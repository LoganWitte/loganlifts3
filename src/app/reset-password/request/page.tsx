'use client'

import { Suspense } from "react"
import RequestForm from "./RequestForm"
import RequestLoading from "./RequestLoading"

const Page = () => {
    return (
        <Suspense fallback={<RequestLoading />}>
            <RequestForm />
        </Suspense>
    );
}

export default Page;