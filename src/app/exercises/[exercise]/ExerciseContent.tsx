'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getOneRepMax } from '@/lib/formulas';
import type { Exercise, Lift } from '@/lib/models';
import { useExerciseContext } from '@/app/components/contextProviders/ExerciseProvider';
import UnitToggle from '@/app/components/UnitToggle';
import LogLiftForm from './LogLiftForm';
import EquivalentLifts from './EquivalentLifts';
import LiftHistory, { PreviousBest } from './LiftHistory';
import EditExercisePanel from './EditExercisePanel';
import { getFormEffectiveWeight, toDateTimeInputValue, usesAccountBodyWeight, type LiftFormValues } from './LiftFieldInputs';

// Defaults when the URL has no 'weight' / 'reps' params, matching '/calculator'
const DEFAULT_WEIGHT_LBS = 100;
const DEFAULT_ADDED_WEIGHT_LBS = 0;
const DEFAULT_REPS = 5;

const PANEL_CLASS = "flex flex-col items-center justify-center text-center p-4 sm:m-4 bg-slate-200 sm:border-t border-b sm:border-l sm:border-r border-black text-black min-w-full sm:min-w-160 sm:w-[60vw]";

// Small label displayed under an exercise's name (category, body parts, tags)
const Tag = ({ tag }: { tag: string }) => {
    return (
        <span className="w-fit h-fit px-1 py-0.5 m-0.5 inline-block font-semibold bg-slate-300 rounded-md">{tag}</span>
    );
}

// Label displayed next to an exercise's name for the user's own exercises (custom, suggested, rejected)
const StatusLabel = ({ label, color }: { label: string, color: "orange" | "green" | "red" }) => {
    return (
        <span className={`w-fit h-fit px-1 py-0.5 text-xs font-semibold rounded-md border border-black
            ${color === "orange" ? "bg-orange-500" : color === "green" ? "bg-green-300" : "bg-red-300"}`}>
            {label}
        </span>
    );
}

