'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowDown } from 'lucide-react';
import type { PublicLift } from '@/lib/models';
import UnitToggle from '@/app/components/UnitToggle';
import { formatLiftTime, formatWeight } from '@/app/exercises/[exercise]/liftDisplay';
import { formatMemberSince } from '../ProfileCard';
import { useProfileContext } from '@/app/components/contextProviders/ProfileProvider';

const PANEL_CLASS = "flex flex-col items-center justify-center text-center p-4 sm:m-4 bg-slate-200 sm:border-t border-b sm:border-l sm:border-r border-black text-black min-w-full sm:min-w-160 sm:w-[60vw]";

// Most recent lifts shown in 'Recent Lifts'. All lifts are still used for PRs.
const RECENT_LIFTS_LIMIT = 50;

// Label & value pair displayed within a lift, matching 'LiftHistory'
const LiftStat = ({ label, value }: { label: string, value: string }) => {
    return (
        <div className="flex flex-col">
            <span className="text-xs text-stone-600">{label}</span>
            <span className="font-semibold">{value}</span>
        </div>
    );
}

// Displays "—" for values hidden by the user's privacy settings (or not recorded)
function formatOptionalWeight(pounds: number | null, useKgs: boolean): string {
    return pounds !== null ? formatWeight(pounds, useKgs) : "—";
}

// Short summary of a lift, e.g. "135.00lb × 5 (1RM 157.50lb)".
// Bodyweight exercises with hidden weights (private body weight) show added weight & reps only.
function formatLiftSummary(lift: PublicLift, useKgs: boolean): string {
    const traditional = lift.exercise.weightCoefficient === null;
    if (lift.weight !== null && lift.oneRepMax !== null) {
        return `${traditional ? "" : "Equivalent to "}${formatWeight(lift.weight, useKgs)} × ${lift.reps} (1RM ${formatWeight(lift.oneRepMax, useKgs)})`;
    }
    return lift.addedWeight !== null
        ? `+${formatWeight(lift.addedWeight, useKgs)} × ${lift.reps}`
        : `${lift.reps} ${lift.reps === 1 ? "rep" : "reps"}`;
}

// Whether lift 'a' is a better PR than lift 'b' for the same exercise: highest estimated 1RM,
// or if hidden (bodyweight exercises with a private body weight), highest added weight then most reps
function isBetterLift(a: PublicLift, b: PublicLift): boolean {
    if (a.oneRepMax !== null && b.oneRepMax !== null) {
        return a.oneRepMax > b.oneRepMax;
    }
    const aAdded = a.addedWeight ?? 0;
    const bAdded = b.addedWeight ?? 0;
    return aAdded !== bAdded ? aAdded > bAdded : a.reps > b.reps;
}

// Values displayed for each recent lift, matching 'LiftStats' in 'LiftHistory'
const PublicLiftStats = ({ lift, useKgs }: { lift: PublicLift, useKgs: boolean }) => {
    const traditional = lift.exercise.weightCoefficient === null;
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-left">
            <LiftStat label="Time" value={formatLiftTime(lift.time)} />
            <LiftStat label="Body weight" value={formatOptionalWeight(lift.bodyWeight, useKgs)} />
            {!traditional && <LiftStat label="Added weight" value={formatOptionalWeight(lift.addedWeight, useKgs)} />}
            <LiftStat label={traditional ? "Weight" : "Equivalent weight"} value={formatOptionalWeight(lift.weight, useKgs)} />
            <LiftStat label="Reps" value={String(lift.reps)} />
            <LiftStat label="Estimated 1RM" value={formatOptionalWeight(lift.oneRepMax, useKgs)} />
        </div>
    );
}

