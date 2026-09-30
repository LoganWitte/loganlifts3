// Server-only helpers shared by the '/api/lifts/*' routes (and '/api/exercises/update', for recalculating lifts).
// Uses Prisma, so this must never be imported into client components (use 'lib/liftChecks.ts' there instead).

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import { calculateLiftWeight, calculateLiftOneRepMax, checkCalculatedWeight } from '@/lib/liftChecks';

// Returns the exercise if the user may log lifts to it (approved global exercises, or exercises the user owns), otherwise null
export async function getLoggableExercise(exerciseId: string, userId: string) {
    return prisma.exercise.findFirst({
        where: {
            id: exerciseId,
            OR: [
                { userId: null, isApproved: true },
                { userId },
            ],
        },
        select: { id: true, weightCoefficient: true },
    });
}

// Updates the user's account body weight from a lift, if:
// - the user has 'bodyWeightAutoUpdate' on,
// - the lift has a body weight (a lift with no body weight never clears the account's body weight), and
// - the lift happened at or after the user's body weight was last set (from '/account' or another lift).
// 'bodyWeightUpdatedAt' is set to the lift's time, so older (backdated) lifts can't overwrite it later.
// Returns whether the body weight was updated.
export async function autoUpdateBodyWeight(
    user: { id: string, bodyWeightAutoUpdate: boolean, bodyWeightUpdatedAt: Date | null },
    liftBodyWeight: number | null,
    liftTime: Date,
): Promise<boolean> {
    if (!user.bodyWeightAutoUpdate || liftBodyWeight === null) return false;
    if (user.bodyWeightUpdatedAt !== null && liftTime < user.bodyWeightUpdatedAt) return false;

    await prisma.user.update({
        where: { id: user.id },
        data: { bodyWeight: liftBodyWeight, bodyWeightUpdatedAt: liftTime },
    });
    return true;
}

// Recalculates 'weight' & 'oneRepMax' for every user's lifts of an exercise, after its 'weightCoefficient' changes.
// Only called for changes between non-traditional values (e.g. 0.65 -> 0.7, or 0 -> 1). Changes between traditional
// (null) and non-traditional are rejected by '/api/exercises/update' while the exercise has lifts.
// Uses only each lift's recorded body weight / added weight. Lifts with no body weight are calculated with it as null
// (never falling back to the owner's account body weight), and their 'bodyWeight' stays null.
// Lifts whose weight can't be recalculated this way (or would become invalid) are left unchanged.
export async function recalculateExerciseLifts(tx: Prisma.TransactionClient, exerciseId: string, weightCoefficient: number | null): Promise<number> {
    if (weightCoefficient === null) return 0;

    const lifts = await tx.lift.findMany({
        where: { exerciseId },
        select: { id: true, reps: true, weight: true, bodyWeight: true, addedWeight: true },
    });

    let updatedCount = 0;
    for (const lift of lifts) {
        const weight = calculateLiftWeight(weightCoefficient, lift, null);
        if (!checkCalculatedWeight(weight, weightCoefficient).status || weight === lift.weight) continue;

        await tx.lift.update({
            where: { id: lift.id },
            data: { weight: weight!, oneRepMax: calculateLiftOneRepMax(weight!, lift.reps) },
        });
        updatedCount++;
    }

    return updatedCount;
}