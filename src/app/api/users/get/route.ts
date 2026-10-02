import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { PUBLIC_USER_SELECT, toPublicProfileSummary } from '@/lib/profileServer'
import type { PublicProfileSummary } from '@/lib/models'

// Fetches every public profile, sorted alphabetically by username. Used by '/profiles'. No sign-in needed.
// Only public profiles with a username are returned. Each one is passed through 'toPublicProfileSummary',
// which hides the photo, bio, body weight & lift count according to the user's privacy settings.
// All profiles are returned at once & filtered client-side, like '/api/exercises/get'.
export async function GET() {

    const users = await prisma.user.findMany({
        where: { profilePublic: true, name: { not: null } },
        select: PUBLIC_USER_SELECT,
    })

    // 'name' is never null here, due to the query above
    const profiles: PublicProfileSummary[] = users.flatMap((user) =>
        user.name === null ? [] : [{ ...toPublicProfileSummary(user), name: user.name }]
    )

    // Sorted here rather than in the query for case-insensitive alphabetical ordering
    profiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

    return NextResponse.json({ ok: true, users: profiles })
}
