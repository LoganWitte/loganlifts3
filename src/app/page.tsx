import Link from 'next/link';
import { Wrench, Calculator } from 'lucide-react'

const Page = () => {
    return (
        <div className="flex flex-col items-center justify-center text-center p-4 sm:m-4 bg-slate-200 sm:border-t border-b sm:border-l sm:border-r border-black text-black min-w-full sm:min-w-160">

            <div className="flex flex-row justify-center text-xl sm:text-2xl font-semibold mb-2">
                Welcome to LoganLifts
            </div>

            <div className="flex flex-row items-center justify-center gap-2 sm:text-lg mx-4 mb-2 p-1 pr-2 rounded-md border-2 border-black bg-gray-300">
                <Wrench />
                <span>This site is currently in-progress. Features may be missing, incomplete, or subject to change.</span>
            </div>

            <div className="sm:text-lg mx-4">
                All-in-one lifting platform. Track lifts, view PR&apos;s, and plan your next workout all in one spot!
            </div>

            <div className="flex flex-row justify-center text-lg sm:text-xl font-semibold mb-2">
                Available Tools
            </div>

            <Link
                href="/calculator"
                className="flex flex-row items-center text-left sm:text-lg font-medium p-2 mx-4 mb-2 rounded-md border sm:border-2 border-black text-black bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer w-fit"
            >
                <Calculator className="mr-2" />
                <div className="flex flex-col items-start">
                    <span className="font-semibold">Lift Calculator</span>
                    <span className="text-sm font-normal">Estimate your one-rep max and see equivalent weights across rep ranges.</span>
                </div>
            </Link>

        </div>
    );
}

export default Page;