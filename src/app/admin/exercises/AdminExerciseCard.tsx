'use client'

import { useState, type ReactNode } from 'react';
import { Pencil, Save, Check, X, EyeOff, Undo2, Trash2 } from 'lucide-react';
import { checkExerciseFields, type ExerciseFieldErrors } from '@/lib/exerciseChecks';
import type { Exercise, ExerciseFields, SuggestedExercise } from '@/lib/models';
import ExerciseForm, { EMPTY_EXERCISE_FIELD_ERRORS, fromExercise, toExerciseFields, type ExerciseFormValues } from '@/app/exercises/ExerciseForm';

// The four groups of exercises moderated on '/admin/exercises'
export type AdminExerciseTab = "suggested" | "approved" | "unapproved" | "rejected";

// Returns which tab an exercise belongs to, or null if admins can't moderate it (a user's private exercise)
export function getAdminExerciseTab(exercise: Exercise): AdminExerciseTab | null {
    if (exercise.userId === null) {
        return exercise.isApproved ? "approved" : "unapproved";
    }
    if (exercise.isSuggested) return "suggested";
    if (exercise.isRejected) return "rejected";
    return null;
}

interface AdminExerciseCardProps {
    exercise: SuggestedExercise;
    tab: AdminExerciseTab;
    // Called with the updated exercise & a success message after any successful update (save, approve, reject, etc.)
    // The message lets the parent report the change if the exercise moves to another tab (unmounting this card)
    onUpdated: (exercise: Exercise, message: string) => void;
    // Called with the deleted exercise after it is deleted
    onDeleted: (exercise: Exercise) => void;
}

// Small label displayed under an exercise's name (category, body parts, tags)
const Tag = ({ tag }: { tag: string }) => {
    return (
        <span className="w-fit h-fit px-1 py-0.5 m-0.5 inline-block font-semibold bg-slate-300 rounded-md">{tag}</span>
    );
}

