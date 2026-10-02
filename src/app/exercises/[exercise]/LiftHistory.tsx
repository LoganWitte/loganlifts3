'use client'

import { useState, type ReactNode } from 'react';
import { ArrowDown, Calculator, Pencil, Save, Trash2, X } from 'lucide-react';
import { checkLiftFields, checkCalculatedWeight, type LiftFieldErrors } from '@/lib/liftChecks';
import type { Lift } from '@/lib/models';
import LiftFieldInputs, { EMPTY_LIFT_FIELD_ERRORS, fromLift, getFormEffectiveWeight, toLiftFields, type LiftFormValues } from './LiftFieldInputs';
import { formatLiftTime, formatWeight } from './liftDisplay';

// Action button, matching '/admin/exercises'
const ActionButton = ({ label, icon, onClick, disabled, loading }: {
    label: string, icon: ReactNode, onClick: () => void, disabled: boolean, loading: boolean
}) => {
    return (
        <button
            type="button"
            className={`flex flex-row items-center justify-center gap-1 text-sm font-medium px-2 py-1 rounded-md border-2 border-black text-black
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

// Label & value pair displayed within a lift
const LiftStat = ({ label, value }: { label: string, value: string }) => {
    return (
        <div className="flex flex-col">
            <span className="text-xs text-stone-600">{label}</span>
            <span className="font-semibold">{value}</span>
        </div>
    );
}

// Values displayed for every lift: time, body weight, (added weight), weight, reps, 1RM
const LiftStats = ({ lift, weightCoefficient, useKgs }: { lift: Lift, weightCoefficient: number | null, useKgs: boolean }) => {
    const traditional = weightCoefficient === null;
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-left">
            <LiftStat label="Time" value={formatLiftTime(lift.time)} />
            <LiftStat label="Body weight" value={lift.bodyWeight !== null ? formatWeight(lift.bodyWeight, useKgs) : "—"} />
            {!traditional && <LiftStat label="Added weight" value={lift.addedWeight !== null ? formatWeight(lift.addedWeight, useKgs) : "—"} />}
            <LiftStat label={traditional ? "Weight" : "Equivalent weight"} value={formatWeight(lift.weight, useKgs)} />
            <LiftStat label="Reps" value={String(lift.reps)} />
            <LiftStat label="Estimated 1RM" value={formatWeight(lift.oneRepMax, useKgs)} />
        </div>
    );
}

interface LiftRowProps {
    lift: Lift;
    weightCoefficient: number | null;
    useKgs: boolean;
    accountBodyWeight: number | null;
    onUseInTable: (lift: Lift) => void;
    onUpdated: (lift: Lift, bodyWeightUpdated: boolean) => void;
    onDeleted: (id: string) => void;
}

// A single previous lift, which can be used in the rep table, edited, or deleted
const LiftRow = ({ lift, weightCoefficient, useKgs, accountBodyWeight, onUseInTable, onUpdated, onDeleted }: LiftRowProps) => {

    // Form inputs
    const [editing, setEditing] = useState(false);
    const [values, setValues] = useState<LiftFormValues>(() => fromLift(lift, weightCoefficient));
    const [resetKey, setResetKey] = useState(0);

    // Form outputs
    const [fieldErrors, setFieldErrors] = useState<LiftFieldErrors>(EMPTY_LIFT_FIELD_ERRORS);
    const [output, setOutput] = useState<string[]>([]);
    const [outputColor, setOutputColor] = useState<"black" | "red" | "green">("black");
    const [formLoading, setFormLoading] = useState(false);

    function clearOutput() {
        setOutput([]);
        setOutputColor("black");
    }

    function startEditing() {
        setValues(fromLift(lift, weightCoefficient));
        setResetKey(resetKey + 1);
        setFieldErrors(EMPTY_LIFT_FIELD_ERRORS);
        clearOutput();
        setEditing(true);
    }

    function cancelEditing() {
        setFieldErrors(EMPTY_LIFT_FIELD_ERRORS);
        clearOutput();
        setEditing(false);
    }

    async function handleSave() {

        document.body.style.cursor = "wait";
        setFormLoading(true);

        // Clears output fields
        clearOutput();
        setFieldErrors(EMPTY_LIFT_FIELD_ERRORS);

        // Checks validity of input fields, then the calculated weight
        const fields = toLiftFields(values, weightCoefficient);
        const fieldsCheck = checkLiftFields(fields, weightCoefficient);
        const weightCheck = checkCalculatedWeight(getFormEffectiveWeight(values, weightCoefficient, accountBodyWeight), weightCoefficient);

        if (!fieldsCheck.status || !weightCheck.status) {
            setFieldErrors(!fieldsCheck.status ? fieldsCheck.errors : { ...EMPTY_LIFT_FIELD_ERRORS, ...weightCheck.errors });
            document.body.style.cursor = "default";
            setFormLoading(false);
            return;
        }

        // Updates lift using '/api/lifts/update' endpoint
        const result = await fetch('/api/lifts/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: lift.id,
                ...fields,
            }),
        });

        // Displays error / success from above endpoint
        const data = await result.json();
        if (!result.ok) {
            if (data.details) {
                setFieldErrors({ ...EMPTY_LIFT_FIELD_ERRORS, ...data.details });
            }
            setOutput([data.error ?? "Something went wrong. Try again later."]);
            setOutputColor("red");
            document.body.style.cursor = "default";
            setFormLoading(false);
            return;
        }
        else {
            setOutput(["Lift updated." + (data.bodyWeightUpdated ? " Your account body weight was updated." : "")]);
            setOutputColor("green");
            setEditing(false);
            document.body.style.cursor = "default";
            setFormLoading(false);
            onUpdated(data.lift, data.bodyWeightUpdated === true);
            return;
        }
    }

    async function handleDelete() {

        const confirmed = window.confirm(`Are you sure you would like to delete this lift (${formatWeight(lift.weight, useKgs)} × ${lift.reps}, ${formatLiftTime(lift.time)})? This action is permanent.`);
        if (!confirmed) return;

        document.body.style.cursor = "wait";
        setFormLoading(true);
        clearOutput();

        // Deletes lift using '/api/lifts/delete' endpoint
        const result = await fetch('/api/lifts/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: lift.id }),
        });

        const data = await result.json();
        document.body.style.cursor = "default";
        setFormLoading(false);

        if (!result.ok) {
            setOutput([data.error ?? "Something went wrong. Try again later."]);
            setOutputColor("red");
            return;
        }

        onDeleted(lift.id);
    }

    return (
        <div className="flex flex-col p-3 rounded-md border-2 border-black bg-slate-100">

            {editing ? (
                <div className="w-full">
                    <LiftFieldInputs
                        values={values}
                        setValues={setValues}
                        errors={fieldErrors}
                        setErrors={setFieldErrors}
                        weightCoefficient={weightCoefficient}
                        useKgs={useKgs}
                        resetKey={resetKey}
                        idPrefix={`edit-${lift.id}`}
                        onChange={clearOutput}
                    />
                </div>
            ) : (
                <LiftStats lift={lift} weightCoefficient={weightCoefficient} useKgs={useKgs} />
            )}

            <div className="flex flex-row flex-wrap gap-2 mt-2">
                {editing ? <>
                    <ActionButton label="Save" icon={<Save size={16} />} disabled={formLoading} loading={formLoading} onClick={handleSave} />
                    <ActionButton label="Cancel" icon={<X size={16} />} disabled={formLoading} loading={false} onClick={cancelEditing} />
                </> : <>
                    <ActionButton label="Use in table" icon={<Calculator size={16} />} disabled={formLoading} loading={false} onClick={() => onUseInTable(lift)} />
                    <ActionButton label="Edit" icon={<Pencil size={16} />} disabled={formLoading} loading={false} onClick={startEditing} />
                </>}
                <ActionButton label="Delete" icon={<Trash2 size={16} />} disabled={formLoading} loading={formLoading} onClick={handleDelete} />
            </div>

            {output.length > 0 && (
                <ul className={`w-full flex flex-col items-start text-sm list-disc mt-1 ${outputColor === "red" ? "text-red-600" : outputColor === "green" ? "text-green-600" : "text-black"}`}>
                    {output.map((line, i) => {
                        return <li key={i} className="ml-5 text-left">{line}</li>
                    })}
                </ul>
            )}

        </div>
    );
}

// Displays the user's best lift (highest estimated 1RM) for this exercise
export const PreviousBest = ({ lift, weightCoefficient, useKgs }: { lift: Lift, weightCoefficient: number | null, useKgs: boolean }) => {
    const traditional = weightCoefficient === null;
    return (
        <div className="w-full px-4 mt-3">
            <div className="w-full flex flex-col items-center p-3 rounded-md border-2 border-black bg-white">
                <div className="text-sm font-semibold text-stone-600">Previous best</div>
                <div className="text-2xl sm:text-3xl font-bold">
                    {!traditional && <span className="text-base sm:text-lg font-normal mr-1">Equivalent to</span>}
                    {formatWeight(lift.weight, useKgs)} × {lift.reps}
                </div>
                <div className="sm:text-lg">Estimated 1RM: <span className="font-semibold">{formatWeight(lift.oneRepMax, useKgs)}</span></div>
                {!traditional && (lift.bodyWeight !== null || lift.addedWeight !== null) && (
                    <div className="text-sm text-stone-600">
                        {lift.bodyWeight !== null && `Body weight ${formatWeight(lift.bodyWeight, useKgs)}`}
                        {lift.bodyWeight !== null && lift.addedWeight !== null && ", "}
                        {lift.addedWeight !== null && `+${formatWeight(lift.addedWeight, useKgs)} added`}
                    </div>
                )}
                <div className="text-sm text-stone-600">{formatLiftTime(lift.time)}</div>
            </div>
        </div>
    );
}

interface LiftHistoryProps {
    lifts: Lift[] | null;       // Oldest first, as returned by '/api/lifts/get'. null while loading.
    error: string;
    weightCoefficient: number | null;
    useKgs: boolean;
    accountBodyWeight: number | null;
    onUseInTable: (lift: Lift) => void;
    onUpdated: (lift: Lift, bodyWeightUpdated: boolean) => void;
    onDeleted: (id: string) => void;
}

// Collapsible list of the user's previous lifts for this exercise, newest first
const LiftHistory = ({ lifts, error, weightCoefficient, useKgs, accountBodyWeight, onUseInTable, onUpdated, onDeleted }: LiftHistoryProps) => {

    const [expanded, setExpanded] = useState(true);

    return (
        <div className="w-full px-4 mt-3 mb-2">
            <div className="w-full flex flex-col items-center p-3 rounded-md border-2 border-black bg-white">

                {/* Matches 'Equivalent Lifts' */}
                <button
                    type="button"
                    aria-expanded={expanded}
                    className="text-lg sm:text-xl font-semibold flex items-center hover:bg-stone-200 px-2 py-1 rounded-md hover:cursor-pointer"
                    onClick={() => setExpanded(!expanded)}
                >
                    Previous Lifts{lifts !== null && ` (${lifts.length})`}
                    <ArrowDown className={`ml-1 transition-[rotate] duration-300 ease-in-out ${expanded && "-rotate-180"}`} />
                </button>

                {/* Hidden rather than unmounted while closed, so edits in progress aren't lost */}
                <div className={`w-full flex-col items-center ${expanded ? "flex" : "hidden"}`}>
                    <div className="text-sm text-stone-600 mb-2">
                        Newest first. Use a lift in the table above, or edit / delete it.
                    </div>

                    <div className="w-full max-h-128 overflow-y-auto flex flex-col gap-2 border-2 border-black p-2">
                        {error !== "" ? (
                            <p className="py-2 text-center text-sm text-red-600">{error}</p>
                        ) : lifts === null ? (
                            <p className="py-2 text-center text-sm text-stone-600">Loading lifts...</p>
                        ) : lifts.length === 0 ? (
                            <p className="py-2 text-center text-sm text-stone-600">No lifts logged yet.</p>
                        ) : (
                            [...lifts].reverse().map((lift) => (
                                <LiftRow
                                    key={lift.id}
                                    lift={lift}
                                    weightCoefficient={weightCoefficient}
                                    useKgs={useKgs}
                                    accountBodyWeight={accountBodyWeight}
                                    onUseInTable={onUseInTable}
                                    onUpdated={onUpdated}
                                    onDeleted={onDeleted}
                                />
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

export default LiftHistory;