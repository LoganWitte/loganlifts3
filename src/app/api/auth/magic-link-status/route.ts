import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { RESEND_COOLDOWN_MS } from '@/lib/constants'

export async function GET(req: Request) {
    const email = new URL(req.url).searchParams.get('email')?.trim().toLowerCase()

    if (!email) {
        return NextResponse.json(
            { error: 'Email is required.' },
            { status: 400 },
        )
    }

    const rateLimit = await prisma.magicLinkRateLimit.findUnique({
        where: { identifier: email },
    })

    if (!rateLimit) {
        return NextResponse.json({ allowed: true, secondsLeft: 0 })
    }

    const elapsed = Date.now() - rateLimit.lastSentAt.getTime()
    const remainingMs = RESEND_COOLDOWN_MS - elapsed

    if (remainingMs > 0) {
        return NextResponse.json(
            {
                allowed: false,
                secondsLeft: Math.ceil(remainingMs / 1000),
                error: 'Please wait before requesting another sign-in link.',
            },
            { status: 429 },
        )
    }

    return NextResponse.json({ allowed: true, secondsLeft: 0 })
}