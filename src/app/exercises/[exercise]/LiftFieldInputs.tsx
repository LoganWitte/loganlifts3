'use client'

import { useState } from 'react';
import { kgsToPounds } from '@/lib/formulas';
import { calculateLiftWeight, type LiftFieldErrors } from '@/lib/liftChecks';
import type { Lift, LiftFields } from '@/lib/models';
import { toDisplayWeight } from './liftDisplay';

// Shared lift inputs (weight or added weight, body weight, reps, date / time), used to log new lifts
// and to edit previous lifts on '/exercises/[exercise]'.
// Like '/calculator', weights are stored as full-precision pounds regardless of the displayed unit, and
// the number inputs are uncontrolled. Changing 'resetKey' (or the unit) re-mounts them with the current values.

// Form state. Weights are in pounds. undefined is an empty field.
export type LiftFormValues = {
    weight: number | undefined,         // Traditional exercises only
    addedWeight: number | undefined,    // Non-traditional exercises only
    bodyWeight: number | undefined,
    reps: number | undefined,
    time: string,                       // 'datetime-local' input value (local time)
    // Whether the user changed the time. If not, the lift is logged at the time it's submitted.
    timeEdited: boolean,
};

export const EMPTY_LIFT_FIELD_ERRORS: LiftFieldErrors = {
    weight: [],
    reps: [],
    bodyWeight: [],
    addedWeight: [],
    time: [],
};

// Allowed clock drift, matching '/api/lifts/*'
const FUTURE_TIME_TOLERANCE_MS = 60 * 1000;

