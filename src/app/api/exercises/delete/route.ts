import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Deletes an exercise, cascading to all lifts logged with it.
// The frontend must warn users / admins about this before calling this route.
// - Owners may delete their own exercises.
// - Admins may delete suggested & global exercises.
export async function POST(req: Request) {

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await req.json()

    if (typeof id !== 'string' || id.length === 0) {
        return NextResponse.json({ error: 'Invalid exercise id provided.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, isAdmin: true },
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const exercise = await prisma.exercise.findUnique({
        where: { id },
        select: { id: true, userId: true, isSuggested: true },
    })

    if (!exercise) {
        return NextResponse.json({ error: 'Exercise not found.' }, { status: 404 })
    }

    const isGlobal = exercise.userId === null
    const isOwner = !isGlobal && exercise.userId === user.id

    if (!isOwner) {
        if (!user.isAdmin) {
            // 404 for other users' exercises, to avoid revealing their existence
            return isGlobal
                ? NextResponse.json({ error: 'Only admins may delete global exercises.' }, { status: 403 })
                : NextResponse.json({ error: 'Exercise not found.' }, { status: 404 })
        }
        if (!isGlobal && !exercise.isSuggested) {
            return NextResponse.json({ error: 'Admins may only delete suggested or global exercises.' }, { status: 403 })
        }
    }

    await prisma.exercise.delete({ where: { id: exercise.id } })

    return NextResponse.json({ ok: true })
}