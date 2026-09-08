'use client'

import { Suspense, useEffect, useState } from "react"
import ResetPasswordForm from "./ConfirmForm"
import ConfirmLoading from "./ConfirmLoading"
import { usePathname, useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"

const Page = () => {

    const searchParams = useSearchParams();

    const tokenFromParam = searchParams.get('token');
    const [resetToken, setResetToken] = useState<string | null | undefined>((tokenFromParam !== null && tokenFromParam.length > 0) ? tokenFromParam : null);

    // Used to remove token from URL bar
    const pathname = usePathname();
    const router = useRouter();

    // Token present in URL bar: clears it from URL bar & saves it to localStorage
    // Token not present in URL bar: loads token from localStorage
    useEffect(() => {
        // Token present in URL bar
        // Will clear it from URL bar and save it to localStorage
        if (tokenFromParam !== null && tokenFromParam.length > 0) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('token');
            localStorage.setItem("resetToken", tokenFromParam);
            const query = params.toString();
            const newUrl = query ? `${pathname}?${query}` : pathname;
            router.push(newUrl);
        }
        // Token not present in URL bar and not already loaded
        // Will attempt to load token from localStorage
        else if (resetToken === null) {
            const tokenFromLocalStorage = localStorage.getItem("resetToken");
            if (tokenFromLocalStorage !== null && tokenFromLocalStorage.length > 0) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setResetToken(tokenFromLocalStorage);
            }
            else {
                setResetToken(undefined);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <Suspense fallback={<ConfirmLoading />}>
            {resetToken === null ? <ConfirmLoading /> : <ResetPasswordForm resetToken={resetToken} />}
        </Suspense>
    );
}

export default Page;