// Action button, matching other buttons in this project
const ActionButton = ({ label, icon, onClick, disabled, loading }: {
    label: string, icon: ReactNode, onClick: () => void, disabled: boolean, loading: boolean
}) => {
    return (
        <button
            type="button"
            className={`flex flex-row items-center justify-center gap-2 font-medium px-3 py-1 rounded-md border-2 border-black text-black
                ${loading ? "bg-[oklch(63.5%_0.213_47.604)] hover:cursor-wait" : "bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"}`}
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

const AdminExerciseCard = ({ exercise, tab, onUpdated, onDeleted }: AdminExerciseCardProps) => {

    // Form inputs
    const [editing, setEditing] = useState(false);
    const [values, setValues] = useState<ExerciseFormValues>(() => fromExercise(exercise));

    // Form outputs
    const [fieldErrors, setFieldErrors] = useState<ExerciseFieldErrors>(EMPTY_EXERCISE_FIELD_ERRORS);
    const [output, setOutput] = useState<string[]>([]);
    const [outputColor, setOutputColor] = useState<"black" | "red" | "green">("black");
    const [formLoading, setFormLoading] = useState(false);

    function clearOutput() {
        setOutput([]);
        setOutputColor("black");
    }

    function startEditing() {
        setValues(fromExercise(exercise));
        setFieldErrors(EMPTY_EXERCISE_FIELD_ERRORS);
        clearOutput();
        setEditing(true);
    }

    function cancelEditing() {
        setValues(fromExercise(exercise));
        setFieldErrors(EMPTY_EXERCISE_FIELD_ERRORS);
        clearOutput();
        setEditing(false);
    }

    // Sends the complete exercise to '/api/exercises/update' along with any flag changes.
    // 'useEdits' sends the form's (edited) fields, otherwise the exercise's original fields are sent unchanged.
    async function submitUpdate(flags: { isApproved?: boolean, isRejected?: boolean }, useEdits: boolean, successMessage: string) {

        document.body.style.cursor = "wait";
        setFormLoading(true);

        // Clears output fields
        clearOutput();
        setFieldErrors(EMPTY_EXERCISE_FIELD_ERRORS);

        // Checks validity of edited fields
        const fields: ExerciseFields = toExerciseFields(useEdits ? values : fromExercise(exercise));
        const fieldsCheck = checkExerciseFields(fields);

        if (!fieldsCheck.status) {
            setFieldErrors(fieldsCheck.errors);
            if (!editing) setEditing(true);
            document.body.style.cursor = "default";
            setFormLoading(false);
            return;
        }

        // Updates exercise using '/api/exercises/update' endpoint
        const result = await fetch('/api/exercises/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: exercise.id,
                ...fields,
                ...flags,
            }),
        });

        // Displays error / success from above endpoint
        const data = await result.json();
        if (!result.ok) {
            if (data.details) {
                setFieldErrors({ ...EMPTY_EXERCISE_FIELD_ERRORS, ...data.details });
                if (!editing) setEditing(true);
            }
            setOutput([data.error ?? "Something went wrong. Try again later."]);
            setOutputColor("red");
            document.body.style.cursor = "default";
            setFormLoading(false);
            return;
        }
        else {
            const updated: Exercise = data.exercise;
            setOutput([successMessage]);
            setOutputColor("green");
            setEditing(false);
            setValues(fromExercise(updated));
            document.body.style.cursor = "default";
            setFormLoading(false);
            onUpdated(updated, successMessage); // May move this exercise to another tab
            return;
        }
    }

    async function handleDelete() {

        const lifts = tab === "suggested"
            ? `all of ${exercise.suggestedBy?.name ?? exercise.suggestedBy?.email ?? "the owner"}'s lifts`
            : "every user's lifts";
        const confirmed = window.confirm(`Are you sure you would like to delete "${exercise.name}"? This also deletes ${lifts} logged with it. This action is permanent.`);
        if (!confirmed) return;

        document.body.style.cursor = "wait";
        setFormLoading(true);
        clearOutput();

        // Deletes exercise using '/api/exercises/delete' endpoint
        const result = await fetch('/api/exercises/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: exercise.id }),
        });

        const data = await result.json();
        document.body.style.cursor = "default";
        setFormLoading(false);

        if (!result.ok) {
            setOutput([data.error ?? "Something went wrong. Try again later."]);
            setOutputColor("red");
            return;
        }

        onDeleted(exercise);
    }

    return (
        <div className="flex flex-col text-left p-3 rounded-md border-2 border-black bg-white">

            {/* Name & slug */}
            <div className="text-lg sm:text-xl font-bold">{exercise.name}</div>
            <div className="text-xs text-stone-600 break-all">/exercises/{exercise.URLSlug}</div>

            {/* Suggesting / owning user */}
            {exercise.suggestedBy !== null && (tab === "suggested" || tab === "rejected") &&
                <div className="text-sm mt-1">
                    <span className="font-semibold mr-1">{tab === "suggested" ? "Suggested by:" : "Owner:"}</span>
                    {exercise.suggestedBy.name ?? "(no username)"}
                    {exercise.suggestedBy.email && <span className="text-stone-600"> ({exercise.suggestedBy.email})</span>}
                </div>
            }

            {/* Details (hidden while editing, as the form displays them) */}
            {!editing && <>
                <div className="mt-2 text-sm text-black">
                    <Tag tag={exercise.category} />
                    {exercise.bodyParts.map((part) => (
                        <Tag key={part} tag={part} />
                    ))}
                    {exercise.tags.map((tag) => (
                        <Tag key={tag} tag={tag} />
                    ))}
                </div>

                {exercise.weightCoefficient !== null &&
                    <div className="text-sm mt-1">
                        <span className="font-semibold mr-1">Added weight coefficient:</span>
                        {exercise.weightCoefficient}
                    </div>
                }

                <div className="text-sm mt-1 whitespace-pre-wrap">
                    {exercise.description ?? <span className="text-stone-500">No description.</span>}
                </div>

                <div className="text-xs text-stone-600 mt-1">
                    Created {new Date(exercise.createdAt).toLocaleString()}, last updated {new Date(exercise.updatedAt).toLocaleString()}
                </div>
            </>}

            {/* Edit form */}
            {editing && <div className="-mx-4 mt-2">
                <ExerciseForm
                    values={values}
                    setValues={setValues}
                    errors={fieldErrors}
                    setErrors={setFieldErrors}
                    onChange={clearOutput}
                />
            </div>}

            {/* Actions */}
            <div className="flex flex-row flex-wrap gap-2 mt-3">

                {tab !== "rejected" && (editing
                    ? <>
                        <ActionButton label="Save" icon={<Save size={18} />} disabled={formLoading} loading={formLoading}
                            onClick={() => submitUpdate({}, true, "Changes saved.")} />
                        <ActionButton label="Cancel" icon={<X size={18} />} disabled={formLoading} loading={false}
                            onClick={cancelEditing} />
                    </>
                    : <ActionButton label="Edit" icon={<Pencil size={18} />} disabled={formLoading} loading={false}
                        onClick={startEditing} />
                )}

                {(tab === "suggested" || tab === "unapproved") &&
                    <ActionButton label={editing ? "Save & approve" : "Approve"} icon={<Check size={18} />} disabled={formLoading} loading={formLoading}
                        onClick={() => submitUpdate({ isApproved: true }, editing, `Approved "${exercise.name}".`)} />
                }

                {tab === "approved" &&
                    <ActionButton label={editing ? "Save & un-approve" : "Un-approve"} icon={<EyeOff size={18} />} disabled={formLoading} loading={formLoading}
                        onClick={() => submitUpdate({ isApproved: false }, editing, `Un-approved "${exercise.name}". It is now hidden from users.`)} />
                }

                {/* Rejecting always sends the user's original fields, discarding any edits */}
                {tab === "suggested" &&
                    <ActionButton label="Reject" icon={<X size={18} />} disabled={formLoading} loading={formLoading}
                        onClick={() => submitUpdate({ isRejected: true }, false, `Rejected "${exercise.name}".`)} />
                }

                {tab === "rejected" &&
                    <ActionButton label="Undo rejection" icon={<Undo2 size={18} />} disabled={formLoading} loading={formLoading}
                        onClick={() => submitUpdate({ isRejected: false }, false, `Undid rejection of "${exercise.name}". The owner can suggest it again.`)} />
                }

                {tab !== "rejected" &&
                    <ActionButton label="Delete" icon={<Trash2 size={18} />} disabled={formLoading} loading={formLoading}
                        onClick={handleDelete} />
                }

            </div>

            {output.length > 0 && (
                <ul className={`w-full flex flex-col items-start text-sm list-disc mt-1 ${outputColor === "red" ? "text-red-600" : outputColor === "green" ? "text-green-600" : "text-black"}`}>
                    {output.map((line, i) => {
                        return <li key={i} className="mx-4 text-left">{line}</li>
                    })}
                </ul>
            )}

        </div>
    );
}

export default AdminExerciseCard;