import { Suspense } from "react";
import AdminExerciseBrowser from "./AdminExerciseBrowser";

// 'AdminExerciseBrowser' uses 'useSearchParams', so it must be wrapped in Suspense
// Admin access to this page is enforced by middleware
export default function AdminExercisesPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center text-center p-4 sm:m-4 bg-slate-200 sm:border-t border-b sm:border-l sm:border-r border-black text-black min-w-full sm:min-w-160 sm:w-[60vw]">
                <div className="flex flex-row justify-center text-lg mx-4 mb-2">
                    Loading...
                </div>
            </div>
        }>
            <AdminExerciseBrowser />
        </Suspense>
    );
}