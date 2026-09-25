import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { MAX_BODY_WEIGHT } from '@/lib/constants'

// Updates the user's body weight, and / or whether it is auto-updated when logging a lift.
// Used by the 'Update body weight' form in '/account' (both for the weight and the 'Auto-update' checkbox).
// - bodyWeight: number (pounds) > 0 and <= MAX_BODY_WEIGHT to set, or null to clear. Omit to leave unchanged.
// - bodyWeightAutoUpdate: boolean. Omit to leave unchanged.
export async function POST(req: Request) {

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { bodyWeight, bodyWeightAutoUpdate } = await req.json();

    const bodyWeightValid = bodyWeight === undefined || bodyWeight === null ||
        (typeof bodyWeight === 'number' && Number.isFinite(bodyWeight) && bodyWeight > 0 && bodyWeight <= MAX_BODY_WEIGHT);

    if (!bodyWeightValid) {
        return NextResponse.json(
            { error: 'Invalid body weight provided.', details: { bodyWeight: [`Body weight must be empty or a positive number up to ${MAX_BODY_WEIGHT} lbs.`] } },
            { status: 400 }
        )
    }

    if (bodyWeightAutoUpdate !== undefined && typeof bodyWeightAutoUpdate !== 'boolean') {
        return NextResponse.json({ error: 'Invalid auto-update value provided.' }, { status: 400 })
    }

    if (bodyWeight === undefined && bodyWeightAutoUpdate === undefined) {
        return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
            // Rounded to 2 decimal places, matching 'poundsToKgs' / 'kgsToPounds' in lib/formulas.ts
            ...(bodyWeight !== undefined ? { bodyWeight: bodyWeight === null ? null : Math.round(bodyWeight * 100) / 100 } : {}),
            ...(bodyWeightAutoUpdate !== undefined ? { bodyWeightAutoUpdate } : {}),
        },
        select: { bodyWeight: true, bodyWeightAutoUpdate: true },
    })

    return NextResponse.json({ ok: true, bodyWeight: updated.bodyWeight, bodyWeightAutoUpdate: updated.bodyWeightAutoUpdate })
}