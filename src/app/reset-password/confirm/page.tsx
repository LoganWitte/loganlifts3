'use client'

import { Suspense } from "react"
import ResetPasswordForm from "./ConfirmForm"
import ConfirmLoading from "./ConfirmLoading"

const Page = () => {
    return (
        <Suspense fallback={<ConfirmLoading />}>
            <ResetPasswordForm />
        </Suspense>
    );
}

export default Page;