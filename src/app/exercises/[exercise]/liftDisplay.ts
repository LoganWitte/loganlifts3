// Display helpers for '/exercises/[exercise]'. All weights are stored & passed around in pounds,
// then converted only for display, matching '/calculator'.

import { poundsToKgs } from '@/lib/formulas';

// A weight (stored in pounds) in the displayed unit, rounded to 2 places
export function toDisplayWeight(pounds: number, useKgs: boolean): number {
    return useKgs ? poundsToKgs(pounds) : Math.round(pounds * 100) / 100;
}

// e.g. "135.00lb" / "61.23kg", matching '/calculator'
export function formatWeight(pounds: number, useKgs: boolean): string {
    return `${toDisplayWeight(pounds, useKgs).toFixed(2)}${useKgs ? "kg" : "lb"}`;
}

export function formatLiftTime(time: string): string {
    return new Date(time).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}