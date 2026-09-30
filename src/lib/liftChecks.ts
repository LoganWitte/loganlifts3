// Shared (client & server) validation, normalization, and weight calculation for lift fields.
// Used by the '/api/lifts/*' routes and by lift forms on the frontend.
// Must not import anything server-only (e.g. Prisma), so it can be used in client components.

import { MAX_BODY_WEIGHT, MAX_LIFT_WEIGHT } from '@/lib/constants';
import { getEquivalentWeight, getOneRepMax } from '@/lib/formulas';
import type { LiftFields } from '@/lib/models';

type CheckResult = { status: boolean, errors: string[] };

export type LiftFieldErrors = {
    weight: string[],
    reps: string[],
    bodyWeight: string[],
    addedWeight: string[],
    time: string[],
};

// Sanity cap for reps in a single set
export const MAX_LIFT_REPS = 100;

// Allowed clock drift between client & server when checking that a lift's time isn't in the future
const FUTURE_TIME_TOLERANCE_MS = 60 * 1000; // 1m / 60s

// The 3 types of exercise, based on the exercise's 'weightCoefficient' (k):
// - "traditional": k === null (barbell, dumbbell, machine, etc.). Weight is entered directly, no added weight.
// - "bodyweight": k === 0 (crunches, etc.). Weight is the user's body weight. Added weight may be recorded but isn't calculable.
// - "weightedBodyweight": k > 0 (pull-ups, push-ups, etc.). Weight is bodyWeight + addedWeight / k.
export type ExerciseType = "traditional" | "bodyweight" | "weightedBodyweight";

export function getExerciseType(weightCoefficient: number | null): ExerciseType {
    if (weightCoefficient === null) return "traditional";
    if (weightCoefficient === 0) return "bodyweight";
    return "weightedBodyweight";
}

// Rounds to 2 decimal places, matching 'poundsToKgs' / 'kgsToPounds' in lib/formulas.ts
export function roundWeight(weight: number): number {
    return Math.round(weight * 100) / 100;
}

// Whether a value is omitted (null / undefined)
function isEmpty(value: unknown): boolean {
    return value === null || value === undefined;
}

// Whether a value is a finite number > 0 and <= max
function isPositiveNumberUpTo(value: unknown, max: number): boolean {
    return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= max;
}

// Weight is only entered for traditional exercises, where it is required
export function checkLiftWeight(weight: unknown, weightCoefficient: number | null): CheckResult {
    if (weightCoefficient !== null) {
        return { status: true, errors: [] };
    }
    if (isEmpty(weight)) {
        return { status: false, errors: ["Weight is required."] };
    }
    if (!isPositiveNumberUpTo(weight, MAX_LIFT_WEIGHT)) {
        return { status: false, errors: [`Weight must be a positive number up to ${MAX_LIFT_WEIGHT} lbs.`] };
    }
    return { status: true, errors: [] };
}

export function checkLiftReps(reps: unknown): CheckResult {
    if (typeof reps !== "number" || !Number.isInteger(reps) || reps < 1 || reps > MAX_LIFT_REPS) {
        return { status: false, errors: [`Reps must be a whole number between 1 and ${MAX_LIFT_REPS}.`] };
    }
    return { status: true, errors: [] };
}

// Body weight is optional for all exercises
export function checkLiftBodyWeight(bodyWeight: unknown): CheckResult {
    if (isEmpty(bodyWeight)) {
        return { status: true, errors: [] };
    }
    if (!isPositiveNumberUpTo(bodyWeight, MAX_BODY_WEIGHT)) {
        return { status: false, errors: [`Body weight must be empty or a positive number up to ${MAX_BODY_WEIGHT} lbs.`] };
    }
    return { status: true, errors: [] };
}

// Added weight is optional, and only allowed for bodyweight exercises. 0 is treated as no added weight.
export function checkLiftAddedWeight(addedWeight: unknown, weightCoefficient: number | null): CheckResult {
    if (isEmpty(addedWeight) || addedWeight === 0) {
        return { status: true, errors: [] };
    }
    if (weightCoefficient === null) {
        return { status: false, errors: ["Added weight can't be recorded for this exercise."] };
    }
    if (!isPositiveNumberUpTo(addedWeight, MAX_LIFT_WEIGHT)) {
        return { status: false, errors: [`Added weight must be empty or a positive number up to ${MAX_LIFT_WEIGHT} lbs.`] };
    }
    return { status: true, errors: [] };
}

