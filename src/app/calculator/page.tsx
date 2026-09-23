'use client'

import { Suspense, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { allowedFormula, getOneRepMax, getWeight, poundsToKgs, kgsToPounds } from '@/lib/formulas';
import { CircleQuestionMark, BicepsFlexed, LogIn, ArrowDown, MoveHorizontal } from 'lucide-react'

// Must mirror 'allowedFormula' from 'lib/formulas.ts':
// "Recommended" | "Brzycki" | "Epley" | "Lombardi" | "OConnor";
const FORMULA_OPTIONS: allowedFormula[] = ["Recommended", "Brzycki", "Epley", "Lombardi", "OConnor"];

// Simple lb/kg toggle switch, kept inline (rather than as its own component file) so this page remains a single file.
type UnitToggleProps = {
    falseString: string; // Left value (false)
    trueString: string; // Right value (true)
    value: boolean;
    setValue: (value: boolean) => void;
}

const UnitToggle = ({ falseString, trueString, value, setValue }: UnitToggleProps) => {
    return (
        <div className="flex items-center justify-center text-center gap-2 sm:gap-3 mb-2">
            <div
                className={`sm:text-lg transition-all ${value ? "opacity-60" : "font-semibold underline underline-offset-2"} hover:cursor-pointer hover:opacity-100`}
                onClick={() => setValue(false)}
            >
                {falseString}
            </div>

            <button
                type="button"
                onClick={() => setValue(!value)}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-orange-500 hover:cursor-pointer transition-colors hover:bg-[oklch(63.5%_0.213_47.604)] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                aria-label={`Toggle between ${falseString} and ${trueString}`}
                role="switch"
                aria-checked={value}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${value ? "translate-x-6" : "translate-x-1"}`}
                />
            </button>

            <div
                className={`sm:text-lg transition-all ${value ? "font-semibold underline underline-offset-2" : "opacity-60"} hover:cursor-pointer hover:opacity-100`}
                onClick={() => setValue(true)}
            >
                {trueString}
            </div>
        </div>
    );
}

// Reads the URL via useSearchParams (needed to persist the pound/kilogram toggle across refreshes/
// navigation), so it's wrapped in Suspense below.
const CalculatorContent = () => {

    const { status } = useSession();

    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    // Default values
    // 'defaultWeightLbs' is the canonical (always-pounds) default; see 'weightLbs' below for why weight is
    // stored this way rather than as whatever unit is currently displayed.
    const defaultWeightLbs = 100;
    const defaultReps = 5;
    const defaultFormula: allowedFormula = "Recommended";

    const [useKgs, setUseKgs] = useState(searchParams.get('useKgs') === 'true');
    // Weight is stored internally as a single full-precision pounds value, independent of the displayed unit.
    // Toggling units only flips 'useKgs' and never touches this value, so converting back and forth repeatedly
    // can't compound rounding error the way converting-then-storing-then-reconverting would.
    // The 'weight' URL param always holds this canonical pounds value too, regardless of the active unit.
    // Both 'weightLbs' and 'reps' can be undefined (an empty field) rather than snapping to 0, so clearing
    // a field just clears it instead of leaving a stray "0" with the cursor stuck after it.
    // A param that's simply absent (first-ever visit) falls back to the default; a param that's present but
    // empty (the field was explicitly cleared) stays undefined instead, so a cleared field survives a
    // refresh as cleared rather than silently repopulating with the default.
    function parseInitial(paramName: string, isValid: (n: number) => boolean, parse: (raw: string) => number, fallback: number): number | undefined {
        if (!searchParams.has(paramName)) return fallback;
        const raw = searchParams.get(paramName) ?? '';
        if (raw === '') return undefined;
        const value = parse(raw);
        return isValid(value) ? value : fallback;
    }

    const [weightLbs, setWeightLbs] = useState<number | undefined>(
        parseInitial('weight', (n) => !isNaN(n) && n >= 0, parseFloat, defaultWeightLbs)
    );
    const [reps, setReps] = useState<number | undefined>(
        parseInitial('reps', (n) => !isNaN(n) && n >= 0, parseInt, defaultReps)
    );
    const [formula, setFormula] = useState<allowedFormula>(defaultFormula);

    // Equivalent lifts rep range
    const [expanded, setExpanded] = useState(true);
    const [lowerLimit, setLowerLimit] = useState<number | undefined>(1);
    const [upperLimit, setUpperLimit] = useState<number | undefined>(20);

    function roundWeight(value: number) {
        return Math.round(value * 100) / 100;
    }

    // The weight value in whatever unit is currently displayed, derived fresh from the canonical pounds
    // value each render rather than being its own piece of state. Undefined (an empty field) passes through as-is.
    const displayWeight = useMemo(() => {
        if (weightLbs === undefined) return undefined;
        return roundWeight(useKgs ? poundsToKgs(weightLbs) : weightLbs);
    }, [weightLbs, useKgs]);

    // Persists one or more values to the URL (without adding a history entry), so unit/weight/reps all
    // survive a refresh or revisit. An empty string is a valid value here (see 'parseInitial' above) - it's
    // how a cleared field is distinguished from a param that was never set.
    function updateSearchParams(updates: Record<string, string>) {
        const params = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(updates)) {
            params.set(key, value);
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }

    // Flips the displayed unit without touching the underlying canonical weight value.
    function handleUnitToggle(newUseKgs: boolean) {
        setUseKgs(newUseKgs);
        updateSearchParams({ useKgs: String(newUseKgs) });
    }

    // A negative, empty, or otherwise invalid field clears the value (rather than falling back to 0 or
    // accepting a negative), so the input just empties out and is ready for a fresh number instead of
    // leaving a "0" or a rejected negative behind.
    function handleWeightChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = parseFloat(e.target.value);
        if (isNaN(value) || value < 0) {
            setWeightLbs(undefined);
            updateSearchParams({ weight: '' });
            return;
        }
        const newWeightLbs = useKgs ? kgsToPounds(value) : value;
        setWeightLbs(newWeightLbs);
        updateSearchParams({ weight: String(newWeightLbs) });
    }

    // Since the field is uncontrolled, an invalid/negative value isn't automatically wiped from the DOM as
    // the user types (that's the point - see the deprecated-file discussion above); this clears the visible
    // text once they leave the field, rather than leaving stray invalid text sitting in it.
    function handleWeightBlur(e: React.FocusEvent<HTMLInputElement>) {
        const value = parseFloat(e.target.value);
        if (isNaN(value) || value < 0) {
            e.target.value = "";
        }
    }

    function handleRepsChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = parseInt(e.target.value);
        if (isNaN(value) || value < 0) {
            setReps(undefined);
            updateSearchParams({ reps: '' });
            return;
        }
        setReps(value);
        updateSearchParams({ reps: String(value) });
    }

    function handleRepsBlur(e: React.FocusEvent<HTMLInputElement>) {
        const value = parseInt(e.target.value);
        if (isNaN(value) || value < 0) {
            e.target.value = "";
        }
    }

    const oneRepMax = useMemo(() => {
        if (displayWeight === undefined || reps === undefined) return undefined;
        return getOneRepMax(displayWeight, reps, formula);
    }, [displayWeight, reps, formula]);

    const equivalents = useMemo(() => {
        if (oneRepMax === undefined || oneRepMax <= 0 || lowerLimit === undefined || upperLimit === undefined || lowerLimit >= upperLimit) return [];
        return Array.from({ length: upperLimit - lowerLimit + 1 }, (_, i) => {
            const currentReps = i + lowerLimit;
            return getWeight(oneRepMax, currentReps, formula);
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

    return (
        <div className="flex flex-col items-center justify-center text-center p-4 sm:m-4 bg-slate-200 sm:border-t border-b sm:border-l sm:border-r border-black text-black min-w-full sm:min-w-160">

            <div className="flex flex-row justify-center text-xl sm:text-2xl font-semibold mb-2">
                Lift Calculator
            </div>

            <UnitToggle falseString="Pounds" trueString="Kilograms" value={useKgs} setValue={handleUnitToggle} />

            <div className="sm:min-w-96 w-fit flex flex-col mx-4 mb-2 gap-1">
                <div className="min-w-full w-fit flex flex-row items-center justify-between">
                    <label htmlFor="weight" className="font-bold sm:text-lg">Weight {useKgs ? "(kgs)" : "(lbs)"}:</label>
                    <input
                        key={useKgs ? "kg" : "lb"}
                        type="number" id="weight" name="weight" min="1" step="1" defaultValue={displayWeight ?? ""}
                        className="bg-gray-300 border border-black p-1 ml-1 w-30 rounded-md"
                        onChange={handleWeightChange}
                        onBlur={handleWeightBlur}
                    />
                </div>

                <div className="min-w-full w-fit flex flex-row items-center justify-between">
                    <label htmlFor="reps" className="font-bold sm:text-lg">Reps:</label>
                    <input
                        type="number" id="reps" name="reps" min="1" step="1" defaultValue={reps ?? ""}
                        className="bg-gray-300 border border-black p-1 ml-1 w-30 rounded-md"
                        onChange={handleRepsChange}
                        onBlur={handleRepsBlur}
                    />
                </div>

                <div className="min-w-full w-fit flex flex-row items-center justify-between">
                    <label htmlFor="formula" className="font-bold sm:text-lg mr-6">Formula:</label>
                    <div className="flex flex-row items-center">
                        <select
                            value={formula}
                            id="formula"
                            onChange={(e) => {
                                if (FORMULA_OPTIONS.includes(e.target.value as allowedFormula)) {
                                    setFormula(e.target.value as allowedFormula);
                                }
                            }}
                            className="bg-gray-300 border border-black p-1 ml-1 rounded-md"
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
                </div>
            </div>

            <div className="w-full flex flex-col items-center mb-1">
                <div className="text-xl sm:text-2xl mb-3">
                    Estimated 1RM: {oneRepMax !== undefined ? oneRepMax.toFixed(2) : "N/A"}{oneRepMax !== undefined && (useKgs ? "kg" : "lb")}
                </div>

                {status === "loading" ? (
                    <div className="flex flex-row items-center justify-center sm:text-lg font-medium p-2 mx-4 rounded-md border sm:border-2 border-black text-black bg-[oklch(63.5%_0.213_47.604)] hover:cursor-wait">
                        Loading...
                    </div>
                ) : oneRepMax === undefined ? (
                    <div className="flex flex-row items-center justify-center sm:text-lg font-medium p-2 mx-4 rounded-md border sm:border-2 border-black text-black bg-gray-400 opacity-60 hover:cursor-not-allowed">
                        <BicepsFlexed className="mr-1" />
                        Enter weight &amp; reps to log
                    </div>
                ) : status === "authenticated" ? (
                    <Link
                        className="flex flex-row items-center justify-center sm:text-lg font-medium p-2 mx-4 rounded-md border sm:border-2 border-black text-black bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"
                        href={`/exercises?weight=${displayWeight}&reps=${reps}&useKgs=${useKgs}`}
                    >
                        <BicepsFlexed className="mr-1" />
                        Log this lift
                    </Link>
                ) : (
                    <Link
                        className="flex flex-row items-center justify-center sm:text-lg font-medium p-2 mx-4 rounded-md border sm:border-2 border-black text-black bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"
                        href="/login"
                    >
                        <LogIn className="mr-1" />
                        Sign in to log lift
                    </Link>
                )}
            </div>

            <div className="min-w-80 w-fit flex flex-col items-center mb-2">

                <button
                    type="button"
                    className="text-xl sm:text-2xl flex items-center hover:bg-stone-400 p-1 mt-1 mb-2 rounded-md hover:cursor-pointer"
                    onClick={() => setExpanded(!expanded)}
                >
                    Equivalent Lifts
                    <ArrowDown className={`ml-1 transition-[rotate] duration-300 ease-in-out ${expanded && "-rotate-180"}`} />
                </button>

                <div className={`w-full flex flex-row sm:text-lg justify-center items-center px-4 transition-all ease-in-out duration-300 overflow-hidden ${!expanded ? "max-h-0" : "max-h-64"}`}>
                    <div className="font-semibold mr-2 text-lg sm:text-xl">Rep range:</div>
                    <div className="flex items-center">
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
                        <div className="w-[50%] text-center border-r border-gray-500">Reps</div>
                        <div className="w-[50%] text-center">Weight</div>
                    </div>
                    {equivalents
                        .filter((equivalent): equivalent is number => equivalent !== undefined)
                        .map((equivalent, index) => (
                            <div key={index} className="w-full flex flex-row justify-between border-t border-gray-500">
                                <div className="w-[50%] text-center border-r border-gray-500">{index + (lowerLimit ?? 0)}</div>
                                <div className="w-[50%] text-center">{`${equivalent.toFixed(2)}${useKgs ? "kg" : "lb"}`}</div>
                            </div>
                        ))
                    }
                </div>

            </div>

        </div>
    );
}

const Page = () => {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center text-center p-4 sm:m-4 bg-slate-200 sm:border-t border-b sm:border-l sm:border-r border-black text-black min-w-full sm:min-w-160">
                Loading...
            </div>
        }>
            <CalculatorContent />
        </Suspense>
    );
}

export default Page;