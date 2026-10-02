'use client'

import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from 'next/link';
import ProfileCard from "./ProfileCard";
import { useProfileContext } from "@/app/components/contextProviders/ProfileProvider";
import Pagination, { getPageCount, MAX_PER_PAGE } from "@/app/components/Pagination";

// Number of profiles shown per page by default (matching '/exercises')
const DEFAULT_PER_PAGE = 12;

// Search param keys used to save filters in the URL
const SEARCH_PARAM = "search";
const SORT_PARAM = "sort";
const HAS_LIFTS_PARAM = "hasLifts";
const PAGE_PARAM = "page";
const PER_PAGE_PARAM = "perPage";

// Parses a positive whole number search param, or returns the fallback if missing / invalid
function parsePositiveIntParam(value: string | null, fallback: number, max: number): number {
    const parsed = value === null ? NaN : parseInt(value);
    return (isNaN(parsed) || parsed < 1) ? fallback : Math.min(parsed, max);
}

// Sort options, as [URL value, label]. The first is the default, matching the order from '/api/users/get'.
const SORT_OPTIONS = [
    ["name", "Username (A–Z)"],
    ["newest", "Newest members"],
    ["oldest", "Oldest members"],
    ["lifts", "Most lifts"],
] as const;
type SortOption = typeof SORT_OPTIONS[number][0];

function isSortOption(value: string | null): value is SortOption {
    return SORT_OPTIONS.some(([option]) => option === value);
}

