'use client'

const Page = () => {
    return (
        <div className="flex flex-col p-4 sm:m-4 bg-slate-200 sm:border-t border-b border-l border-r border-black text-black min-w-full sm:min-w-160">
            <div className="flex flex-row justify-center text-2xl font-semibold mb-2">
                Reset Password
            </div>
            <div className="flex flex-row justify-center text-lg mx-4 mb-2">
                Loading...
            </div>
        </div>
    );
}

export default Page;