import { auth } from '@/auth'
import { checkBio, normalizeBio } from '@/lib/credentialChecks'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Updates the user's bio. Used by the 'Update bio' form in '/account'.
// - bio: string, validated with 'checkBio' and saved after 'normalizeBio'. An empty bio (or null) removes it, like DELETE.
// Returns the saved bio, so the page can display it without waiting for the session to refresh.
export async function POST(req: Request) {

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { bio } = await req.json();

    if (bio !== null && typeof bio !== 'string') {
        return NextResponse.json({ error: 'Invalid bio provided.' }, { status: 400 })
    }

    const bioCheck = checkBio(bio ?? "");

    if (!bioCheck.status) {
        return NextResponse.json(
            { error: 'Invalid bio provided.', details: { bio: bioCheck.errors } },
            { status: 400 }
        )
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const normalizedBio = normalizeBio(bio ?? "");

    const updated = await prisma.user.update({
        where: { id: user.id },
        data: { bio: normalizedBio.length > 0 ? normalizedBio : null },
        select: { bio: true },
    })

    return NextResponse.json({ ok: true, bio: updated.bio })
}

// Removes the user's bio. Used by the 'Remove bio' button in '/account'.
export async function DELETE() {

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { bio: null },
    })

    return NextResponse.json({ ok: true, bio: null })
}