// Time is optional (defaults to now), may be backdated, but can't be in the future
export function checkLiftTime(time: unknown): CheckResult {
    if (isEmpty(time)) {
        return { status: true, errors: [] };
    }
    if (typeof time !== "string" || Number.isNaN(new Date(time).getTime())) {
        return { status: false, errors: ["Invalid date / time."] };
    }
    if (new Date(time).getTime() > Date.now() + FUTURE_TIME_TOLERANCE_MS) {
        return { status: false, errors: ["Date / time can't be in the future."] };
    }
    return { status: true, errors: [] };
}

// Checks all editable lift fields at once. 'errors' is used as 'details' in API error responses,
// and can be used by forms to display errors under each field.
export function checkLiftFields(input: Record<string, unknown>, weightCoefficient: number | null): { status: boolean, errors: LiftFieldErrors } {
    const weight = checkLiftWeight(input.weight, weightCoefficient);
    const reps = checkLiftReps(input.reps);
    const bodyWeight = checkLiftBodyWeight(input.bodyWeight);
    const addedWeight = checkLiftAddedWeight(input.addedWeight, weightCoefficient);
    const time = checkLiftTime(input.time);

    return {
        status: weight.status && reps.status && bodyWeight.status && addedWeight.status && time.status,
        errors: {
            weight: weight.errors,
            reps: reps.errors,
            bodyWeight: bodyWeight.errors,
            addedWeight: addedWeight.errors,
            time: time.errors,
        },
    };
}

// Normalized lift fields, ready for weight calculation & storage
export type NormalizedLiftFields = {
    weight: number | null,      // Entered weight (traditional exercises only)
    reps: number,
    bodyWeight: number | null,
    addedWeight: number | null,
    time: Date,
};

// Normalizes editable lift fields. Only call after 'checkLiftFields' has passed.
export function normalizeLiftFields(input: LiftFields, weightCoefficient: number | null): NormalizedLiftFields {
    const traditional = weightCoefficient === null;
    return {
        weight: (traditional && typeof input.weight === "number") ? roundWeight(input.weight) : null,
        reps: input.reps,
        bodyWeight: typeof input.bodyWeight === "number" ? roundWeight(input.bodyWeight) : null,
        addedWeight: (!traditional && typeof input.addedWeight === "number" && input.addedWeight > 0) ? roundWeight(input.addedWeight) : null,
        time: typeof input.time === "string" ? new Date(input.time) : new Date(),
    };
}

// Calculates the weight used for 1RM calculations (stored as the lift's 'weight'):
// - Traditional: the entered weight.
// - Bodyweight / weighted bodyweight: 'getEquivalentWeight' (bodyWeight + addedWeight / k).
//   If this can't be calculated (e.g. no body weight & no calculable added weight), the user's saved
//   account body weight ('fallbackBodyWeight') is used in place of the lift's body weight.
//   The lift's own 'bodyWeight' is not changed by this fallback.
// Returns undefined if no weight can be calculated. Result must still be checked with 'checkCalculatedWeight'.
export function calculateLiftWeight(
    weightCoefficient: number | null,
    fields: { weight: number | null, bodyWeight: number | null, addedWeight: number | null },
    fallbackBodyWeight: number | null,
): number | undefined {
    if (weightCoefficient === null) {
        return fields.weight ?? undefined;
    }

    let equivalent = getEquivalentWeight(fields.bodyWeight, fields.addedWeight, weightCoefficient);
    if (equivalent === undefined && fallbackBodyWeight !== null && fallbackBodyWeight > 0) {
        equivalent = getEquivalentWeight(fallbackBodyWeight, fields.addedWeight, weightCoefficient);
    }

    return equivalent !== undefined ? roundWeight(equivalent) : undefined;
}

// Checks the calculated weight. Errors are reported under 'bodyWeight' for bodyweight exercises,
// since a missing body weight is the usual cause.
export function checkCalculatedWeight(weight: number | undefined, weightCoefficient: number | null): { status: boolean, errors: Partial<LiftFieldErrors> } {
    const field = weightCoefficient === null ? "weight" : "bodyWeight";

    if (weight === undefined || !(weight > 0)) {
        return {
            status: false,
            errors: {
                [field]: [weightCoefficient === null
                    ? "Weight must be a positive number."
                    : "Enter your body weight for this lift, or set one on your account page."],
            },
        };
    }
    if (weight > MAX_LIFT_WEIGHT) {
        return { status: false, errors: { [field]: [`Total weight must be at most ${MAX_LIFT_WEIGHT} lbs.`] } };
    }
    return { status: true, errors: {} };
}

// Estimated 1RM stored with each lift, always using the "Recommended" formula
export function calculateLiftOneRepMax(weight: number, reps: number): number {
    return roundWeight(getOneRepMax(weight, reps, "Recommended") ?? weight);
}