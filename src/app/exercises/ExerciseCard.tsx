'use client'

import Link from 'next/link';
import type { Exercise } from '@/lib/models';

// Optional calculator values, passed through to the exercise page (e.g. from '/calculator')
export type CalculatorParams = {
    weight: number | undefined,
    reps: number | undefined,
    useKgs: boolean | undefined,
};

interface ExerciseCardProps {
    exercise: Exercise;
    calculatorParams: CalculatorParams;
}

// Small label displayed under an exercise's name (category, body parts, tags)
const Tag = ({ tag }: { tag: string }) => {
    return (
        <span className="w-fit h-fit px-1 py-0.5 m-0.5 inline-block font-semibold bg-slate-300 rounded-md">{tag}</span>
    );
}

// Label displayed next to an exercise's name for the user's own exercises (custom, suggested, rejected)
const StatusLabel = ({ label, color }: { label: string, color: "orange" | "green" | "red" }) => {
    return (
        <span className={`w-fit h-fit px-1 py-0.5 text-xs font-semibold rounded-md border border-black
            ${color === "orange" ? "bg-orange-500" : color === "green" ? "bg-green-300" : "bg-red-300"}`}>
            {label}
        </span>
    );
}

// Displays a single exercise, linking to its page
const ExerciseCard = ({ exercise, calculatorParams }: ExerciseCardProps) => {

    // Constructs href link with optional weight, reps, and useKgs query params
    const { weight, reps, useKgs } = calculatorParams;
    const params = new URLSearchParams();
    if (weight !== undefined) params.set("weight", String(weight));
    if (reps !== undefined) params.set("reps", String(reps));
    if (useKgs !== undefined) params.set("useKgs", String(useKgs));
    const query = params.toString();
    const href = `/exercises/${exercise.URLSlug}${query ? "?" + query : ""}`;

    // Exercises returned from '/api/exercises/get' with a userId are always the current user's own
    const isOwned = exercise.userId !== null;

    return (
        <Link
            href={href}
            className="flex flex-col text-left p-3 rounded-md border-2 border-black bg-white hover:bg-orange-100 hover:cursor-pointer"
        >
            <div className="flex flex-row flex-wrap items-center gap-1">
                <span className="text-lg sm:text-xl font-bold mr-1">{exercise.name}</span>
                {isOwned && <StatusLabel label="Custom" color="orange" />}
                {isOwned && exercise.isSuggested && <StatusLabel label="Suggested" color="green" />}
                {isOwned && exercise.isRejected && <StatusLabel label="Rejected" color="red" />}
            </div>

            {/* Displays category, body parts, and tags in that order below name */}
            <div className="mt-2 text-sm text-black">
                <Tag tag={exercise.category} />
                {exercise.bodyParts.map((part) => (
                    <Tag key={part} tag={part} />
                ))}
                {exercise.tags.map((tag) => (
                    <Tag key={tag} tag={tag} />
                ))}
            </div>
        </Link>
    );
}

export default ExerciseCard;