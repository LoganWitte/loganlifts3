import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { UpdateUnitPreferenceRequest } from '@/lib/models'

// Updates the user's preferred unit (User 'prefersKgs'). Used by the 'General settings' section in '/account'.
// - useKgs: boolean. true for kilograms, false for pounds.
// Returns the saved value, so the page can display it without waiting for the session to refresh.
export async function POST(req: Request) {

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body: Partial<UpdateUnitPreferenceRequest> = await req.json()

    if (typeof body?.useKgs !== 'boolean') {
        return NextResponse.json({ error: "Invalid value provided for 'useKgs'." }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const updated = await prisma.user.update({
        where: { id: user.id },
        data: { prefersKgs: body.useKgs },
        select: { prefersKgs: true },
    })

    return NextResponse.json({ ok: true, prefersKgs: updated.prefersKgs })
}
