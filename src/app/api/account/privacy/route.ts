import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { PRIVACY_SETTING_KEYS, type UpdatePrivacyRequest } from '@/lib/models'

// Updates any subset of the user's privacy settings. Used by the 'Privacy settings' section in '/account'.
// - profilePublic, profilePhotoPublic, bioPublic, bodyWeightPublic, liftsPublic: boolean. Omit to leave unchanged.
// The sub-flags keep their values while the profile is private, and only apply once it is public.
// A profile can't be made public without a username, as the username is what identifies it publicly.
// Returns all five saved values, so the page can display them without waiting for the session to refresh.
export async function POST(req: Request) {

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json();

    const data: UpdatePrivacyRequest = {};
    for (const key of PRIVACY_SETTING_KEYS) {
        const value = body?.[key];
        if (value === undefined) continue;
        if (typeof value !== 'boolean') {
            return NextResponse.json({ error: `Invalid value provided for '${key}'.` }, { status: 400 })
        }
        data[key] = value;
    }

    if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true },
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    if (data.profilePublic === true && !user.name) {
        return NextResponse.json({ error: 'Set a username before making your profile public.' }, { status: 400 })
    }

    const updated = await prisma.user.update({
        where: { id: user.id },
        data,
        select: { profilePublic: true, profilePhotoPublic: true, bioPublic: true, bodyWeightPublic: true, liftsPublic: true },
    })

    return NextResponse.json({ ok: true, ...updated })
}
