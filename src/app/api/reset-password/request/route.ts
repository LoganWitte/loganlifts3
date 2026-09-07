import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { RESEND_COOLDOWN_MS } from '@/lib/constants'
import { checkEmail } from '@/lib/credentialChecks'

const resend = new Resend(process.env.AUTH_RESEND_KEY)

export async function POST(req: Request) {

    const { email } = await req.json()

    // Makes sure email address is valid before continuing
    if (!checkEmail(email).status) {
        // Does not reveal whether email address exists
        return NextResponse.json({ ok: true })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
        // Does not reveal whether email address exists
        return NextResponse.json({ ok: true })
    }

    if (user.lastVerificationEmailSentAt) {
        const elapsed = Date.now() - user.lastVerificationEmailSentAt.getTime()
        if (elapsed < RESEND_COOLDOWN_MS) {
            // Does not reveal whether email address exists
            return NextResponse.json({ ok: true })
        }
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 1000 * 60 * 30) // 30m

    await prisma.user.update({
        where: { email },
        data: {
            resetToken: token,
            resetTokenExpiry: expiry,
            lastVerificationEmailSentAt: new Date(),
        },
    })

    const foundName = user.name !== null && user.name.length > 0;
    let resetUrl: string;
    if (foundName) {
        resetUrl = `${process.env.APP_URL}/reset-password/confirm?name=${user.name}&email=${user.email}&token=${token}`;
    }
    else {
        resetUrl = `${process.env.APP_URL}/reset-password/confirm?email=${user.email}&token=${token}`;
    }

    await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: email,
        subject: 'LoganLifts - Reset your password',
        html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 30 minutes.</p>`,
    })

    return NextResponse.json({ ok: true })
}