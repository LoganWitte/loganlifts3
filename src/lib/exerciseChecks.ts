// Shared (client & server) validation and normalization for exercise fields.
// Used by the '/api/exercises/*' routes and by exercise forms on the frontend.
// Must not import anything server-only (e.g. Prisma), so it can be used in client components.

import {
    MIN_EXERCISE_NAME_LENGTH,
    MAX_EXERCISE_NAME_LENGTH,
    MAX_EXERCISE_DESCRIPTION_LENGTH,
    MAX_EXERCISE_TAG_LENGTH,
    MAX_EXERCISE_TAG_COUNT,
    convertToSlug,
} from '@/lib/constants';
import { BODY_PART_OPTIONS, CATEGORY_OPTIONS, type bodyPart, type Category, type ExerciseFields } from '@/lib/models';

type CheckResult = { status: boolean, errors: string[] };

export type ExerciseFieldErrors = {
    name: string[],
    description: string[],
    bodyParts: string[],
    category: string[],
    tags: string[],
    weightCoefficient: string[],
};

// Valid values, excluding the "Any ..." options used for searching
export const VALID_BODY_PARTS = BODY_PART_OPTIONS.filter((option) => option !== "Any Body Part") as bodyPart[];
export const VALID_CATEGORIES = CATEGORY_OPTIONS.filter((option) => option !== "Any Category") as Category[];

// Global URLSlugs which would conflict with existing pages under '/exercises' (e.g. '/exercises/add')
// Add to this list when creating new static pages under '/exercises'
export const RESERVED_EXERCISE_SLUGS = ["add"];

// URLSlug for global (approved) exercises
export function getGlobalExerciseSlug(name: string): string {
    return convertToSlug(name);
}

// URLSlug for user-owned exercises
export function getUserExerciseSlug(name: string): string {
    return `user-created-${convertToSlug(name)}`;
}

export function checkExerciseName(name: unknown): CheckResult {
    if (typeof name !== "string") {
        return { status: false, errors: ["Name is required."] };
    }

    const errors: string[] = [];
    const trimmed = name.trim();

    if (trimmed.length < MIN_EXERCISE_NAME_LENGTH || trimmed.length > MAX_EXERCISE_NAME_LENGTH) {
        errors.push(`Name must be between ${MIN_EXERCISE_NAME_LENGTH} and ${MAX_EXERCISE_NAME_LENGTH} characters.`);
    }
    // Names such as "!!!" would generate an empty URLSlug
    else if (convertToSlug(trimmed).length === 0) {
        errors.push("Name must contain at least one letter or number.");
    }
    // Checked for all exercises, since user-owned exercises may later be approved and use the global URLSlug
    else if (RESERVED_EXERCISE_SLUGS.includes(convertToSlug(trimmed))) {
        errors.push(`"${trimmed}" is a reserved name. Please choose a different name.`);
    }

    return { status: errors.length === 0, errors };
}

// Description is optional (null, undefined, or empty string are all accepted as no description)
export function checkExerciseDescription(description: unknown): CheckResult {
    if (description === null || description === undefined) {
        return { status: true, errors: [] };
    }
    if (typeof description !== "string") {
        return { status: false, errors: ["Description must be text."] };
    }

    const errors: string[] = [];

    if (description.trim().length > MAX_EXERCISE_DESCRIPTION_LENGTH) {
        errors.push(`Description must be at most ${MAX_EXERCISE_DESCRIPTION_LENGTH} characters.`);
    }

    return { status: errors.length === 0, errors };
}

// Body parts are optional, but each must be valid. "Whole Body" may be combined with other body parts.
export function checkExerciseBodyParts(bodyParts: unknown): CheckResult {
    if (!Array.isArray(bodyParts)) {
        return { status: false, errors: ["Body parts must be a list."] };
    }

    const errors: string[] = [];
    const invalid = bodyParts.filter((part) => !VALID_BODY_PARTS.includes(part as bodyPart));

    if (invalid.length > 0) {
        errors.push(`Invalid body part(s): ${invalid.join(", ")}.`);
    }

    return { status: errors.length === 0, errors };
}

