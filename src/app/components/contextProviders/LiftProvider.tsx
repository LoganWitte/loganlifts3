'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import type { Lift } from '@/lib/models';

// Stores the signed-in user's lifts for each exercise (from '/api/lifts/get'), so revisiting an exercise's page
// shows its lifts immediately while they refresh.
// - Nothing is fetched until a page asks for it. '/exercises/[exercise]' calls 'refreshLifts' when visited.
//   Until the fetch completes, it displays the previous data if there is any, otherwise "Loading lifts...".
// - Lifts are stored per signed-in user, and lifts from a previous user are discarded when the signed-in user changes.
// - Signed out, every exercise has no lifts (null) and nothing is fetched.
// Must be placed inside <SessionProvider>, as it uses 'useSession'.

// A single exercise's stored lifts
export type LiftEntry = {
    lifts: Lift[] | null,   // Oldest first, matching '/api/lifts/get'. null until the first fetch completes.
    isLoading: boolean,     // Whether a fetch is in progress
    error: string,          // Error from the most recent fetch, or ""
};

const EMPTY_LIFT_ENTRY: LiftEntry = { lifts: null, isLoading: false, error: "" };

type LiftContextValue = {
    // Returns an empty entry for exercises not fetched yet (or while signed out / the session loads)
    getLiftEntry: (exerciseId: string) => LiftEntry,
    refreshLifts: (exerciseId: string) => void,
    // Local updates after a successful create / update / delete, so pages don't display stale data
    upsertLift: (exerciseId: string, lift: Lift) => void,
    removeLift: (exerciseId: string, liftId: string) => void,
};

const LiftContext = createContext<LiftContextValue | null>(null);

// Sorted oldest first, matching '/api/lifts/get'
function sortLifts(lifts: Lift[]): Lift[] {
    return [...lifts].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

export const LiftProvider = ({ children }: { children: ReactNode }) => {

    const { data, status } = useSession();

    // Keyed by 'viewer|exerciseId' (see 'entryKey')
    const [entries, setEntries] = useState<Record<string, LiftEntry>>({});

    // Only the most recent fetch of each exercise may update state, so an older, slower response can't overwrite a newer one.
    // Local updates also invalidate any fetch in progress, as its response may not include them.
    const latestRequestIds = useRef<Record<string, number>>({});

    // The signed-in user's email, or null when signed out / while the session loads
    const viewer = status === "authenticated" ? (data?.user?.email ?? null) : null;

    const getLiftEntry = useCallback((exerciseId: string): LiftEntry => {
        if (viewer === null) return EMPTY_LIFT_ENTRY;
        return entries[entryKey(viewer, exerciseId)] ?? EMPTY_LIFT_ENTRY;
    }, [viewer, entries]);

    // Updates a single exercise's entry
    const updateEntry = useCallback((key: string, update: (entry: LiftEntry) => LiftEntry) => {
        setEntries((current) => ({ ...current, [key]: update(current[key] ?? EMPTY_LIFT_ENTRY) }));
    }, []);

    const refreshLifts = useCallback(async (exerciseId: string) => {
        if (viewer === null) return;

        const key = entryKey(viewer, exerciseId);
        const requestId = (latestRequestIds.current[key] ?? 0) + 1;
        latestRequestIds.current[key] = requestId;

        updateEntry(key, (entry) => ({ ...entry, isLoading: true, error: "" }));

        try {
            const result = await fetch(`/api/lifts/get?exerciseId=${encodeURIComponent(exerciseId)}`);
            const data = await result.json();
            if (requestId !== latestRequestIds.current[key]) return;

            if (!result.ok) {
                updateEntry(key, (entry) => ({ ...entry, isLoading: false, error: data.error ?? "Something went wrong. Try again later." }));
            }
            else {
                updateEntry(key, () => ({ lifts: data.lifts, isLoading: false, error: "" }));
            }
        }
        catch {
            if (requestId !== latestRequestIds.current[key]) return;
            updateEntry(key, (entry) => ({ ...entry, isLoading: false, error: "Server failed to respond. Confirm internet connection or try again later." }));
        }
    }, [viewer, updateEntry]);

    const upsertLift = useCallback((exerciseId: string, lift: Lift) => {
        if (viewer === null) return;
        const key = entryKey(viewer, exerciseId);
        latestRequestIds.current[key] = (latestRequestIds.current[key] ?? 0) + 1;
        updateEntry(key, (entry) => ({
            ...entry,
            isLoading: false,
            lifts: sortLifts([...(entry.lifts ?? []).filter((l) => l.id !== lift.id), lift]),
        }));
    }, [viewer, updateEntry]);

    const removeLift = useCallback((exerciseId: string, liftId: string) => {
        if (viewer === null) return;
        const key = entryKey(viewer, exerciseId);
        latestRequestIds.current[key] = (latestRequestIds.current[key] ?? 0) + 1;
        updateEntry(key, (entry) => ({
            ...entry,
            isLoading: false,
            lifts: entry.lifts === null ? null : entry.lifts.filter((l) => l.id !== liftId),
        }));
    }, [viewer, updateEntry]);

    // Discards lifts fetched for a previous user when the signed-in user changes (including signing out)
    useEffect(() => {
        if (status === "loading") return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEntries((current) => keepViewerEntries(current, viewer));
    }, [status, viewer]);

    return (
        <LiftContext.Provider value={{ getLiftEntry, refreshLifts, upsertLift, removeLift }}>
            {children}
        </LiftContext.Provider>
    );
}

// Lifts are stored per signed-in user
function entryKey(viewer: string, exerciseId: string): string {
    return `${viewer}|${exerciseId}`;
}

// Removes entries stored for any other user, or all entries when signed out
// (returns the same object if there's nothing to remove, avoiding a re-render)
function keepViewerEntries<T>(entries: Record<string, T>, viewer: string | null): Record<string, T> {
    const keys = Object.keys(entries);
    const keep = (key: string) => viewer !== null && key.startsWith(`${viewer}|`);
    if (keys.every(keep)) return entries;
    return Object.fromEntries(keys.filter(keep).map((key) => [key, entries[key]]));
}

export function useLiftContext(): LiftContextValue {
    const context = useContext(LiftContext);
    if (context === null) {
        throw new Error("useLiftContext must be used within <LiftProvider>.");
    }
    return context;
}
