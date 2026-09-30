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

    const columnWidth = showAddedWeight ? "w-[33.33%]" : "w-[50%]";

    return (
        <div className="min-w-80 w-fit flex flex-col items-center mb-2">

            <button
                type="button"
                className="text-xl sm:text-2xl flex items-center hover:bg-stone-400 p-1 mt-1 mb-2 rounded-md hover:cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                Equivalent Lifts
                <ArrowDown className={`ml-1 transition-[rotate] duration-300 ease-in-out ${expanded && "-rotate-180"}`} />
            </button>

            <div className={`w-full flex flex-col gap-1 sm:text-lg items-center px-4 transition-all ease-in-out duration-300 overflow-hidden ${!expanded ? "max-h-0" : "max-h-64"}`}>

                <div className="flex flex-row items-center">
                    <label htmlFor="table-one-rep-max" className="font-semibold mr-2 text-lg sm:text-xl">1RM {useKgs ? "(kgs)" : "(lbs)"}:</label>
                    <input
                        type="number" id="table-one-rep-max" min="0" step="any"
                        value={oneRepMaxText}
                        className="bg-gray-300 border border-black p-1 w-24 rounded-md"
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
                            className="ml-1 p-1 rounded-full opacity-75 hover:opacity-100 hover:bg-stone-400 hover:cursor-pointer"
                            onClick={() => setOverrideOneRepMax(null)}
                        >
                            <RotateCcw size={20} />
                        </button>
                    )}
                </div>

                <div className="text-xs text-stone-600">
                    {overrideOneRepMax !== null ? "Custom 1RM." : `From ${autoSourceLabel}.`}
                </div>

                <div className="flex flex-row items-center">
                    <label htmlFor="table-formula" className="font-semibold mr-2 text-lg sm:text-xl">Formula:</label>
                    <select
                        value={formula}
                        id="table-formula"
                        onChange={(e) => {
                            if (FORMULA_OPTIONS.includes(e.target.value as allowedFormula)) {
                                setFormula(e.target.value as allowedFormula);
                            }
                        }}
                        className="bg-gray-300 border border-black p-1 rounded-md"
                    >
                        <option value="Recommended">Recommended</option>
                        <option value="Brzycki">Brzycki</option>
                        <option value="Epley">Epley</option>
                        <option value="Lombardi">Lombardi</option>
                        <option value="OConnor">O&apos;Connor</option>
                    </select>
                    <Link href="/calculator/info">
                        <CircleQuestionMark className="ml-1 opacity-75 hover:opacity-100 hover:cursor-pointer" />
                    </Link>
                </div>

                <div className="flex flex-row items-center">
                    <div className="font-semibold mr-2 text-lg sm:text-xl">Rep range:</div>
                    <input
                        type="number" id="lowerLimit" name="lowerLimit" min="1" max={(upperLimit === undefined || isNaN(upperLimit)) ? 10000 : upperLimit - 1} step="1" value={lowerLimit ?? ""}
                        className="bg-gray-300 border sm:border border-black p-1 w-12 h-fit text-sm rounded-md"
                        onChange={handleLowerLimitChange}
                    />
                    <MoveHorizontal className="mx-1" />
                    <input
                        type="number" id="upperLimit" name="upperLimit" min={(lowerLimit === undefined || isNaN(lowerLimit)) ? 1 : lowerLimit + 1} max="10000" step="1" value={upperLimit ?? ""}
                        className="bg-gray-300 border sm:border border-black p-1 w-12 h-fit text-sm rounded-md"
                        onChange={handleUpperLimitChange}
                    />
                </div>
            </div>

            <div className={`w-full ${expanded ? "max-h-60 border border-gray-500 mt-2 mb-1" : "max-h-0 border-none mt-0 mb-0"} transition-all duration-300 ease-in-out overflow-y-auto flex flex-col sm:text-lg`}>
                <div className="flex flex-row justify-between text-lg border-gray-500 sm:text-xl font-semibold">
                    <div className={`${columnWidth} text-center border-r border-gray-500`}>Reps</div>
                    <div className={`${columnWidth} text-center ${showAddedWeight ? "border-r border-gray-500" : ""}`}>
                        {weightCoefficient === null ? "Weight" : "Equivalent"}
                    </div>
                    {showAddedWeight && <div className={`${columnWidth} text-center`}>Added</div>}
                </div>
                {equivalents
                    .filter((equivalent): equivalent is { reps: number, weight: number } => equivalent.weight !== undefined)
                    .map((equivalent) => (
                        <div key={equivalent.reps} className="w-full flex flex-row justify-between border-t border-gray-500">
                            <div className={`${columnWidth} text-center border-r border-gray-500`}>{equivalent.reps}</div>
                            <div className={`${columnWidth} text-center ${showAddedWeight ? "border-r border-gray-500" : ""}`}>{formatWeight(equivalent.weight, useKgs)}</div>
                            {showAddedWeight && <div className={`${columnWidth} text-center`}>{formatAddedWeight(equivalent.weight)}</div>}
                        </div>
                    ))
                }
            </div>

        </div>
    );
}

export default EquivalentLifts;