'use client'

import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useCallback, useEffect } from 'react';
import { FaGithub, FaGoogle, FaEye, FaEyeSlash, FaUser } from 'react-icons/fa'
import { checkUsername, checkEmail, checkPassword } from '@/lib/credentialChecks'
import Link from 'next/link'

const Page = () => {

    const { status } = useSession();
    const router = useRouter();

    // Redirect to home page if user is already signed in
    useEffect(() => {
        if (status === "authenticated") {
            router.push('/');
        }
    }, [router, status]);

    // Form inputs
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);

    // Form outputs
    const [usernameErrors, setUsernameErrors] = useState<string[]>([]);
    const [emailErrors, setEmailErrors] = useState<string[]>([]);
    const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
    const [signUpOutput, setSignUpOutput] = useState<string[]>([]);
    const [signUpOutputColor, setSignUpOutputColor] = useState<"black" | "red" | "green">("black");
    const [usernameHighlighted, setUsernameHighlighted] = useState(false);
    const [emailHighlighted, setEmailHighlighted] = useState(false);
    const [passwordHighlighted, setPasswordHighlighted] = useState(false);
    const [formLoading1, setFormLoading1] = useState(false);
    const [formLoading2, setFormLoading2] = useState(false);
    const [formLoading3, setFormLoading3] = useState(false);

    // Form submit handlers
    async function handleRegisterSubmit() {

        document.body.style.cursor = "wait";

        setFormLoading1(true);

        // Clears output fields
        setSignUpOutput([]);
        setSignUpOutputColor("black");
        setUsernameHighlighted(false);
        setUsernameErrors([]);
        setEmailHighlighted(false);
        setEmailErrors([]);
        setPasswordHighlighted(false);
        setEmailErrors([]);

        // Checks validity of input fields
        const usernameCheck = checkUsername(username);
        const emailCheck = checkEmail(email);
        const passwordCheck = checkPassword(password);

        // Highlights invalid input fields & displays their errors
        if (!usernameCheck.status) {
            setUsernameErrors(usernameCheck.errors);
            setUsernameHighlighted(true);
        }
        if (!emailCheck.status) {
            setEmailErrors(emailCheck.errors);
            setEmailHighlighted(true);
        }
        if (!passwordCheck.status) {
            setPasswordErrors(passwordCheck.errors);
            setPasswordHighlighted(true);
        }

        // Returns before hitting API if any inputs are invalid
        if (!usernameCheck.status || !emailCheck.status || !passwordCheck.status) {
            document.body.style.cursor = "default";

            setFormLoading1(false);
            return;
        }

        // Signs up using '/api/register' endpoint
        const result = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: username,
                email: email,
                password: password,
            }),
        })

        // Displays error / success from above endpoint
        const data = await result.json();
        if (!result.ok) {
            setSignUpOutput([data.error ?? "Something went wrong. Try again later."]);
            setSignUpOutputColor("red");
            document.body.style.cursor = "default";

            setFormLoading1(false);
            return;
        }
        else {
            setSignUpOutput(["Account created — check your email to verify before signing in."]);
            setSignUpOutputColor("green");
            setUsername("");
            setEmail("");
            setPassword("");
            document.body.style.cursor = "default";

            setFormLoading1(false);
            return;
        }
    }
    async function handleGoogleSubmit() {

        document.body.style.cursor = "wait";

        setFormLoading2(true);

        await signIn('google');

        document.body.style.cursor = "default";

        setFormLoading2(false);
        return;
    }
    async function handleGithubSubmit() {

        document.body.style.cursor = "wait";

        setFormLoading3(true);

        await signIn('github');

        document.body.style.cursor = "default";

        setFormLoading3(false);
        return;
    }

    // Updates state variables when user navigates back to this page and the input fields are pre-filled 
    // with their previous values (e.g. after a failed login attempt)
    const usernameInputRef = useCallback((node: HTMLInputElement | null) => {
        if (node !== null && node.value !== username) {
            setUsername(node.value);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const emailInputRef = useCallback((node: HTMLInputElement | null) => {
        if (node !== null && node.value !== email) {
            setEmail(node.value);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const passwordInputRef = useCallback((node: HTMLInputElement | null) => {
        if (node !== null && node.value !== password) {
            setPassword(node.value);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps 
    }, []);

    return (
        <div className="flex flex-col p-4 sm:m-4 bg-slate-200 sm:border-t border-b sm:border-l sm:border-r border-black text-black min-w-full sm:min-w-160">

            <div className="flex flex-row justify-center text-2xl font-semibold mb-2">
                Sign up for LoganLifts
            </div>

            <button className={`flex flex-row items-center justify-center text-lg font-medium p-2 mx-4 my-2 rounded-md border-2 border-black text-black
                                ${formLoading2 ? "bg-[oklch(58.75%_0.1603_148.5)] hover:cursor-wait" : "bg-[oklch(64.75%_0.1603_148.5)] hover:bg-[oklch(58.75%_0.1603_148.5)] hover:cursor-pointer"}`}
                onClick={() => {
                    if (formLoading2) return;
                    handleGoogleSubmit();
                }}>
                <FaGoogle className="scale-160 ml-2 mr-4" />
                Continue with Google
            </button>

            <button className={`flex flex-row items-center justify-center text-lg font-medium p-2 mx-4 my-2 rounded-md border-2 border-black  text-black 
                                ${formLoading3 ? "bg-[oklch(0.5202_0.2585_295.66)] hover:cursor-wait" : "bg-[oklch(0.5502_0.2585_295.66)] hover:bg-[oklch(0.5202_0.2585_295.66)] hover:cursor-pointer"}`}
                onClick={() => {
                    if (formLoading3) return;
                    handleGithubSubmit();
                }}>
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
                    if (formLoading1) return;
                    handleRegisterSubmit();
                }}
            >
                <input
                    ref={usernameInputRef}
                    type="text"
                    className={`
                        flex flex-row justify-center p-2 mx-4 mt-2 rounded-md border-2 
                        ${usernameHighlighted ? "border-red-600 text-red-600" : "border-black text-black"}
                    `}
                    placeholder="Username"
                    value={username}
                    onChange={
                        (e) => {
                            setUsername(e.target.value);
                            setUsernameHighlighted(false);
                            setUsernameErrors([]);
                            setSignUpOutput([]);
                            setSignUpOutputColor("black");
                        }
                    }
                />

                {usernameErrors.length > 0 && (
                    <ul className="w-full flex flex-col items-start text-sm text-red-600 list-disc mt-1">
                        {usernameErrors.map((error, i) => {
                            return <li key={i} className="mx-7">{error}</li>
                        })}
                    </ul>
                )}

                <input
                    ref={emailInputRef}
                    type="text"
                    className={`
                        flex flex-row justify-center p-2 mx-4 mt-2 rounded-md border-2 
                        ${emailHighlighted ? "border-red-600 text-red-600" : "border-black text-black"}
                    `}
                    placeholder="Email"
                    value={email}
                    onChange={
                        (e) => {
                            setEmail(e.target.value);
                            setEmailHighlighted(false);
                            setEmailErrors([]);
                            setSignUpOutput([]);
                            setSignUpOutputColor("black");
                        }
                    }
                />

                {emailErrors.length > 0 && (
                    <ul className="w-full flex flex-col items-start text-sm text-red-600 list-disc mt-1">
                        {emailErrors.map((error, i) => {
                            return <li key={i} className="mx-7">{error}</li>
                        })}
                    </ul>
                )}

                <div className="flex flex-row relative mx-4 mt-2">
                    <input
                        ref={passwordInputRef}
                        type={passwordVisible ? "text" : "password"}
                        className={`
                            w-full flex justify-center p-2 rounded-md border-2 
                            ${passwordHighlighted ? "border-red-600 text-red-600" : "border-black text-black"}
                        `}
                        placeholder="Password"
                        value={password}
                        onChange={
                            (e) => {
                                setPassword(e.target.value);
                                setPasswordHighlighted(false);
                                setPasswordErrors([]);
                                setSignUpOutput([]);
                                setSignUpOutputColor("black");
                            }
                        }
                    />
                    <button
                        type="button"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 hover:cursor-pointer rounded-full p-1 scale-125 hover:bg-stone-400 opacity-75"
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        onClick={(e) => setPasswordVisible(!passwordVisible)}
                    >
                        {passwordVisible ? <FaEyeSlash /> : <FaEye />}
                    </button>
                </div>

                {passwordErrors.length > 0 && (
                    <ul className="w-full flex flex-col items-start text-sm text-red-600 list-disc mt-1">
                        {passwordErrors.map((error, i) => {
                            return <li key={i} className="mx-7">{error}</li>
                        })}
                    </ul>
                )}

                <button
                    type="submit"
                    className={`flex flex-row items-center justify-center text-lg font-medium p-2 mx-4 mt-2 rounded-md border-2 border-black  text-black 
                        ${formLoading1 ? "bg-[oklch(63.5%_0.213_47.604)] hover:cursor-wait" : "bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"}`}
                >
                    <FaUser className="scale-160 ml-2 mr-4" />
                    Create account
                </button>

                {signUpOutput.length > 0 && (
                    <ul className={`w-full flex flex-col items-start text-sm list-disc mt-1 ${signUpOutputColor === "red" ? "text-red-600" : signUpOutputColor === "green" ? "text-green-600" : "text-black"}`}>
                        {signUpOutput.map((error, i) => {
                            return <li key={i} className="mx-7">{error}</li>
                        })}
                    </ul>
                )}

                <div className="flex flex-row items-center justify-evenly mt-2">
                    <div className="grow border-t border-black" />
                    <div className="w-fit mx-3 text-center">or</div>
                    <div className="grow border-t border-black" />
                </div>

                <Link
                    href="/login"
                    className="flex flex-row text-blue-600 underline sm:no-underline hover:underline justify-center mb-3">Already have an account?
                </Link>

            </form>
        </div>
    );
}

export default Page;