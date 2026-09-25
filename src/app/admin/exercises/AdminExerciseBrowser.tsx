'use client'

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { BODY_PART_OPTIONS, CATEGORY_OPTIONS, type Exercise, type SuggestedExercise } from "@/lib/models";
import AdminExerciseCard, { getAdminExerciseTab, type AdminExerciseTab } from "./AdminExerciseCard";

// Tabs, in display order
const TABS: { tab: AdminExerciseTab, label: string }[] = [
    { tab: "suggested", label: "Suggested" },
    { tab: "approved", label: "Approved" },
    { tab: "unapproved", label: "Un-approved" },
    { tab: "rejected", label: "Rejected" },
];
const DEFAULT_TAB: AdminExerciseTab = "suggested";

// Search param keys used to save the tab & filters in the URL
const TAB_PARAM = "tab";
const SEARCH_PARAM = "search";
const CATEGORY_PARAM = "category";
const BODY_PART_PARAM = "bodyPart";

// Admin access is enforced by middleware (page) and by each API route (data)
const Page = () => {

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Pulls & sanitizes tab & filters from searchParams, falling back to defaults if invalid
    const paramTab = searchParams.get(TAB_PARAM);
    const paramSearch = searchParams.get(SEARCH_PARAM);
    const paramCategory = searchParams.get(CATEGORY_PARAM);
    const paramBodyPart = searchParams.get(BODY_PART_PARAM);

    // Form inputs (tab & filters)
    const [tab, setTab] = useState<AdminExerciseTab>(TABS.some((t) => t.tab === paramTab) ? paramTab as AdminExerciseTab : DEFAULT_TAB);
    const [searchQuery, setSearchQuery] = useState(paramSearch ?? "");
    const [category, setCategory] = useState((paramCategory !== null && CATEGORY_OPTIONS.includes(paramCategory)) ? paramCategory : CATEGORY_OPTIONS[0]);
    const [bodyPart, setBodyPart] = useState((paramBodyPart !== null && BODY_PART_OPTIONS.includes(paramBodyPart)) ? paramBodyPart : BODY_PART_OPTIONS[0]);

    // Saves tab & filters to URL (without adding history entries). Only non-default values are written.
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());

        const setOrDelete = (key: string, value: string | null) => {
            if (value === null) params.delete(key);
            else params.set(key, value);
        };
        setOrDelete(TAB_PARAM, tab !== DEFAULT_TAB ? tab : null);
        setOrDelete(SEARCH_PARAM, searchQuery.trim().length > 0 ? searchQuery : null);
        setOrDelete(CATEGORY_PARAM, category !== CATEGORY_OPTIONS[0] ? category : null);
        setOrDelete(BODY_PART_PARAM, bodyPart !== BODY_PART_OPTIONS[0] ? bodyPart : null);

        const query = params.toString();
        if (query === searchParams.toString()) return;
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [tab, searchQuery, category, bodyPart, searchParams, pathname, router]);

    // Fetched data: all moderatable exercises from every tab, in one list
    const [exercises, setExercises] = useState<SuggestedExercise[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState("");

    // Output for actions which move an exercise to another tab (or delete it), unmounting its card
    const [actionOutput, setActionOutput] = useState("");

    // Fetches approved exercises using '/api/exercises/get', and suggested, rejected, & un-approved exercises
    // using '/api/exercises/getsuggested'
    useEffect(() => {
        let cancelled = false;

        async function fetchExercises() {
            try {
                const [approvedResult, suggestedResult] = await Promise.all([
                    fetch('/api/exercises/get'),
                    fetch('/api/exercises/getsuggested'),
                ]);
                const [approvedData, suggestedData] = await Promise.all([
                    approvedResult.json(),
                    suggestedResult.json(),
                ]);
                if (cancelled) return;

                if (!approvedResult.ok || !suggestedResult.ok) {
                    setFetchError((!suggestedResult.ok ? suggestedData.error : approvedData.error) ?? "Something went wrong. Try again later.");
                    setIsLoading(false);
                    return;
                }

                // '/api/exercises/get' also returns the admin's own private exercises, which are excluded here
                const approved: SuggestedExercise[] = (approvedData.exercises as Exercise[])
                    .filter((ex) => getAdminExerciseTab(ex) === "approved")
                    .map((ex) => ({ ...ex, suggestedBy: null }));

                setExercises([...approved, ...suggestedData.exercises]);
            }
            catch {
                if (cancelled) return;
                setFetchError("Server failed to respond. Confirm internet connection or try again later.");
            }

            setIsLoading(false);
        }
        fetchExercises();

        return () => { cancelled = true; };
    }, []);

    // Replaces an exercise after an update. Keeps 'suggestedBy', as update responses don't include it.
    // Exercises which admins can no longer moderate (e.g. a rejection was undone) are removed.
    function handleUpdated(updated: Exercise, message: string) {
        const previous = exercises.find((ex) => ex.id === updated.id);
        const newTab = getAdminExerciseTab(updated);

        setExercises((current) => newTab === null
            ? current.filter((ex) => ex.id !== updated.id)
            : current.map((ex) => ex.id === updated.id ? { ...updated, suggestedBy: ex.suggestedBy } : ex)
        );

        // Card is unmounted if the exercise leaves the current tab, so the message is shown here instead
        if (previous !== undefined && newTab !== getAdminExerciseTab(previous)) {
            setActionOutput(message);
        }
    }

    function handleDeleted(deleted: Exercise) {
        setExercises((current) => current.filter((ex) => ex.id !== deleted.id));
        setActionOutput(`Deleted "${deleted.name}".`);
    }

    // Number of exercises in each tab (before filters)
    const tabCounts = useMemo(() => {
        const counts: Record<AdminExerciseTab, number> = { suggested: 0, approved: 0, unapproved: 0, rejected: 0 };
        for (const ex of exercises) {
            const exerciseTab = getAdminExerciseTab(ex);
            if (exerciseTab !== null) counts[exerciseTab]++;
        }
        return counts;
    }, [exercises]);

    // Filters exercises by tab, search query (name, description, tags, suggesting user), category, and body part
    const filteredExercises = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return exercises.filter(
            (ex) =>
                getAdminExerciseTab(ex) === tab &&
                (bodyPart === BODY_PART_OPTIONS[0] || ex.bodyParts.includes(bodyPart as Exercise["bodyParts"][number])) &&
                (category === CATEGORY_OPTIONS[0] || ex.category === category) &&
                (ex.name.toLowerCase().includes(query) ||
                    (ex.description?.toLowerCase().includes(query) ?? false) ||
                    ex.tags.some((tag) => tag.toLowerCase().includes(query)) ||
                    (ex.suggestedBy?.name?.toLowerCase().includes(query) ?? false) ||
                    (ex.suggestedBy?.email?.toLowerCase().includes(query) ?? false))
        );
    }, [exercises, tab, searchQuery, category, bodyPart]);

    return (
        <div className="flex flex-col items-center justify-center text-center p-4 sm:m-4 bg-slate-200 sm:border-t border-b sm:border-l sm:border-r border-black text-black min-w-full sm:min-w-160 sm:w-[60vw]">

            <div className="flex flex-row justify-center text-xl sm:text-2xl font-semibold mb-2">
                Moderate exercises
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full px-4" role="tablist">
                {TABS.map(({ tab: t, label }) => {
                    return (
                        <button
                            key={t}
                            type="button"
                            role="tab"
                            aria-selected={tab === t}
                            className={`flex flex-row items-center justify-center font-medium p-2 rounded-md border-2 border-black text-black hover:cursor-pointer
                                ${tab === t ? "bg-orange-500" : "bg-white hover:bg-orange-100"}`}
                            onClick={() => {
                                setTab(t);
                                setActionOutput("");
                            }}
                        >
                            {label} ({tabCounts[t]})
                        </button>
                    )
                })}
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col w-full mt-3">

                <input
                    type="text"
                    aria-label="Search exercises"
                    className="flex flex-row justify-center p-2 mx-4 rounded-md border-2 border-black text-black bg-white"
                    placeholder="Search by name, description, tag, or user"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                <div className="flex flex-col sm:flex-row gap-2 mx-4 mt-2">
                    <select
                        aria-label="Filter by category"
                        className="grow p-2 rounded-md border-2 border-black text-black bg-white hover:cursor-pointer"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        {CATEGORY_OPTIONS.map((option) => {
                            return <option key={option} value={option}>{option}</option>
                        })}
                    </select>

                    <select
                        aria-label="Filter by body part"
                        className="grow p-2 rounded-md border-2 border-black text-black bg-white hover:cursor-pointer"
                        value={bodyPart}
                        onChange={(e) => setBodyPart(e.target.value)}
                    >
                        {BODY_PART_OPTIONS.map((option) => {
                            return <option key={option} value={option}>{option}</option>
                        })}
                    </select>
                </div>

            </div>

            {actionOutput !== "" && (
                <ul className="w-full flex flex-col items-start text-sm list-disc mt-2 text-green-600">
                    <li className="mx-7 text-left">{actionOutput}</li>
                </ul>
            )}

            {/* Results */}
            <div className="w-full px-4 mt-3 flex flex-col gap-3">
                {isLoading ? (
                    <p className="text-center text-lg font-semibold">
                        Loading exercises...
                    </p>
                ) : fetchError !== "" ? (
                    <p className="text-center text-sm text-red-600">
                        {fetchError}
                    </p>
                ) : filteredExercises.length === 0 ? (
                    <p className="text-center text-lg font-semibold">
                        {tabCounts[tab] === 0 ? "Nothing here right now." : "No exercises match these filters."}
                    </p>
                ) : (
                    filteredExercises.map((exercise) => (
                        <AdminExerciseCard
                            key={exercise.id}
                            exercise={exercise}
                            tab={tab}
                            onUpdated={handleUpdated}
                            onDeleted={handleDeleted}
                        />
                    ))
                )}
            </div>

        </div>
    );
}

export default Page;