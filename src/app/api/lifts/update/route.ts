import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkLiftFields, normalizeLiftFields, calculateLiftWeight, checkCalculatedWeight, calculateLiftOneRepMax } from '@/lib/liftChecks'
import { autoUpdateBodyWeight } from '@/lib/liftServer'
import type { LiftFields } from '@/lib/models'

// Updates one of the user's lifts. The request contains the complete editable lift, overwriting all editable fields.
// - A lift's exercise cannot be changed.
// - 'weight' & 'oneRepMax' are recalculated server-side, using the exercise's current 'weightCoefficient'.
// - Also updates the user's account body weight if they have 'bodyWeightAutoUpdate' on (see 'autoUpdateBodyWeight').
export async function POST(req: Request) {

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { id } = body

    if (typeof id !== 'string' || id.length === 0) {
        return NextResponse.json({ error: 'Invalid lift id provided.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, bodyWeight: true, bodyWeightAutoUpdate: true, bodyWeightUpdatedAt: true },
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const existing = await prisma.lift.findUnique({
        where: { id },
        select: { id: true, userId: true, exercise: { select: { weightCoefficient: true } } },
    })

    // 404 for other users' lifts, to avoid revealing their existence
    if (!existing || existing.userId !== user.id) {
        return NextResponse.json({ error: 'Lift not found.' }, { status: 404 })
    }

    const weightCoefficient = existing.exercise.weightCoefficient
    const fieldsCheck = checkLiftFields(body, weightCoefficient)

    if (!fieldsCheck.status) {
        return NextResponse.json(
            { error: 'Invalid lift provided.', details: fieldsCheck.errors },
            { status: 400 }
        )
    }

    const fields = normalizeLiftFields(body as LiftFields, weightCoefficient)

    // Falls back to the user's account body weight if the lift's weight can't be calculated otherwise
    const weight = calculateLiftWeight(weightCoefficient, fields, user.bodyWeight)
    const weightCheck = checkCalculatedWeight(weight, weightCoefficient)

    if (!weightCheck.status) {
        return NextResponse.json(
            { error: 'Invalid lift provided.', details: weightCheck.errors },
            { status: 400 }
        )
    }

    const lift = await prisma.lift.update({
        where: { id: existing.id },
        data: {
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