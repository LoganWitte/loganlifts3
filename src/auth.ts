import NextAuth, { CredentialsSignin, type NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import Resend from 'next-auth/providers/resend'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { v2 as cloudinary } from 'cloudinary'
import bcrypt from 'bcryptjs'
import { sendVerificationRequestCustom } from './lib/sendMagicLink'
import { checkUsername } from './lib/credentialChecks'

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

class EmailNotVerifiedError extends CredentialsSignin {
    code = 'email_not_verified'
}

function isOAuthImageUrl(url: string): boolean {
    if (!url) return false;
    return url.includes('googleusercontent.com') || url.includes('githubusercontent.com');
}

async function validateAndUploadOAuthImage(imageUrl: string, userId: string): Promise<string | null> {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) return null;

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) return null;

        const contentLength = response.headers.get('content-length');
        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) return null;

        const buffer = await response.arrayBuffer();

        const uploadResult = await new Promise<{ secure_url: string } | null>((resolve) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'loganlifts/profile-photos',
                    public_id: `user-${userId}`,
                    overwrite: true,
                    resource_type: 'auto',
                    quality: 'auto:best',
                    fetch_format: 'auto',
                    format: 'webp',
                },
                (error, result) => {
                    if (error) resolve(null);
                    else resolve(result as { secure_url: string });
                }
            );
            stream.end(Buffer.from(buffer));
        });

        return uploadResult?.secure_url ?? null;
    } catch {
        // If image upload fails, continue with user creation
        return null;
    }
}

async function checkUniqueNameIdExcluded(name: string, id: string): Promise<boolean> {
    const result = await prisma.user.findMany({ take: 2, where: { name } });

    if (result === null || result.length === 0) {
        return true;
    }

    else if (result.length === 1) {
        if (result[0].id === id) {
            return true;
        }
        else {
            return false;
        }
    }

    else {
        return false;
    }
}

async function getUniqueName(baseName: string): Promise<string> {
    let name = baseName;
    let counter = 1;

    while (await prisma.user.findFirst({ where: { name } })) {
        name = `${baseName}${counter}`;
        counter++;
    }

    return name;
}

const config = {
    theme: {
        colorScheme: "light",
        brandColor: "#F97316",
        buttonText: "#000000",
        logo: `${process.env.NEXT_PUBLIC_PRODUCTION_URL}/logo.webp`,
    },
    adapter: PrismaAdapter(prisma),
    session: { strategy: 'jwt' },
    trustHost: true,
    providers: [
        Google({ allowDangerousEmailAccountLinking: true }),
        GitHub({ allowDangerousEmailAccountLinking: true }),
        Resend({
            from: process.env.NEXT_PUBLIC_EMAIL_FROM,
            sendVerificationRequest: sendVerificationRequestCustom,
        }),
        Credentials({
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            authorize: async (credentials) => {
                if (!credentials?.email || !credentials?.password) return null

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                })

                if (!user || !user.password) return null

                const isValid = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                )

                if (!isValid) return null

                if (!user.emailVerified) {
                    throw new EmailNotVerifiedError()
                }

                return user
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if ((account?.provider === 'google' || account?.provider === 'github') && user.email) {
                const existingUser = await prisma.user.findUnique({
                    where: { email: user.email },
                    select: { emailVerified: true },
                })

                if (existingUser && !existingUser.emailVerified) {
                    await prisma.user.update({
                        where: { email: user.email },
                        data: { emailVerified: new Date() },
                    })
                }
            }
            return true
        },
        async jwt({ token, account }) {
            if (account) {
                token.provider = account.provider
            }
            return token
        },
        async session({ session, token }) {
            if (session.user && token.sub) {
                // Fetch updated user data from database
                const user = await prisma.user.findUnique({
                    where: { id: token.sub },
                    select: {
                        password: true,
                        name: true,
                        image: true,
                        email: true,
                    },
                })

                session.user.hasPassword = !!user?.password
                session.user.name = user?.name ?? null
                session.user.image = user?.image ?? null
                if (user?.email) session.user.email = user.email
            }

            session.provider = token.provider as string | undefined
            return session
        },
    },
    events: {
        async createUser({ user }) {
            const existingUser = await prisma.user.findUnique({
                where: { email: user.email! },
                select: { id: true, name: true, image: true },
            });

            if (existingUser) {
                const updateData: { name?: string | null; image?: string; emailVerified: Date } = {
                    emailVerified: new Date(),
                };

                // Handle name sanitization
                if (existingUser.name) {
                    const nameValid = checkUsername(existingUser.name).status;
                    const nameUnique = await checkUniqueNameIdExcluded(existingUser.name, existingUser.id);

                    if (!nameValid) {
                        updateData.name = null;
                    } else if (!nameUnique) {
                        const uniqueName = await getUniqueName(existingUser.name);
                        updateData.name = uniqueName;
                    }
                }

                // Handle OAuth image upload
                if (existingUser.image && isOAuthImageUrl(existingUser.image)) {
                    const cloudinaryUrl = await validateAndUploadOAuthImage(existingUser.image, existingUser.id);
                    if (cloudinaryUrl) {
                        updateData.image = cloudinaryUrl;
                    }
                }

                // Single update call with both name and image changes
                await prisma.user.update({
                    where: { id: existingUser.id },
                    data: updateData,
                });
            }
        },
    },
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(config)