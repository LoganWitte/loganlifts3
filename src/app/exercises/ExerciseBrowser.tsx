'use client'

import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from 'next/link';
import { ArrowUpWideNarrow, ArrowDownWideNarrow, Plus } from 'lucide-react';
import { BODY_PART_OPTIONS, CATEGORY_OPTIONS, type Exercise } from "@/lib/models";
import ExerciseCard, { type CalculatorParams } from "./ExerciseCard";

// Number of exercises shown at once, and how many are added / removed by the show more / fewer arrows
const EXERCISES_STEP = 4;
const DEFAULT_MAX_EXERCISES = 12;

// Search param keys used to save filters in the URL
const SEARCH_PARAM = "search";
const CATEGORY_PARAM = "category";
const BODY_PART_PARAM = "bodyPart";
const MINE_PARAM = "mine";

const Page = () => {

    const { status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Pulls & sanitizes filters from searchParams, falling back to defaults if invalid
    const paramSearch = searchParams.get(SEARCH_PARAM);
    const paramCategory = searchParams.get(CATEGORY_PARAM);
    const paramBodyPart = searchParams.get(BODY_PART_PARAM);

    // Form inputs (filters)
    const [searchQuery, setSearchQuery] = useState(paramSearch ?? "");
    const [category, setCategory] = useState((paramCategory !== null && CATEGORY_OPTIONS.includes(paramCategory)) ? paramCategory : CATEGORY_OPTIONS[0]);
    const [bodyPart, setBodyPart] = useState((paramBodyPart !== null && BODY_PART_OPTIONS.includes(paramBodyPart)) ? paramBodyPart : BODY_PART_OPTIONS[0]);
    const [mineOnly, setMineOnly] = useState(searchParams.get(MINE_PARAM) === "true");
    const [maxExercises, setMaxExercises] = useState(DEFAULT_MAX_EXERCISES);

    // Pulls & sanitizes calculator values from searchParams (e.g. from '/calculator'), passed through to exercise pages
    const calculatorParams: CalculatorParams = useMemo(() => {
        const weightParam = searchParams.get('weight');
        const repsParam = searchParams.get('reps');
        const useKgsParam = searchParams.get('useKgs');

        let weight: number | undefined = weightParam === null ? undefined : parseFloat(weightParam);
        let reps: number | undefined = repsParam === null ? undefined : parseInt(repsParam);
        if (weight !== undefined) {
            weight = isNaN(weight) ? undefined : Math.max(Math.round(weight * 100) / 100, 0);
        }
        if (reps !== undefined) {
            reps = isNaN(reps) ? undefined : Math.max(reps, 0);
        }
        const useKgs = useKgsParam === "true" ? true : useKgsParam === "false" ? false : undefined;

        return { weight, reps, useKgs };
    }, [searchParams]);

    // Saves filters to URL (without adding history entries), preserving any other params (e.g. calculator values)
    // Only non-default filter values are written, keeping the URL short
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());

        const setOrDelete = (key: string, value: string | null) => {
            if (value === null) params.delete(key);
            else params.set(key, value);
        };
        setOrDelete(SEARCH_PARAM, searchQuery.trim().length > 0 ? searchQuery : null);
        setOrDelete(CATEGORY_PARAM, category !== CATEGORY_OPTIONS[0] ? category : null);
        setOrDelete(BODY_PART_PARAM, bodyPart !== BODY_PART_OPTIONS[0] ? bodyPart : null);
        setOrDelete(MINE_PARAM, mineOnly ? "true" : null);

        const query = params.toString();
        if (query === searchParams.toString()) return;
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [searchQuery, category, bodyPart, mineOnly, searchParams, pathname, router]);

    // Fetched data
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState("");

    // Fetches exercises using '/api/exercises/get' endpoint once session has loaded
    // Re-fetches if the user signs in / out, since the result includes the user's own exercises
    useEffect(() => {
        if (status === "loading") return;

        let cancelled = false;

        async function fetchExercises() {
            setIsLoading(true);
            setFetchError("");

            try {
                const result = await fetch('/api/exercises/get');
                const data = await result.json();
                if (cancelled) return;

                if (!result.ok) {
                    setFetchError(data.error ?? "Something went wrong. Try again later.");
                    setExercises([]);
                }
                else {
                    setExercises(data.exercises);
                }
            }
            catch {
                if (cancelled) return;
                setFetchError("Server failed to respond. Confirm internet connection or try again later.");
                setExercises([]);
            }

            setIsLoading(false);
        }
        fetchExercises();

        return () => { cancelled = true; };
    }, [status]);

    // Filters exercises by search query (name, description, tags), category, body part, and ownership
    const filteredExercises = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const ownOnly = mineOnly && status === "authenticated";
        return exercises.filter(
            (ex) =>
                (!ownOnly || ex.userId !== null) &&
                (bodyPart === BODY_PART_OPTIONS[0] || ex.bodyParts.includes(bodyPart as Exercise["bodyParts"][number])) &&
                (category === CATEGORY_OPTIONS[0] || ex.category === category) &&
                (ex.name.toLowerCase().includes(query) ||
                    (ex.description?.toLowerCase().includes(query) ?? false) ||
                    ex.tags.some((tag) => tag.toLowerCase().includes(query)))
        );
    }, [exercises, searchQuery, category, bodyPart, mineOnly, status]);

    const shownCount = Math.min(maxExercises, filteredExercises.length);

    function showMore() {
        if (maxExercises < filteredExercises.length) {
            setMaxExercises(maxExercises + EXERCISES_STEP);
        }
    }

    function showFewer() {
        // Snaps down to the nearest step below the number of results, if showing all results
        if (maxExercises > filteredExercises.length) {
            setMaxExercises(Math.max(EXERCISES_STEP, filteredExercises.length % EXERCISES_STEP === 0
                ? filteredExercises.length - EXERCISES_STEP
                : filteredExercises.length - filteredExercises.length % EXERCISES_STEP));
        }
        else {
            setMaxExercises(Math.max(EXERCISES_STEP, maxExercises - EXERCISES_STEP));
        }
    }

    return (
        <div className="flex flex-col items-center justify-center text-center p-4 sm:m-4 bg-slate-200 sm:border-t border-b sm:border-l sm:border-r border-black text-black min-w-full sm:min-w-160 sm:w-[60vw]">

            <div className="flex flex-row justify-center text-xl sm:text-2xl font-semibold mb-2">
                Exercises
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col w-full">

                <input
                    type="text"
                    aria-label="Search exercises"
                    className="flex flex-row justify-center p-2 mx-4 rounded-md border-2 border-black text-black bg-white"
                    placeholder="Search by name, description, or tag"
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setMaxExercises(DEFAULT_MAX_EXERCISES);
                    }}
                />

                <div className="flex flex-col sm:flex-row gap-2 mx-4 mt-2">
                    <select
                        aria-label="Filter by category"
                        className="grow p-2 rounded-md border-2 border-black text-black bg-white hover:cursor-pointer"
                        value={category}
                        onChange={(e) => {
                            setCategory(e.target.value);
                            setMaxExercises(DEFAULT_MAX_EXERCISES);
                        }}
                    >
                        {CATEGORY_OPTIONS.map((option) => {
                            return <option key={option} value={option}>{option}</option>
                        })}
                    </select>

                    <select
                        aria-label="Filter by body part"
                        className="grow p-2 rounded-md border-2 border-black text-black bg-white hover:cursor-pointer"
                        value={bodyPart}
                        onChange={(e) => {
                            setBodyPart(e.target.value);
                            setMaxExercises(DEFAULT_MAX_EXERCISES);
                        }}
                    >
                        {BODY_PART_OPTIONS.map((option) => {
                            return <option key={option} value={option}>{option}</option>
                        })}
                    </select>
                </div>

                <div className="flex flex-row flex-wrap items-center justify-between gap-2 mx-4 mt-2">

                    {status === "authenticated" ? (
                        <label className="flex flex-row items-center gap-2 text-left sm:text-lg font-medium hover:cursor-pointer">
                            <input
                                type="checkbox"
                                className="accent-orange-500 scale-125 hover:cursor-pointer"
                                checked={mineOnly}
                                onChange={(e) => {
                                    setMineOnly(e.target.checked);
                                    setMaxExercises(DEFAULT_MAX_EXERCISES);
                                }}
                            />
                            Show only my exercises
                        </label>
                    ) : <div />}

                    <div className="flex flex-row items-center rounded-md border-2 border-black bg-white px-2">
                        <span className="select-none">
                            Results: {shownCount} / {filteredExercises.length}
                        </span>
                        <button
                            type="button"
                            title="Show more"
                            className="ml-2 p-1 rounded-full hover:bg-stone-300 hover:cursor-pointer"
                            onClick={showMore}
                        >
                            <ArrowUpWideNarrow size={24} />
                        </button>
                        <button
                            type="button"
                            title="Show fewer"
                            className="p-1 rounded-full hover:bg-stone-300 hover:cursor-pointer"
                            onClick={showFewer}
                        >
                            <ArrowDownWideNarrow size={24} />
                        </button>
                    </div>

                </div>
            </div>

            {/* Results */}
            <div className="w-full px-4 mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {isLoading ? (
                    <p className="col-span-full text-center text-lg font-semibold">
                        Loading exercises...
                    </p>
                ) : fetchError !== "" ? (
                    <p className="col-span-full text-center text-sm text-red-600">
                        {fetchError}
                    </p>
                ) : filteredExercises.length === 0 ? (
                    <p className="col-span-full text-center text-lg font-semibold">
                        No exercises match these filters.
                    </p>
                ) : (
                    filteredExercises.slice(0, maxExercises).map((exercise) => (
                        <ExerciseCard key={exercise.id} exercise={exercise} calculatorParams={calculatorParams} />
                    ))
                )}
            </div>

            {/* Create exercise link */}
            <Link
                href="/exercises/add"
                className="flex flex-row items-center justify-center sm:text-lg font-medium p-2 mx-4 mt-4 mb-1 rounded-md border-2 border-black text-black w-full sm:w-fit sm:px-6
                    bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"
            >
                <Plus className="ml-2 mr-4 sm:ml-0" />
                Create custom exercise
            </Link>

        </div>
    );
}

export default Page;