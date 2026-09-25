import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkExerciseFields, normalizeExerciseFields, getGlobalExerciseSlug, getUserExerciseSlug } from '@/lib/exerciseChecks'
import { toPrismaExerciseData, serializeExercise, isOptionalBoolean, isUserSlugTaken, isApprovedGlobalSlugTaken } from '@/lib/exerciseServer'
import type { ExerciseFields } from '@/lib/models'

// Creates an exercise.
// - Default: creates an exercise owned by the user.
// - isSuggested=true: creates an owned exercise which is also suggested for global approval.
// - isApproved=true (admin only): creates a global, approved exercise immediately (no owned copy).
export async function POST(req: Request) {

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { isSuggested, isApproved } = body

    const fieldsCheck = checkExerciseFields(body)

    if (!fieldsCheck.status) {
        return NextResponse.json(
            { error: 'Invalid exercise provided.', details: fieldsCheck.errors },
            { status: 400 }
        )
    }

    if (!isOptionalBoolean(isSuggested) || !isOptionalBoolean(isApproved)) {
        return NextResponse.json({ error: 'Invalid suggestion or approval value provided.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, isAdmin: true },
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    if (isApproved === true && !user.isAdmin) {
        return NextResponse.json({ error: 'Only admins may approve exercises.' }, { status: 403 })
    }

    const fields = normalizeExerciseFields(body as ExerciseFields)
    const globalSlug = getGlobalExerciseSlug(fields.name)

    // Admin creating an approved exercise: only the global copy is created
    if (isApproved === true) {
        if (await isApprovedGlobalSlugTaken(globalSlug)) {
            return NextResponse.json(
                { error: 'An approved exercise with this name already exists. Please choose a different name.' },
                { status: 409 }
            )
        }

        const exercise = await prisma.exercise.create({
            data: {
                ...toPrismaExerciseData(fields),
                URLSlug: globalSlug,
                userId: null,
                isApproved: true,
                isSuggested: false,
            },
        })

        return NextResponse.json({ ok: true, exercise: serializeExercise(exercise) })
    }

    // Owned exercise, optionally suggested
    const userSlug = getUserExerciseSlug(fields.name)

    if (await isUserSlugTaken(user.id, userSlug)) {
        return NextResponse.json(
            { error: 'You already have an exercise with this name. Please choose a different name.' },
            { status: 409 }
        )
    }

    if (isSuggested === true && await isApprovedGlobalSlugTaken(globalSlug)) {
        return NextResponse.json(
            { error: 'An approved exercise with this name already exists. Please choose a different name or use the existing exercise.' },
            { status: 409 }
        )
    }

    const exercise = await prisma.exercise.create({
        data: {
            ...toPrismaExerciseData(fields),
            URLSlug: userSlug,
            userId: user.id,
            isSuggested: isSuggested === true,
        },
    })

    return NextResponse.json({ ok: true, exercise: serializeExercise(exercise) })
}