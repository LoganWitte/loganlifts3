import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { PUBLIC_LIFT_SELECT, PUBLIC_LIFT_WHERE, PUBLIC_USER_SELECT, canViewProfile, toPublicProfile } from '@/lib/profileServer'

// Fetches a single public profile, including its lifts (newest first) when they are public. Used by '/profiles/[id]'.
// Usage: GET '/api/users/<id>'. Sign-in is optional, and only used to tell whether the viewer owns the profile.
// - A private profile returns the same 404 as a nonexistent user (unless viewed by its owner), so its existence can't be probed.
// - The owner may view their own private profile, seeing exactly what others would once it is public.
export async function GET(_req: Request, ctx: RouteContext<'/api/users/[id]'>) {

    const { id } = await ctx.params

    // 'session.user.id' is set from the token in 'auth.ts', so no extra lookup is needed
    const session = await auth()
    const viewerId = session?.user?.id ?? null

    const user = await prisma.user.findUnique({
        where: { id },
        select: PUBLIC_USER_SELECT,
    })

    if (!user || !canViewProfile(user, viewerId)) {
        return NextResponse.json({ error: 'User does not exist.' }, { status: 404 })
    }

    const lifts = user.liftsPublic
        ? await prisma.lift.findMany({
            where: { userId: user.id, ...PUBLIC_LIFT_WHERE },
            orderBy: { time: 'desc' },
            select: PUBLIC_LIFT_SELECT,
        })
        : []

    return NextResponse.json({ ok: true, profile: toPublicProfile(user, lifts, viewerId) })
}