// Sorted oldest first, matching '/api/lifts/get'
function sortLifts(lifts: Lift[]): Lift[] {
    return [...lifts].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

interface ExerciseDetailProps {
    exercise: Exercise;
    onExerciseUpdated: (exercise: Exercise) => void;
    onExerciseDeleted: (exercise: Exercise) => void;
}

// The page for a single exercise, once it has been found
const ExerciseDetail = ({ exercise, onExerciseUpdated, onExerciseDeleted }: ExerciseDetailProps) => {

    const { data, status, update } = useSession();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const weightCoefficient = exercise.weightCoefficient;
    const traditional = weightCoefficient === null;
    // Exercises from '/api/exercises/get' with a userId are always the current user's own
    const isOwned = exercise.userId !== null;

    // Stored in pounds
    const accountBodyWeight: number | null = useMemo(() =>
        data?.user?.bodyWeight ?? null,
        [data]
    );

    // Unit toggle. The URL's 'useKgs' param sets the initial unit, and is kept updated like '/calculator'.
    // Weights in the URL are always in pounds.
    const [useKgs, setUseKgs] = useState(searchParams.get('useKgs') === 'true');

    function handleUnitToggle(newUseKgs: boolean) {
        setUseKgs(newUseKgs);
        const params = new URLSearchParams(searchParams.toString());
        params.set('useKgs', String(newUseKgs));
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }

    // Initial values from the URL ('weight' & 'reps', e.g. from '/calculator'), falling back to defaults.
    // For bodyweight exercises, 'weight' fills added weight instead. Used again when the form is cleared.
    // Like '/calculator', an absent param uses the default, while a present but empty param stays empty.
    const [urlDefaults] = useState(() => {
        function parseInitial(paramName: string, parse: (raw: string) => number, fallback: number): number | undefined {
            if (!searchParams.has(paramName)) return fallback;
            const raw = searchParams.get(paramName) ?? '';
            if (raw === '') return undefined;
            const value = parse(raw);
            return (!isNaN(value) && value >= 0) ? value : fallback;
        }
        return {
            weight: parseInitial('weight', parseFloat, traditional ? DEFAULT_WEIGHT_LBS : DEFAULT_ADDED_WEIGHT_LBS),
            reps: parseInitial('reps', parseInt, DEFAULT_REPS),
        };
    });

    // Log form state (pounds). Time defaults to now, and is only sent if edited.
    function makeLogValues(bodyWeight: number | null): LiftFormValues {
        return {
            weight: traditional ? urlDefaults.weight : undefined,
            addedWeight: traditional ? undefined : urlDefaults.weight,
            bodyWeight: bodyWeight ?? undefined,
            reps: urlDefaults.reps,
            time: toDateTimeInputValue(new Date()),
            timeEdited: false,
        };
    }

    const [logValues, setLogValues] = useState<LiftFormValues>(() => makeLogValues(accountBodyWeight));
    // Changing this re-mounts the log form's (uncontrolled) inputs with the current values
    const [logResetKey, setLogResetKey] = useState(0);

    // Fills body weight from the account once the session loads (if the user hasn't entered one)
    const bodyWeightPrefilled = useRef(accountBodyWeight !== null);
    useEffect(() => {
        if (bodyWeightPrefilled.current || status === "loading") return;
        bodyWeightPrefilled.current = true;
        if (accountBodyWeight !== null && logValues.bodyWeight === undefined) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLogValues((current) => ({ ...current, bodyWeight: accountBodyWeight }));
            setLogResetKey((current) => current + 1);
        }
    }, [status, accountBodyWeight, logValues.bodyWeight]);

    // Current set's equivalent weight & estimated 1RM (pounds), matching how '/api/lifts/create' calculates them
    const effectiveWeight = getFormEffectiveWeight(logValues, weightCoefficient, accountBodyWeight);
    const currentOneRepMax = (effectiveWeight !== undefined && effectiveWeight > 0 && logValues.reps !== undefined && logValues.reps > 0)
        ? getOneRepMax(effectiveWeight, logValues.reps, "Recommended")
        : undefined;

    // User's lifts for this exercise, oldest first. null while loading (or signed out).
    const [lifts, setLifts] = useState<Lift[] | null>(null);
    const [liftsError, setLiftsError] = useState("");

    // Fetches lifts using '/api/lifts/get' endpoint once signed in
    useEffect(() => {
        if (status !== "authenticated") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLifts(null);
            return;
        }

        let cancelled = false;

        async function fetchLifts() {
            setLiftsError("");
            try {
                const result = await fetch(`/api/lifts/get?exerciseId=${encodeURIComponent(exercise.id)}`);
                const data = await result.json();
                if (cancelled) return;

                if (!result.ok) {
                    setLiftsError(data.error ?? "Something went wrong. Try again later.");
                }
                else {
                    setLifts(data.lifts);
                }
            }
            catch {
                if (cancelled) return;
                setLiftsError("Server failed to respond. Confirm internet connection or try again later.");
            }
        }
        fetchLifts();

        return () => { cancelled = true; };
    }, [status, exercise.id]);

    // Best lift (highest estimated 1RM)
    const bestLift: Lift | undefined = useMemo(() => {
        if (lifts === null || lifts.length === 0) return undefined;
        return lifts.reduce((best, lift) => lift.oneRepMax > best.oneRepMax ? lift : best);
    }, [lifts]);

    // Rep table 1RM set by the user (pounds). null uses the previous best, or the current set if there is none.
    const [tableOneRepMax, setTableOneRepMax] = useState<number | null>(null);

    async function handleLogged(lift: Lift, bodyWeightUpdated: boolean) {
        setLifts((current) => current === null ? [lift] : sortLifts([...current, lift]));

        // Clears the form back to its defaults
        setLogValues(makeLogValues(bodyWeightUpdated ? lift.bodyWeight : accountBodyWeight));
        setLogResetKey(logResetKey + 1);

        if (bodyWeightUpdated) await update(); // Updates { data, status } ('useSession')
    }

    async function handleLiftUpdated(lift: Lift, bodyWeightUpdated: boolean) {
        setLifts((current) => current === null ? current : sortLifts(current.map((l) => l.id === lift.id ? lift : l)));
        if (bodyWeightUpdated) await update();
    }

    function handleLiftDeleted(id: string) {
        setLifts((current) => current === null ? current : current.filter((l) => l.id !== id));
    }

    return (
        <div className={PANEL_CLASS}>

            {/* Exercise info */}
            <div className="flex flex-row flex-wrap items-center justify-center gap-1 mb-1">
                <span className="text-xl sm:text-2xl font-semibold mr-1">{exercise.name}</span>
                {isOwned && <StatusLabel label="Custom" color="orange" />}
                {isOwned && exercise.isSuggested && <StatusLabel label="Suggested" color="green" />}
                {isOwned && exercise.isRejected && <StatusLabel label="Rejected" color="red" />}
            </div>

            <div className="text-sm text-black mb-1">
                <Tag tag={exercise.category} />
                {exercise.bodyParts.map((part) => (
                    <Tag key={part} tag={part} />
                ))}
                {exercise.tags.map((tag) => (
                    <Tag key={tag} tag={tag} />
                ))}
            </div>

            {exercise.description !== null && (
                <div className="w-0 min-w-full px-4 sm:text-lg whitespace-pre-wrap mb-1">
                    {exercise.description}
                </div>
            )}

            {!traditional && (
                <div className="w-0 min-w-full px-4 text-sm text-stone-600 mb-1">
                    {weightCoefficient === 0
                        ? "Bodyweight exercise: estimated from your body weight."
                        : `Weighted bodyweight exercise: equivalent weight = body weight + added weight ÷ ${weightCoefficient}.`}
                </div>
            )}

            {isOwned && (
                <EditExercisePanel
                    exercise={exercise}
                    liftCount={lifts?.length ?? null}
                    onUpdated={onExerciseUpdated}
                    onDeleted={() => onExerciseDeleted(exercise)}
                />
            )}

            <div className="w-full border-t border-black my-2" />

            <UnitToggle falseString="Pounds" trueString="Kilograms" value={useKgs} setValue={handleUnitToggle} />

            <LogLiftForm
                exerciseId={exercise.id}
                weightCoefficient={weightCoefficient}
                values={logValues}
                setValues={setLogValues}
                resetKey={logResetKey}
                useKgs={useKgs}
                sessionStatus={status}
                effectiveWeight={effectiveWeight}
                oneRepMax={currentOneRepMax}
                usingAccountBodyWeight={usesAccountBodyWeight(logValues, weightCoefficient, accountBodyWeight)}
                accountBodyWeight={accountBodyWeight}
                onLogged={handleLogged}
            />

            {bestLift !== undefined && (
                <PreviousBest lift={bestLift} weightCoefficient={weightCoefficient} useKgs={useKgs} />
            )}

            <EquivalentLifts
                autoOneRepMax={bestLift?.oneRepMax ?? currentOneRepMax}
                autoSourceLabel={bestLift !== undefined ? "your previous best" : "the set above"}
                overrideOneRepMax={tableOneRepMax}
                setOverrideOneRepMax={setTableOneRepMax}
                useKgs={useKgs}
                weightCoefficient={weightCoefficient}
                bodyWeight={logValues.bodyWeight ?? accountBodyWeight ?? undefined}
            />

            {status === "authenticated" && (
                <LiftHistory
                    lifts={lifts}
                    error={liftsError}
                    weightCoefficient={weightCoefficient}
                    useKgs={useKgs}
                    accountBodyWeight={accountBodyWeight}
                    onUseInTable={(lift) => setTableOneRepMax(lift.oneRepMax)}
                    onUpdated={handleLiftUpdated}
                    onDeleted={handleLiftDeleted}
                />
            )}

        </div>
    );
}

