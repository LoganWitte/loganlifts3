import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Fetches all of the user's lifts for a given exercise, oldest first.
// Usage: GET '/api/lifts/get?exerciseId=<id>'
// Lifts are returned even if the exercise is no longer visible to the user (e.g. an un-approved global exercise).
export async function GET(req: Request) {

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const exerciseId = new URL(req.url).searchParams.get('exerciseId')

    if (exerciseId === null || exerciseId.length === 0) {
        return NextResponse.json({ error: 'Invalid exercise id provided.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const lifts = await prisma.lift.findMany({
        where: { userId: user.id, exerciseId },
        orderBy: { time: 'asc' },
    })

    return NextResponse.json({ ok: true, lifts })
}