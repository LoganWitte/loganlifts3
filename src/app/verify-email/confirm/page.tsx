'use client'

import { Suspense } from "react"
import ConfirmForm from "./ConfirmForm"
import ConfirmLoading from "./ConfirmLoading"

const Page = () => {
    return (
        <Suspense fallback={<ConfirmLoading />}>
            <ConfirmForm />
        </Suspense>
    );
}

export default Page;