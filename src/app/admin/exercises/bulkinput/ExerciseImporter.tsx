'use client'

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import { ArrowLeft, Copy, Eye, Square, Upload, X } from "lucide-react";
import { useExerciseContext } from "@/app/components/contextProviders/ExerciseProvider";
import {
    checkExerciseFields,
    normalizeExerciseFields,
    getGlobalExerciseSlug,
    VALID_BODY_PARTS,
    VALID_CATEGORIES,
} from "@/lib/exerciseChecks";
import {
    MAX_EXERCISE_NAME_LENGTH,
    MAX_EXERCISE_DESCRIPTION_LENGTH,
    MAX_EXERCISE_TAG_COUNT,
    MAX_EXERCISE_TAG_LENGTH,
} from "@/lib/constants";
import type { CreateExerciseRequest, Exercise, ExerciseFields } from "@/lib/models";

// Bulk input of global, approved exercises (admin only).
// An admin pastes a JSON array of exercises, previews & validates them, then imports the valid ones
// one at a time through '/api/exercises/create' (with isApproved: true). Existing exercises are never overwritten.

// Status of each pasted item. The first four are set by the preview, the rest while importing.
type RowStatus = "ready" | "invalid" | "duplicate" | "exists" | "importing" | "imported" | "skipped" | "failed";

type ImportRow = {
    raw: unknown,                   // The item exactly as pasted (used for "Copy failed rows")
    fields: ExerciseFields | null,  // Normalized fields, or null if invalid
    slug: string | null,            // Global URLSlug, or null if invalid
    status: RowStatus,
    errors: string[],
    warnings: string[],
};

// The only keys sent to the API. Any other keys are ignored with a warning.
const EXERCISE_FIELD_KEYS = ["name", "description", "bodyParts", "category", "tags", "weightCoefficient"];

const STATUS_LABELS: Record<RowStatus, string> = {
    ready: "Ready",
    invalid: "Invalid",
    duplicate: "Duplicate in paste",
    exists: "Already exists",
    importing: "Importing...",
    imported: "Imported ✓",
    skipped: "Skipped (already exists)",
    failed: "Failed",
};

const STATUS_COLORS: Record<RowStatus, string> = {
    ready: "bg-green-200",
    invalid: "bg-red-200",
    duplicate: "bg-yellow-200",
    exists: "bg-yellow-200",
    importing: "bg-orange-300",
    imported: "bg-green-400",
    skipped: "bg-slate-300",
    failed: "bg-red-400",
};

const EXAMPLE_JSON = `[
  {
    "name": "Barbell Bench Press",
    "description": "Lie on a flat bench, lower the bar to mid-chest, and press it back up to lockout.",
    "bodyParts": ["Chest", "Shoulders", "Triceps"],
    "category": "Barbell",
    "tags": ["compound", "push", "horizontal"],
    "weightCoefficient": null
  }
]`;

