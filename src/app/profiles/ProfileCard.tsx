'use client'

import Link from 'next/link';
import Image from 'next/image';
import type { PublicProfileSummary } from '@/lib/models';

// e.g. "Member since Oct 2, 2026"
export function formatMemberSince(createdAt: string): string {
    return `Member since ${new Date(createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}`;
}

// Displays a single public profile, linking to its page. Styled like 'ExerciseCard'.
// Fields hidden by the user's privacy settings are null, and aren't shown.
const ProfileCard = ({ profile }: { profile: PublicProfileSummary }) => {

    // Only the first line of the bio is shown, truncated to fit
    const bioFirstLine = profile.bio?.split("\n")[0] ?? null;

    return (
        <Link
            href={`/profiles/${profile.id}`}
            className="flex flex-row items-center gap-3 text-left p-3 rounded-md border-2 border-black bg-white hover:bg-orange-100 hover:cursor-pointer"
        >
            <Image
                className="shrink-0 border border-black rounded-md"
                src={profile.image ?? "/default_avatar.webp"}
                alt={profile.image !== null ? `${profile.name}'s profile image` : "Blank profile image"}
                width={64}
                height={64}
            />

            <div className="flex flex-col min-w-0">
                <span className="text-lg sm:text-xl font-bold truncate">{profile.name}</span>
                <span className="text-xs text-stone-600">{formatMemberSince(profile.createdAt)}</span>
                {bioFirstLine !== null && (
                    <span className="text-sm truncate">{bioFirstLine}</span>
                )}
                {profile.liftCount !== null && (
                    <span className="text-sm font-semibold">
                        {profile.liftCount} {profile.liftCount === 1 ? "lift" : "lifts"} logged
                    </span>
                )}
            </div>
        </Link>
    );
}

export default ProfileCard;
