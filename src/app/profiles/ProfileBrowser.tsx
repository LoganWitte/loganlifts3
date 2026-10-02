'use client'

import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from 'next/link';
import { ArrowUpWideNarrow, ArrowDownWideNarrow } from 'lucide-react';
import ProfileCard from "./ProfileCard";
import { useProfileContext } from "@/app/components/contextProviders/ProfileProvider";

// Number of profiles shown at once, and how many are added / removed by the show more / fewer arrows (matching '/exercises')
const PROFILES_STEP = 4;
const DEFAULT_MAX_PROFILES = 12;

// Search param keys used to save filters in the URL
const SEARCH_PARAM = "search";
const SORT_PARAM = "sort";
const HAS_LIFTS_PARAM = "hasLifts";

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
    const [maxProfiles, setMaxProfiles] = useState(DEFAULT_MAX_PROFILES);

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

        const query = params.toString();
        if (query === searchParams.toString()) return;
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [searchQuery, sort, hasLiftsOnly, searchParams, pathname, router]);

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

    const shownCount = Math.min(maxProfiles, filteredProfiles.length);

    function showMore() {
        if (maxProfiles < filteredProfiles.length) {
            setMaxProfiles(maxProfiles + PROFILES_STEP);
        }
    }

    function showFewer() {
        // Snaps down to the nearest step below the number of results, if showing all results
        if (maxProfiles > filteredProfiles.length) {
            setMaxProfiles(Math.max(PROFILES_STEP, filteredProfiles.length % PROFILES_STEP === 0
                ? filteredProfiles.length - PROFILES_STEP
                : filteredProfiles.length - filteredProfiles.length % PROFILES_STEP));
        }
        else {
            setMaxProfiles(Math.max(PROFILES_STEP, maxProfiles - PROFILES_STEP));
        }
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
                        setMaxProfiles(DEFAULT_MAX_PROFILES);
                    }}
                />

                <div className="flex flex-col sm:flex-row gap-2 mx-4 mt-2">
                    <select
                        aria-label="Sort profiles"
                        className="grow p-2 rounded-md border-2 border-black text-black bg-white hover:cursor-pointer"
                        value={sort}
                        onChange={(e) => {
                            setSort(e.target.value as SortOption);
                            setMaxProfiles(DEFAULT_MAX_PROFILES);
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
                                setMaxProfiles(DEFAULT_MAX_PROFILES);
                            }}
                        />
                        Has public lifts
                    </label>

                    <div className="flex flex-row items-center rounded-md border-2 border-black bg-white px-2">
                        <span className="select-none">
                            Results: {shownCount} / {filteredProfiles.length}
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
                    filteredProfiles.slice(0, maxProfiles).map((profile) => (
                        <ProfileCard key={profile.id} profile={profile} />
                    ))
                )}
            </div>

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
