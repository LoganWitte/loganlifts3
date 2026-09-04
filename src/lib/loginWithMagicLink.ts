import { signIn } from 'next-auth/react'

type MagicLinkResult =
    | { success: true }
    | { success: false; error: string }

export async function loginWithMagicLink(
    email: string,
): Promise<MagicLinkResult> {
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
        return { success: false, error: 'Email is required.' }
    }

    try {
        const statusResponse = await fetch(
            `/api/auth/magic-link-status?email=${encodeURIComponent(normalizedEmail)}`,
        )

        const status = await statusResponse.json()

        if (!statusResponse.ok || !status.allowed) {
            return {
                success: false,
                error: status.error ?? 'Please wait before requesting another sign-in link.',
            }
        }

        const signInResult = await signIn('resend', {
            email: normalizedEmail,
            redirect: false,
        })

        if (signInResult?.error) {
            return {
                success: false,
                error: 'Unable to send the sign-in link. Please try again.',
            }
        }

        return { success: true }
    } catch {
        return {
            success: false,
            error: 'Something went wrong. Please try again.',
        }
    }
}
