import NextAuth, { CredentialsSignin } from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import Resend from 'next-auth/providers/resend'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

class EmailNotVerifiedError extends CredentialsSignin {
    code = 'email_not_verified'
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    session: { strategy: 'jwt' },
    trustHost: true,
    providers: [
        Google({ allowDangerousEmailAccountLinking: true }),
        GitHub({ allowDangerousEmailAccountLinking: true }),
        Resend({ from: process.env.EMAIL_FROM }),
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
    pages: {
        verifyRequest: '/check-email',
    },
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
        async createUser({ user }) {
            if (user.email) {
                await prisma.user.update({
                    where: { email: user.email },
                    data: { emailVerified: new Date() },
                })
            }
        },
    },
})