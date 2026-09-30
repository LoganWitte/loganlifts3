import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkLiftFields, normalizeLiftFields, calculateLiftWeight, checkCalculatedWeight, calculateLiftOneRepMax } from '@/lib/liftChecks'
import { getLoggableExercise, autoUpdateBodyWeight } from '@/lib/liftServer'
import type { LiftFields } from '@/lib/models'

// Logs a lift for the user.
// - 'weight' & 'oneRepMax' are calculated server-side from the exercise's 'weightCoefficient' (see lib/liftChecks.ts).
// - Also updates the user's account body weight if they have 'bodyWeightAutoUpdate' on (see 'autoUpdateBodyWeight').
export async function POST(req: Request) {

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { exerciseId } = body

    if (typeof exerciseId !== 'string' || exerciseId.length === 0) {
        return NextResponse.json({ error: 'Invalid exercise id provided.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, bodyWeight: true, bodyWeightAutoUpdate: true, bodyWeightUpdatedAt: true },
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const exercise = await getLoggableExercise(exerciseId, user.id)

    if (!exercise) {
        return NextResponse.json({ error: 'Exercise not found.' }, { status: 404 })
    }

    const fieldsCheck = checkLiftFields(body, exercise.weightCoefficient)

    if (!fieldsCheck.status) {
        return NextResponse.json(
            { error: 'Invalid lift provided.', details: fieldsCheck.errors },
            { status: 400 }
        )
    }

    const fields = normalizeLiftFields(body as LiftFields, exercise.weightCoefficient)

    // Falls back to the user's account body weight if the lift's weight can't be calculated otherwise
    const weight = calculateLiftWeight(exercise.weightCoefficient, fields, user.bodyWeight)
    const weightCheck = checkCalculatedWeight(weight, exercise.weightCoefficient)

    if (!weightCheck.status) {
        return NextResponse.json(
            { error: 'Invalid lift provided.', details: weightCheck.errors },
            { status: 400 }
        )
    }

    const lift = await prisma.lift.create({
        data: {
            userId: user.id,
            exerciseId: exercise.id,
            weight: weight!,
            reps: fields.reps,
            oneRepMax: calculateLiftOneRepMax(weight!, fields.reps),
            bodyWeight: fields.bodyWeight,
            addedWeight: fields.addedWeight,
            time: fields.time,
        },
    })

    const bodyWeightUpdated = await autoUpdateBodyWeight(user, fields.bodyWeight, fields.time)

    return NextResponse.json({ ok: true, lift, bodyWeightUpdated })
}