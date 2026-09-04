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
        return NextResponse.json({ ok: true }) // don't reveal whether email exists
    }

    if (user.lastVerificationEmailSentAt) {
        const elapsed = Date.now() - user.lastVerificationEmailSentAt.getTime()
        if (elapsed < RESEND_COOLDOWN_MS) {
            // Same generic response as a successful send — avoids revealing account existence
            return NextResponse.json({ ok: true })
        }
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 1000 * 60 * 30)

    await prisma.user.update({
        where: { email },
        data: {
            resetToken: token,
            resetTokenExpiry: expiry,
            lastVerificationEmailSentAt: new Date(),
        },
    })

    const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`

    await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: email,
        subject: 'LoganLifts - Reset your password',
        html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 30 minutes.</p>`,
    })

    return NextResponse.json({ ok: true })
}