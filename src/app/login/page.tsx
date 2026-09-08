'use client'

import { Suspense } from "react"
import LoginForm from "./LoginForm"
import LoginLoading from "./LoginLoading"

const Page = () => {
    return (
        <Suspense fallback={<LoginLoading />}>
            <LoginForm />
        </Suspense>
    );
}

export default Page;