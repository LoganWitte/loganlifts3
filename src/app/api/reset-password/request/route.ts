import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const resend = new Resend(process.env.AUTH_RESEND_KEY)

export async function POST(req: Request) {
    const { email } = await req.json()

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
        return NextResponse.json({ ok: true }) // don't reveal whether email exists
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 1000 * 60 * 30)

    await prisma.user.update({
        where: { email },
        data: { resetToken: token, resetTokenExpiry: expiry },
    })

    const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`

    await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: email,
        subject: 'Reset your password',
        html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 30 minutes.</p>`,
    })

    return NextResponse.json({ ok: true })
}