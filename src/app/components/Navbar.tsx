'use client'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { FaBars } from 'react-icons/fa'
import { FaX } from 'react-icons/fa6'

const Navbar = () => {

    const { status } = useSession();
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <nav className="w-full bg-orange-500 border-b border-black">
            <div className="flex items-center justify-between p-4">
                <Link className="text-4xl text-black select-none" href="/">LoganLifts™</Link>

                {/* Desktop Navigation - Hidden on mobile */}
                <div className="hidden md:flex flex-1 items-center justify-end gap-4 text-white text-center">
                    <Link
                        className="p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0] select-none"
                        href="/calculator">
                        Lift Calculator
                    </Link>
                    <Link
                        className="p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0] select-none"
                        href="/exercises">
                        Exercises
                    </Link>
                    {
                        status === "authenticated" ? (
                            <>
                                <Link
                                    className="min-w-22 p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0] select-none"
                                    href="/account"
                                >
                                    Account
                                </Link>
                                <button
                                    className="min-w-22 hover:cursor-pointer p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0]"
                                    onClick={() => signOut()}
                                >
                                    Sign out
                                </button>
                            </>
                        ) : status === "unauthenticated" ? (
                            <>
                                <Link
                                    className="min-w-22 p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0] select-none"
                                    href="/login"
                                >
                                    Sign in
                                </Link>
                                <Link
                                    className="min-w-22 p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0] select-none"
                                    href="/signup"
                                >
                                    Sign up
                                </Link>
                            </>
                        ) : (
                            <>
                                <div className="min-w-22 p-2 rounded-lg bg-[#00000080] select-none">
                                    Loading...
                                </div>
                                <div className="min-w-22 p-2 rounded-lg bg-[#00000080] select-none">
                                    Loading...
                                </div>
                            </>
                        )
                    }
                </div>

                {/* Mobile Hamburger Button */}
                <button
                    className="md:hidden flex flex-col p-3 border rounded-lg hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle menu"
                >
                    {menuOpen ? <FaX className="scale-150" /> : <FaBars className="scale-150" />}
                </button>
            </div>

            {/* Mobile Menu */}
            {menuOpen && (
                <div className="md:hidden flex flex-col gap-2 p-4 bg-orange-500 border-t border-black">
                    <Link className="p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0] text-white select-none" href="/calculator">Lift Calculator</Link>
                    <Link className="p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0] text-white select-none" href="/exercises">Exercises</Link>
                    {
                        status === "authenticated" ? (
                            <>
                                <Link
                                    className="p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0] text-white select-none"
                                    href="/account"
                                >
                                    Account
                                </Link>
                                <button
                                    className="hover:cursor-pointer p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0] text-white text-left"
                                    onClick={() => signOut()}
                                >
                                    Sign out
                                </button>
                            </>
                        ) : status === "unauthenticated" ? (
                            <>
                                <Link
                                    className="p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0] text-white select-none"
                                    href="/login"
                                >
                                    Sign in
                                </Link>
                                <Link
                                    className="p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0] text-white select-none"
                                    href="/signup"
                                >
                                    Sign up
                                </Link>
                            </>
                        ) : (
                            <>
                                <div className="p-2 rounded-lg bg-[#00000080] text-white select-none">
                                    Loading...
                                </div>
                                <div className="p-2 rounded-lg bg-[#00000080] text-white select-none">
                                    Loading...
                                </div>
                            </>
                        )
                    }
                </div>
            )}
        </nav>
    );
}

export default Navbar