// Category is required
export function checkExerciseCategory(category: unknown): CheckResult {
    if (typeof category !== "string" || category.length === 0) {
        return { status: false, errors: ["Category is required."] };
    }
    if (!VALID_CATEGORIES.includes(category as Category)) {
        return { status: false, errors: [`Invalid category: ${category}.`] };
    }
    return { status: true, errors: [] };
}

// Trims, lowercases, removes empty tags, and removes duplicates
export function normalizeExerciseTags(tags: string[]): string[] {
    const normalized = tags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0);
    return Array.from(new Set(normalized));
}

// Tag limits are checked after normalization
export function checkExerciseTags(tags: unknown): CheckResult {
    if (!Array.isArray(tags)) {
        return { status: false, errors: ["Tags must be a list."] };
    }
    if (tags.some((tag) => typeof tag !== "string")) {
        return { status: false, errors: ["Tags must be text."] };
    }

    const errors: string[] = [];
    const normalized = normalizeExerciseTags(tags as string[]);

    if (normalized.length > MAX_EXERCISE_TAG_COUNT) {
        errors.push(`At most ${MAX_EXERCISE_TAG_COUNT} tags are allowed.`);
    }

    const tooLong = normalized.filter((tag) => tag.length > MAX_EXERCISE_TAG_LENGTH);
    if (tooLong.length > 0) {
        errors.push(`Tags must be at most ${MAX_EXERCISE_TAG_LENGTH} characters: ${tooLong.join(", ")}.`);
    }

    return { status: errors.length === 0, errors };
}

// null (traditional exercise), 0 (non-calculable load), or > 0 (calculable load). No upper bound.
export function checkExerciseWeightCoefficient(weightCoefficient: unknown): CheckResult {
    if (weightCoefficient === null || weightCoefficient === undefined) {
        return { status: true, errors: [] };
    }
    if (typeof weightCoefficient !== "number" || !Number.isFinite(weightCoefficient) || weightCoefficient < 0) {
        return { status: false, errors: ["Weight coefficient must be empty, 0, or a positive number."] };
    }
    return { status: true, errors: [] };
}

// Checks all editable exercise fields at once. 'errors' is used as 'details' in API error responses,
// and can be used by forms to display errors under each field.
export function checkExerciseFields(input: Record<string, unknown>): { status: boolean, errors: ExerciseFieldErrors } {
    const name = checkExerciseName(input.name);
    const description = checkExerciseDescription(input.description);
    const bodyParts = checkExerciseBodyParts(input.bodyParts);
    const category = checkExerciseCategory(input.category);
    const tags = checkExerciseTags(input.tags);
    const weightCoefficient = checkExerciseWeightCoefficient(input.weightCoefficient);

    return {
        status: name.status && description.status && bodyParts.status && category.status && tags.status && weightCoefficient.status,
        errors: {
            name: name.errors,
            description: description.errors,
            bodyParts: bodyParts.errors,
            category: category.errors,
            tags: tags.errors,
            weightCoefficient: weightCoefficient.errors,
        },
    };
}

// Normalizes editable exercise fields. Only call after 'checkExerciseFields' has passed.
// Picks only editable fields, so any extra properties on 'input' are dropped.
export function normalizeExerciseFields(input: ExerciseFields): ExerciseFields {
    const description = typeof input.description === "string" ? input.description.trim() : "";

    return {
        name: input.name.trim(),
        description: description.length > 0 ? description : null,
        bodyParts: Array.from(new Set(input.bodyParts)),
        category: input.category,
        tags: normalizeExerciseTags(input.tags),
        weightCoefficient: input.weightCoefficient ?? null,
    };
}