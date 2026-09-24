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
export type bodyPart = "Whole Body" | "Chest" | "Back" |
    "Shoulders" | "Biceps" | "Triceps" | "Forearms" |
    "Quads" | "Hamstrings" | "Calves" | "Glutes" |
    "Abductors" | "Adductors" | "Core";
// Used in form inputs for searching for exercise based on muscle used
export const BODY_PART_OPTIONS = ["Any Body Part", "Whole Body", "Chest", "Back",
    "Shoulders", "Biceps", "Triceps", "Forearms", "Quads", "Hamstrings", "Calves",
    "Glutes", "Abductors", "Adductors", "Core"];

// An "Exercise" is a unique setup / variation of a setup which trains 
// certain muscles and has a trackable amount of weight & reps able to be completed
export type Exercise = {
    id: string,                 // String @id @default(cuid())
    // userId & User relation are optional, allowing for global exercises.
    userId: string | null,      // String? - User? @relation(fields: [userId], references: [id], onDelete: Cascade)
    name: string,               // String
    description: string | null, // String | null
    URLSlug: string,            // String @unique
    bodyParts: bodyPart[],      // BodyPart[]
    category: Category,         // Category
    tags: string[],             // String[]
    // Represents the coefficient for added weight to be used in calculations for 1RM
    // null in the case of traditional exercises (barbell, dumbbell, etc.)
    // 0 in the case of non-calculable loads on exercises like crunches
    // number > 0 in the case of calculable loads like pull-ups or push-ups
    // Reference schema.prisma for examples
    weightCoefficient: number | null, // Float > 0 | null
    isApproved: boolean         // Boolean @default(false)
    createdAt: string,          // DateTime @default(now())
    updatedAt: string,          // DateTime @updatedAt
};

// A "Lift" is a single set of a given exercise, for example a set of 8 reps with 135lbs on bench press.
export type Lift = {
    id: string,                 // String @id @default(cuid())
    userId: string,             // String - User @relation(fields: [userId], references: [id], onDelete: Cascade)
    exerciseId: string,         // String - Exercise @relation(fields: [exerciseId], references: [id], onDelete: Cascade)
    weight: number,             // Float > 0
    reps: number,               // Int > 0
    oneRepMax: number,          // Float > 0
    // bodyWeight is always available to be recorded.
    // It will default to the user's recorded bodyWeight value.
    // This value can be set in '/account'.
    // This value will also be updated at log-time if the lift being logged happened after the 
    bodyWeight: number | null,  // Float > 0 | null
    addedWeight: number | null  // Float > 0 | null
    time: string,               // DateTime - when the lift is logged
    createdAt: string,          // DateTime @default(now())
    updatedAt: string,          // DateTime @updatedAt
};