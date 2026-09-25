import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { Prisma } from '@/generated/prisma/client'
import { checkExerciseFields, normalizeExerciseFields, getGlobalExerciseSlug, getUserExerciseSlug } from '@/lib/exerciseChecks'
import { toPrismaExerciseData, serializeExercise, isOptionalBoolean, isUserSlugTaken, isApprovedGlobalSlugTaken } from '@/lib/exerciseServer'
import type { ExerciseFields } from '@/lib/models'

// Updates an exercise. The request contains the complete editable exercise, overwriting all editable fields.
// - Owners may edit their exercises and change 'isSuggested' (unless the exercise has been rejected).
// - Admins may edit suggested, rejected & global exercises, and change 'isApproved' / 'isRejected'.
//   Approving clears the user relation, making the exercise global. Its URLSlug becomes the global form.
//   Since the admin submits the complete exercise, any edits the owner made in the meantime are overwritten.
export async function POST(req: Request) {

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { id, isSuggested, isApproved, isRejected } = body

    if (typeof id !== 'string' || id.length === 0) {
        return NextResponse.json({ error: 'Invalid exercise id provided.' }, { status: 400 })
    }

    const fieldsCheck = checkExerciseFields(body)

    if (!fieldsCheck.status) {
        return NextResponse.json(
            { error: 'Invalid exercise provided.', details: fieldsCheck.errors },
            { status: 400 }
        )
    }

    if (!isOptionalBoolean(isSuggested) || !isOptionalBoolean(isApproved) || !isOptionalBoolean(isRejected)) {
        return NextResponse.json({ error: 'Invalid suggestion, approval, or rejection value provided.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, isAdmin: true },
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const exercise = await prisma.exercise.findUnique({ where: { id } })

    if (!exercise) {
        return NextResponse.json({ error: 'Exercise not found.' }, { status: 404 })
    }

    const isGlobal = exercise.userId === null
    const isOwner = !isGlobal && exercise.userId === user.id

    // Permission checks: owners may edit their own exercises, admins may edit suggested & global exercises
    if (!isOwner) {
        if (!user.isAdmin) {
            // 404 for other users' exercises, to avoid revealing their existence
            return isGlobal
                ? NextResponse.json({ error: 'Only admins may modify global exercises.' }, { status: 403 })
                : NextResponse.json({ error: 'Exercise not found.' }, { status: 404 })
        }
        // Rejected exercises are included so admins can reverse a rejection
        if (!isGlobal && !exercise.isSuggested && !exercise.isRejected) {
            return NextResponse.json({ error: 'Admins may only modify suggested, rejected, or global exercises.' }, { status: 403 })
        }
    }

    // Resolves requested flags, defaulting to current values
    const newIsSuggested: boolean = isSuggested ?? exercise.isSuggested
    const newIsApproved: boolean = isApproved ?? exercise.isApproved
    const newIsRejected: boolean = isRejected ?? exercise.isRejected

    if ((newIsApproved !== exercise.isApproved || newIsRejected !== exercise.isRejected) && !user.isAdmin) {
        return NextResponse.json({ error: 'Only admins may approve or reject exercises.' }, { status: 403 })
    }

    if (newIsSuggested !== exercise.isSuggested && !isOwner) {
        return NextResponse.json({ error: 'Only the owner may change whether an exercise is suggested.' }, { status: 403 })
    }

    if (newIsApproved && newIsRejected) {
        return NextResponse.json({ error: 'An exercise cannot be both approved and rejected.' }, { status: 400 })
    }

    const fields = normalizeExerciseFields(body as ExerciseFields)
    const fieldData = toPrismaExerciseData(fields)
    const globalSlug = getGlobalExerciseSlug(fields.name)

    let data: Prisma.ExerciseUncheckedUpdateInput

    // Approving, or editing an already-approved exercise: exercise becomes / stays global
    if (newIsApproved) {
        if (await isApprovedGlobalSlugTaken(globalSlug, exercise.id)) {
            return NextResponse.json(
                { error: 'An approved exercise with this name already exists. Rename this exercise before approving it.' },
                { status: 409 }
            )
        }

        data = {
            ...fieldData,
            URLSlug: globalSlug,
            userId: null,
            isApproved: true,
            isSuggested: false,
            isRejected: false,
        }
    }

    // Un-approved global exercise (hidden from users, admin only)
    else if (isGlobal) {
        if (newIsRejected) {
            return NextResponse.json({ error: 'Only suggested exercises can be rejected.' }, { status: 400 })
        }

        data = {
            ...fieldData,
            URLSlug: globalSlug,
            isApproved: false,
            isSuggested: false,
            isRejected: false,
        }
    }

    // Owned exercise (private, suggested, or rejected)
    else {
        if (newIsRejected && !exercise.isRejected && !exercise.isSuggested) {
            return NextResponse.json({ error: 'Only suggested exercises can be rejected.' }, { status: 400 })
        }

        if (newIsRejected && newIsSuggested && !exercise.isSuggested) {
            return NextResponse.json({ error: 'Rejected exercises cannot be suggested again.' }, { status: 400 })
        }

        // Rejecting clears the suggestion
        const finalIsSuggested = newIsRejected ? false : newIsSuggested
        const userSlug = getUserExerciseSlug(fields.name)

        if (await isUserSlugTaken(exercise.userId!, userSlug, exercise.id)) {
            return NextResponse.json(
                {
                    error: isOwner
                        ? 'You already have an exercise with this name. Please choose a different name.'
                        : 'The owner of this exercise already has another exercise with this name.'
                },
                { status: 409 }
            )
        }

        if (finalIsSuggested && await isApprovedGlobalSlugTaken(globalSlug)) {
            return NextResponse.json(
                { error: 'An approved exercise with this name already exists. Please choose a different name or use the existing exercise.' },
                { status: 409 }
            )
        }

        data = {
            ...fieldData,
            URLSlug: userSlug,
            isApproved: false,
            isSuggested: finalIsSuggested,
            isRejected: newIsRejected,
        }
    }

    const updated = await prisma.exercise.update({
        where: { id: exercise.id },
        data,
    })

    return NextResponse.json({ ok: true, exercise: serializeExercise(updated) })
}