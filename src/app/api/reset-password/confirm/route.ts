import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { MIN_PASSWORD_LENGTH } from '@/lib/constants'

export async function POST(req: Request) {
    const { token, newPassword } = await req.json()

    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json(
            { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
            { status: 400 }
        )
    }

    const user = await prisma.user.findFirst({
        where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
    })

    if (!user) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null },
    })

    return NextResponse.json({ ok: true })
}