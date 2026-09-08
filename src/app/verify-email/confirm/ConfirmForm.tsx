'use client'

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MIN_USERNAME_LENGTH, MAX_USERNAME_LENGTH, MIN_EMAIL_LENGTH, MAX_EMAIL_LENGTH } from "@/lib/constants";
import { checkUsername, checkEmail } from "@/lib/credentialChecks";

const Page = () => {

    // Form outputs
    const [submitResponse, setSubmitResponse] = useState<string[]>([]);
    const [responseIsError, setResponseIsError] = useState(false);

    const searchParams = useSearchParams();

    // Pulls data from searchParams
    const name = searchParams.get('name');
    const email = searchParams.get('email');
    const paramToken: string | null = searchParams.get('token');
    const token = ((paramToken !== null && paramToken.length > 0) ? paramToken : null);

    // Sanitizes data from searchParams, sets to null if invalid
    // Missing data here will simply not be displayed
    const sanitizedName = (name !== null && name.length >= MIN_USERNAME_LENGTH && name.length <= MAX_USERNAME_LENGTH && checkUsername(name).status) ? name : null;
    const sanitizedEmail = (email !== null && email.length >= MIN_EMAIL_LENGTH && email.length <= MAX_EMAIL_LENGTH && checkEmail(email).status) ? email : null;

    useEffect(() => {
        // Handles form submission
        async function submit() {
            console.log('Token:', token);

            // Clears submit response
            setSubmitResponse([]);

            if (token === null) {
                setSubmitResponse(["Error: Invalid token. Try clicking your the link in your inbox again, or send another email link if that does not work."]);
                setResponseIsError(true);
                return;
            }

            // Signs in using 'api\verify-email\confirm\route.ts'
            const result = await fetch('/api/verify-email/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: token,
                }),
            })

            // Populates 'submitResponse' with either server error or success message
            const data = await result.json();
            if (!result.ok) {
                setSubmitResponse([data.error ?? "Something went wrong. Try again later."]);
                setResponseIsError(true);
                return;
            }

            // Sets success message
            setSubmitResponse(["Success! Email has been verified. Sign in to continue."]);
            setResponseIsError(false);
            return;
        }
        submit();
    }, [token])

    return (
        <div className="flex flex-col p-4 sm:m-4 bg-slate-200 sm:border-t border-b sm:border-l sm:border-r border-black text-black min-w-full sm:min-w-160">
            <div className="flex flex-row justify-center text-2xl font-semibold mb-2">
                Verify Email
            </div>
            {sanitizedName !== null && <div className="flex flex-row justify-center text-lg mx-4 mb-2">
                <span className="font-bold mr-1">Name:</span>
                {sanitizedName}
            </div>}

            {sanitizedEmail !== null && <div className="flex flex-row justify-center text-lg mx-4 mb-2">
                <span className="font-bold mr-1">Email:</span>
                {sanitizedEmail}
            </div>}
            {submitResponse.length > 0 ?
                <ul className={`w-full flex flex-col items-start text-sm list-disc mb-1 ${responseIsError ? "text-red-600" : "text-green-600"}`}>
                    {submitResponse.map((error, i) => {
                        return <li key={i} className="mx-7">{error}</li>
                    })}
                    {!responseIsError &&
                        <li className="mx-7 text-black">
                            Click<Link className="mx-1 text-blue-600 underline sm:no-underline hover:underline"
                                href={`/login${sanitizedEmail ? "?email=" + sanitizedEmail : ""}`}>here</Link>to sign in.
                        </li>
                    }
                </ul>
                :
                <div className="flex flex-row justify-center text-lg mx-4 mb-2">
                    Loading...
                </div>
            }
        </div>
    );
}

export default Page;