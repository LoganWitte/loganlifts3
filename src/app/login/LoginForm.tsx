'use client'

import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import { useState, useCallback, useEffect } from 'react';
import { FaEnvelope, FaGithub, FaGoogle, FaEye, FaEyeSlash, FaKey } from 'react-icons/fa'
import { useRouter } from 'next/navigation'
import { checkEmail } from '@/lib/credentialChecks'
import { loginWithMagicLink } from '@/lib/loginWithMagicLink'
import { useSearchParams } from "next/navigation";

const Page = () => {

    const searchParams = useSearchParams();
    const { status } = useSession();
    const router = useRouter();

    // Redirect to home page if user is already signed in
    useEffect(() => {
        if (status === "authenticated") {
            router.push('/');
        }
    }, [router, status]);

    // Form inputs
    const paramEmail = searchParams.get("email");
    const [credentialsEmail, setCredentialsEmail] = useState((paramEmail !== null && paramEmail.length > 0) ? paramEmail : '');
    const [password, setPassword] = useState('');
    const [linkEmail, setLinkEmail] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);

    // Form outputs
    const [credentialsErrors, setCredentialsErrors] = useState("");
    const [linkOutput, setLinkOutput] = useState("");
    const [linkOutputColor, setLinkOutputColor] = useState<"black" | "red" | "green">("black");
    const [credentialsEmailHighlighted, setCredentialsEmailHighlighted] = useState(false);
    const [passwordHighlighted, setPasswordHighlighted] = useState(false);
    const [linkEmailHighlighted, setLinkEmailHighlighted] = useState(false);

    // Form submit handlers
    async function handleCredentialsSubmit() {

        // Clears output fields
        setCredentialsErrors("");
        setCredentialsEmailHighlighted(false);
        setPasswordHighlighted(false);

        // Checks validity of input fields
        const emailPresent = credentialsEmail.length > 0;
        const emailValid = emailPresent ? checkEmail(credentialsEmail).status : false;
        const passwordPresent = password.length > 0;

        // Populates 'credentialErrors' with errors from email and password fields
        let credentialErrors: string = "";
        if (passwordPresent) {
            if (!emailPresent) {
                credentialErrors = "Missing email.";
                setCredentialsEmailHighlighted(true);
            }
            else if (!emailValid) {
                credentialErrors = "Invalid email.";
                setCredentialsEmailHighlighted(true);
            }
        }
        else {
            credentialErrors =
                !emailPresent ? "Missing email and password." :
                    !emailValid ? "Invalid email and missing password." :
                        "Missing password.";
            setPasswordHighlighted(true);
            if (!emailPresent || !emailValid) {
                setCredentialsEmailHighlighted(true);
            }
        }

        // Populates output with new errors if necessary
        if (credentialErrors !== "") {
            setCredentialsErrors(credentialErrors);
            return;
        }

        // Signs in using credentials 'signIn' function
        const result = await signIn('credentials', {
            email: credentialsEmail,
            password: password,
            redirect: false,
        });

        // Populates output with new errors if necessary
        if (result?.error) {
            if (result.code === 'email_not_verified') {
                setCredentialsErrors("Email is not verified.");
            }
            else {
                setCredentialsErrors("Invalid email or password.");
            }
        }
    }
    async function handleEmailLinkSubmit() {
        // Clears output fields
        setLinkOutput("");
        setLinkOutputColor("black");
        setLinkEmailHighlighted(false);

        // Checks validity of input field
        const emailPresent = linkEmail.length > 0;
        const emailValid = emailPresent ? checkEmail(linkEmail).status : false;

        // Populates output with error from email field if necessary
        if (!emailPresent) {
            setLinkOutput("Missing email.");
            setLinkOutputColor("red");
            setLinkEmailHighlighted(true);
            return;
        }
        else if (!emailValid) {
            setLinkOutput("Invalid email.");
            setLinkOutputColor("red");
            setLinkEmailHighlighted(true);
            return;
        }

        // Signs in using 'loginWithMagicLink' function and populates output with new errors if necessary
        const result = await loginWithMagicLink(linkEmail)
        if (result.success) {
            setLinkOutput("Success: check your email for the sign-in link.");
            setLinkOutputColor("green");
        }
        else {
            setLinkOutput(result.error);
            setLinkOutputColor("red");
        }
    }

    // Updates form inputs when user navigates back to this page and the input fields are pre-filled 
    // with their previous values (e.g. after a failed login attempt)
    const credentialEmailInputRef = useCallback((node: HTMLInputElement | null) => {
        if (node !== null && node.value !== credentialsEmail) {
            setCredentialsEmail(node.value);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const credentialPasswordInputRef = useCallback((node: HTMLInputElement | null) => {
        if (node !== null && node.value !== password) {
            setPassword(node.value);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const emailLinkInputRef = useCallback((node: HTMLInputElement | null) => {
        if (node !== null && node.value !== linkEmail) {
            setLinkEmail(node.value);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex flex-col p-4 sm:m-4 bg-slate-200 sm:border-t border-b sm:border-l sm:border-r border-black text-black min-w-full sm:min-w-160">

            <div className="flex flex-row justify-center text-2xl font-semibold mb-2">
                Sign in to LoganLifts
            </div>

            <button className="flex flex-row items-center justify-center text-lg font-medium p-2 mx-4 my-2 rounded-md border-2 border-black bg-[oklch(64.75%_0.1603_148.5)] hover:bg-[oklch(58.75%_0.1603_148.5)] text-black
                               hover:cursor-pointer"
                onClick={() => signIn('google')}>
                <FaGoogle className="scale-160 ml-2 mr-4" />
                Continue with Google
            </button>

            <button className="flex flex-row items-center justify-center text-lg font-medium p-2 mx-4 my-2 rounded-md border-2 border-black bg-[oklch(0.5502_0.2585_295.66)] hover:bg-[oklch(0.5202_0.2585_295.66)] text-black
                               hover:cursor-pointer"
                onClick={() => signIn('github')}>
                <FaGithub className="scale-160 ml-2 mr-4" />
                Continue with GitHub
            </button>

            <div className="flex flex-row items-center justify-evenly">
                <div className="grow border-t border-black" />
                <div className="w-fit mx-3 text-center">or</div>
                <div className="grow border-t border-black" />
            </div>

            <form
                className="flex flex-col"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleCredentialsSubmit();
                }}
            >
                <input
                    ref={credentialEmailInputRef}
                    type="text"
                    className={`flex flex-row justify-center p-2 mx-4 mt-2 rounded-md border-2 ${credentialsEmailHighlighted ? "border-red-600 text-red-600" : "border-black text-black"}`}
                    placeholder="Email"
                    value={credentialsEmail}
                    onChange={
                        (e) => {
                            setCredentialsEmail(e.target.value);
                            setCredentialsEmailHighlighted(false);
                            setCredentialsErrors("");
                        }
                    }
                />

                <div className="flex flex-row relative mx-4 my-2">
                    <input
                        ref={credentialPasswordInputRef}
                        type={passwordVisible ? "text" : "password"}
                        className={`w-full flex justify-center p-2 rounded-md border-2 ${passwordHighlighted ? "border-red-600 text-red-600" : "border-black text-black"}`}
                        placeholder="Password"
                        value={password}
                        onChange={
                            (e) => {
                                setPassword(e.target.value);
                                setPasswordHighlighted(false);
                                setCredentialsErrors("");
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

                <button
                    type="submit"
                    className="flex flex-row items-center justify-center text-lg font-medium p-2 mx-4 mb-1 rounded-md border-2 
                    border-black bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] text-black hover:cursor-pointer"
                >
                    <FaKey className="scale-160 ml-2 mr-4" />
                    Sign in with credentials
                </button>

                {credentialsErrors !== "" && credentialsErrors !== "Email is not verified." && (
                    <div className="flex flex-col items-center justify-center text-sm text-red-600">
                        {credentialsErrors}
                    </div>
                )}

                {credentialsErrors === "Email is not verified." && (
                    <div className="flex flex-col items-center justify-center text-sm">
                        <div className='text-red-600'>{credentialsErrors}</div>
                        <Link href={`/verify-email/request${credentialsEmail ? "?email=" + credentialsEmail : linkEmail ? "?email=" + linkEmail : ""}`}
                            className='text-blue-600 underline sm:no-underline hover:underline'>Click here to verify email.</Link>
                    </div>
                )}

            </form>

            <div className="flex flex-row justify-center mx-4 text-sm">
                <Link
                    href={`/reset-password/request${credentialsEmail ? "?email=" + credentialsEmail : linkEmail ? "?email=" + linkEmail : ""}`}
                    className="text-blue-600 underline sm:no-underline hover:underline">Forgot password?</Link>
            </div>

            <div className="flex flex-row items-center justify-evenly">
                <div className="grow border-t border-black" />
                <div className="w-fit mx-3 text-center">or</div>
                <div className="grow border-t border-black" />
            </div>

            <form
                className="flex flex-col"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleEmailLinkSubmit();
                }}
            >
                <input
                    type="text"
                    className={`flex flex-row items-center justify-center p-2 mx-4 mt-2 rounded-md border-2 ${linkEmailHighlighted ? "border-red-600 text-red-600" : "border-black text-black"}`}
                    placeholder="Email"
                    value={linkEmail}
                    onChange={
                        (e) => {
                            setLinkEmail(e.target.value);
                            setLinkOutput("");
                            setLinkOutputColor("black");
                            setLinkEmailHighlighted(false);
                        }
                    }
                    ref={emailLinkInputRef}
                />

                <button
                    type="submit"
                    className="flex flex-row items-center justify-center text-lg font-medium p-2 mx-4 mt-2 rounded-md border-2 
                    border-black bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] text-black hover:cursor-pointer"
                >
                    <FaEnvelope className="scale-160 ml-2 mr-4" />
                    Sign in with email link
                </button>

                {linkOutput !== "" && (
                    <div className={
                        `flex flex-col items-center justify-center text-sm mt-1 mb-3
                        ${linkOutputColor === "red" ? "text-red-600" : linkOutputColor === "green" ? "text-green-500" : "text-black"}`
                    }>
                        {linkOutput}
                    </div>
                )}

            </form>
        </div>
    );
}

export default Page;