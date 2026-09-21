export type allowedFormula = "Recommended" | "Brzycki" | "Epley" | "Lombardi" | "OConnor";

// undefined only if: (brzycki && reps >= 37) === true
export function getOneRepMax(weight: number, reps: number, formula: allowedFormula): number | undefined {
    if (weight <= 0 || reps <= 0) return 0;
    if (reps === 1) return weight;
    switch (formula) {
        case "Recommended":
            if (reps <= 8) {
                // 100% Brzychi
                return weight * (36 / (37 - reps));
            }
            else if (reps <= 10) {
                // 50/50 Brzychi/Epley interpolation
                return (weight * (36 / (37 - reps)) + weight * (1 + reps / 30)) / 2
            }
            else {
                // 100% Epley
                return (weight * (1 + reps / 30));
            }
        case "Brzycki":
            if (reps >= 37) return undefined;
            return weight * (36 / (37 - reps));
        case "Epley":
            return weight * (1 + reps / 30);
        case "Lombardi":
            return weight * (Math.pow(reps, 0.1));
        case "OConnor":
            return weight * (1 + 0.025 * reps);
    }
}

// undefined only in case of (brzycki && reps >= 37)
export function getWeight(oneRepMax: number, reps: number, formula: allowedFormula): number | undefined {
    if (oneRepMax <= 0 || reps <= 0) return 0;
    if (reps === 1) return oneRepMax;
    switch (formula) {
        case "Recommended":
            if (reps <= 8) {
                // 100% Brzychi
                return oneRepMax / (36 / (37 - reps));
            }
            else if (reps <= 10) {
                // 50/50 Brzychi/Epley interpolation
                return (oneRepMax / (36 / (37 - reps)) + oneRepMax / (1 + reps / 30)) / 2
            }
            else {
                // 100% Epley
                return (oneRepMax / (1 + reps / 30));
            }
        case "Brzycki":
            if (reps >= 37) return undefined;
            return oneRepMax / (36 / (37 - reps)); // TODO
        case "Epley":
            return oneRepMax / (1 + reps / 30);
        case "Lombardi":
            return oneRepMax / (Math.pow(reps, 0.1));
        case "OConnor":
            return oneRepMax / (1 + 0.025 * reps);
    }
}

// Converts pounds to kilograms (rounded, 2 places)
export function poundsToKgs(pounds: number): number {
    return Math.round((pounds * 0.45359237) * 100) / 100;
}

// Converts kilograms to pounds (rounded, 2 places)
export function kgsToPounds(kgs: number): number {
    return Math.round((kgs / 0.45359237) * 100) / 100;
}