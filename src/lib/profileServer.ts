// Server-only helpers shared by the '/api/users/*' routes, which return other users' public profiles.
// Uses Prisma types, so this must never be imported into client components.
// Every privacy rule is applied here, so the routes can't drift apart. Never return a user object that
// hasn't been through these functions, and never widen the selects below to include private fields
// (email, password, token fields, isAdmin, emailVerified, bodyWeightAutoUpdate, bodyWeightUpdatedAt, lift userId).

import type { Prisma } from '@/generated/prisma/client';
import type { PublicLift, PublicProfile, PublicProfileSummary } from '@/lib/models';

// Lifts shown on (and counted for) public profiles: only lifts on approved global exercises.
// This also keeps the names of users' custom exercises private.
export const PUBLIC_LIFT_WHERE = {
    exercise: { userId: null, isApproved: true },
} satisfies Prisma.LiftWhereInput;

// The only user fields ever read for a public profile
export const PUBLIC_USER_SELECT = {
    id: true,
    name: true,
    createdAt: true,
    image: true,
    bio: true,
    bodyWeight: true,
    profilePublic: true,
    profilePhotoPublic: true,
    bioPublic: true,
    bodyWeightPublic: true,
    liftsPublic: true,
    _count: { select: { lifts: { where: PUBLIC_LIFT_WHERE } } },
} satisfies Prisma.UserSelect;

// The only lift fields ever read for a public profile
export const PUBLIC_LIFT_SELECT = {
    id: true,
    reps: true,
    time: true,
    weight: true,
    oneRepMax: true,
    bodyWeight: true,
    addedWeight: true,
    exercise: { select: { name: true, URLSlug: true, category: true, weightCoefficient: true } },
} satisfies Prisma.LiftSelect;

export type PublicUserRow = Prisma.UserGetPayload<{ select: typeof PUBLIC_USER_SELECT }>;
export type PublicLiftRow = Prisma.LiftGetPayload<{ select: typeof PUBLIC_LIFT_SELECT }>;

// Whether the viewer may see this profile at all. A private profile, or one without a username (which can't be
// made public), is only visible to its owner. Callers must return the same 404 as for a nonexistent user otherwise.
export function canViewProfile(user: { id: string, name: string | null, profilePublic: boolean }, viewerId: string | null): boolean {
    if (viewerId !== null && user.id === viewerId) return true;
    return user.profilePublic && user.name !== null;
}

// Applies the sub-flags to a user's profile fields. Assumes 'canViewProfile' has already passed.
// The sub-flags are applied as if the profile were public, so owners previewing a private profile see what others would.
export function toPublicProfileSummary(user: PublicUserRow): Omit<PublicProfileSummary, "name"> & { name: string | null } {
    return {
        id: user.id,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
        image: user.profilePhotoPublic ? user.image : null,
        bio: user.bioPublic ? user.bio : null,
        bodyWeight: user.bodyWeightPublic ? user.bodyWeight : null,
        liftCount: user.liftsPublic ? user._count.lifts : null,
    };
}

// Converts a lift for display on a public profile.
// For bodyweight exercises (weightCoefficient !== null) the stored 'weight' is calculated from the lifter's body weight
// (and for a coefficient of 0, it IS their body weight), so 'weight' & 'oneRepMax' would leak a private body weight.
// When body weight is private, those are hidden too, leaving reps & added weight.
export function toPublicLift(lift: PublicLiftRow, bodyWeightPublic: boolean): PublicLift {
    const hideWeight = !bodyWeightPublic && lift.exercise.weightCoefficient !== null;
    return {
        id: lift.id,
        reps: lift.reps,
        time: lift.time.toISOString(),
        weight: hideWeight ? null : lift.weight,
        oneRepMax: hideWeight ? null : lift.oneRepMax,
        bodyWeight: bodyWeightPublic ? lift.bodyWeight : null,
        addedWeight: lift.addedWeight,
        exercise: {
            name: lift.exercise.name,
            URLSlug: lift.exercise.URLSlug,
            category: lift.exercise.category,
            weightCoefficient: lift.exercise.weightCoefficient,
        },
    };
}

// Builds the full profile for '/api/users/[id]'. Assumes 'canViewProfile' has already passed.
// 'lifts' should only be fetched when 'user.liftsPublic' is true. They are ignored otherwise.
export function toPublicProfile(user: PublicUserRow, lifts: PublicLiftRow[], viewerId: string | null): PublicProfile {
    const isOwnProfile = viewerId !== null && user.id === viewerId;
    return {
        ...toPublicProfileSummary(user),
        lifts: user.liftsPublic ? lifts.map((lift) => toPublicLift(lift, user.bodyWeightPublic)) : null,
        isOwnProfile,
        // Others can only ever see public profiles
        profilePublic: isOwnProfile ? user.profilePublic : true,
    };
}
