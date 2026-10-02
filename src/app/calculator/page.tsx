'use client'

import { Suspense, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { allowedFormula, getOneRepMax, getWeight, poundsToKgs, kgsToPounds } from '@/lib/formulas';
import { CircleQuestionMark, BicepsFlexed, LogIn, ArrowDown, MoveHorizontal } from 'lucide-react'
import UnitToggle from '@/app/components/UnitToggle';
import { useUnitContext } from '@/app/components/contextProviders/UnitProvider';

// Must mirror 'allowedFormula' from 'lib/formulas.ts':
// "Recommended" | "Brzycki" | "Epley" | "Lombardi" | "OConnor";
const FORMULA_OPTIONS: allowedFormula[] = ["Recommended", "Brzycki", "Epley", "Lombardi", "OConnor"];

// Reads the URL via useSearchParams (needed to persist weight & reps across refreshes/
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

    // Displayed unit, shared across pages & initialized from the user's preference ('UnitProvider')
    const { useKgs, setUseKgs } = useUnitContext();
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

    // Persists one or more values to the URL (without adding a history entry), so weight/reps
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

    // Shared styles, matching inputs & cards elsewhere in this project (e.g. '/exercises')
    const inputClass = "w-full p-2 rounded-md border-2 border-black text-black bg-white";
    const cardClass = "w-full flex flex-col items-center p-3 rounded-md border-2 border-black bg-white";
    const unit = useKgs ? "kg" : "lb";

    return (
        <div className="flex flex-col items-center justify-center text-center p-4 sm:m-4 bg-slate-200 sm:border-t border-b sm:border-l sm:border-r border-black text-black min-w-full sm:min-w-160 sm:w-[60vw]">

            <div className="flex flex-row justify-center text-xl sm:text-2xl font-semibold mb-1">
                Lift Calculator
            </div>

            <div className="text-sm text-stone-600 mx-4 mb-3">
                Estimate your one-rep max from any set, and see what you could lift for other rep counts.
            </div>

            <UnitToggle falseString="Pounds" trueString="Kilograms" value={useKgs} setValue={handleUnitToggle} />

            {/* Inputs */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2 px-4 text-left">
                <div className="flex flex-col gap-1">
                    <label htmlFor="weight" className="font-semibold sm:text-lg">Weight ({useKgs ? "kgs" : "lbs"})</label>
                    <input
                        key={useKgs ? "kg" : "lb"}
                        type="number" id="weight" name="weight" min="1" step="1" defaultValue={displayWeight ?? ""}
                        className={inputClass}
                        onChange={handleWeightChange}
                        onBlur={handleWeightBlur}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="reps" className="font-semibold sm:text-lg">Reps</label>
                    <input
                        type="number" id="reps" name="reps" min="1" step="1" defaultValue={reps ?? ""}
                        className={inputClass}
                        onChange={handleRepsChange}
                        onBlur={handleRepsBlur}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <div className="flex flex-row items-center gap-1">
                        <label htmlFor="formula" className="font-semibold sm:text-lg">Formula</label>
                        <Link href="/calculator/info" title="How the formulas work" aria-label="How the formulas work">
                            <CircleQuestionMark size={20} className="opacity-75 hover:opacity-100 hover:cursor-pointer" />
                        </Link>
                    </div>
                    <select
                        value={formula}
                        id="formula"
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
                </div>
            </div>

            {/* Result */}
            <div className="w-full px-4 mt-3">
                <div className={cardClass}>
                    <div className="text-sm font-semibold text-stone-600">Estimated 1RM</div>
                    <div className="text-3xl sm:text-4xl font-bold mb-3">
                        {oneRepMax !== undefined ? `${oneRepMax.toFixed(2)}${unit}` : "N/A"}
                    </div>

                    {status === "loading" ? (
                        <div className="flex flex-row items-center justify-center sm:text-lg font-medium p-2 px-6 rounded-md border-2 border-black text-black bg-[oklch(63.5%_0.213_47.604)] hover:cursor-wait">
                            Loading...
                        </div>
                    ) : oneRepMax === undefined ? (
                        <div className="flex flex-row items-center justify-center sm:text-lg font-medium p-2 px-6 rounded-md border-2 border-black text-stone-600 bg-stone-300 hover:cursor-not-allowed">
                            <BicepsFlexed className="mr-2" />
                            Enter weight &amp; reps to log
                        </div>
                    ) : status === "authenticated" ? (
                        <Link
                            className="flex flex-row items-center justify-center sm:text-lg font-medium p-2 px-6 rounded-md border-2 border-black text-black bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"
                            href={`/exercises?weight=${weightLbs}&reps=${reps}`}
                        >
                            <BicepsFlexed className="mr-2" />
                            Log this lift
                        </Link>
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
            </div>

            {/* Equivalent lifts */}
            <div className="w-full px-4 mt-3">
                <div className={cardClass}>

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
                            Estimated weight for each rep count, based on your 1RM.
                        </div>

                        <div className="flex flex-row items-center justify-center gap-2 mb-2">
                            <span className="font-semibold">Rep range:</span>
                            <input
                                type="number" id="lowerLimit" name="lowerLimit" aria-label="Lowest rep count" min="1" max={(upperLimit === undefined || isNaN(upperLimit)) ? 10000 : upperLimit - 1} step="1" value={lowerLimit ?? ""}
                                className="w-16 p-1 text-center rounded-md border-2 border-black bg-white"
                                onChange={handleLowerLimitChange}
                            />
                            <MoveHorizontal />
                            <input
                                type="number" id="upperLimit" name="upperLimit" aria-label="Highest rep count" min={(lowerLimit === undefined || isNaN(lowerLimit)) ? 1 : lowerLimit + 1} max="10000" step="1" value={upperLimit ?? ""}
                                className="w-16 p-1 text-center rounded-md border-2 border-black bg-white"
                                onChange={handleUpperLimitChange}
                            />
                        </div>

                        <div className="w-full sm:w-96 max-h-80 overflow-y-auto border-2 border-black sm:text-lg">
                            <div className="sticky top-0 flex flex-row font-semibold bg-slate-200 border-b-2 border-black">
                                <div className="w-1/2 py-1 text-center border-r border-black">Reps</div>
                                <div className="w-1/2 py-1 text-center">Weight</div>
                            </div>
                            {equivalents.length === 0 ? (
                                <div className="py-2 text-sm text-stone-600">Enter weight, reps &amp; a valid rep range.</div>
                            ) : equivalents
                                .filter((equivalent): equivalent is number => equivalent !== undefined)
                                .map((equivalent, index) => {
                                    const rowReps = index + (lowerLimit ?? 0);
                                    return (
                                        <div
                                            key={index}
                                            className={`flex flex-row border-b border-black last:border-b-0 ${rowReps === reps ? "bg-orange-100 font-semibold" : ""}`}
                                        >
                                            <div className="w-1/2 py-0.5 text-center border-r border-black">{rowReps}</div>
                                            <div className="w-1/2 py-0.5 text-center">{`${equivalent.toFixed(2)}${unit}`}</div>
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </>}

                </div>
            </div>

        </div>
    );
}

const Page = () => {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center text-center p-4 sm:m-4 bg-slate-200 sm:border-t border-b sm:border-l sm:border-r border-black text-black min-w-full sm:min-w-160 sm:w-[60vw]">
                Loading...
            </div>
        }>
            <CalculatorContent />
        </Suspense>
    );
}

export default Page;