import { auth } from '@/auth'
import { checkUsername } from '@/lib/credentialChecks'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { newUsername } = await req.json();

    const usernameCheck = checkUsername(newUsername);

    if (!usernameCheck.status) {
        return NextResponse.json(
            { error: 'Invalid username provided.', details: { password: usernameCheck.errors } },
            { status: 400 }
        )
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const userWithName = await prisma.user.findFirst({
        where: { name: newUsername }
    })

    if (userWithName) {
        if (userWithName.email === session.user.email) {
            return NextResponse.json({ error: 'Username already associated with current account.' }, { status: 409 });
        }
        else {
            return NextResponse.json({ error: 'Username already in use by another user.' }, { status: 409 });
        }
    }

    await prisma.user.update({
        where: { email: session.user.email },
        data: { name: newUsername },
    })

    return NextResponse.json({ ok: true })
}