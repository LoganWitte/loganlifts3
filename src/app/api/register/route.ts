import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { MIN_PASSWORD_LENGTH } from '@/lib/constants'

const resend = new Resend(process.env.AUTH_RESEND_KEY)

const convertToProperName = (name: string) => {
    if (name === "github") return "GitHub";
    else return name.charAt(0).toUpperCase() + name.slice(1);
}

export async function POST(req: Request) {
    const { email, password, name } = await req.json()

    if (!email || !password || password.length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json(
            { error: `Missing fields or password must be at least ${MIN_PASSWORD_LENGTH} characters` },
            { status: 400 }
        )
    }

    const existing = await prisma.user.findUnique({
        where: { email },
        include: { accounts: true },
    })

    if (existing) {
        if (existing.password) {
            return NextResponse.json(
                { error: 'An account with this email already exists. Please sign in instead.' },
                { status: 409 }
            )
        }

        const oauthMethods = existing.accounts.map((a) => convertToProperName(a.provider))
        const allMethods = [...oauthMethods, 'Magic Link']
        const via =
            allMethods.length > 2
                ? `${allMethods.slice(0, -1).join(', ')}, or ${allMethods[allMethods.length - 1]}`
                : allMethods.length > 1
                    ? `${allMethods.slice(0, -1).join(', ')} or ${allMethods[allMethods.length - 1]}`
                    : allMethods[0]

        return NextResponse.json(
            {
                error: `An account with this email already exists. Sign in via ${via}, then you can add a password from your account settings.`,
            },
            { status: 409 }
        )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
        data: { email, name, password: hashedPassword },
    })

    // Generate and store a verification token
    const token = crypto.randomBytes(32).toString('hex')
    await prisma.user.update({
        where: { id: user.id },
        data: {
            emailVerificationToken: token,
            emailVerificationExpiry: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24h
            lastVerificationEmailSentAt: new Date(),
        },
    })

    // Sends verification email
    const verifyUrl = `${process.env.APP_URL}/verify-email?token=${token}`
    await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: email,
        subject: 'LoganLifts - Verify your email',
        html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email. This link expires in 24 hours.</p>`,
    })

    return NextResponse.json({ id: user.id, email: user.email })
}