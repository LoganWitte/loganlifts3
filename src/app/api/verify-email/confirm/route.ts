import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    const { token } = await req.json()

    const user = await prisma.user.findFirst({
        where: { emailVerificationToken: token, emailVerificationExpiry: { gt: new Date() } },
    })

    if (!user) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            emailVerified: new Date(),
            emailVerificationToken: null,
            emailVerificationExpiry: null,
        },
    })

    return NextResponse.json({ ok: true })
}