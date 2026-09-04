'use client'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

const Navbar = () => {

    const { data: session } = useSession();
    const isAuthenticated = !!session;

    return(
        <nav className="w-full flex items-center justify-between p-4 bg-orange-500 border-b border-black">
            <Link className="text-4xl text-black" href="/">Logan Lifts™</Link>
            <div className="flex-1 flex items-center justify-end gap-4 text-white">
                <Link className="p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0]" href="/calculator">1RM Calculator</Link>
                <Link className="p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0]" href="/exercises">Exercises</Link>
                <Link className="p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0]" href="/workouts">Workouts</Link>
                {
                    isAuthenticated ? (
                        <button 
                            className="hover:cursor-pointer p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0]"
                            onClick={() => signOut()}
                        >
                            Sign out
                        </button>
                    ) : (
                        <>
                        <Link 
                            className="p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0]"
                            href="/login"
                        >
                            Sign in
                        </Link>
                        <Link 
                            className="p-2 rounded-lg bg-[#00000080] hover:bg-[#000000a0]"
                            href="/signup"
                        >
                            Sign up
                        </Link>
                        </>
                    )
                }
                
            </div>
        </nav>
    );
}

export default Navbar