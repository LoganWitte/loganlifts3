// Server-only helpers shared by the '/api/exercises/*' routes.
// Uses Prisma, so this must never be imported into client components (use 'lib/exerciseChecks.ts' there instead).

import { prisma } from '@/lib/prisma';
import { BodyPart as PrismaBodyPart, Category as PrismaCategory } from '@/generated/prisma/client';
import type { bodyPart, ExerciseFields } from '@/lib/models';

// Prisma enums don't support multi-word identifiers, so "Whole Body" is "Whole_Body" within Prisma calls
export function toPrismaBodyParts(bodyParts: bodyPart[]): PrismaBodyPart[] {
    return bodyParts.map((part) => (part === "Whole Body" ? "Whole_Body" : part) as PrismaBodyPart);
}

// Converts normalized editable fields into Prisma-compatible data
export function toPrismaExerciseData(fields: ExerciseFields) {
    return {
        name: fields.name,
        description: fields.description,
        bodyParts: toPrismaBodyParts(fields.bodyParts),
        category: fields.category as PrismaCategory,
        tags: fields.tags,
        weightCoefficient: fields.weightCoefficient,
    };
}

// Converts an exercise returned from Prisma into the shape of 'Exercise' in models.ts
// Handles "Whole_Body" -> "Whole Body", whether or not Prisma has already applied the @map
export function serializeExercise<T extends { bodyParts: string[] }>(exercise: T) {
    return {
        ...exercise,
        bodyParts: exercise.bodyParts.map((part) => (part === "Whole_Body" ? "Whole Body" : part)) as bodyPart[],
    };
}

// Whether a request body flag is either omitted or a boolean
export function isOptionalBoolean(value: unknown): boolean {
    return value === undefined || typeof value === "boolean";
}

// Whether the given user already owns an exercise with this URLSlug (optionally excluding one exercise, for updates)
export async function isUserSlugTaken(userId: string, slug: string, excludeId?: string): Promise<boolean> {
    const existing = await prisma.exercise.findFirst({
        where: {
            userId,
            URLSlug: slug,
            ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
    });
    return existing !== null;
}

// Whether an approved global exercise already has this URLSlug (optionally excluding one exercise, for updates)
export async function isApprovedGlobalSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const existing = await prisma.exercise.findFirst({
        where: {
            userId: null,
            isApproved: true,
            URLSlug: slug,
            ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
    });
    return existing !== null;
}