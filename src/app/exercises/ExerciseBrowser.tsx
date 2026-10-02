'use client'

import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { BODY_PART_OPTIONS, CATEGORY_OPTIONS, type Exercise } from "@/lib/models";
import ExerciseCard, { type CalculatorParams } from "./ExerciseCard";
import { useExerciseContext } from "@/app/components/contextProviders/ExerciseProvider";
import Pagination, { getPageCount, MAX_PER_PAGE } from "@/app/components/Pagination";

// Number of exercises shown per page by default
const DEFAULT_PER_PAGE = 12;

// Search param keys used to save filters in the URL
const SEARCH_PARAM = "search";
const CATEGORY_PARAM = "category";
const BODY_PART_PARAM = "bodyPart";
const MINE_PARAM = "mine";
const PAGE_PARAM = "page";
const PER_PAGE_PARAM = "perPage";

// Parses a positive whole number search param, or returns the fallback if missing / invalid
function parsePositiveIntParam(value: string | null, fallback: number, max: number): number {
    const parsed = value === null ? NaN : parseInt(value);
    return (isNaN(parsed) || parsed < 1) ? fallback : Math.min(parsed, max);
}

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
    // Pagination (1-based page). Reset to the first page whenever a filter changes.
    const [page, setPage] = useState(parsePositiveIntParam(searchParams.get(PAGE_PARAM), 1, Number.MAX_SAFE_INTEGER));
    const [perPage, setPerPage] = useState(parsePositiveIntParam(searchParams.get(PER_PAGE_PARAM), DEFAULT_PER_PAGE, MAX_PER_PAGE));

    // Pulls & sanitizes calculator values from searchParams (e.g. from '/calculator'), passed through to exercise pages
    const calculatorParams: CalculatorParams = useMemo(() => {
        const weightParam = searchParams.get('weight');
        const repsParam = searchParams.get('reps');

        let weight: number | undefined = weightParam === null ? undefined : parseFloat(weightParam);
        let reps: number | undefined = repsParam === null ? undefined : parseInt(repsParam);
        if (weight !== undefined) {
            weight = isNaN(weight) ? undefined : Math.max(Math.round(weight * 100) / 100, 0);
        }
        if (reps !== undefined) {
            reps = isNaN(reps) ? undefined : Math.max(reps, 0);
        }

        return { weight, reps };
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
        setOrDelete(PAGE_PARAM, page !== 1 ? String(page) : null);
        setOrDelete(PER_PAGE_PARAM, perPage !== DEFAULT_PER_PAGE ? String(perPage) : null);

        const query = params.toString();
        if (query === searchParams.toString()) return;
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [searchQuery, category, bodyPart, mineOnly, page, perPage, searchParams, pathname, router]);

    // Pulls exercises from context. 'storedExercises' is null until the first fetch completes,
    // otherwise it holds the most recent data (possibly from a previous visit) while refreshing.
    const { exercises: storedExercises, isLoading, error: fetchError, refreshExercises } = useExerciseContext();
    const exercises = useMemo(() => storedExercises ?? [], [storedExercises]);

    // Refreshes exercises each visit once session has loaded ('/api/exercises/get')
    // Re-fetches if the user signs in / out, since the result includes the user's own exercises
    useEffect(() => {
        if (status === "loading") return;
        refreshExercises();
    }, [status, refreshExercises]);

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

    // Clamps the page to the available pages (e.g. after results shrink), without changing the saved page
    const pageCount = getPageCount(filteredExercises.length, perPage);
    const currentPage = Math.min(page, pageCount);
    const pageExercises = filteredExercises.slice((currentPage - 1) * perPage, currentPage * perPage);

    // Changing the page size keeps the first visible exercise on screen
    function handlePerPageChange(newPerPage: number) {
        const firstIndex = (currentPage - 1) * perPage;
        setPerPage(newPerPage);
        setPage(Math.floor(firstIndex / newPerPage) + 1);
    }

    // The bottom controls also scroll back up to the top of the results
    const resultsRef = useRef<HTMLDivElement>(null);
    function handleBottomPageChange(newPage: number) {
        setPage(newPage);
        resultsRef.current?.scrollIntoView({ block: "start" });
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
                        setPage(1);
                    }}
                />

                <div className="flex flex-col sm:flex-row gap-2 mx-4 mt-2">
                    <select
                        aria-label="Filter by category"
                        className="grow p-2 rounded-md border-2 border-black text-black bg-white hover:cursor-pointer"
                        value={category}
                        onChange={(e) => {
                            setCategory(e.target.value);
                            setPage(1);
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
                            setPage(1);
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
                                    setPage(1);
                                }}
                            />
                            Show only my exercises
                        </label>
                    ) : <div />}

                    <Pagination
                        page={currentPage}
                        setPage={setPage}
                        perPage={perPage}
                        setPerPage={handlePerPageChange}
                        total={filteredExercises.length}
                    />

                </div>
            </div>

            {/* Results */}
            <div ref={resultsRef} className="scroll-mt-4 w-full px-4 mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Previous data (if any) is displayed while refreshing */}
                {storedExercises === null && fetchError === "" ? (
                    <p className="col-span-full text-center text-lg font-semibold">
                        Loading exercises...
                    </p>
                ) : storedExercises === null ? (
                    <p className="col-span-full text-center text-sm text-red-600">
                        {fetchError}
                    </p>
                ) : filteredExercises.length === 0 && isLoading ? (
                    <p className="col-span-full text-center text-lg font-semibold">
                        Loading exercises...
                    </p>
                ) : filteredExercises.length === 0 ? (
                    <p className="col-span-full text-center text-lg font-semibold">
                        No exercises match these filters.
                    </p>
                ) : (
                    pageExercises.map((exercise) => (
                        <ExerciseCard key={exercise.id} exercise={exercise} calculatorParams={calculatorParams} />
                    ))
                )}
            </div>

            {/* Bottom page controls, so the next page can be reached without scrolling back up */}
            {pageCount > 1 && (
                <div className="flex flex-row justify-center w-full px-4 mt-3">
                    <Pagination
                        page={currentPage}
                        setPage={handleBottomPageChange}
                        perPage={perPage}
                        setPerPage={handlePerPageChange}
                        total={filteredExercises.length}
                    />
                </div>
            )}

            {/* Failed refresh while previous data is displayed */}
            {storedExercises !== null && fetchError !== "" && (
                <p className="w-full px-4 mt-2 text-center text-sm text-red-600">
                    Couldn&apos;t refresh exercises: {fetchError}
                </p>
            )}

            {/* Create exercise link */}
            <Link
                href="/exercises/add"
                className="flex flex-row items-center justify-center sm:text-lg font-medium p-2 mx-4 mt-4 mb-1 rounded-md border-2 border-black text-black w-fit max-w-full sm:px-6
                    bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"
            >
                <Plus className="ml-2 mr-4 sm:ml-0" />
                Create custom exercise
            </Link>

        </div>
    );
}

export default Page;