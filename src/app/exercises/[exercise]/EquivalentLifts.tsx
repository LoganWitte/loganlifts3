'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, CircleQuestionMark, MoveHorizontal, RotateCcw } from 'lucide-react';
import { allowedFormula, getWeight, kgsToPounds } from '@/lib/formulas';
import { formatWeight, toDisplayWeight } from './liftDisplay';

// Must mirror 'allowedFormula' from 'lib/formulas.ts', matching '/calculator'
const FORMULA_OPTIONS: allowedFormula[] = ["Recommended", "Brzycki", "Epley", "Lombardi", "OConnor"];

interface EquivalentLiftsProps {
    // 1RM (pounds) displayed by default: the user's previous best, otherwise the set being logged
    autoOneRepMax: number | undefined;
    autoSourceLabel: string;
    // 1RM (pounds) set by the user (typed, or chosen from a previous lift). null uses 'autoOneRepMax'.
    overrideOneRepMax: number | null;
    setOverrideOneRepMax: (oneRepMax: number | null) => void;
    useKgs: boolean;
    weightCoefficient: number | null;
    // Body weight (pounds) used for the added weight column (weighted bodyweight exercises)
    bodyWeight: number | undefined;
}

// Rep table ("Equivalent Lifts") with an adjustable 1RM, like '/calculator'.
// For bodyweight exercises, weights are equivalent weights (bodyWeight + addedWeight / k). For weighted
// bodyweight exercises (k > 0), the added weight needed for each rep count is also shown, if a body weight is known.
const EquivalentLifts = ({
    autoOneRepMax, autoSourceLabel, overrideOneRepMax, setOverrideOneRepMax, useKgs, weightCoefficient, bodyWeight,
}: EquivalentLiftsProps) => {

    const [formula, setFormula] = useState<allowedFormula>("Recommended");
    const [expanded, setExpanded] = useState(true);
    const [lowerLimit, setLowerLimit] = useState<number | undefined>(1);
    const [upperLimit, setUpperLimit] = useState<number | undefined>(20);

    const oneRepMax = overrideOneRepMax ?? autoOneRepMax;
    const showAddedWeight = weightCoefficient !== null && weightCoefficient > 0 && bodyWeight !== undefined;

    // 1RM input text, in the displayed unit. Kept in sync with 'oneRepMax' except while the user is typing in it.
    const [oneRepMaxText, setOneRepMaxText] = useState("");
    const oneRepMaxFocused = useRef(false);
    useEffect(() => {
        if (oneRepMaxFocused.current) return;

        setOneRepMaxText(oneRepMax !== undefined ? String(toDisplayWeight(oneRepMax, useKgs)) : "");
    }, [oneRepMax, useKgs]);

    function handleOneRepMaxChange(e: React.ChangeEvent<HTMLInputElement>) {
        setOneRepMaxText(e.target.value);
        const value = parseFloat(e.target.value);
        if (isNaN(value) || value <= 0) return;
        setOverrideOneRepMax(useKgs ? kgsToPounds(value) : value);
    }

    // Weights (pounds) for each rep count in the range
    const equivalents = useMemo(() => {
        if (oneRepMax === undefined || oneRepMax <= 0 || lowerLimit === undefined || upperLimit === undefined || lowerLimit >= upperLimit) return [];
        return Array.from({ length: upperLimit - lowerLimit + 1 }, (_, i) => {
            const currentReps = i + lowerLimit;
            return { reps: currentReps, weight: getWeight(oneRepMax, currentReps, formula) };
        });
    }, [oneRepMax, lowerLimit, upperLimit, formula]);

    function handleLowerLimitChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = parseInt(e.target.value);
        setLowerLimit((isNaN(value) || value < 0) ? undefined : value);
    }
    function handleUpperLimitChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = parseInt(e.target.value);
        setUpperLimit((isNaN(value) || value < 0) ? undefined : value);
    }

    // Added weight needed for an equivalent weight: (weight - bodyWeight) * k. "—" if body weight alone is enough.
    function formatAddedWeight(weight: number): string {
        const added = (weight - bodyWeight!) * weightCoefficient!;
        return added >= 0 ? formatWeight(added, useKgs) : "—";
    }

    const columnWidth = showAddedWeight ? "w-1/3" : "w-1/2";

    // Shared input style, matching '/calculator'
    const inputClass = "p-1 rounded-md border-2 border-black bg-white";

    return (
        <div className="w-full px-4 mt-3 mb-2">
            <div className="w-full flex flex-col items-center p-3 rounded-md border-2 border-black bg-white">

                <button
                    type="button"
                    aria-expanded={expanded}
                    className="text-lg sm:text-xl font-semibold flex items-center hover:bg-stone-200 px-2 py-1 rounded-md hover:cursor-pointer"
                    onClick={() => setExpanded(!expanded)}
                >
                    Equivalent Lifts
                    <ArrowDown className={`ml-1 transition-[rotate] duration-300 ease-in-out ${expanded && "-rotate-180"}`} />
                </button>

                {expanded && <>
                    <div className="text-sm text-stone-600 mb-2">
                        Estimated {weightCoefficient === null ? "weight" : "equivalent weight"} for each rep count, based on a 1RM.
                    </div>

                    <div className="flex flex-row flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-2">

                        <div className="flex flex-col items-center">
                            <div className="flex flex-row items-center gap-2">
                                <label htmlFor="table-one-rep-max" className="font-semibold">1RM ({useKgs ? "kgs" : "lbs"}):</label>
                                <input
                                    type="number" id="table-one-rep-max" min="0" step="any"
                                    value={oneRepMaxText}
                                    className={`${inputClass} w-24`}
                                    onChange={handleOneRepMaxChange}
                                    onFocus={() => { oneRepMaxFocused.current = true; }}
                                    onBlur={() => {
                                        oneRepMaxFocused.current = false;
                                        setOneRepMaxText(oneRepMax !== undefined ? String(toDisplayWeight(oneRepMax, useKgs)) : "");
                                    }}
                                />
                                {overrideOneRepMax !== null && (
                                    <button
                                        type="button"
                                        title={`Reset to ${autoSourceLabel}`}
                                        aria-label={`Reset to ${autoSourceLabel}`}
                                        className="p-1 rounded-full opacity-75 hover:opacity-100 hover:bg-stone-200 hover:cursor-pointer"
                                        onClick={() => setOverrideOneRepMax(null)}
                                    >
                                        <RotateCcw size={20} />
                                    </button>
                                )}
                            </div>
                            <div className="text-xs text-stone-600">
                                {overrideOneRepMax !== null ? "Custom 1RM." : `From ${autoSourceLabel}.`}
                            </div>
                        </div>

                        <div className="flex flex-row items-center gap-2">
                            <label htmlFor="table-formula" className="font-semibold">Formula:</label>
                            <select
                                value={formula}
                                id="table-formula"
                                onChange={(e) => {
                                    if (FORMULA_OPTIONS.includes(e.target.value as allowedFormula)) {
                                        setFormula(e.target.value as allowedFormula);
                                    }
                                }}
                                className={`${inputClass} hover:cursor-pointer`}
                            >
                                <option value="Recommended">Recommended</option>
                                <option value="Brzycki">Brzycki</option>
                                <option value="Epley">Epley</option>
                                <option value="Lombardi">Lombardi</option>
                                <option value="OConnor">O&apos;Connor</option>
                            </select>
                            <Link href="/calculator/info" title="How the formulas work" aria-label="How the formulas work">
                                <CircleQuestionMark size={20} className="opacity-75 hover:opacity-100 hover:cursor-pointer" />
                            </Link>
                        </div>

                        <div className="flex flex-row items-center gap-2">
                            <span className="font-semibold">Rep range:</span>
                            <input
                                type="number" id="lowerLimit" name="lowerLimit" aria-label="Lowest rep count" min="1" max={(upperLimit === undefined || isNaN(upperLimit)) ? 10000 : upperLimit - 1} step="1" value={lowerLimit ?? ""}
                                className={`${inputClass} w-16 text-center`}
                                onChange={handleLowerLimitChange}
                            />
                            <MoveHorizontal />
                            <input
                                type="number" id="upperLimit" name="upperLimit" aria-label="Highest rep count" min={(lowerLimit === undefined || isNaN(lowerLimit)) ? 1 : lowerLimit + 1} max="10000" step="1" value={upperLimit ?? ""}
                                className={`${inputClass} w-16 text-center`}
                                onChange={handleUpperLimitChange}
                            />
                        </div>

                    </div>

                    <div className={`w-full ${showAddedWeight ? "sm:w-[32rem]" : "sm:w-96"} max-h-80 overflow-y-auto border-2 border-black sm:text-lg`}>
                        <div className="sticky top-0 flex flex-row font-semibold bg-slate-200 border-b-2 border-black">
                            <div className={`${columnWidth} py-1 text-center border-r border-black`}>Reps</div>
                            <div className={`${columnWidth} py-1 text-center ${showAddedWeight ? "border-r border-black" : ""}`}>
                                {weightCoefficient === null ? "Weight" : "Equivalent"}
                            </div>
                            {showAddedWeight && <div className={`${columnWidth} py-1 text-center`}>Added</div>}
                        </div>
                        {equivalents.length === 0 ? (
                            <div className="py-2 text-center text-sm text-stone-600">Enter a 1RM & a valid rep range.</div>
                        ) : equivalents
                            .filter((equivalent): equivalent is { reps: number, weight: number } => equivalent.weight !== undefined)
                            .map((equivalent) => (
                                <div key={equivalent.reps} className="flex flex-row border-b border-black last:border-b-0">
                                    <div className={`${columnWidth} py-0.5 text-center border-r border-black`}>{equivalent.reps}</div>
                                    <div className={`${columnWidth} py-0.5 text-center ${showAddedWeight ? "border-r border-black" : ""}`}>{formatWeight(equivalent.weight, useKgs)}</div>
                                    {showAddedWeight && <div className={`${columnWidth} py-0.5 text-center`}>{formatAddedWeight(equivalent.weight)}</div>}
                                </div>
                            ))
                        }
                    </div>
                </>}

            </div>
        </div>
    );
}

export default EquivalentLifts;