// Collapsible section with a scrolling list, matching 'Previous Lifts' in 'LiftHistory'
const CollapsibleList = ({ title, children }: { title: string, children: ReactNode }) => {

    const [expanded, setExpanded] = useState(true);

    return (
        <div className="w-full flex flex-col items-center mb-2">

            <button
                type="button"
                className="text-xl sm:text-2xl flex items-center hover:bg-stone-400 p-1 mt-1 mb-2 rounded-md hover:cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                {title}
                <ArrowDown className={`ml-1 transition-[rotate] duration-300 ease-in-out ${expanded && "-rotate-180"}`} />
            </button>

            {/* Scrolls open / closed like 'Previous Lifts' */}
            <div className={`w-full px-4 transition-all duration-300 ease-in-out overflow-hidden ${expanded ? "max-h-128" : "max-h-0"}`}>
                <div className={`w-full max-h-128 overflow-y-auto flex flex-col gap-2 ${expanded ? "border border-gray-500 rounded-lg p-2" : ""}`}>
                    {children}
                </div>
            </div>

        </div>
    );
}

// Public lifts: collapsible lists of the best lift per exercise ('PRs'), then recent lifts
const ProfileLifts = ({ lifts, useKgs }: { lifts: PublicLift[], useKgs: boolean }) => {

    // Best lift per exercise, sorted by exercise name
    const prs: PublicLift[] = useMemo(() => {
        const best = new Map<string, PublicLift>();
        for (const lift of lifts) {
            const current = best.get(lift.exercise.URLSlug);
            if (current === undefined || isBetterLift(lift, current)) {
                best.set(lift.exercise.URLSlug, lift);
            }
        }
        return [...best.values()].sort((a, b) => a.exercise.name.localeCompare(b.exercise.name, undefined, { sensitivity: 'base' }));
    }, [lifts]);

    if (lifts.length === 0) {
        return (
            <div className="sm:text-lg mx-4 mb-2">
                No lifts logged yet.
            </div>
        );
    }

    return (
        <>
            <CollapsibleList title={`PRs (${prs.length})`}>
                {prs.map((lift) => (
                    <Link
                        key={lift.exercise.URLSlug}
                        href={`/exercises/${lift.exercise.URLSlug}?useKgs=${useKgs}`}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-left p-3 rounded-md border-2 border-black bg-white hover:bg-orange-100 hover:cursor-pointer"
                    >
                        <span className="text-lg font-bold">{lift.exercise.name}</span>
                        <span className="flex flex-col sm:items-end">
                            <span className="font-semibold">{formatLiftSummary(lift, useKgs)}</span>
                            <span className="text-xs text-stone-600">{formatLiftTime(lift.time)}</span>
                        </span>
                    </Link>
                ))}
            </CollapsibleList>

            <CollapsibleList title={`Recent Lifts (${Math.min(lifts.length, RECENT_LIFTS_LIMIT)}${lifts.length > RECENT_LIFTS_LIMIT ? ` of ${lifts.length}` : ""})`}>
                {/* Already sorted newest first by '/api/users/[id]' */}
                {lifts.slice(0, RECENT_LIFTS_LIMIT).map((lift) => (
                    <div key={lift.id} className="flex flex-col p-3 rounded-md border-2 border-black bg-white">
                        <Link
                            href={`/exercises/${lift.exercise.URLSlug}?useKgs=${useKgs}`}
                            className="w-fit text-left font-bold text-blue-600 underline sm:no-underline hover:underline mb-1"
                        >
                            {lift.exercise.name}
                        </Link>
                        <PublicLiftStats lift={lift} useKgs={useKgs} />
                    </div>
                ))}
            </CollapsibleList>
        </>
    );
}

