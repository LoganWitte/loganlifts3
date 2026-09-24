import { auth } from '@/auth'
import { NextResponse } from 'next/server'

// Runs before matched pages render, using the session from auth.ts
// (req.auth is the session object, including isAdmin)
export const proxy = auth((req) => {
    const { pathname } = req.nextUrl
    const session = req.auth

    // Redirects signed-out users from account pages to login page
    if (pathname.startsWith('/account') && !session?.user) {
        return NextResponse.redirect(new URL('/login', req.nextUrl.origin))
    }

    // Redirects non-admin users from admin pages to home page
    if (pathname.startsWith('/admin') && !session?.user?.isAdmin) {
        return NextResponse.redirect(new URL('/', req.nextUrl.origin))
    }

    return NextResponse.next()
})

// Limits proxy to these paths only (includes '/account' and '/admin' themselves)
export const config = {
    matcher: ['/account/:path*', '/admin/:path*'],
}