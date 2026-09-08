'use client'

import { Suspense, useEffect, useState } from "react"
import ResetPasswordForm from "./ConfirmForm"
import ConfirmLoading from "./ConfirmLoading"

const Page = () => {

    const [resetToken, setResetToken] = useState<string | null | undefined>(null);

    // Token not present in URL bar: loads token from localStorage
    useEffect(() => {
        const tokenFromLocalStorage = localStorage.getItem("resetToken");
        if (tokenFromLocalStorage !== null && tokenFromLocalStorage.length > 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setResetToken(tokenFromLocalStorage);
        }
        else {
            setResetToken(undefined);
        }
    }, [])

    return (
        <Suspense fallback={<ConfirmLoading />}>
            {resetToken === null ? <ConfirmLoading /> : <ResetPasswordForm tokenFromLocalStorage={resetToken} />}
        </Suspense>
    );
}

export default Page;