// Finds the exercise matching the URL slug in the exercise provider, refreshing it on each visit
const ExerciseContent = () => {

    const { status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams<{ exercise: string }>();
    const slug = decodeURIComponent(params.exercise);

    const { exercises, isLoading, error, refreshExercises, upsertExercise, removeExercise } = useExerciseContext();

    // Refreshes exercises each visit once session has loaded, displaying previous data (if any) meanwhile
    useEffect(() => {
        if (status === "loading") return;
        refreshExercises();
    }, [status, refreshExercises]);

    // After a rename, the exercise is displayed under its new slug until navigation to the new URL completes
    const [renamedSlug, setRenamedSlug] = useState<string | null>(null);
    const [deleted, setDeleted] = useState(false);

    const exercise = useMemo(() => {
        if (exercises === null) return undefined;
        return exercises.find((ex) => ex.URLSlug === slug)
            ?? (renamedSlug !== null ? exercises.find((ex) => ex.URLSlug === renamedSlug) : undefined);
    }, [exercises, slug, renamedSlug]);

    function handleExerciseUpdated(updated: Exercise) {
        upsertExercise(updated);
        if (updated.URLSlug !== slug) {
            setRenamedSlug(updated.URLSlug);
            const query = searchParams.toString();
            router.replace(`/exercises/${updated.URLSlug}${query ? "?" + query : ""}`, { scroll: false });
        }
    }

    function handleExerciseDeleted(deletedExercise: Exercise) {
        setDeleted(true);
        removeExercise(deletedExercise.id);
        router.push('/exercises');
    }

    if (deleted) {
        return (
            <div className={PANEL_CLASS}>
                <div className="flex flex-row justify-center text-lg mx-4 mb-2">
                    Exercise deleted. Returning to exercises...
                </div>
            </div>
        );
    }

    if (exercise === undefined) {
        return (
            <div className={PANEL_CLASS}>
                {/* Still loading, or refreshing (e.g. an exercise created since the last fetch) */}
                {(exercises === null && error === "") || (exercises !== null && isLoading) ? (
                    <div className="flex flex-row justify-center text-lg mx-4 mb-2">
                        Loading...
                    </div>
                ) : exercises === null ? (
                    <div className="flex flex-row justify-center text-sm text-red-600 mx-4 mb-2">
                        {error}
                    </div>
                ) : <>
                    <div className="flex flex-row justify-center text-xl sm:text-2xl font-semibold mb-2">
                        Exercise not found
                    </div>
                    <div className="flex flex-row justify-center sm:text-lg mx-4 mb-2">
                        {status === "authenticated"
                            ? "This exercise doesn't exist, or isn't available to you."
                            : "This exercise doesn't exist, or you may need to sign in to view it."}
                    </div>
                </>}
                <Link
                    href="/exercises"
                    className="text-blue-600 underline sm:no-underline hover:underline"
                >
                    Back to exercises
                </Link>
            </div>
        );
    }

    // Keyed by id so form state resets when switching exercises (but not when renamed)
    return (
        <ExerciseDetail
            key={exercise.id}
            exercise={exercise}
            onExerciseUpdated={handleExerciseUpdated}
            onExerciseDeleted={handleExerciseDeleted}
        />
    );
}

export default ExerciseContent;