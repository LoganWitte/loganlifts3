// This file contains functions dedicated to verifying the validity of user credentials
// such as username, email, and password. These functions are used to ensure that the 
// credentials meet certain criteria before they are accepted for user registration.
// Each function will accept the credential as a string and return an object containing a boolean
// indicating whether the credential is valid and an array of messages detailing any validation errors.

import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';

import {
    MIN_USERNAME_LENGTH, MAX_USERNAME_LENGTH, MIN_EMAIL_LENGTH, MAX_EMAIL_LENGTH,
    MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH, MAX_BIO_LENGTH, MAX_BIO_LINES
} from './constants'

export type CheckResponse = {
    status: boolean,
    errors: string[],
}

export const checkUsername = (username: string): CheckResponse => {

    username = username.trim();
    const errors: string[] = [];

    if (username.length === 0) {
        const response: CheckResponse = {
            status: false,
            errors: ["Username missing."]
        }
        return response;
    }

    // Username must be between 1 and 20 characters long
    if (username.length < MIN_USERNAME_LENGTH) {
        errors.push(`Username must be at least ${MIN_USERNAME_LENGTH} characters long.`);
    }
    else if (username.length > MAX_USERNAME_LENGTH) {
        errors.push(`Username must be no more than ${MAX_USERNAME_LENGTH} characters long.`);
    }

    if (!/^[a-zA-Z0-9-]+$/.test(username)) {
        errors.push("Username can only contain letters, numbers, and hyphens.");
    }
    if (username.startsWith("-") || username.endsWith("-")) {
        errors.push("Username must not start or end with a hyphen.");
    }
    if (/--/.test(username)) {
        errors.push("Username must not contain consecutive hyphens.");
    }

    // Tests name for profanity using 'obscenity' package
    const matcher = new RegExpMatcher({
        ...englishDataset.build(),
        ...englishRecommendedTransformers,
    });
    const matches = matcher.hasMatch(username);
    if (matches) {
        errors.push("Username must not contain profanity.");
    }

    const response: CheckResponse = {
        status: errors.length === 0,
        errors: errors,
    };

    return response;
}

// Normalizes a bio before it is checked, counted, or saved:
// - Converts Windows / old Mac line endings to '\n'
// - Removes trailing spaces & tabs from each line
// - Collapses 3+ line breaks in a row into 2 (at most one blank line between paragraphs)
// - Trims leading & trailing whitespace
// An empty result means the bio should be removed.
export const normalizeBio = (bio: string): string => {
    return bio
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t]+$/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

// Control characters other than tab & line feed
const BIO_CONTROL_CHARACTERS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/;
// Invisible & text-direction characters (zero-width spaces / joiners, direction marks & overrides, word joiners, BOM, soft hyphen)
const BIO_INVISIBLE_CHARACTERS = /[­​-‏‪-‮⁠-⁤⁦-⁯﻿]/;

// Checks a bio after normalizing it with 'normalizeBio'. An empty bio is valid (it removes the bio).
// Bios are only ever displayed as plain text.
export const checkBio = (bio: string): CheckResponse => {

    bio = normalizeBio(bio);
    const errors: string[] = [];

    if (bio.length === 0) {
        const response: CheckResponse = {
            status: true,
            errors: []
        }
        return response;
    }

    if (bio.length > MAX_BIO_LENGTH) {
        errors.push(`Bio must be no more than ${MAX_BIO_LENGTH} characters long.`);
    }

    if (bio.split("\n").length > MAX_BIO_LINES) {
        errors.push(`Bio must be no more than ${MAX_BIO_LINES} lines long.`);
    }

    if (BIO_CONTROL_CHARACTERS.test(bio)) {
        errors.push("Bio must not contain control characters.");
    }

    if (BIO_INVISIBLE_CHARACTERS.test(bio)) {
        errors.push("Bio must not contain invisible or text-direction characters.");
    }

    // Tests bio for profanity using 'obscenity' package, matching 'checkUsername'
    const matcher = new RegExpMatcher({
        ...englishDataset.build(),
        ...englishRecommendedTransformers,
    });
    const matches = matcher.hasMatch(bio);
    if (matches) {
        errors.push("Bio must not contain profanity.");
    }

    const response: CheckResponse = {
        status: errors.length === 0,
        errors: errors,
    };

    return response;
}

export const checkEmail = (email: string): CheckResponse => {

    email = email.toLowerCase().trim();
    const errors: string[] = [];

    if (email.length === 0) {
        const response: CheckResponse = {
            status: false,
            errors: ["Email missing."]
        }
        return response;
    }

    // Email must be between 5 and 254 characters long
    if (email.length < MIN_EMAIL_LENGTH) {
        errors.push(`Email must be at least ${MIN_EMAIL_LENGTH} characters long.`);
    }
    else if (email.length > MAX_EMAIL_LENGTH) {
        errors.push(`Email must be no more than ${MAX_EMAIL_LENGTH} characters long.`);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push("Email must be valid.");
    }

    const response: CheckResponse = {
        status: errors.length === 0,
        errors: errors,
    };

    return response;
}

export const checkPassword = (password: string): CheckResponse => {

    const errors: string[] = [];

    if (password.length === 0) {
        const response: CheckResponse = {
            status: false,
            errors: ["Password missing."]
        }
        return response;
    }

    // Password must be between 8 and 100 characters long
    if (password.length < MIN_PASSWORD_LENGTH) {
        errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
    }
    else if (password.length > MAX_PASSWORD_LENGTH) {
        errors.push(`Password must be no more than ${MAX_PASSWORD_LENGTH} characters long.`);
    }

    if (!/[a-z]/.test(password)) {
        errors.push("Password must contain at least one lowercase letter.");
    }
    if (!/[A-Z]/.test(password)) {
        errors.push("Password must contain at least one uppercase letter.");
    }
    if (!/\d/.test(password)) {
        errors.push("Password must contain at least one digit.");
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
        errors.push("Password must contain at least one special (non-alphanumeric) character.");
    }

    const response: CheckResponse = {
        status: errors.length === 0,
        errors: errors,
    };

    return response;
}