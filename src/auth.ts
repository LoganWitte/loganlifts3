import NextAuth, { CredentialsSignin, type NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import Resend from 'next-auth/providers/resend'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sendVerificationRequestCustom } from './lib/sendMagicLink'
import { checkUsername } from './lib/credentialChecks'

class EmailNotVerifiedError extends CredentialsSignin {
    code = 'email_not_verified'
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
                if (user?.name) session.user.name = user.name
                if (user?.image) session.user.image = user.image
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
                select: { id: true, name: true },
            });

            if (existingUser) {
                if (existingUser.name) {
                    const nameValid = checkUsername(existingUser.name).status;
                    const nameUnique = await checkUniqueNameIdExcluded(existingUser.name, existingUser.id);

                    if (!nameValid) {
                        await prisma.user.update({
                            where: { id: existingUser.id },
                            data: { name: null, emailVerified: new Date() },
                        });
                    }

                    else if (!nameUnique) {
                        const uniqueName = await getUniqueName(existingUser.name);
                        await prisma.user.update({
                            where: { id: existingUser.id },
                            data: { name: uniqueName, emailVerified: new Date() },
                        });
                    }

                    else {
                        await prisma.user.update({
                            where: { id: existingUser.id },
                            data: { emailVerified: new Date() },
                        });
                    }
                }

                else {
                    await prisma.user.update({
                        where: { id: existingUser.id },
                        data: { emailVerified: new Date() },
                    });
                }
            }
        },
    },
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(config)