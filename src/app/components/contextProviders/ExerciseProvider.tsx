'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import type { Exercise } from '@/lib/models';

// Stores the exercises available to the current user (from '/api/exercises/get'), shared between
// '/exercises' and '/exercises/[exercise]' so navigating between them doesn't start from an empty page.
// - Starts with no data ('exercises' is null).
// - Pages call 'refreshExercises' when visited. Until the fetch completes, pages display the previous
//   data if there is any, otherwise "Loading...".
// - Data is cleared when the signed-in user changes (sign in / out), since it includes the user's own exercises.
// Must be placed inside <SessionProvider>, as it uses 'useSession'.

type ExerciseContextValue = {
    exercises: Exercise[] | null,   // null until the first fetch completes
    isLoading: boolean,             // Whether a fetch is in progress
    error: string,                  // Error from the most recent fetch, or ""
    refreshExercises: () => void,
    // Local updates after a successful create / update / delete, so pages don't display stale data
    upsertExercise: (exercise: Exercise) => void,
    removeExercise: (id: string) => void,
};

const ExerciseContext = createContext<ExerciseContextValue | null>(null);

// Sorted alphabetically by name, matching '/api/exercises/get'
function sortExercises(exercises: Exercise[]): Exercise[] {
    return [...exercises].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export const ExerciseProvider = ({ children }: { children: ReactNode }) => {

    const { data, status } = useSession();

    const [exercises, setExercises] = useState<Exercise[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Only the most recent fetch may update state, so an older, slower response can't overwrite a newer one
    const latestRequestId = useRef(0);

    const refreshExercises = useCallback(async () => {
        const requestId = ++latestRequestId.current;
        setIsLoading(true);
        setError("");

        try {
            const result = await fetch('/api/exercises/get');
            const data = await result.json();
            if (requestId !== latestRequestId.current) return;

            if (!result.ok) {
                setError(data.error ?? "Something went wrong. Try again later.");
            }
            else {
                setExercises(data.exercises);
            }
        }
        catch {
            if (requestId !== latestRequestId.current) return;
            setError("Server failed to respond. Confirm internet connection or try again later.");
        }

        setIsLoading(false);
    }, []);

    const upsertExercise = useCallback((exercise: Exercise) => {
        setExercises((current) => current === null
            ? current
            : sortExercises([...current.filter((ex) => ex.id !== exercise.id), exercise])
        );
    }, []);

    const removeExercise = useCallback((id: string) => {
        setExercises((current) => current === null ? current : current.filter((ex) => ex.id !== id));
    }, []);

    // Clears data when the signed-in user changes (not on the first session load)
    const previousEmail = useRef<string | null | undefined>(undefined);
    const email = status === "loading" ? undefined : (data?.user?.email ?? null);
    useEffect(() => {
        if (email === undefined) return;
        if (previousEmail.current !== undefined && previousEmail.current !== email) {

            setExercises(null);
        }
        previousEmail.current = email;
    }, [email]);

    return (
        <ExerciseContext.Provider value={{ exercises, isLoading, error, refreshExercises, upsertExercise, removeExercise }}>
            {children}
        </ExerciseContext.Provider>
    );
}

export function useExerciseContext(): ExerciseContextValue {
    const context = useContext(ExerciseContext);
    if (context === null) {
        throw new Error("useExerciseContext must be used within <ExerciseProvider>.");
    }
    return context;
}