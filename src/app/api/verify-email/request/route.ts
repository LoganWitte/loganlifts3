import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const resend = new Resend(process.env.AUTH_RESEND_KEY)

export async function POST(req: Request) {
    const { email } = await req.json()

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
        return NextResponse.json({ ok: true })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24h

    await prisma.user.update({
        where: { email },
        data: { emailVerificationToken: token, emailVerificationExpiry: expiry },
    })

    const verifyUrl = `${process.env.APP_URL}/verify-email?token=${token}`

    await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: email,
        subject: 'Verify your email',
        html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email. This link expires in 24 hours.</p>`,
    })

    return NextResponse.json({ ok: true })
}