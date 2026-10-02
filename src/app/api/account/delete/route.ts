import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Permanently deletes the user's account. Used by the 'Delete account' form in '/account'.
// - confirmUsername: must exactly match the user's username (or their email, if they have no username).
// Cascades (see schema.prisma) to the user's linked OAuth accounts, sessions, owned exercises (including
// suggested & rejected ones), and all of their lifts. Approved global exercises they suggested are kept,
// as approval clears their user relation.
// The client should sign the user out after this succeeds.
export async function POST(req: Request) {

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { confirmUsername } = await req.json();

    if (typeof confirmUsername !== 'string' || confirmUsername.trim().length === 0) {
        return NextResponse.json({ error: 'Username confirmation missing.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, email: true },
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    // Users without a username confirm with their email instead
    const expected = user.name || user.email;

    if (confirmUsername.trim() !== expected) {
        return NextResponse.json(
            { error: user.name ? 'Username does not match.' : 'Email address does not match.' },
            { status: 400 }
        )
    }

    // Also removes any outstanding magic link tokens for this email, as they aren't linked to the user by a relation
    await prisma.$transaction([
        prisma.verificationToken.deleteMany({ where: { identifier: user.email! } }),
        prisma.user.delete({ where: { id: user.id } }),
    ])

    return NextResponse.json({ ok: true })
}