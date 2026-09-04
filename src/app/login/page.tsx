'use client'

import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import { useState, useCallback, useEffect } from 'react';
import { FaEnvelope, FaGithub, FaGoogle, FaEye, FaEyeSlash, FaKey } from 'react-icons/fa'
import { useRouter } from 'next/navigation'

const Page = () => {

    const { data: session } = useSession();
    const router = useRouter();

    // Redirect to home page if user is already signed in
    useEffect(() => {
        if(session) {
            router.push('/');
        }
    }, [router, session]);

    // State variables
    const [emailForLink, setEmailForLink] = useState('');
    const [emailForCredentials, setEmailForCredentials] = useState('');
    const [password, setPassword] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);

    // Updates state variables when user navigates back to this page and the input fields are pre-filled 
    // with their previous values (e.g. after a failed login attempt)
    const credentialEmailInputRef = useCallback((node: HTMLInputElement | null) => {
        if(node !== null && node.value !== emailForCredentials) {
            setEmailForCredentials(node.value);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const credentialPasswordInputRef = useCallback((node: HTMLInputElement | null) => {
        if(node !== null && node.value !== password) {
            setPassword(node.value);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const emailLinkInputRef = useCallback((node: HTMLInputElement | null) => {
        if(node !== null && node.value !== emailForLink) {
            setEmailForLink(node.value);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handleEmailLinkSubmit() {
        return;
    }

    function handleCredentialsSubmit() {
        return;
    }

    return(
        <div className="flex flex-col p-4 m-4 bg-slate-200 border border-black text-black">
            
            <div className="flex flex-row justify-center text-2xl font-semibold mb-2">
                Sign in to LoganLifts
            </div>

            <button className="flex flex-row items-center justify-center text-lg font-medium p-2 mx-4 my-2 rounded-md border-2 border-black bg-green-600/70 hover:bg-green-600 text-black
                               hover:cursor-pointer"
                               onClick={() => signIn('google')}>
                <FaGoogle className="scale-160 ml-2 mr-4"/>
                Continue with Google
            </button>

            <button className="flex flex-row items-center justify-center text-lg font-medium p-2 mx-4 my-2 rounded-md border-2 border-black bg-purple-600/70 hover:bg-purple-600/90 text-black
                               hover:cursor-pointer"
                               onClick={() => signIn('github')}>
                <FaGithub className="scale-160 ml-2 mr-4"/>
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
                    type="email" 
                    className="flex flex-row justify-center p-2 mx-4 mt-2 rounded-md border-2 border-black"
                    placeholder="Email"
                    value={emailForCredentials}
                    onChange={(e) => setEmailForCredentials(e.target.value)}
                />

                <div className="flex flex-row relative mx-4 my-2">
                    <input 
                        ref={credentialPasswordInputRef}
                        type={passwordVisible ? "text" : "password"} 
                        className="w-full flex justify-center p-2 rounded-md border-2 border-black"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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

                <button 
                    type="submit" 
                    className="flex flex-row items-center justify-center text-lg font-medium p-2 mx-4 mb-2 rounded-md border-2 
                    border-black bg-orange-500/90 hover:bg-orange-500 text-black hover:cursor-pointer"
                >
                    <FaKey className="scale-160 ml-2 mr-4"/>
                    Sign in with credentials
                </button>
            </form>

            <div className="flex flex-row justify-center mx-4 my-0 text-sm">
                 <Link 
                    href={`/reset-password${emailForCredentials ? "?email=" + emailForCredentials : emailForLink ? "?email=" + emailForLink : ""}`} 
                    className="text-blue-600 hover:underline">Forgot password?</Link>
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
                    type="email" 
                    className="flex flex-row items-center justify-center p-2 mx-4 mt-2 rounded-md border-2 border-black"
                    placeholder="Email"
                    value={emailForLink}
                    onChange={(e) => setEmailForLink(e.target.value)}
                    ref={emailLinkInputRef}
                />
                <button 
                    type="submit" 
                    className="flex flex-row items-center justify-center text-lg font-medium p-2 mx-4 my-2 rounded-md border-2 
                    border-black bg-orange-500/90 hover:bg-orange-500 text-black hover:cursor-pointer"
                >
                    <FaEnvelope className="scale-160 ml-2 mr-4"/>
                    Sign in with email link
                </button>
            </form>
        </div>
    );
}

export default Page;