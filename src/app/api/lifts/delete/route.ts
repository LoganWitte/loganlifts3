import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Deletes one of the user's lifts. The user's account body weight is not changed.
export async function POST(req: Request) {

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await req.json()

    if (typeof id !== 'string' || id.length === 0) {
        return NextResponse.json({ error: 'Invalid lift id provided.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    // Only deletes the lift if the user owns it. 404 for other users' lifts, to avoid revealing their existence.
    const result = await prisma.lift.deleteMany({
        where: { id, userId: user.id },
    })

    if (result.count === 0) {
        return NextResponse.json({ error: 'Lift not found.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
}