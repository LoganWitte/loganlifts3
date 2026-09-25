import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serializeExercise } from '@/lib/exerciseServer'

// Fetches all exercises available to the current user, sorted alphabetically by name.
// - Logged out: approved global exercises only.
// - Logged in: approved global exercises, plus all exercises the user owns (including their suggested / rejected ones).
// Lifts are not included, as this route is used for browsing exercises.
export async function GET() {

    const session = await auth()

    let userId: string | null = null
    if (session?.user?.email) {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        })
        userId = user?.id ?? null
    }

    const exercises = await prisma.exercise.findMany({
        where: userId
            ? { OR: [{ userId: null, isApproved: true }, { userId }] }
            : { userId: null, isApproved: true },
    })

    // Sorted here rather than in the query for case-insensitive alphabetical ordering
    exercises.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

    return NextResponse.json({ ok: true, exercises: exercises.map(serializeExercise) })
}