// The page for a single public profile ('/profiles/[id]')
const ProfileContent = () => {

    const { id } = useParams<{ id: string }>();
    const { status } = useSession();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    // Profile from '/api/users/[id]', stored in 'ProfileProvider' so revisiting this page shows it immediately while it refreshes.
    // 'profile' is null while loading for the first time. 'notFound' for private & nonexistent profiles alike.
    const { getProfileEntry, refreshProfile } = useProfileContext();
    const { profile, notFound, error } = getProfileEntry(id);

    // Unit toggle. The URL's 'useKgs' param sets the initial unit, and is kept updated like '/exercises/[exercise]'.
    const [useKgs, setUseKgs] = useState(searchParams.get('useKgs') === 'true');

    function handleUnitToggle(newUseKgs: boolean) {
        setUseKgs(newUseKgs);
        const params = new URLSearchParams(searchParams.toString());
        params.set('useKgs', String(newUseKgs));
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }

    // Refreshes the profile each visit once session has loaded, as owners may view their own private profile
    // Re-fetches if the user signs in / out ('refreshProfile' changes with the signed-in user)
    useEffect(() => {
        if (status === "loading") return;
        refreshProfile(id);
    }, [status, id, refreshProfile]);

    if (notFound) {
        return (
            <div className={PANEL_CLASS}>
                <div className="flex flex-row justify-center text-xl sm:text-2xl font-semibold mb-2">
                    User does not exist
                </div>
                <Link
                    href="/profiles"
                    className="text-blue-600 underline sm:no-underline hover:underline"
                >
                    Back to profiles
                </Link>
            </div>
        );
    }

    if (profile === null) {
        return (
            <div className={PANEL_CLASS}>
                {error === "" ? (
                    <div className="flex flex-row justify-center text-lg mx-4 mb-2">
                        Loading...
                    </div>
                ) : (
                    <div className="flex flex-row justify-center text-sm text-red-600 mx-4 mb-2">
                        {error}
                    </div>
                )}
                <Link
                    href="/profiles"
                    className="text-blue-600 underline sm:no-underline hover:underline"
                >
                    Back to profiles
                </Link>
            </div>
        );
    }

    return (
        <div className={PANEL_CLASS}>

            {/* Shown only to the profile's owner */}
            {profile.isOwnProfile && (
                <div className="w-full px-4 mb-2">
                    <div className="flex flex-col items-center p-2 rounded-md border-2 border-black bg-gray-300">
                        <span className="font-semibold">
                            {profile.profilePublic
                                ? "This is your public profile, as others see it."
                                : "Only you can see this. Your profile is private."}
                        </span>
                        {!profile.profilePublic && (
                            <span className="text-sm">This is how it will look to others once it is public.</span>
                        )}
                        <Link
                            href="/account"
                            className="text-sm text-blue-600 underline sm:no-underline hover:underline"
                        >
                            Change privacy settings
                        </Link>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col items-center mx-4 mb-2 gap-1">
                <Image
                    className="border border-black"
                    src={profile.image ?? "/default_avatar.webp"}
                    alt={profile.image !== null ? `${profile.name}'s profile image` : "Blank profile image"}
                    width={150}
                    height={150}
                />
                <div className="text-xl sm:text-2xl font-semibold break-all">
                    {profile.name ?? <span className="text-stone-600">No username set</span>}
                </div>
                <div className="text-sm text-stone-600">{formatMemberSince(profile.createdAt)}</div>
                {profile.bodyWeight !== null && (
                    <div className="sm:text-lg">
                        Body weight: <span className="font-bold">{formatWeight(profile.bodyWeight, useKgs)}</span>
                    </div>
                )}
            </div>

            {/* Displayed as plain text only. Line breaks are kept, and links aren't clickable. */}
            {profile.bio !== null && (
                <div className="w-full px-4 mb-2">
                    <p className="p-3 rounded-md border-2 border-black bg-white text-left whitespace-pre-wrap wrap-break-word">
                        {profile.bio}
                    </p>
                </div>
            )}

            <div className="w-full border-t border-black my-2" />

            {profile.lifts === null ? (
                <div className="sm:text-lg mx-4 mb-2">
                    This user&apos;s lifts are private.
                </div>
            ) : <>
                <UnitToggle falseString="Pounds" trueString="Kilograms" value={useKgs} setValue={handleUnitToggle} />
                <ProfileLifts lifts={profile.lifts} useKgs={useKgs} />
            </>}

            {/* Unit toggle for body weight, when there are no lifts to show it above */}
            {profile.lifts === null && profile.bodyWeight !== null && (
                <UnitToggle falseString="Pounds" trueString="Kilograms" value={useKgs} setValue={handleUnitToggle} />
            )}

            <Link
                href="/profiles"
                className="mt-2 text-blue-600 underline sm:no-underline hover:underline"
            >
                Back to profiles
            </Link>

        </div>
    );
}

export default ProfileContent;
