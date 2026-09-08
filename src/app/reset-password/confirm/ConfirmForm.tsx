'use client'

import { useSearchParams } from "next/navigation";
import { useState, useCallback } from 'react';
import { FaKey, FaEye, FaEyeSlash } from 'react-icons/fa'
import { checkPassword } from "@/lib/credentialChecks";
import Link from 'next/link'
import { MIN_USERNAME_LENGTH, MAX_USERNAME_LENGTH, MIN_EMAIL_LENGTH, MAX_EMAIL_LENGTH } from "@/lib/constants";
import { checkUsername, checkEmail } from "@/lib/credentialChecks";

interface ConfirmFormProps {
    resetToken: string | undefined;
}

const Page = ({ resetToken: resetToken }: ConfirmFormProps) => {

    const searchParams = useSearchParams();

    // Pulls data from searchParams
    const name: string | null = searchParams.get('name');
    const email = searchParams.get('email');

    // Sanitizes data from searchParams, sets to null if invalid
    // Note that page will work normally unless 'sanitizedToken' is null
    // Otherwise, missing data will simply not be displayed
    const sanitizedName = (name !== null && name.length >= MIN_USERNAME_LENGTH && name.length <= MAX_USERNAME_LENGTH && checkUsername(name).status) ? name : null;
    const sanitizedEmail = (email !== null && email.length >= MIN_EMAIL_LENGTH && email.length <= MAX_EMAIL_LENGTH && checkEmail(email).status) ? email : null;

    // Form inputs
    const [password, setPassword] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);

    // Form outputs
    const [passwordHighlighted, setPasswordHighlighted] = useState(false);
    const [submitResponse, setSubmitResponse] = useState<string[]>([]);
    const [responseIsError, setResponseIsError] = useState(false);

    // Handles form submission
    async function handleSubmit() {

        // Clears output fields
        setPasswordHighlighted(false);
        setSubmitResponse([]);

        // Checks validity of password field
        const passwordCheck = checkPassword(password);

        // Returns & populates 'submitResponse' with errors from password field if necessary
        if (!passwordCheck.status) {
            setSubmitResponse(passwordCheck.errors);
            setResponseIsError(true);
            return;
        }

        // Signs in using 'api\reset-password\confirm\route.ts'
        const result = await fetch('/api/reset-password/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: resetToken,
                newPassword: password,
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
        setSubmitResponse(["Success! Password has been reset. Sign in to continue."]);
        setResponseIsError(false);

    }

    // Updates form inputs when user navigates back to this page and the input fields are pre-filled 
    // with their previous values (e.g. after a failed login attempt)
    const passwordInputRef = useCallback((node: HTMLInputElement | null) => {
        if (node !== null && node.value !== password) {
            setPassword(node.value);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return resetToken !== undefined ? (
        <div className="flex flex-col p-4 sm:m-4 bg-slate-200 sm:border-t border-b border-l border-r border-black text-black min-w-full sm:min-w-160">

            <div className="flex flex-row justify-center text-2xl font-semibold mb-2">
                Reset Password
            </div>

            {sanitizedName !== null && <div className="flex flex-row justify-center text-lg mx-4 mb-2">
                <span className="font-bold mr-1">Name:</span>
                {sanitizedName}
            </div>}

            {sanitizedEmail !== null && <div className="flex flex-row justify-center text-lg mx-4 mb-2">
                <span className="font-bold mr-1">Email:</span>
                {sanitizedEmail}
            </div>}

            <div className="flex flex-row justify-center text-lg mx-4 mb-2">
                Enter your new password below and we&apos;ll reset it for you.
            </div>

            <form
                className="flex flex-col"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                }}
            >
                <div className="flex flex-row relative mx-4 mb-1">
                    <input
                        ref={passwordInputRef}
                        type={passwordVisible ? "text" : "password"}
                        className={`w-full flex justify-center p-2 rounded-md border-2 ${passwordHighlighted ? "border-red-600 text-red-600" : "border-black text-black"}`}
                        placeholder="Password"
                        value={password}
                        onChange={
                            (e) => {
                                setPassword(e.target.value);
                                setPasswordHighlighted(false);
                                setSubmitResponse([]);
                                setResponseIsError(false);
                            }
                        }
                    />
                    <button
                        type="button"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 hover:cursor-pointer rounded-full p-1 scale-125 hover:bg-stone-400 opacity-75"
                        onClick={() => setPasswordVisible(!passwordVisible)}
                    >
                        {passwordVisible ? <FaEyeSlash /> : <FaEye />}
                    </button>
                </div>
                {submitResponse.length > 0 && (
                    <ul className={`w-full flex flex-col items-start text-sm list-disc mb-1 ${responseIsError ? "text-red-600" : "text-green-600"}`}>
                        {submitResponse.map((error, i) => {
                            return <li key={i} className="mx-7">{error}</li>
                        })}
                    </ul>
                )}
                <button
                    type="submit"
                    className="flex flex-row items-center justify-center text-lg font-medium p-2 mx-4 mb-1 rounded-md border-2 
                    border-black bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] text-black hover:cursor-pointer"
                >
                    <FaKey className="scale-160 ml-2 mr-4" />
                    Reset Password
                </button>
            </form>
        </div>
    ) : (
        <div className="flex flex-col p-4 sm:m-4 bg-slate-200 sm:border-t border-b border-l border-r border-black text-black min-w-full sm:min-w-160">

            <div className="flex flex-row justify-center text-2xl font-semibold mb-2">
                Reset Password
            </div>

            <div className="flex flex-row justify-center text-lg mx-4 mb-2">
                Error: invalid token. Try clicking your the link in your inbox again, or send another email link if that does not work.
            </div>

            <div className="flex flex-row justify-center text-lg mx-4 mb-2">
                <Link
                    href={`/reset-password/request${sanitizedEmail ? "?email=" + email : ""}`}
                    className="text-blue-600 underline sm:no-underline hover:underline mr-1">Click here
                </Link>
                to request another email link.
            </div>
        </div>
    )
}

export default Page;