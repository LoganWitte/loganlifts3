'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import type { PublicProfile, PublicProfileSummary } from '@/lib/models';

// Stores public profiles, so navigating between '/profiles' and '/profiles/[id]' (and back) doesn't start from an empty page.
// - 'profiles': the list from '/api/users/get', used by '/profiles'. The same for every viewer.
// - Single profiles (including their public lifts) from '/api/users/[id]', used by '/profiles/[id]', stored per profile id.
//   These depend on the viewer (owners may view their own private profile), so they're stored per signed-in user,
//   and entries from a previous user are discarded when the signed-in user changes (sign in / out).
// Nothing is fetched until a page asks for it. Pages call 'refreshProfiles' / 'refreshProfile' when visited. Until the fetch
// completes, pages display the previous data if there is any, otherwise "Loading...".
// Must be placed inside <SessionProvider>, as it uses 'useSession'.

// A single profile's stored state
export type ProfileEntry = {
    profile: PublicProfile | null,  // null until the first successful fetch, or when not found
    notFound: boolean,              // Private & nonexistent profiles alike (both return 404)
    isLoading: boolean,             // Whether a fetch is in progress
    error: string,                  // Error from the most recent fetch, or ""
};

const EMPTY_PROFILE_ENTRY: ProfileEntry = { profile: null, notFound: false, isLoading: false, error: "" };

type ProfileContextValue = {
    profiles: PublicProfileSummary[] | null,  // null until the first fetch completes
    isLoading: boolean,                       // Whether a fetch of 'profiles' is in progress
    error: string,                            // Error from the most recent fetch of 'profiles', or ""
    refreshProfiles: () => void,
    // Single profiles. 'getProfileEntry' returns an empty entry for profiles not fetched yet (or while the session loads).
    getProfileEntry: (id: string) => ProfileEntry,
    refreshProfile: (id: string) => void,
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {

    const { data, status } = useSession();

    const [profiles, setProfiles] = useState<PublicProfileSummary[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Single profiles, keyed by 'viewer|id' (see 'entryKey')
    const [entries, setEntries] = useState<Record<string, ProfileEntry>>({});

    // Only the most recent fetch (of the list, or of each profile) may update state,
    // so an older, slower response can't overwrite a newer one
    const latestRequestId = useRef(0);
    const latestEntryRequestIds = useRef<Record<string, number>>({});

    // The signed-in user's email, "" when signed out, or undefined while the session loads
    const viewer = status === "loading" ? undefined : (data?.user?.email ?? "");

    const refreshProfiles = useCallback(async () => {
        const requestId = ++latestRequestId.current;
        setIsLoading(true);
        setError("");

        try {
            const result = await fetch('/api/users/get');
            const data = await result.json();
            if (requestId !== latestRequestId.current) return;

            if (!result.ok) {
                setError(data.error ?? "Something went wrong. Try again later.");
            }
            else {
                setProfiles(data.users);
            }
        }
        catch {
            if (requestId !== latestRequestId.current) return;
            setError("Server failed to respond. Confirm internet connection or try again later.");
        }

        setIsLoading(false);
    }, []);

    const getProfileEntry = useCallback((id: string): ProfileEntry => {
        if (viewer === undefined) return EMPTY_PROFILE_ENTRY;
        return entries[entryKey(viewer, id)] ?? EMPTY_PROFILE_ENTRY;
    }, [viewer, entries]);

    const refreshProfile = useCallback(async (id: string) => {
        if (viewer === undefined) return;

        const key = entryKey(viewer, id);
        const requestId = (latestEntryRequestIds.current[key] ?? 0) + 1;
        latestEntryRequestIds.current[key] = requestId;

        const setEntry = (update: (entry: ProfileEntry) => ProfileEntry) => {
            setEntries((current) => ({ ...current, [key]: update(current[key] ?? EMPTY_PROFILE_ENTRY) }));
        };

        setEntry((entry) => ({ ...entry, isLoading: true, error: "" }));

        try {
            const result = await fetch(`/api/users/${encodeURIComponent(id)}`);
            const data = await result.json();
            if (requestId !== latestEntryRequestIds.current[key]) return;

            if (result.status === 404) {
                setEntry(() => ({ profile: null, notFound: true, isLoading: false, error: "" }));
            }
            else if (!result.ok) {
                setEntry((entry) => ({ ...entry, isLoading: false, error: data.error ?? "Something went wrong. Try again later." }));
            }
            else {
                setEntry(() => ({ profile: data.profile, notFound: false, isLoading: false, error: "" }));
            }
        }
        catch {
            if (requestId !== latestEntryRequestIds.current[key]) return;
            setEntry((entry) => ({ ...entry, isLoading: false, error: "Server failed to respond. Confirm internet connection or try again later." }));
        }
    }, [viewer]);

    // Discards single profiles fetched for a previous user when the signed-in user changes
    useEffect(() => {
        if (viewer === undefined) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEntries((current) => keepViewerEntries(current, viewer));
    }, [viewer]);

    return (
        <ProfileContext.Provider value={{ profiles, isLoading, error, refreshProfiles, getProfileEntry, refreshProfile }}>
            {children}
        </ProfileContext.Provider>
    );
}

// Single profiles are stored per viewer, as what a profile shows depends on who's viewing it
function entryKey(viewer: string, id: string): string {
    return `${viewer}|${id}`;
}

// Removes entries stored for any other viewer (returns the same object if there are none, avoiding a re-render)
function keepViewerEntries<T>(entries: Record<string, T>, viewer: string): Record<string, T> {
    const prefix = `${viewer}|`;
    const keys = Object.keys(entries);
    if (keys.every((key) => key.startsWith(prefix))) return entries;
    return Object.fromEntries(keys.filter((key) => key.startsWith(prefix)).map((key) => [key, entries[key]]));
}

export function useProfileContext(): ProfileContextValue {
    const context = useContext(ProfileContext);
    if (context === null) {
        throw new Error("useProfileContext must be used within <ProfileProvider>.");
    }
    return context;
}
