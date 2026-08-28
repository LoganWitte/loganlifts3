// src/app/api/account/password/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { MIN_PASSWORD_LENGTH } from '@/lib/constants'

export async function POST(req: Request) {
    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await req.json()

    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json(
            { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
            { status: 400 }
        )
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.password) {
        // Changing an existing password — require current password
        if (!currentPassword) {
            return NextResponse.json(
                { error: 'Current password required' },
                { status: 400 }
            )
        }

        const isValid = await bcrypt.compare(currentPassword, user.password)
        if (!isValid) {
            return NextResponse.json(
                { error: 'Current password is incorrect' },
                { status: 401 }
            )
        }
    }
    // else: no existing password, nothing to confirm — proceed directly

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
        where: { email: session.user.email },
        data: { password: hashedPassword },
    })

    return NextResponse.json({ ok: true })
}