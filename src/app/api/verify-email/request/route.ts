import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { RESEND_COOLDOWN_MS } from '@/lib/constants'

const resend = new Resend(process.env.AUTH_RESEND_KEY)

export async function POST(req: Request) {
    const { email } = await req.json()

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
        return NextResponse.json({ ok: true })
    }

    if (user.lastVerificationEmailSentAt) {
        const elapsed = Date.now() - user.lastVerificationEmailSentAt.getTime()
        if (elapsed < RESEND_COOLDOWN_MS) {
            const secondsLeft = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)
            return NextResponse.json(
                { error: `Please wait ${secondsLeft}s before requesting another email.` },
                { status: 429 }
            )
        }
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 1000 * 60 * 30) // 30m

    await prisma.user.update({
        where: { email },
        data: {
            emailVerificationToken: token,
            emailVerificationExpiry: expiry,
            lastVerificationEmailSentAt: new Date(),
        },
    })

    const foundName = user.name !== null && user.name.length > 0;
    let verifyUrl: string;
    if (foundName) {
        verifyUrl = `${process.env.APP_URL}/verify-email/confirm?name=${user.name}&email=${user.email}&token=${token}`;
    }
    else {
        verifyUrl = `${process.env.APP_URL}/verify-email/confirm?email=${user.email}&token=${token}`;
    }

    // Sends verification email
    await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: email,
        subject: 'LoganLifts - Verify your email',
        html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email. This link expires in 30 minutes.</p>`,
    })

    return NextResponse.json({ ok: true })
}