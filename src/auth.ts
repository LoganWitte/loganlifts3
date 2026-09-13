import NextAuth, { CredentialsSignin } from 'next-auth'
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

// Helper function to check whether a name is unique - but excludes counting accounts with same id.
// This is to trigger after a provider creates an account, such that the name can be modified if it is not unique.
// Note: 'api/register' handles this instead by rejecting names that already exist.
async function checkUniqueNameIdExcluded(name: string, id: string): Promise<boolean> {

    // Searches for (up to 2) accounts matching the name being tested.
    const result = await prisma.user.findMany({ take: 2, where: { name } });

    // No account found with name - name is unique.
    if (result === null || result.length === 0) {
        return true;
    }

    // Found 1 account with name
    else if (result.length === 1) {

        // Found 1 account with name, but it is the account being tested - name is unique.
        if (result[0].id === id) {
            return true;
        }

        // Found 1 account with name and it is not the account being tested - name is not unique.
        else {
            return false;
        }
    }

    // Found > 1 account with name (including account being tested) - name is not unique.
    else {
        return false;
    }
}

// Helper function to generate unique name
// Note: 'api/register' handles this instead by rejecting names that already exist.
async function getUniqueName(baseName: string): Promise<string> {
    let name = baseName;
    let counter = 1;

    while (await prisma.user.findFirst({ where: { name } })) {
        name = `${baseName}${counter}`;
        counter++;
    }

    return name;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    theme: {
        colorScheme: "light",
        brandColor: "#F97316",
        buttonText: "#000000",
        logo: `${process.env.PRODUCTION_URL}/logo.jpg`,
    },
    adapter: PrismaAdapter(prisma),
    session: { strategy: 'jwt' },
    trustHost: true,
    providers: [
        Google({ allowDangerousEmailAccountLinking: true }),
        GitHub({ allowDangerousEmailAccountLinking: true }),
        Resend({
            from: process.env.EMAIL_FROM,
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
            return {
                ...session,
                provider: token.provider as string | undefined,
            }
        },
    },
    events: {

        // This event ('createUser') triggers when a user signs in with an account method for the first time, excluding credentials sign-in.
        // Providers will attempt to fill user values 'name', 'email', and 'image' if the user does not have an existing account (email-based).
        // This event makes sure that the 'name' value being inserted follows username rules & preserves uniqueness within the database.
        async createUser({ user }) {

            const existingUser = await prisma.user.findUnique({
                where: { email: user.email! },
                select: { id: true, name: true },
            });

            if (existingUser) {

                // Name is present - it will be modified if necessary.
                if (existingUser.name) {

                    // Checks existing name for validity and uniqueness.
                    const nameValid = checkUsername(existingUser.name).status;
                    const nameUnique = await checkUniqueNameIdExcluded(existingUser.name, existingUser.id);

                    // Name is not valid - name will be cleared.
                    if (!nameValid) {
                        await prisma.user.update({
                            where: { id: existingUser.id },
                            data: { name: null, emailVerified: new Date() },
                        });
                    }

                    // Name is valid but not unique - name will be updated to a unique version.
                    else if (!nameUnique) {
                        const uniqueName = await getUniqueName(existingUser.name);
                        await prisma.user.update({
                            where: { id: existingUser.id },
                            data: { name: uniqueName, emailVerified: new Date() },
                        });
                    }

                    // Name is valid and unique - name will be preserved.
                    else {
                        await prisma.user.update({
                            where: { id: existingUser.id },
                            data: { emailVerified: new Date() },
                        });
                    }
                }

                // Name is not present.
                else {
                    await prisma.user.update({
                        where: { id: existingUser.id },
                        data: { emailVerified: new Date() },
                    });
                }
            }
        },
    },
})