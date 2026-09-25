'use client'

import { useState } from 'react';
import { X } from 'lucide-react';
import { MAX_EXERCISE_NAME_LENGTH, MAX_EXERCISE_DESCRIPTION_LENGTH, MAX_EXERCISE_TAG_LENGTH, MAX_EXERCISE_TAG_COUNT } from '@/lib/constants';
import { VALID_BODY_PARTS, VALID_CATEGORIES, normalizeExerciseTags, type ExerciseFieldErrors } from '@/lib/exerciseChecks';
import type { bodyPart, Category, Exercise, ExerciseFields } from '@/lib/models';

// Shared exercise form fields, used by '/exercises/create' and later by exercise edit / admin review forms.
// This component only renders the editable fields. The parent page owns the state, the <form> element,
// any extra inputs (e.g. suggest / approve checkboxes), the submit button, and the submit handler.

// Form state for the editable exercise fields. Inputs are kept as strings where needed,
// then converted to 'ExerciseFields' using 'toExerciseFields' before validation / submission.
export type ExerciseFormValues = {
    name: string,
    description: string,
    bodyParts: bodyPart[],
    category: Category | "",
    tags: string[],
    weightCoefficient: string,
};

export const EMPTY_EXERCISE_FORM_VALUES: ExerciseFormValues = {
    name: "",
    description: "",
    bodyParts: [],
    category: "",
    tags: [],
    weightCoefficient: "",
};

export const EMPTY_EXERCISE_FIELD_ERRORS: ExerciseFieldErrors = {
    name: [],
    description: [],
    bodyParts: [],
    category: [],
    tags: [],
    weightCoefficient: [],
};

// Weight coefficient only applies to bodyweight exercises. For all other categories it is always null.
export function weightCoefficientEnabled(category: Category | ""): boolean {
    return category === "Bodyweight";
}

// Converts form state into 'ExerciseFields' for validation ('checkExerciseFields') and API requests
export function toExerciseFields(values: ExerciseFormValues): ExerciseFields {
    const coefficientInput = values.weightCoefficient.trim();
    return {
        name: values.name,
        description: values.description,
        bodyParts: values.bodyParts,
        category: values.category as Category,
        tags: values.tags,
        weightCoefficient: (weightCoefficientEnabled(values.category) && coefficientInput.length > 0) ? Number(coefficientInput) : null,
    };
}

// Converts an existing exercise into form state (for edit / admin review forms)
export function fromExercise(exercise: Exercise): ExerciseFormValues {
    return {
        name: exercise.name,
        description: exercise.description ?? "",
        bodyParts: exercise.bodyParts,
        category: exercise.category,
        tags: exercise.tags,
        weightCoefficient: exercise.weightCoefficient !== null ? String(exercise.weightCoefficient) : "",
    };
}

interface ExerciseFormProps {
    values: ExerciseFormValues;
    setValues: (values: ExerciseFormValues) => void;
    errors: ExerciseFieldErrors;
    setErrors: (errors: ExerciseFieldErrors) => void;
    // Called whenever any field changes, e.g. so the parent can clear its output message
    onChange?: () => void;
}

// Displays a list of errors under a field, matching other forms in this project
const FieldErrors = ({ errors }: { errors: string[] }) => {
    if (errors.length === 0) return null;
    return (
        <ul className="w-full flex flex-col items-start text-sm text-red-600 list-disc mt-1">
            {errors.map((error, i) => {
                return <li key={i} className="mx-7 text-left">{error}</li>
            })}
        </ul>
    );
}

