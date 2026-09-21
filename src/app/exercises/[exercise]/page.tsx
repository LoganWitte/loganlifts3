'use client'

import { useParams } from "next/navigation";

const Page = () => {

    const { exercise } = useParams<{ exercise: string }>();

    return (
        <div className="flex flex-col items-center justify-center text-center p-4 sm:m-4 bg-slate-200 sm:border-t border-b sm:border-l sm:border-r border-black text-black min-w-full sm:min-w-160">
            <div className="flex flex-row justify-center text-xl sm:text-2xl font-semibold mb-1">
                exercises/[exercise]
            </div>
            <div className="flex flex-row justify-center sm:text-lg mx-4 mb-1">
                <div className="font-semibold mr-1">Exercise:</div>
                {exercise}
            </div>
        </div>
    );
}

export default Page;