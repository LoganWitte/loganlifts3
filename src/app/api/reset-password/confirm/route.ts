import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { checkPassword } from '@/lib/credentialChecks'

export async function POST(req: Request) {

    const { token, newPassword } = await req.json()
    const passwordCheck = checkPassword(newPassword);

    if (!passwordCheck.status) {
        return NextResponse.json(
            { error: 'Invalid password provided.', details: { password: passwordCheck.errors } },
            { status: 400 }
        )
    }

    const user = await prisma.user.findFirst({
        where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
    })

    if (!user) {
        return NextResponse.json({ error: 'Invalid or expired token. Try again by requesting a new reset link.' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Also verifies users email
    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiry: null,
            emailVerified: new Date(),
            emailVerificationToken: null,
            emailVerificationExpiry: null,
        },
    })

    return NextResponse.json({ ok: true })
}