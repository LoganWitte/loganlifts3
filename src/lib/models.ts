// This file is to contain the types & related information for the models related to lifts, exercises, and more.
// These models must be synchronous with the content found in 'schema.prisma'.
// Note that the types represent what is returned from a 'fetch' call client-side, not exactly what is contained in the database for each model.
// Notably, this includes DateTime objects, which are first returned as 'Date' from the 'prisma.find...*' call (in server-side API calls).
// Then, after the 'fetch' call they are converted to string objects, as represented here.

// Supported categories of exercises
export type Category = "Barbell" | "Bodyweight" | "Dumbbell" | "Machine" | "Cable" | "Kettlebell";
// Used in form inputs for searching for exercise based on exercise type / category
export const CATEGORY_OPTIONS = ["Any Category", "Barbell", "Bodyweight", "Dumbbell", "Machine", "Cable", "Kettlebell"];

// Supported muscles that an exercise can be recorded to engage
// "Whole Body" means that every listed body part is engaged
// NOTE: "Whole Body" must be referenced as "Whole_Body" when interacting with Prisma, as Prisma enums do not support multi-word identifiers
// However, as seen in schema.prisma, it uses "@map("Whole Body")", meaning it will be returned as "Whole Body" from "prisma.find...*" searches
// This also applies to "Upper Back" and "Lower Back"
export type bodyPart = "Whole Body" | "Chest" | "Upper Back" | "Lower Back" |
    "Shoulders" | "Biceps" | "Triceps" | "Forearms" |
    "Quads" | "Hamstrings" | "Calves" | "Glutes" |
    "Abductors" | "Adductors" | "Core";
// Used in form inputs for searching for exercise based on muscle used
export const BODY_PART_OPTIONS = ["Any Body Part", "Whole Body", "Chest", "Upper Back", "Lower Back",
    "Shoulders", "Biceps", "Triceps", "Forearms", "Quads", "Hamstrings", "Calves",
    "Glutes", "Abductors", "Adductors", "Core"];

// An "Exercise" is a unique setup / variation of a setup which trains 
// certain muscles and has a trackable amount of weight & reps able to be completed
export type Exercise = {
    id: string,                 // String @id @default(cuid())
    // userId & User relation are optional, allowing for global exercises.
    // Cleared when an exercise is approved, making it global.
    userId: string | null,      // String? - User? @relation(fields: [userId], references: [id], onDelete: Cascade)
    name: string,               // String
    description: string | null, // String | null
    URLSlug: string,            // String
    bodyParts: bodyPart[],      // BodyPart[]
    category: Category,         // Category
    tags: string[],             // String[]
    // Represents the coefficient for added weight to be used in calculations for 1RM
    // null in the case of traditional exercises (barbell, dumbbell, etc.)
    // 0 in the case of non-calculable loads on exercises like crunches
    // number > 0 in the case of calculable loads like pull-ups or push-ups
    // Reference schema.prisma for examples
    weightCoefficient: number | null, // Float > 0 | null
    // Set to false when an exercise is approved or rejected.
    // Cannot be true whilst isApproved or isRejected are true.
    isSuggested: boolean,       // Boolean @default(false)
    isApproved: boolean,        // Boolean @default(false)
    isRejected: boolean,        // Boolean @default(false)
    createdAt: string,          // DateTime @default(now())
    updatedAt: string,          // DateTime @updatedAt
};

// The user-editable fields of an "Exercise", as sent to '/api/exercises/create' and '/api/exercises/update'.
// Validated & normalized using 'lib/exerciseChecks.ts'.
export type ExerciseFields = Pick<Exercise, "name" | "description" | "bodyParts" | "category" | "tags" | "weightCoefficient">;

// Request body for '/api/exercises/create'
// 'isApproved' may only be true for admins, which creates the exercise as global & approved immediately (no owned copy).
export type CreateExerciseRequest = ExerciseFields & {
    isSuggested?: boolean,
    isApproved?: boolean,
};

// Request body for '/api/exercises/update'
// Contains the complete editable exercise, overwriting all editable fields. Omitted flags keep their current values.
// 'isSuggested' may only be changed by the exercise's owner. 'isApproved' & 'isRejected' may only be changed by admins.
export type UpdateExerciseRequest = ExerciseFields & {
    id: string,
    isSuggested?: boolean,
    isApproved?: boolean,
    isRejected?: boolean,
};

// Request body for '/api/exercises/delete'
export type DeleteExerciseRequest = {
    id: string,
};

// An "Exercise" as returned by '/api/exercises/getsuggested' (admin only).
// 'suggestedBy' is the owner of suggested & rejected exercises.
// 'suggestedBy' is null for global exercises (approved or un-approved), as they no longer have an owner.
export type SuggestedExercise = Exercise & {
    suggestedBy: { name: string | null, email: string | null } | null,
};