const ExerciseForm = ({ values, setValues, errors, setErrors, onChange }: ExerciseFormProps) => {

    // Text currently being typed into the tag input, before it becomes a tag
    const [pendingTag, setPendingTag] = useState('');

    // Updates one field, clearing that field's errors
    function updateField<K extends keyof ExerciseFormValues>(key: K, value: ExerciseFormValues[K], extra?: Partial<ExerciseFormValues>) {
        setValues({ ...values, [key]: value, ...extra });
        setErrors({ ...errors, [key]: [] });
        onChange?.();
    }

    function toggleBodyPart(part: bodyPart) {
        const bodyParts = values.bodyParts.includes(part)
            ? values.bodyParts.filter((p) => p !== part)
            : [...values.bodyParts, part];
        updateField("bodyParts", bodyParts);
    }

    function handleCategoryChange(category: Category | "") {
        // Clears weight coefficient when switching away from a bodyweight category
        if (weightCoefficientEnabled(category)) {
            updateField("category", category);
        }
        else {
            setValues({ ...values, category: category, weightCoefficient: "" });
            setErrors({ ...errors, category: [], weightCoefficient: [] });
            onChange?.();
        }
    }

    // Adds the given raw tags (normalized, duplicates skipped), displaying an error for any that can't be added
    function addTags(rawTags: string[]) {
        setPendingTag("");

        const tags = [...values.tags];
        const tagErrors: string[] = [];

        for (const tag of normalizeExerciseTags(rawTags)) {
            if (tags.includes(tag)) continue;

            if (tag.length > MAX_EXERCISE_TAG_LENGTH) {
                tagErrors.push(`Tags must be at most ${MAX_EXERCISE_TAG_LENGTH} characters: ${tag}.`);
                continue;
            }
            if (tags.length >= MAX_EXERCISE_TAG_COUNT) {
                tagErrors.push(`At most ${MAX_EXERCISE_TAG_COUNT} tags are allowed.`);
                break;
            }

            tags.push(tag);
        }

        if (tags.length !== values.tags.length) {
            setValues({ ...values, tags });
            onChange?.();
        }
        setErrors({ ...errors, tags: tagErrors });
    }

    function removeTag(tag: string) {
        updateField("tags", values.tags.filter((t) => t !== tag));
    }

    const coefficientEnabled = weightCoefficientEnabled(values.category);

    return (
        <div className="flex flex-col w-full">

            {/* Name */}
            <label htmlFor="exercise-name" className="flex flex-row justify-center sm:text-lg mx-4 font-bold">
                Name:
            </label>

            <input
                id="exercise-name"
                type="text"
                maxLength={MAX_EXERCISE_NAME_LENGTH}
                className={`
                    flex flex-row justify-center p-2 mx-4 rounded-md border-2 mt-1
                    ${errors.name.length > 0 ? "border-red-600 text-red-600" : "border-black text-black"}
                `}
                placeholder="e.g. Incline Dumbbell Press"
                value={values.name}
                onChange={(e) => updateField("name", e.target.value)}
            />

            <FieldErrors errors={errors.name} />

            {/* Category */}
            <label htmlFor="exercise-category" className="flex flex-row justify-center sm:text-lg mx-4 mt-3 font-bold">
                Category:
            </label>

            <select
                id="exercise-category"
                className={`
                    flex flex-row justify-center p-2 mx-4 rounded-md border-2 mt-1 bg-white hover:cursor-pointer
                    ${errors.category.length > 0 ? "border-red-600 text-red-600" : "border-black text-black"}
                `}
                value={values.category}
                onChange={(e) => handleCategoryChange(e.target.value as Category | "")}
            >
                <option value="" disabled>Select a category</option>
                {VALID_CATEGORIES.map((category) => {
                    return <option key={category} value={category}>{category}</option>
                })}
            </select>

            <FieldErrors errors={errors.category} />

            {/* Body parts */}
            <div className="flex flex-row justify-center sm:text-lg mx-4 mt-3 font-bold">
                Body parts:
            </div>

            <div className={`
                grid grid-cols-2 sm:grid-cols-3 gap-1 p-2 mx-4 mt-1 rounded-md border-2 bg-white
                ${errors.bodyParts.length > 0 ? "border-red-600" : "border-black"}
            `}>
                {VALID_BODY_PARTS.map((part) => {
                    return (
                        <label key={part} className="flex flex-row items-center gap-2 text-left hover:cursor-pointer">
                            <input
                                type="checkbox"
                                className="accent-orange-500 scale-125 hover:cursor-pointer"
                                checked={values.bodyParts.includes(part)}
                                onChange={() => toggleBodyPart(part)}
                            />
                            {part}
                        </label>
                    )
                })}
            </div>

            <FieldErrors errors={errors.bodyParts} />

            {/* Tags */}
            <label htmlFor="exercise-tags" className="flex flex-row justify-center sm:text-lg mx-4 mt-3 font-bold">
                Tags:
            </label>

            <div className={`
                flex flex-row flex-wrap items-center gap-1 p-2 mx-4 mt-1 rounded-md border-2 bg-white
                ${errors.tags.length > 0 ? "border-red-600" : "border-black"}
            `}>
                {values.tags.map((tag) => {
                    return (
                        <span key={tag} className="flex flex-row items-center gap-1 pl-2 pr-1 rounded-md border border-black bg-orange-500 text-sm">
                            {tag}
                            <button
                                type="button"
                                title={`Remove tag "${tag}"`}
                                className="rounded-full hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"
                                onClick={() => removeTag(tag)}
                            >
                                <X size={14} />
                            </button>
                        </span>
                    )
                })}

                <input
                    id="exercise-tags"
                    type="text"
                    className="grow min-w-24 outline-none text-black"
                    placeholder={values.tags.length >= MAX_EXERCISE_TAG_COUNT ? "Tag limit reached" : "Type a tag, then press Enter"}
                    disabled={values.tags.length >= MAX_EXERCISE_TAG_COUNT}
                    value={pendingTag}
                    onChange={(e) => {
                        // Typing (or pasting) a comma adds everything before it as tags, keeping the rest as pending text
                        if (e.target.value.includes(",")) {
                            const parts = e.target.value.split(",");
                            const remainder = parts.pop() ?? "";
                            addTags(parts);
                            setPendingTag(remainder);
                            return;
                        }
                        setPendingTag(e.target.value);
                        setErrors({ ...errors, tags: [] });
                    }}
                    onKeyDown={(e) => {
                        // Enter adds the tag instead of submitting the form
                        if (e.key === "Enter") {
                            e.preventDefault();
                            addTags([pendingTag]);
                        }
                        // Backspace on an empty input removes the last tag
                        else if (e.key === "Backspace" && pendingTag.length === 0 && values.tags.length > 0) {
                            removeTag(values.tags[values.tags.length - 1]);
                        }
                    }}
                    // Adds any half-typed tag when leaving the input (e.g. clicking the submit button)
                    onBlur={() => {
                        if (pendingTag.trim().length > 0) addTags([pendingTag]);
                    }}
                />
            </div>

            <div className="flex flex-row justify-end text-xs mx-4 mt-1 text-stone-600">
                {values.tags.length}/{MAX_EXERCISE_TAG_COUNT} tags
            </div>

            <FieldErrors errors={errors.tags} />

            {/* Weight coefficient (bodyweight exercises only) */}
            <label htmlFor="exercise-weight-coefficient" className={`flex flex-row justify-center sm:text-lg mx-4 mt-2 font-bold ${coefficientEnabled ? "" : "text-stone-500"}`}>
                Added weight coefficient:
            </label>

            <input
                id="exercise-weight-coefficient"
                type="number"
                min={0}
                step="any"
                disabled={!coefficientEnabled}
                className={`
                    flex flex-row justify-center p-2 mx-4 rounded-md border-2 mt-1
                    ${!coefficientEnabled
                        ? "border-stone-400 bg-slate-300 text-stone-500 hover:cursor-not-allowed"
                        : errors.weightCoefficient.length > 0 ? "border-red-600 text-red-600 bg-white" : "border-black text-black bg-white"}
                `}
                placeholder={coefficientEnabled ? "Optional, e.g. 1 for pull-ups" : "Only for bodyweight exercises"}
                value={values.weightCoefficient}
                onChange={(e) => updateField("weightCoefficient", e.target.value)}
            />

            {coefficientEnabled && <div className="text-xs text-left mx-4 mt-1 text-stone-600 max-w-156">
                How much of any added weight counts toward the lift. Use 1 when the weight hangs in line with your body (pull-ups, dips),
                a fraction when it doesn&apos;t (about 0.65 for push-ups), or 0 if added weight can&apos;t be calculated (crunches).
                Leave empty if unsure.
            </div>}

            <FieldErrors errors={errors.weightCoefficient} />

            {/* Description */}
            <label htmlFor="exercise-description" className="flex flex-row justify-center sm:text-lg mx-4 mt-3 font-bold">
                Description:
            </label>

            <textarea
                id="exercise-description"
                rows={4}
                maxLength={MAX_EXERCISE_DESCRIPTION_LENGTH}
                className={`
                    p-2 mx-4 rounded-md border-2 mt-1 resize-y
                    ${errors.description.length > 0 ? "border-red-600 text-red-600" : "border-black text-black"}
                `}
                placeholder="Optional: setup, form cues, or variations"
                value={values.description}
                onChange={(e) => updateField("description", e.target.value)}
            />

            <div className="flex flex-row justify-end text-xs mx-4 mt-1 text-stone-600">
                {values.description.length}/{MAX_EXERCISE_DESCRIPTION_LENGTH}
            </div>

            <FieldErrors errors={errors.description} />

        </div>
    );
}

export default ExerciseForm;