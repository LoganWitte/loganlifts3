'use client'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

const Navbar = () => {

    const { status } = useSession();

    return(
        <nav className="w-full flex items-center justify-between p-4 bg-orange-500 border-b border-black overflow-x-auto">
            <Link className="text-4xl text-black select-none" href="/">LoganLifts™</Link>
            <div className="flex-1 flex items-center justify-end gap-4 text-white text-center">
                <Link className="p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0] select-none" href="/calculator">1RM Calculator</Link>
                <Link className="p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0] select-none" href="/exercises">Exercises</Link>
                <Link className="p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0] select-none" href="/workouts">Workouts</Link>
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
        </nav>
    );
}

export default Navbar