// Formats a date as a 'datetime-local' input value, in local time (e.g. "2026-09-29T14:05")
export function toDateTimeInputValue(date: Date): string {
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

// Converts form state into 'LiftFields' for validation ('checkLiftFields') and API requests
export function toLiftFields(values: LiftFormValues, weightCoefficient: number | null): LiftFields {
    const traditional = weightCoefficient === null;
    const date = new Date(values.time);
    return {
        weight: traditional ? (values.weight ?? null) : null,
        reps: values.reps as number, // An empty field fails 'checkLiftReps'
        bodyWeight: values.bodyWeight ?? null,
        addedWeight: traditional ? null : (values.addedWeight ?? null),
        // Invalid input is sent as-is so 'checkLiftTime' reports it
        time: !values.timeEdited ? null : Number.isNaN(date.getTime()) ? values.time : date.toISOString(),
    };
}

// Converts an existing lift into form state (for editing). The lift's time is always kept.
export function fromLift(lift: Lift, weightCoefficient: number | null): LiftFormValues {
    const traditional = weightCoefficient === null;
    return {
        weight: traditional ? lift.weight : undefined,
        addedWeight: traditional ? undefined : (lift.addedWeight ?? 0),
        bodyWeight: lift.bodyWeight ?? undefined,
        reps: lift.reps,
        time: toDateTimeInputValue(new Date(lift.time)),
        timeEdited: true,
    };
}

// The weight used for 1RM calculations (pounds), matching how '/api/lifts/*' calculates it.
// Falls back to the account body weight for bodyweight exercises, like the API.
export function getFormEffectiveWeight(values: LiftFormValues, weightCoefficient: number | null, accountBodyWeight: number | null): number | undefined {
    return calculateLiftWeight(
        weightCoefficient,
        { weight: values.weight ?? null, bodyWeight: values.bodyWeight ?? null, addedWeight: values.addedWeight ?? null },
        accountBodyWeight,
    );
}

// Whether the effective weight only exists because of the account body weight fallback
export function usesAccountBodyWeight(values: LiftFormValues, weightCoefficient: number | null, accountBodyWeight: number | null): boolean {
    return weightCoefficient !== null && accountBodyWeight !== null &&
        getFormEffectiveWeight(values, weightCoefficient, null) === undefined;
}

// Displays a list of errors under a field, matching other forms in this project
const FieldErrors = ({ errors }: { errors: string[] }) => {
    if (errors.length === 0) return null;
    return (
        // 'w-0 min-w-full' fills the row's width without widening it
        <ul className="w-0 min-w-full flex flex-col items-start text-sm text-red-600 list-disc">
            {errors.map((error, i) => {
                return <li key={i} className="ml-5 text-left">{error}</li>
            })}
        </ul>
    );
}

interface LiftFieldInputsProps {
    values: LiftFormValues;
    setValues: (values: LiftFormValues) => void;
    errors: LiftFieldErrors;
    setErrors: (errors: LiftFieldErrors) => void;
    weightCoefficient: number | null;
    useKgs: boolean;
    // Changing this re-mounts the (uncontrolled) number inputs with the current values, e.g. after clearing the form
    resetKey: number;
    // Prefix for input ids, so multiple forms can be on the page at once
    idPrefix: string;
    // Called whenever any field changes, e.g. so the parent can clear its output message
    onChange?: () => void;
}

const LiftFieldInputs = ({ values, setValues, errors, setErrors, weightCoefficient, useKgs, resetKey, idPrefix, onChange }: LiftFieldInputsProps) => {

    const traditional = weightCoefficient === null;

    // Latest allowed date / time (now + clock drift tolerance). Kept in state rather than calculated each render,
    // as reading the current time during render is impure. Refreshed whenever the input is focused.
    const [maxTime, setMaxTime] = useState(() => toDateTimeInputValue(new Date(Date.now() + FUTURE_TIME_TOLERANCE_MS)));

    const unitLabel = useKgs ? "(kgs)" : "(lbs)";
    const inputKey = `${useKgs ? "kg" : "lb"}-${resetKey}`;

    function updateField<K extends keyof LiftFormValues>(key: K, value: LiftFormValues[K], extra?: Partial<LiftFormValues>) {
        setValues({ ...values, [key]: value, ...extra });
        if (key in errors) setErrors({ ...errors, [key]: [] });
        onChange?.();
    }

    // A negative, empty, or otherwise invalid field clears the value, matching '/calculator'
    function handleWeightChange(key: "weight" | "addedWeight" | "bodyWeight", raw: string) {
        const value = parseFloat(raw);
        if (isNaN(value) || value < 0) {
            updateField(key, undefined);
            return;
        }
        updateField(key, useKgs ? kgsToPounds(value) : value);
    }

    function handleRepsChange(raw: string) {
        const value = parseInt(raw);
        updateField("reps", (isNaN(value) || value < 0) ? undefined : value);
    }

    // Clears invalid text left in an uncontrolled input once the user leaves it, matching '/calculator'
    function handleNumberBlur(e: React.FocusEvent<HTMLInputElement>) {
        const value = parseFloat(e.target.value);
        if (isNaN(value) || value < 0) {
            e.target.value = "";
        }
    }

    const displayed = (pounds: number | undefined) => pounds === undefined ? "" : toDisplayWeight(pounds, useKgs);
    const inputClass = (hasErrors: boolean) =>
        `bg-gray-300 border p-1 ml-1 w-30 rounded-md ${hasErrors ? "border-red-600 text-red-600" : "border-black"}`;

    return (
        <div className="sm:min-w-96 w-fit flex flex-col mx-4 mb-2 gap-1">

            {traditional ? <>
                <div className="min-w-full w-fit flex flex-row items-center justify-between">
                    <label htmlFor={`${idPrefix}-weight`} className="font-bold sm:text-lg">Weight {unitLabel}:</label>
                    <input
                        key={inputKey}
                        type="number" id={`${idPrefix}-weight`} min="0" step="any" defaultValue={displayed(values.weight)}
                        className={inputClass(errors.weight.length > 0)}
                        onChange={(e) => handleWeightChange("weight", e.target.value)}
                        onBlur={handleNumberBlur}
                    />
                </div>
                <FieldErrors errors={errors.weight} />
            </> : <>
                <div className="min-w-full w-fit flex flex-row items-center justify-between">
                    <label htmlFor={`${idPrefix}-added-weight`} className="font-bold sm:text-lg">Added weight {unitLabel}:</label>
                    <input
                        key={inputKey}
                        type="number" id={`${idPrefix}-added-weight`} min="0" step="any" defaultValue={displayed(values.addedWeight)}
                        className={inputClass(errors.addedWeight.length > 0)}
                        onChange={(e) => handleWeightChange("addedWeight", e.target.value)}
                        onBlur={handleNumberBlur}
                    />
                </div>
                {weightCoefficient === 0 && (
                    <div className="w-0 min-w-full text-xs text-left text-stone-600">
                        Recorded only. Added weight isn&apos;t counted toward this exercise&apos;s 1RM.
                    </div>
                )}
                <FieldErrors errors={errors.addedWeight} />
            </>}

            <div className="min-w-full w-fit flex flex-row items-center justify-between">
                <label htmlFor={`${idPrefix}-body-weight`} className="font-bold sm:text-lg">Body weight {unitLabel}:</label>
                <input
                    key={inputKey}
                    type="number" id={`${idPrefix}-body-weight`} min="0" step="any" defaultValue={displayed(values.bodyWeight)}
                    placeholder="Optional"
                    className={inputClass(errors.bodyWeight.length > 0)}
                    onChange={(e) => handleWeightChange("bodyWeight", e.target.value)}
                    onBlur={handleNumberBlur}
                />
            </div>
            <FieldErrors errors={errors.bodyWeight} />

            <div className="min-w-full w-fit flex flex-row items-center justify-between">
                <label htmlFor={`${idPrefix}-reps`} className="font-bold sm:text-lg">Reps:</label>
                <input
                    key={inputKey}
                    type="number" id={`${idPrefix}-reps`} min="1" step="1" defaultValue={values.reps ?? ""}
                    className={inputClass(errors.reps.length > 0)}
                    onChange={(e) => handleRepsChange(e.target.value)}
                    onBlur={handleNumberBlur}
                />
            </div>
            <FieldErrors errors={errors.reps} />

            <div className="min-w-full w-fit flex flex-row items-center justify-between">
                <label htmlFor={`${idPrefix}-time`} className="font-bold sm:text-lg mr-2">Date / time:</label>
                <input
                    type="datetime-local" id={`${idPrefix}-time`}
                    max={maxTime}
                    value={values.time}
                    onFocus={() => setMaxTime(toDateTimeInputValue(new Date(Date.now() + FUTURE_TIME_TOLERANCE_MS)))}
                    className={`bg-gray-300 border p-1 ml-1 rounded-md ${errors.time.length > 0 ? "border-red-600 text-red-600" : "border-black"}`}
                    onChange={(e) => updateField("time", e.target.value, { timeEdited: true })}
                />
            </div>
            <FieldErrors errors={errors.time} />

        </div>
    );
}

export default LiftFieldInputs;