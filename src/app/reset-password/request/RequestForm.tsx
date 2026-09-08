'use client'

import { useState, useCallback } from 'react';
import { FaEnvelope } from 'react-icons/fa'
import { checkEmail } from '@/lib/credentialChecks'
import { useSearchParams } from "next/navigation";

const Page = () => {

    // Pulls data from searchParams
    const searchParams = useSearchParams();
    const paramEmail = searchParams.get('email');

    // Form inputs
    const [email, setEmail] = useState((paramEmail !== null && paramEmail.length > 0 && checkEmail(paramEmail).status) ? paramEmail : "");

    // Form outputs
    const [submitResponse, setSubmitResponse] = useState("");
    const [emailHighlighted, setEmailHighlighted] = useState(false);
    const [responseIsError, setResponseIsError] = useState(false);
    const [formLoading, setFormLoading] = useState(false);

    // Handles form submission
    async function handleSubmit() {

        document.body.style.cursor = "wait";
        console.log("wait")
        setFormLoading(true);

        // Clears output fields
        setSubmitResponse("");
        setEmailHighlighted(false);

        // Checks validity of 'email' field
        const emailPresent = email.length > 0;
        const emailValid = emailPresent ? checkEmail(email).status : false;

        // Populates 'submitResponse' with errors from 'email' field
        if (!emailPresent) {
            setSubmitResponse("Missing email address.");
            setEmailHighlighted(true);
            setResponseIsError(true);
            document.body.style.cursor = "default";
            console.log("default")
            setFormLoading(false);
            return;
        }
        else if (!emailValid) {
            setSubmitResponse("Invalid email address.");
            setEmailHighlighted(true);
            setResponseIsError(true);
            document.body.style.cursor = "default";
            console.log("default")
            setFormLoading(false);
            return;
        }

        // Signs in using '/reset-password/request/route.ts'
        // This route always returns "ok" if it is able to respond
        const result = await fetch('/api/reset-password/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
            }),
        })

        // Sets response depending on whether server is able to respond
        if (result.ok) {
            setSubmitResponse("Success! If an account exists with this email address, a link will be sent shortly.");
            setEmail("");
            setResponseIsError(false);
            document.body.style.cursor = "default";
            console.log("default")
            setFormLoading(false);
            return;
        }
        else {
            setSubmitResponse("Error: Server failed to respond. Confirm internet connection or try again later.");
            setResponseIsError(true);
            document.body.style.cursor = "default";
            console.log("default")
            setFormLoading(false);
            return;
        }
    }

    // Updates form inputs when user navigates back to this page and the input fields are pre-filled 
    // with their previous values (e.g. after a failed login attempt)
    const credentialEmailInputRef = useCallback((node: HTMLInputElement | null) => {
        if (node !== null && node.value !== email) {
            setEmail(node.value);
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex flex-col p-4 sm:m-4 bg-slate-200 sm:border-t border-b sm:border-l sm:border-r border-black text-black min-w-full sm:min-w-160">
            <div className="flex flex-row justify-center text-2xl font-semibold mb-2">
                Forgot Password?
            </div>
            <div className="flex flex-row justify-center text-lg mx-4 mb-2">
                Enter your email address below and we&apos;ll send you a link to reset your password.
            </div>
            <form
                className="flex flex-col"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (formLoading) return;
                    handleSubmit();
                }}
            >
                <input
                    ref={credentialEmailInputRef}
                    type="text"
                    className={`flex flex-row justify-center p-2 mx-4 mt-2 rounded-md border-2 ${emailHighlighted ? "border-red-600 text-red-600" : "border-black text-black"}`}
                    placeholder="Email"
                    value={email}
                    onChange={
                        (e) => {
                            setEmail(e.target.value);
                            setEmailHighlighted(false);
                            setSubmitResponse("");
                        }
                    }
                />

                <button
                    type="submit"
                    className={`flex flex-row items-center justify-center text-lg font-medium p-2 mx-4 mt-2 ${submitResponse ? "mb-1" : "mb-3"} rounded-md border-2 border-black  text-black  
                        ${formLoading ? "bg-[oklch(63.5%_0.213_47.604)] hover:cursor-wait" : "bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"}`}
                >
                    <FaEnvelope className="scale-160 ml-2 mr-4" />
                    Send password reset link
                </button>

                {submitResponse && (
                    <div className={`flex flex-col items-center justify-center text-sm mx-4 mt-1 mb-3 text-center 
                        ${responseIsError ? "text-red-600" : "text-green-600"}`}>
                        {submitResponse}
                    </div>
                )}

            </form>
        </div>
    );

}

export default Page;