// Removes a surrounding Markdown code block (```json ... ```), as Claude's output is often copied with it
function stripCodeFence(input: string): string {
    const match = input.trim().match(/^```[a-zA-Z]*\s*\n?([\s\S]*?)\n?\s*```$/);
    return match ? match[1] : input;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Validates each item & marks duplicates. 'existingSlugs' are the URLSlugs of approved global exercises.
function buildRows(items: unknown[], existingSlugs: Set<string>): ImportRow[] {
    const seenSlugs = new Set<string>();

    return items.map((item): ImportRow => {
        if (!isPlainObject(item)) {
            return { raw: item, fields: null, slug: null, status: "invalid", errors: ["Each item must be an object."], warnings: [] };
        }

        const unknownKeys = Object.keys(item).filter((key) => !EXERCISE_FIELD_KEYS.includes(key));
        const warnings = unknownKeys.length > 0 ? [`Ignored unknown field(s): ${unknownKeys.join(", ")}.`] : [];

        // Same checks as '/api/exercises/create'
        const fieldsCheck = checkExerciseFields(item);
        if (!fieldsCheck.status) {
            return { raw: item, fields: null, slug: null, status: "invalid", errors: Object.values(fieldsCheck.errors).flat(), warnings };
        }

        const fields = normalizeExerciseFields(item as ExerciseFields);
        const slug = getGlobalExerciseSlug(fields.name);

        let status: RowStatus = "ready";
        if (existingSlugs.has(slug)) status = "exists";
        else if (seenSlugs.has(slug)) status = "duplicate";
        seenSlugs.add(slug);

        return { raw: item, fields, slug, status, errors: [], warnings };
    });
}

// Small label displayed under an exercise's name (category, body parts, tags), matching 'AdminExerciseCard'
const Tag = ({ tag }: { tag: string }) => {
    return (
        <span className="w-fit h-fit px-1 py-0.5 m-0.5 inline-block font-semibold bg-slate-300 rounded-md">{tag}</span>
    );
}

// Button, matching other buttons in this project
const ActionButton = ({ label, icon, onClick, disabled, loading }: {
    label: string, icon: ReactNode, onClick: () => void, disabled: boolean, loading: boolean
}) => {
    return (
        <button
            type="button"
            className={`flex flex-row items-center justify-center gap-2 font-medium px-3 py-1 rounded-md border-2 border-black text-black
                ${loading ? "bg-[oklch(63.5%_0.213_47.604)] hover:cursor-wait" :
                    disabled ? "bg-stone-300 text-stone-600 hover:cursor-not-allowed" :
                        "bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"}`}
            onClick={() => {
                if (disabled) return;
                onClick();
            }}
        >
            {icon}
            {label}
        </button>
    );
}

const ExerciseImporter = () => {

    const { status } = useSession();

    // Approved global exercises are used to detect exercises which already exist
    const { exercises, isLoading: exercisesLoading, error: exercisesError, refreshExercises, upsertExercise } = useExerciseContext();

    // Refreshes exercises each visit once session has loaded ('/api/exercises/get')
    useEffect(() => {
        if (status === "loading") return;
        refreshExercises();
    }, [status, refreshExercises]);

    const existingSlugs = useMemo(() => new Set(
        (exercises ?? [])
            .filter((ex) => ex.userId === null && ex.isApproved)
            .map((ex) => ex.URLSlug)
    ), [exercises]);

    // Form inputs
    const [input, setInput] = useState("");

    // Form outputs
    const [parseError, setParseError] = useState("");
    const [rows, setRows] = useState<ImportRow[] | null>(null);
    const [output, setOutput] = useState<string[]>([]);
    const [outputColor, setOutputColor] = useState<"black" | "red" | "green">("black");
    const [formLoading, setFormLoading] = useState(false);

    // Import progress
    const [progress, setProgress] = useState<{ done: number, total: number } | null>(null);
    const [finished, setFinished] = useState(false);
    const [stopping, setStopping] = useState(false);
    const stopRequested = useRef(false);

    function clearOutput() {
        setOutput([]);
        setOutputColor("black");
    }

    // Clears the preview & any import results (e.g. when the input changes)
    function clearPreview() {
        setParseError("");
        setRows(null);
        setProgress(null);
        setFinished(false);
        clearOutput();
    }

    function handlePreview() {
        clearPreview();

        let parsed: unknown;
        try {
            parsed = JSON.parse(stripCodeFence(input));
        }
        catch (e) {
            setParseError(`Invalid JSON: ${e instanceof Error ? e.message : "could not parse input."}`);
            return;
        }

        // Accepts an array, or a single object
        const items = Array.isArray(parsed) ? parsed : [parsed];
        if (items.length === 0) {
            setParseError("No exercises found. Paste a JSON array of exercises.");
            return;
        }

        setRows(buildRows(items, existingSlugs));
    }

    function updateRow(index: number, changes: Partial<ImportRow>) {
        setRows((current) => current === null ? current : current.map((row, i) => i === index ? { ...row, ...changes } : row));
    }

    // Imports every "Ready" row, one request at a time, continuing past failures
    async function handleImport() {
        if (rows === null) return;
        const readyIndices = rows.flatMap((row, i) => row.status === "ready" ? [i] : []);
        if (readyIndices.length === 0) return;

        document.body.style.cursor = "wait";
        setFormLoading(true);
        clearOutput();
        setFinished(false);
        stopRequested.current = false;
        setStopping(false);

        let done = 0;
        let imported = 0, skipped = 0, failed = 0;
        setProgress({ done, total: readyIndices.length });

        for (const index of readyIndices) {
            // Stop finishes the current request, then stops here
            if (stopRequested.current) break;

            const row = rows[index];
            updateRow(index, { status: "importing" });

            const body: CreateExerciseRequest = { ...(row.fields as ExerciseFields), isApproved: true };

            try {
                // Creates exercise using '/api/exercises/create' endpoint
                const result = await fetch('/api/exercises/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                const data = await result.json();

                if (result.ok) {
                    upsertExercise(data.exercise as Exercise);
                    updateRow(index, { status: "imported", errors: [] });
                    imported++;
                }
                else if (result.status === 409) {
                    updateRow(index, { status: "skipped", errors: [] });
                    skipped++;
                }
                else {
                    const details: string[] = data.details ? Object.values(data.details as Record<string, string[]>).flat() : [];
                    updateRow(index, { status: "failed", errors: [data.error ?? "Something went wrong. Try again later.", ...details] });
                    failed++;
                }
            }
            catch {
                updateRow(index, { status: "failed", errors: ["Server failed to respond. Confirm internet connection or try again later."] });
                failed++;
            }

            done++;
            setProgress({ done, total: readyIndices.length });
        }

        const notAttempted = readyIndices.length - done;
        setOutput([
            `Imported ${imported}, skipped ${skipped} (already exist), failed ${failed}.` +
            (notAttempted > 0 ? ` Stopped with ${notAttempted} not attempted (still marked Ready).` : "")
        ]);
        setOutputColor(failed > 0 ? "red" : "green");
        setFinished(true);
        setStopping(false);
        document.body.style.cursor = "default";
        setFormLoading(false);
    }

    function handleStop() {
        stopRequested.current = true;
        setStopping(true);
    }

    // Copies invalid & failed items (as originally pasted) so they can be fixed and re-pasted
    async function handleCopyFailed() {
        if (rows === null) return;
        const failedItems = rows.filter((row) => row.status === "failed" || row.status === "invalid").map((row) => row.raw);
        try {
            await navigator.clipboard.writeText(JSON.stringify(failedItems, null, 2));
            setOutput([`Copied ${failedItems.length} row(s) to the clipboard.`]);
            setOutputColor("green");
        }
        catch {
            setOutput(["Could not copy to the clipboard."]);
            setOutputColor("red");
        }
    }

    async function handleCopyExample() {
        try {
            await navigator.clipboard.writeText(EXAMPLE_JSON);
        }
        catch {
            // Clipboard unavailable. The example is still visible to copy manually.
        }
    }

    // Number of rows with each status
    const counts = useMemo(() => {
        const result: Record<RowStatus, number> = {
            ready: 0, invalid: 0, duplicate: 0, exists: 0, importing: 0, imported: 0, skipped: 0, failed: 0,
        };
        for (const row of rows ?? []) result[row.status]++;
        return result;
    }, [rows]);

    // Counts displayed above the preview. Import statuses are only shown once used.
    const displayedCounts: RowStatus[] = (["ready", "invalid", "duplicate", "exists", "imported", "skipped", "failed"] as RowStatus[])
        .filter((s) => s === "ready" || s === "invalid" || s === "duplicate" || s === "exists" || counts[s] > 0);

    return (
        <div className="flex flex-col items-center justify-center text-center p-4 sm:m-4 bg-slate-200 sm:border-t border-b sm:border-l sm:border-r border-black text-black min-w-full sm:min-w-160 sm:w-[60vw]">

            <div className="flex flex-row justify-center text-xl sm:text-2xl font-semibold mb-2">
                Bulk input exercises
            </div>

            <Link
                href="/admin/exercises"
                className="flex flex-row items-center gap-1 text-sm font-medium underline hover:text-orange-600 mb-2"
            >
                <ArrowLeft size={16} />
                Back to moderate exercises
            </Link>

            {/* Format reference */}
            <details className="w-full px-4 text-left text-sm">
                <summary className="font-semibold hover:cursor-pointer">Format reference</summary>
                <div className="flex flex-col gap-1 mt-1 p-3 rounded-md border-2 border-black bg-white">
                    <p>A JSON array of exercises (a single object is also accepted). A surrounding <code>```json</code> code block is removed automatically.</p>
                    <ul className="list-disc ml-5">
                        <li><code>name</code>: required, at most {MAX_EXERCISE_NAME_LENGTH} characters.</li>
                        <li><code>description</code>: optional, <code>null</code> or at most {MAX_EXERCISE_DESCRIPTION_LENGTH} characters.</li>
                        <li><code>bodyParts</code>: a list of: {VALID_BODY_PARTS.join(", ")}.</li>
                        <li><code>category</code>: required, one of: {VALID_CATEGORIES.join(", ")}.</li>
                        <li><code>tags</code>: a list (may be empty) of at most {MAX_EXERCISE_TAG_COUNT} tags, each at most {MAX_EXERCISE_TAG_LENGTH} characters.</li>
                        <li><code>weightCoefficient</code>: <code>null</code> for loaded exercises, <code>0</code> or a positive number for bodyweight exercises.</li>
                    </ul>
                    <p>Other fields are ignored. Exercises which already exist are skipped, never overwritten.</p>
                    <pre className="text-xs p-2 mt-1 rounded-md bg-slate-100 overflow-x-auto">{EXAMPLE_JSON}</pre>
                    <div className="flex flex-row mt-1">
                        <ActionButton label="Copy example" icon={<Copy size={18} />} disabled={false} loading={false}
                            onClick={handleCopyExample} />
                    </div>
                </div>
            </details>

            {/* Input */}
            <div className="flex flex-col w-full mt-3">
                <textarea
                    aria-label="Paste exercises JSON"
                    className={`p-2 mx-4 h-64 rounded-md border-2 border-black text-black bg-white font-mono text-xs sm:text-sm ${formLoading ? "hover:cursor-wait" : ""}`}
                    placeholder="Paste exercises JSON"
                    spellCheck={false}
                    value={input}
                    disabled={formLoading}
                    onChange={(e) => {
                        setInput(e.target.value);
                        clearPreview();
                    }}
                />

                <div className="flex flex-row flex-wrap gap-2 mx-4 mt-2">
                    <ActionButton label="Preview" icon={<Eye size={18} />} disabled={formLoading || input.trim().length === 0} loading={false}
                        onClick={handlePreview} />
                    <ActionButton label="Clear" icon={<X size={18} />} disabled={formLoading} loading={false}
                        onClick={() => {
                            setInput("");
                            clearPreview();
                        }} />
                </div>

                {/* Existing exercises are needed to detect duplicates. The API still rejects them if this fails. */}
                {exercises === null && exercisesLoading && (
                    <p className="mx-4 mt-2 text-left text-sm text-stone-600">Loading existing exercises...</p>
                )}
                {exercisesError !== "" && (
                    <p className="mx-4 mt-2 text-left text-sm text-red-600">
                        Couldn&apos;t load existing exercises, so they won&apos;t be marked in the preview (they&apos;re still skipped when importing): {exercisesError}
                    </p>
                )}

                {parseError !== "" && (
                    <ul className="w-full flex flex-col items-start text-sm list-disc mt-1 text-red-600">
                        <li className="mx-7 text-left">{parseError}</li>
                    </ul>
                )}
            </div>

            {/* Preview */}
            {rows !== null && <>

                {/* Counts */}
                <div className="flex flex-row flex-wrap justify-center gap-1 w-full px-4 mt-3 text-sm">
                    {displayedCounts.map((s) => (
                        <span key={s} className={`px-2 py-0.5 rounded-md border border-black font-medium ${STATUS_COLORS[s]}`}>
                            {STATUS_LABELS[s].replace(" ✓", "")}: {counts[s]}
                        </span>
                    ))}
                </div>

                {/* Import / Stop */}
                <div className="flex flex-row flex-wrap items-center gap-2 w-full px-4 mt-3">
                    {formLoading
                        ? <ActionButton label={stopping ? "Stopping..." : "Stop"} icon={<Square size={18} />} disabled={stopping} loading={stopping}
                            onClick={handleStop} />
                        : <ActionButton label={`Import ${counts.ready} ready`} icon={<Upload size={18} />} disabled={counts.ready === 0} loading={false}
                            onClick={handleImport} />
                    }
                    {progress !== null && (
                        <span className="text-sm font-medium">
                            {formLoading ? "Importing" : "Processed"} {progress.done} / {progress.total}
                        </span>
                    )}
                </div>

                {output.length > 0 && (
                    <ul className={`w-full flex flex-col items-start text-sm list-disc mt-1 ${outputColor === "red" ? "text-red-600" : outputColor === "green" ? "text-green-600" : "text-black"}`}>
                        {output.map((line, i) => {
                            return <li key={i} className="mx-7 text-left">{line}</li>
                        })}
                    </ul>
                )}

                {/* After importing */}
                {finished && !formLoading && (
                    <div className="flex flex-row flex-wrap items-center gap-2 w-full px-4 mt-2">
                        {(counts.failed > 0 || counts.invalid > 0) &&
                            <ActionButton label="Copy failed & invalid rows as JSON" icon={<Copy size={18} />} disabled={false} loading={false}
                                onClick={handleCopyFailed} />
                        }
                        <Link href="/exercises" className="text-sm font-medium underline hover:text-orange-600">
                            View exercises
                        </Link>
                    </div>
                )}

                {/* Rows */}
                <div className="w-full px-4 mt-3 flex flex-col gap-3">
                    {rows.map((row, i) => {
                        const rawName = isPlainObject(row.raw) && typeof row.raw.name === "string" ? row.raw.name : null;
                        return (
                            <div key={i} className="flex flex-col text-left p-3 rounded-md border-2 border-black bg-white">

                                {/* Name, slug & status */}
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                                    <div className="min-w-0">
                                        <div className="text-lg font-bold break-words">
                                            <span className="text-stone-500 font-medium mr-2">#{i + 1}</span>
                                            {row.fields?.name ?? rawName ?? <span className="text-stone-500">(no name)</span>}
                                        </div>
                                        {row.slug !== null &&
                                            <div className="text-xs text-stone-600 break-all">/exercises/{row.slug}</div>
                                        }
                                    </div>
                                    <span className={`w-fit h-fit shrink-0 px-2 py-0.5 rounded-md border border-black text-sm font-semibold ${STATUS_COLORS[row.status]}`}>
                                        {STATUS_LABELS[row.status]}
                                    </span>
                                </div>

                                {/* Details */}
                                {row.fields !== null && <>
                                    <div className="mt-2 text-sm text-black">
                                        <Tag tag={row.fields.category} />
                                        {row.fields.bodyParts.map((part) => (
                                            <Tag key={part} tag={part} />
                                        ))}
                                        {row.fields.tags.map((tag) => (
                                            <Tag key={tag} tag={tag} />
                                        ))}
                                    </div>

                                    <div className="text-sm mt-1">
                                        <span className="font-semibold mr-1">Added weight coefficient:</span>
                                        {row.fields.weightCoefficient ?? "—"}
                                    </div>

                                    <div className="text-sm mt-1 whitespace-pre-wrap">
                                        {row.fields.description ?? <span className="text-stone-500">No description.</span>}
                                    </div>
                                </>}

                                {row.errors.length > 0 && (
                                    <ul className="w-full flex flex-col items-start text-sm list-disc mt-1 text-red-600">
                                        {row.errors.map((error, j) => {
                                            return <li key={j} className="mx-4 text-left">{error}</li>
                                        })}
                                    </ul>
                                )}

                                {row.warnings.length > 0 && (
                                    <ul className="w-full flex flex-col items-start text-sm list-disc mt-1 text-amber-700">
                                        {row.warnings.map((warning, j) => {
                                            return <li key={j} className="mx-4 text-left">{warning}</li>
                                        })}
                                    </ul>
                                )}

                            </div>
                        );
                    })}
                </div>
            </>}

        </div>
    );
}

export default ExerciseImporter;
