'use client'

import { useState } from 'react';
import { Pencil, Save, Trash2, X } from 'lucide-react';
import { checkExerciseFields, type ExerciseFieldErrors } from '@/lib/exerciseChecks';
import type { Exercise } from '@/lib/models';
import ExerciseForm, { EMPTY_EXERCISE_FIELD_ERRORS, fromExercise, toExerciseFields, type ExerciseFormValues } from '../ExerciseForm';

interface EditExercisePanelProps {
    exercise: Exercise;
    // Number of the user's lifts for this exercise (for the delete warning). null if not loaded.
    liftCount: number | null;
    onUpdated: (exercise: Exercise) => void;
    onDeleted: () => void;
}

// Edit & delete controls for the user's own exercises
const EditExercisePanel = ({ exercise, liftCount, onUpdated, onDeleted }: EditExercisePanelProps) => {

    // Form inputs
    const [editing, setEditing] = useState(false);
    const [values, setValues] = useState<ExerciseFormValues>(() => fromExercise(exercise));
    const [suggest, setSuggest] = useState(exercise.isSuggested);

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
        setSuggest(exercise.isSuggested);
        setFieldErrors(EMPTY_EXERCISE_FIELD_ERRORS);
        clearOutput();
        setEditing(true);
    }

    function cancelEditing() {
        setFieldErrors(EMPTY_EXERCISE_FIELD_ERRORS);
        clearOutput();
        setEditing(false);
    }

    // Form submit handler
    async function handleUpdateSubmit() {

        document.body.style.cursor = "wait";
        setFormLoading(true);

        // Clears output fields
        clearOutput();
        setFieldErrors(EMPTY_EXERCISE_FIELD_ERRORS);

        // Checks validity of input fields
        const fields = toExerciseFields(values);
        const fieldsCheck = checkExerciseFields(fields);

        if (!fieldsCheck.status) {
            setFieldErrors(fieldsCheck.errors);
            document.body.style.cursor = "default";
            setFormLoading(false);
            return;
        }

        // Updates exercise using '/api/exercises/update' endpoint
        // Rejected exercises can't be suggested again, so 'isSuggested' is left unchanged for them
        const result = await fetch('/api/exercises/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: exercise.id,
                ...fields,
                ...(exercise.isRejected ? {} : { isSuggested: suggest }),
            }),
        });

        // Displays error / success from above endpoint
        const data = await result.json();
        if (!result.ok) {
            if (data.details) {
                setFieldErrors({ ...EMPTY_EXERCISE_FIELD_ERRORS, ...data.details });
            }
            setOutput([data.error ?? "Something went wrong. Try again later."]);
            setOutputColor("red");
            document.body.style.cursor = "default";
            setFormLoading(false);
            return;
        }
        else {
            setOutput(["Exercise updated."]);
            setOutputColor("green");
            setEditing(false);
            document.body.style.cursor = "default";
            setFormLoading(false);
            onUpdated(data.exercise); // Redirects to the new URL if the name changed
            return;
        }
    }

    async function handleDelete() {

        const lifts = liftCount === null ? "all of your lifts" : `your ${liftCount} lift${liftCount === 1 ? "" : "s"}`;
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

        onDeleted(); // Redirects to '/exercises'
    }

    const buttonClass = (loading: boolean) => `flex flex-row items-center justify-center sm:text-lg font-medium p-2 rounded-md border-2 border-black text-black
        ${loading ? "bg-[oklch(63.5%_0.213_47.604)] hover:cursor-wait" : "bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"}`;

    return (
        <div className="w-full flex flex-col mb-2">

            {editing && (
                <form
                    className="flex flex-col w-full"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (formLoading) return;
                        handleUpdateSubmit();
                    }}
                >
                    <ExerciseForm
                        values={values}
                        setValues={setValues}
                        errors={fieldErrors}
                        setErrors={setFieldErrors}
                        onChange={clearOutput}
                    />

                    {exercise.isRejected ? (
                        <div className="text-xs text-left mx-4 mt-3 text-stone-600">
                            This exercise was rejected, so it can&apos;t be suggested globally again.
                        </div>
                    ) : <>
                        <label className="flex flex-row items-center gap-2 mx-4 mt-3 text-left sm:text-lg font-medium hover:cursor-pointer">
                            <input
                                type="checkbox"
                                className="accent-orange-500 scale-125 hover:cursor-pointer"
                                checked={suggest}
                                onChange={(e) => {
                                    setSuggest(e.target.checked);
                                    clearOutput();
                                }}
                            />
                            Suggest globally
                        </label>
                        <div className="text-xs text-left mx-4 ml-10 text-stone-600">
                            An admin will review it before it&apos;s added for everyone. You can use it right away either way.
                        </div>
                    </>}

                    <div className="flex flex-row gap-2 mx-4 mt-3">
                        <button type="submit" className={`grow ${buttonClass(formLoading)}`}>
                            <Save className="mr-2" />
                            Save changes
                        </button>
                        <button type="button" className={`grow ${buttonClass(false)}`} onClick={cancelEditing}>
                            <X className="mr-2" />
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {!editing && (
                <div className="flex flex-row gap-2 mx-4">
                    <button type="button" className={`grow ${buttonClass(false)}`} onClick={() => { if (!formLoading) startEditing(); }}>
                        <Pencil className="mr-2" />
                        Edit exercise
                    </button>
                    <button type="button" className={`grow ${buttonClass(formLoading)}`} onClick={() => { if (!formLoading) handleDelete(); }}>
                        <Trash2 className="mr-2" />
                        Delete exercise
                    </button>
                </div>
            )}

            {output.length > 0 && (
                <ul className={`w-full flex flex-col items-start text-sm list-disc mt-1 ${outputColor === "red" ? "text-red-600" : outputColor === "green" ? "text-green-600" : "text-black"}`}>
                    {output.map((line, i) => {
                        return <li key={i} className="mx-7 text-left">{line}</li>
                    })}
                </ul>
            )}

        </div>
    );
}

export default EditExercisePanel;