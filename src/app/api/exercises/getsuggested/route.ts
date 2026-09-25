import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serializeExercise } from '@/lib/exerciseServer'

// Admin only. Fetches exercises for admin moderation (used by '/admin/exercises'), oldest first:
// - Suggested exercises (with the suggesting user's name & email as 'suggestedBy')
// - Rejected exercises (with the owner's name & email as 'suggestedBy')
// - Un-approved global exercises (no owner, so 'suggestedBy' is null)
// Approved exercises are fetched using '/api/exercises/get'.
export async function GET() {

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { isAdmin: true },
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    if (!user.isAdmin) {
        return NextResponse.json({ error: 'Only admins may view suggested exercises.' }, { status: 403 })
    }

    const exercises = await prisma.exercise.findMany({
        where: {
            OR: [
                { isSuggested: true },
                { isRejected: true },
                { userId: null, isApproved: false },
            ],
        },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
        ok: true,
        exercises: exercises.map(({ user: suggestedBy, ...exercise }) => ({
            ...serializeExercise(exercise),
            suggestedBy,
        })),
    })
}