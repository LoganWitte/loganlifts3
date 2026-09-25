export const MIN_USERNAME_LENGTH = 1;
export const MAX_USERNAME_LENGTH = 20;
export const MIN_EMAIL_LENGTH = 5; // a@b.c
export const MAX_EMAIL_LENGTH = 254; // RFC 5321 limit
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 100;
export const RESEND_COOLDOWN_MS = 60 * 1000; // 1m / 60s
export const MIN_EXERCISE_NAME_LENGTH = 1;
export const MAX_EXERCISE_NAME_LENGTH = 50;
export const MAX_EXERCISE_DESCRIPTION_LENGTH = 500;
export const MAX_EXERCISE_TAG_LENGTH = 30;
export const MAX_EXERCISE_TAG_COUNT = 10;
export const MAX_BODY_WEIGHT = 1500; // lbs, sanity cap for body weight input

//Converts a string to a URL-friendly slug
export function convertToSlug(input: string): string {
    return input
        .toLowerCase()
        .trim()
        .replace(/[\s\_]+/g, "-")        // Replace spaces/underscores with hyphen
        .replace(/[^a-z0-9\-]+/g, "")    // Remove all non-alphanumeric except hyphen
        .replace(/\-+/g, "-")            // Collapse multiple hyphens
        .replace(/^\-+|\-+$/g, "");      // Trim hyphens from start/end
}