'use client'

import { useState } from 'react';
import Link from 'next/link';
import { BicepsFlexed, LogIn } from 'lucide-react';
import { checkLiftFields, checkCalculatedWeight, type LiftFieldErrors } from '@/lib/liftChecks';
import type { Lift } from '@/lib/models';
import LiftFieldInputs, { EMPTY_LIFT_FIELD_ERRORS, toLiftFields, type LiftFormValues } from './LiftFieldInputs';
import { formatWeight } from './liftDisplay';

interface LogLiftFormProps {
    exerciseId: string;
    weightCoefficient: number | null;
    values: LiftFormValues;
    setValues: (values: LiftFormValues) => void;
    resetKey: number;
    useKgs: boolean;
    sessionStatus: "loading" | "authenticated" | "unauthenticated";
    // Calculated by the parent from 'values' (pounds), as the rep table also uses them
    effectiveWeight: number | undefined;
    oneRepMax: number | undefined;
    // Whether 'effectiveWeight' uses the account body weight, as no body weight was entered
    usingAccountBodyWeight: boolean;
    accountBodyWeight: number | null;
    // Called after a lift is logged. The parent adds it to the lift list and clears the form.
    onLogged: (lift: Lift, bodyWeightUpdated: boolean) => void;
}

// Form for logging a new lift, with the set's estimated 1RM (and equivalent lift, for bodyweight exercises)
const LogLiftForm = ({
    exerciseId, weightCoefficient, values, setValues, resetKey, useKgs, sessionStatus,
    effectiveWeight, oneRepMax, usingAccountBodyWeight, accountBodyWeight, onLogged,
}: LogLiftFormProps) => {

    const traditional = weightCoefficient === null;

    // Form outputs
    const [fieldErrors, setFieldErrors] = useState<LiftFieldErrors>(EMPTY_LIFT_FIELD_ERRORS);
    const [logOutput, setLogOutput] = useState<string[]>([]);
    const [logOutputColor, setLogOutputColor] = useState<"black" | "red" | "green">("black");
    const [formLoading, setFormLoading] = useState(false);

    function clearOutput() {
        setLogOutput([]);
        setLogOutputColor("black");
    }

    // Form submit handler
    async function handleLogSubmit() {

        document.body.style.cursor = "wait";
        setFormLoading(true);

        // Clears output fields
        clearOutput();
        setFieldErrors(EMPTY_LIFT_FIELD_ERRORS);

        // Checks validity of input fields, then the calculated weight
        const fields = toLiftFields(values, weightCoefficient);
        const fieldsCheck = checkLiftFields(fields, weightCoefficient);
        const weightCheck = checkCalculatedWeight(effectiveWeight, weightCoefficient);

        // Highlights invalid input fields & displays their errors
        if (!fieldsCheck.status || !weightCheck.status) {
            setFieldErrors(!fieldsCheck.status ? fieldsCheck.errors : { ...EMPTY_LIFT_FIELD_ERRORS, ...weightCheck.errors });
            document.body.style.cursor = "default";
            setFormLoading(false);
            return;
        }

        // Logs lift using '/api/lifts/create' endpoint
        const result = await fetch('/api/lifts/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                exerciseId: exerciseId,
                ...fields,
            }),
        });

        // Displays error / success from above endpoint
        const data = await result.json();
        if (!result.ok) {
            if (data.details) {
                setFieldErrors({ ...EMPTY_LIFT_FIELD_ERRORS, ...data.details });
            }
            setLogOutput([data.error ?? "Something went wrong. Try again later."]);
            setLogOutputColor("red");
            document.body.style.cursor = "default";
            setFormLoading(false);
            return;
        }
        else {
            const lift: Lift = data.lift;
            setLogOutput([
                `Logged ${formatWeight(lift.weight, useKgs)} × ${lift.reps}.` +
                (data.bodyWeightUpdated ? " Your account body weight was updated." : "")
            ]);
            setLogOutputColor("green");
            document.body.style.cursor = "default";
            setFormLoading(false);
            onLogged(lift, data.bodyWeightUpdated === true); // Clears the form
            return;
        }
    }

    return (
        <form
            className="w-full px-4 mt-3"
            onSubmit={(e) => {
                e.preventDefault();
                if (formLoading) return;
                handleLogSubmit();
            }}
        >
            <div className="w-full flex flex-col items-center p-3 rounded-md border-2 border-black bg-white">

                <div className="text-lg sm:text-xl font-semibold mb-2">Log a lift</div>

                <LiftFieldInputs
                    values={values}
                    setValues={setValues}
                    errors={fieldErrors}
                    setErrors={setFieldErrors}
                    weightCoefficient={weightCoefficient}
                    useKgs={useKgs}
                    resetKey={resetKey}
                    idPrefix="log"
                    onChange={clearOutput}
                />

                {/* Result, matching '/calculator' */}
                <div className="w-full flex flex-col items-center mt-3 pt-3 border-t border-black">
                    <div className="text-sm font-semibold text-stone-600">Estimated 1RM</div>
                    <div className="text-3xl sm:text-4xl font-bold">
                        {oneRepMax !== undefined ? formatWeight(oneRepMax, useKgs) : "N/A"}
                    </div>

                    {/* Equivalent lift (bodyWeight + addedWeight / k), for bodyweight exercises */}
                    {!traditional && (
                        <div className="text-sm sm:text-base text-stone-600">
                            Equivalent lift: {effectiveWeight !== undefined && values.reps !== undefined
                                ? `${formatWeight(effectiveWeight, useKgs)} × ${values.reps}`
                                : "N/A (enter your body weight)"}
                        </div>
                    )}

                    {usingAccountBodyWeight && accountBodyWeight !== null && (
                        <div className="w-0 min-w-full px-4 text-xs text-stone-600 mt-1">
                            No body weight entered, so your account body weight ({formatWeight(accountBodyWeight, useKgs)}) is used
                            to calculate this lift. The lift itself is saved without a body weight.
                        </div>
                    )}

                    <div className="mt-3">
                        {sessionStatus === "loading" ? (
                            <div className="flex flex-row items-center justify-center sm:text-lg font-medium p-2 px-6 rounded-md border-2 border-black text-black bg-[oklch(63.5%_0.213_47.604)] hover:cursor-wait">
                                Loading...
                            </div>
                        ) : sessionStatus === "authenticated" ? (
                            <button
                                type="submit"
                                className={`flex flex-row items-center justify-center sm:text-lg font-medium p-2 px-6 rounded-md border-2 border-black text-black
                                    ${formLoading ? "bg-[oklch(63.5%_0.213_47.604)] hover:cursor-wait" : "bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"}`}
                            >
                                <BicepsFlexed className="mr-2" />
                                Log this lift
                            </button>
                        ) : (
                            <Link
                                className="flex flex-row items-center justify-center sm:text-lg font-medium p-2 px-6 rounded-md border-2 border-black text-black bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"
                                href="/login"
                            >
                                <LogIn className="mr-2" />
                                Sign in to log lift
                            </Link>
                        )}
                    </div>

                    {logOutput.length > 0 && (
                        <ul className={`w-0 min-w-full flex flex-col items-center text-sm mt-1 ${logOutputColor === "red" ? "text-red-600" : logOutputColor === "green" ? "text-green-600" : "text-black"}`}>
                            {logOutput.map((output, i) => {
                                return <li key={i} className="mx-4">{output}</li>
                            })}
                        </ul>
                    )}
                </div>

            </div>
        </form>
    );
}

export default LogLiftForm;