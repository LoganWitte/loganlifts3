export const MIN_USERNAME_LENGTH = 1;
export const MAX_USERNAME_LENGTH = 20;
export const MIN_EMAIL_LENGTH = 5; // a@b.c
export const MAX_EMAIL_LENGTH = 254; // RFC 5321 limit
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 100;
export const RESEND_COOLDOWN_MS = 60 * 1000; // 1m / 60s

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