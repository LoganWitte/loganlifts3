'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';

// Stores the unit used to display & enter weights (pounds or kilograms), shared by every page.
// Weights are always stored & sent in pounds; this only affects display & input.
// - Signed out users start with pounds.
// - When the session loads, the user signs in, or their saved preference changes (User 'prefersKgs', from the session),
//   the unit is set to the user's preference.
// - Unit toggles on pages (e.g. '/calculator') change 'useKgs' for the rest of the visit, without changing the saved preference.
//   The preference itself is changed on '/account' ('/api/account/preferences/useKgs').
// Must be placed inside <SessionProvider>, as it uses 'useSession'.

type UnitContextValue = {
    useKgs: boolean,
    setUseKgs: (useKgs: boolean) => void,
};

const UnitContext = createContext<UnitContextValue | null>(null);

export const UnitProvider = ({ children }: { children: ReactNode }) => {

    const { data, status } = useSession();

    const [useKgs, setUseKgs] = useState(false);

    // Applies the preference whenever the signed-in user or their saved preference changes (not on every session refresh,
    // so a page toggle isn't undone). Signing out returns to pounds.
    const preferenceKey = status === "loading"
        ? undefined
        : `${data?.user?.email ?? ""}|${data?.user?.prefersKgs === true}`;
    const previousKey = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (preferenceKey === undefined || preferenceKey === previousKey.current) return;
        previousKey.current = preferenceKey;
        setUseKgs(data?.user?.prefersKgs === true);
    }, [preferenceKey, data]);

    return (
        <UnitContext.Provider value={{ useKgs, setUseKgs }}>
            {children}
        </UnitContext.Provider>
    );
}

export function useUnitContext(): UnitContextValue {
    const context = useContext(UnitContext);
    if (context === null) {
        throw new Error("useUnitContext must be used within <UnitProvider>.");
    }
    return context;
}