const Page = () => {

    const { data, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Pulls & sanitizes filters from searchParams, falling back to defaults if invalid
    const paramSearch = searchParams.get(SEARCH_PARAM);
    const paramSort = searchParams.get(SORT_PARAM);

    // Form inputs (filters)
    const [searchQuery, setSearchQuery] = useState(paramSearch ?? "");
    const [sort, setSort] = useState<SortOption>(isSortOption(paramSort) ? paramSort : SORT_OPTIONS[0][0]);
    const [hasLiftsOnly, setHasLiftsOnly] = useState(searchParams.get(HAS_LIFTS_PARAM) === "true");
    // Pagination (1-based page). Reset to the first page whenever a filter or the sort changes.
    const [page, setPage] = useState(parsePositiveIntParam(searchParams.get(PAGE_PARAM), 1, Number.MAX_SAFE_INTEGER));
    const [perPage, setPerPage] = useState(parsePositiveIntParam(searchParams.get(PER_PAGE_PARAM), DEFAULT_PER_PAGE, MAX_PER_PAGE));

    // Saves filters to URL (without adding history entries), preserving any other params
    // Only non-default filter values are written, keeping the URL short
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());

        const setOrDelete = (key: string, value: string | null) => {
            if (value === null) params.delete(key);
            else params.set(key, value);
        };
        setOrDelete(SEARCH_PARAM, searchQuery.trim().length > 0 ? searchQuery : null);
        setOrDelete(SORT_PARAM, sort !== SORT_OPTIONS[0][0] ? sort : null);
        setOrDelete(HAS_LIFTS_PARAM, hasLiftsOnly ? "true" : null);
        setOrDelete(PAGE_PARAM, page !== 1 ? String(page) : null);
        setOrDelete(PER_PAGE_PARAM, perPage !== DEFAULT_PER_PAGE ? String(perPage) : null);

        const query = params.toString();
        if (query === searchParams.toString()) return;
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [searchQuery, sort, hasLiftsOnly, page, perPage, searchParams, pathname, router]);

    // Pulls profiles from context. 'storedProfiles' is null until the first fetch completes,
    // otherwise it holds the most recent data (possibly from a previous visit) while refreshing.
    const { profiles: storedProfiles, isLoading, error: fetchError, refreshProfiles } = useProfileContext();
    const profiles = useMemo(() => storedProfiles ?? [], [storedProfiles]);

    // Refreshes public profiles each visit ('/api/users/get')
    useEffect(() => {
        refreshProfiles();
    }, [refreshProfiles]);

    // Filters profiles by search query (username, bio) and whether they have public lifts, then sorts them
    const filteredProfiles = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const filtered = profiles.filter(
            (profile) =>
                (!hasLiftsOnly || (profile.liftCount ?? 0) > 0) &&
                (profile.name.toLowerCase().includes(query) ||
                    (profile.bio?.toLowerCase().includes(query) ?? false))
        );

        // Already sorted by username from '/api/users/get', which is also the tiebreaker for the other sorts (stable sort)
        if (sort === "newest") {
            filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        else if (sort === "oldest") {
            filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
        else if (sort === "lifts") {
            // Private lift counts sort last
            filtered.sort((a, b) => (b.liftCount ?? -1) - (a.liftCount ?? -1));
        }
        return filtered;
    }, [profiles, searchQuery, sort, hasLiftsOnly]);

    // Clamps the page to the available pages (e.g. after results shrink), without changing the saved page
    const pageCount = getPageCount(filteredProfiles.length, perPage);
    const currentPage = Math.min(page, pageCount);
    const pageProfiles = filteredProfiles.slice((currentPage - 1) * perPage, currentPage * perPage);

    // Changing the page size keeps the first visible profile on screen
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
                Profiles
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col w-full">

                <input
                    type="text"
                    aria-label="Search profiles"
                    className="flex flex-row justify-center p-2 mx-4 rounded-md border-2 border-black text-black bg-white"
                    placeholder="Search by username or bio"
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPage(1);
                    }}
                />

                <div className="flex flex-col sm:flex-row gap-2 mx-4 mt-2">
                    <select
                        aria-label="Sort profiles"
                        className="grow p-2 rounded-md border-2 border-black text-black bg-white hover:cursor-pointer"
                        value={sort}
                        onChange={(e) => {
                            setSort(e.target.value as SortOption);
                            setPage(1);
                        }}
                    >
                        {SORT_OPTIONS.map(([option, label]) => {
                            return <option key={option} value={option}>{label}</option>
                        })}
                    </select>
                </div>

                <div className="flex flex-row flex-wrap items-center justify-between gap-2 mx-4 mt-2">

                    <label className="flex flex-row items-center gap-2 text-left sm:text-lg font-medium hover:cursor-pointer">
                        <input
                            type="checkbox"
                            className="accent-orange-500 scale-125 hover:cursor-pointer"
                            checked={hasLiftsOnly}
                            onChange={(e) => {
                                setHasLiftsOnly(e.target.checked);
                                setPage(1);
                            }}
                        />
                        Has public lifts
                    </label>

                    <Pagination
                        page={currentPage}
                        setPage={setPage}
                        perPage={perPage}
                        setPerPage={handlePerPageChange}
                        total={filteredProfiles.length}
                        itemLabel="profiles"
                    />

                </div>
            </div>

            {/* Results */}
            <div ref={resultsRef} className="scroll-mt-4 w-full px-4 mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Previous data (if any) is displayed while refreshing */}
                {storedProfiles === null && fetchError === "" ? (
                    <p className="col-span-full text-center text-lg font-semibold">
                        Loading profiles...
                    </p>
                ) : storedProfiles === null ? (
                    <p className="col-span-full text-center text-sm text-red-600">
                        {fetchError}
                    </p>
                ) : profiles.length === 0 && isLoading ? (
                    <p className="col-span-full text-center text-lg font-semibold">
                        Loading profiles...
                    </p>
                ) : profiles.length === 0 ? (
                    <p className="col-span-full text-center text-lg font-semibold">
                        No public profiles yet.
                    </p>
                ) : filteredProfiles.length === 0 ? (
                    <p className="col-span-full text-center text-lg font-semibold">
                        No profiles match these filters.
                    </p>
                ) : (
                    pageProfiles.map((profile) => (
                        <ProfileCard key={profile.id} profile={profile} />
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
                        total={filteredProfiles.length}
                        itemLabel="profiles"
                    />
                </div>
            )}

            {/* Failed refresh while previous data is displayed */}
            {storedProfiles !== null && fetchError !== "" && (
                <p className="w-full px-4 mt-2 text-center text-sm text-red-600">
                    Couldn&apos;t refresh profiles: {fetchError}
                </p>
            )}

            {/* Prompts signed in users to make their own profile public */}
            {status === "authenticated" && !data?.user?.profilePublic && (
                <div className="w-full px-4 mt-3 text-sm text-stone-600">
                    Want to appear here?{" "}
                    <Link className="text-blue-600 underline sm:no-underline hover:underline" href="/account">
                        Make your profile public in your account settings.
                    </Link>
                </div>
            )}

        </div>
    );
}

export default Page;
