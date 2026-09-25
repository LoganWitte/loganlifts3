'use client'

import { useSession } from "next-auth/react";
import { useState, useMemo } from "react";
import { Plus, Globe } from 'lucide-react'
import { checkExerciseFields, type ExerciseFieldErrors } from "@/lib/exerciseChecks";
import type { Exercise } from "@/lib/models";
import ExerciseForm, { EMPTY_EXERCISE_FIELD_ERRORS, EMPTY_EXERCISE_FORM_VALUES, toExerciseFields, type ExerciseFormValues } from "../ExerciseForm";

const Page = () => {

    const { data, status } = useSession();

    // Only used to display the approve checkbox. The API verifies admin status itself.
    const isAdmin: boolean = useMemo(() => {
        if (status !== "authenticated") return false;
        if (!data || !data.user) return false;
        return data.user.isAdmin === true;
    }, [data, status]);

    // Form inputs
    const [values, setValues] = useState<ExerciseFormValues>(EMPTY_EXERCISE_FORM_VALUES);
    const [suggest, setSuggest] = useState(false);
    const [approve, setApprove] = useState(false);

    // Form outputs
    const [fieldErrors, setFieldErrors] = useState<ExerciseFieldErrors>(EMPTY_EXERCISE_FIELD_ERRORS);
    const [createOutput, setCreateOutput] = useState<string[]>([]);
    const [createOutputColor, setCreateOutputColor] = useState<"black" | "red" | "green">("black");
    const [formLoading, setFormLoading] = useState(false);

    // Clears output message when any input changes
    function clearOutput() {
        setCreateOutput([]);
        setCreateOutputColor("black");
    }

    // Form submit handler
    async function handleCreateSubmit() {

        document.body.style.cursor = "wait";
        setFormLoading(true);

        // Clears output fields
        clearOutput();
        setFieldErrors(EMPTY_EXERCISE_FIELD_ERRORS);

        // Checks validity of input fields
        const fields = toExerciseFields(values);
        const fieldsCheck = checkExerciseFields(fields);

        // Highlights invalid input fields & displays their errors
        if (!fieldsCheck.status) {
            setFieldErrors(fieldsCheck.errors);
            document.body.style.cursor = "default";
            setFormLoading(false);
            return;
        }

        // Creates exercise using '/api/exercises/create' endpoint
        // Approving creates only a global exercise, so suggesting is ignored
        const result = await fetch('/api/exercises/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...fields,
                isSuggested: approve ? false : suggest,
                isApproved: isAdmin && approve,
            }),
        });

        // Displays error / success from above endpoint
        const data = await result.json();
        if (!result.ok) {
            if (data.details) {
                setFieldErrors({ ...EMPTY_EXERCISE_FIELD_ERRORS, ...data.details });
            }
            setCreateOutput([data.error ?? "Something went wrong. Try again later."]);
            setCreateOutputColor("red");
            document.body.style.cursor = "default";
            setFormLoading(false);
            return;
        }
        else {
            const exercise: Exercise = data.exercise;
            setCreateOutput([
                `Created "${exercise.name}".` +
                (exercise.isApproved ? " It's now available to everyone." :
                    exercise.isSuggested ? " It's been suggested for everyone, and you can use it right away." :
                        " You can use it right away.")
            ]);
            setCreateOutputColor("green");
            setValues(EMPTY_EXERCISE_FORM_VALUES);
            setSuggest(false);
            setApprove(false);
            document.body.style.cursor = "default";
            setFormLoading(false);
            return;
        }
    }

    return (
        <div className="flex flex-col items-center justify-center text-center p-4 sm:m-4 bg-slate-200 sm:border-t border-b sm:border-l sm:border-r border-black text-black min-w-full sm:min-w-160">

            <div className="flex flex-row justify-center text-xl sm:text-2xl font-semibold mb-2">
                Create exercise
            </div>

            <form
                className="flex flex-col mb-3 w-full"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (formLoading) return;
                    handleCreateSubmit();
                }}
            >

                <ExerciseForm
                    values={values}
                    setValues={setValues}
                    errors={fieldErrors}
                    setErrors={setFieldErrors}
                    onChange={clearOutput}
                />

                {/* Suggest globally (disabled while approving) */}
                <label className={`flex flex-row items-center gap-2 mx-4 mt-3 text-left sm:text-lg font-medium
                    ${approve ? "text-stone-500 hover:cursor-not-allowed" : "hover:cursor-pointer"}`}>
                    <input
                        type="checkbox"
                        className={`accent-orange-500 scale-125 ${approve ? "hover:cursor-not-allowed" : "hover:cursor-pointer"}`}
                        checked={suggest && !approve}
                        disabled={approve}
                        onChange={(e) => {
                            setSuggest(e.target.checked);
                            clearOutput();
                        }}
                    />
                    Suggest globally
                </label>

                <div className={`text-xs text-left mx-4 ml-10 ${approve ? "text-stone-400" : "text-stone-600"}`}>
                    An admin will review it before it&apos;s added for everyone. You can use it right away either way.
                </div>

                {/* Approve (admin only) */}
                {isAdmin && <>
                    <label className="flex flex-row items-center gap-2 mx-4 mt-2 text-left sm:text-lg font-medium hover:cursor-pointer">
                        <input
                            type="checkbox"
                            className="accent-orange-500 scale-125 hover:cursor-pointer"
                            checked={approve}
                            onChange={(e) => {
                                setApprove(e.target.checked);
                                if (e.target.checked) setSuggest(false);
                                clearOutput();
                            }}
                        />
                        Approve (admin)
                    </label>

                    <div className="text-xs text-left mx-4 ml-10 text-stone-600">
                        Adds it for everyone immediately, without creating a private copy.
                    </div>
                </>}

                <button
                    type="submit"
                    className={`flex flex-row items-center justify-center sm:text-lg font-medium p-2 mx-4 mt-3 rounded-md border-2 border-black text-black 
                        ${formLoading ? "bg-[oklch(63.5%_0.213_47.604)] hover:cursor-wait" : "bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"}`}
                >
                    {approve ? <Globe className="ml-2 mr-4" /> : <Plus className="ml-2 mr-4" />}
                    {approve ? "Create global exercise" : "Create exercise"}
                </button>

                {createOutput.length > 0 && (
                    <ul className={`w-full flex flex-col items-start text-sm list-disc mt-1 ${createOutputColor === "red" ? "text-red-600" : createOutputColor === "green" ? "text-green-600" : "text-black"}`}>
                        {createOutput.map((output, i) => {
                            return <li key={i} className="mx-7 text-left">{output}</li>
                        })}
                    </ul>
                )}

            </form>

        </div>
    );
}

export default Page;