// A "Lift" is a single set of a given exercise, for example a set of 8 reps with 135lbs on bench press.
export type Lift = {
    id: string,                 // String @id @default(cuid())
    userId: string,             // String - User @relation(fields: [userId], references: [id], onDelete: Cascade)
    exerciseId: string,         // String - Exercise @relation(fields: [exerciseId], references: [id], onDelete: Cascade)
    // All weights are stored in pounds.
    // For traditional exercises, the weight entered by the user.
    // For bodyweight exercises, the equivalent weight calculated server-side using 'calculateLiftWeight' (lib/liftChecks.ts).
    weight: number,             // Float > 0
    reps: number,               // Int > 0
    // Calculated server-side using the "Recommended" formula. Other formulas may be used client-side (e.g. rep table).
    oneRepMax: number,          // Float > 0
    // bodyWeight is always available to be recorded.
    // It will default to the user's recorded bodyWeight value.
    // This value can be set in '/account'.
    // This value will also be updated at log-time if the lift being logged happened after the 
    // user's body weight was last set (User 'bodyWeightUpdatedAt'), and the user has 'bodyWeightAutoUpdate' on.
    bodyWeight: number | null,  // Float > 0 | null
    addedWeight: number | null  // Float > 0 | null
    time: string,               // DateTime - when the lift is logged
    createdAt: string,          // DateTime @default(now())
    updatedAt: string,          // DateTime @updatedAt
};

// The user-editable fields of a "Lift", as sent to '/api/lifts/create' and '/api/lifts/update'.
// Validated & normalized using 'lib/liftChecks.ts'.
// - weight: only used for traditional exercises (weightCoefficient === null), ignored otherwise.
// - addedWeight: only allowed for bodyweight exercises (weightCoefficient !== null). 0 is treated as null.
// - time: ISO date string. Omit to use the current time.
export type LiftFields = {
    weight?: number | null,
    reps: number,
    bodyWeight?: number | null,
    addedWeight?: number | null,
    time?: string | null,
};

// Request body for '/api/lifts/create'
export type CreateLiftRequest = LiftFields & {
    exerciseId: string,
};

// Request body for '/api/lifts/update'
// Contains the complete editable lift, overwriting all editable fields. A lift's exercise cannot be changed.
export type UpdateLiftRequest = LiftFields & {
    id: string,
};

// Request body for '/api/lifts/delete'
export type DeleteLiftRequest = {
    id: string,
};

// Response from '/api/lifts/create' and '/api/lifts/update'
// 'bodyWeightUpdated' is true if the user's account body weight was auto-updated (client should refresh its session).
export type LiftResponse = {
    ok: true,
    lift: Lift,
    bodyWeightUpdated: boolean,
};

// A user's privacy settings, as stored on the 'User' model & sent to / returned by '/api/account/privacy'.
// A private profile (profilePublic = false) hides everything, including the username.
// The other flags keep their values while the profile is private, and only apply once it is public.
export type PrivacySettings = {
    profilePublic: boolean,       // Boolean @default(false)
    profilePhotoPublic: boolean,  // Boolean @default(true)
    bioPublic: boolean,           // Boolean @default(true)
    bodyWeightPublic: boolean,    // Boolean @default(false)
    liftsPublic: boolean,         // Boolean @default(false)
};
export const PRIVACY_SETTING_KEYS = ["profilePublic", "profilePhotoPublic", "bioPublic", "bodyWeightPublic", "liftsPublic"] as const;

// Request body for '/api/account/privacy'. Any subset of the flags; omitted flags keep their current values.
export type UpdatePrivacyRequest = Partial<PrivacySettings>;

// One user as returned by '/api/users/get'. Fields are null when private or unset.
// Built only by 'toPublicProfileSummary' (lib/profileServer.ts), which applies every privacy rule.
export type PublicProfileSummary = {
    id: string,
    name: string,
    createdAt: string,          // "Account age": displayed as "Member since <date>"
    image: string | null,
    bio: string | null,
    bodyWeight: number | null,  // pounds
    liftCount: number | null,   // null when lifts are private; counts lifts on approved global exercises only
};

// A lift as shown on a public profile. Never includes 'userId' or 'exerciseId'.
// Only lifts on approved global exercises are shown, so custom exercise names stay private.
export type PublicLift = {
    id: string,
    reps: number,
    time: string,
    weight: number | null,      // null for bodyweight exercises when body weight is private
    oneRepMax: number | null,   // null for bodyweight exercises when body weight is private
    bodyWeight: number | null,  // null when body weight is private
    addedWeight: number | null,
    exercise: { name: string, URLSlug: string, category: Category, weightCoefficient: number | null },
};

// A single profile as returned by '/api/users/[id]'.
// The owner may view their own profile while it is private. They see exactly what others would see once it is public.
export type PublicProfile = Omit<PublicProfileSummary, "name"> & {
    name: string | null,        // Only null when the owner views their own profile without a username
    lifts: PublicLift[] | null, // Newest first. null when lifts are private
    isOwnProfile: boolean,
    profilePublic: boolean,     // Always true unless 'isOwnProfile'
};
