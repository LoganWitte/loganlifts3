'use client'

import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useCallback, useEffect} from 'react';
import { FaGithub, FaGoogle, FaEye, FaEyeSlash, FaUser } from 'react-icons/fa'

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
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);

    // Updates state variables when user navigates back to this page and the input fields are pre-filled 
    // with their previous values (e.g. after a failed login attempt)
    const usernameInputRef = useCallback((node: HTMLInputElement | null) => {
        if(node !== null && node.value !== username) {
            setUsername(node.value);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const emailInputRef = useCallback((node: HTMLInputElement | null) => {
        if(node !== null && node.value !== email) {
            setEmail(node.value);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const passwordInputRef = useCallback((node: HTMLInputElement | null) => {
        if(node !== null && node.value !== password) {
            setPassword(node.value);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handleRegisterSubmit() {
        return;
    }

    return(
        <div className="flex flex-col p-4 m-4 bg-slate-200 border border-black text-black">
            
            <div className="flex flex-row justify-center text-2xl font-semibold mb-2">
                Sign up for LoganLifts
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
                    handleRegisterSubmit();
                }}
            >
                <input 
                    ref={usernameInputRef}
                    type="text" 
                    className="flex flex-row justify-center p-2 mx-4 mt-2 rounded-md border-2 border-black"
                    placeholder="Username (optional)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                <input 
                    ref={emailInputRef}
                    type="email" 
                    className="flex flex-row justify-center p-2 mx-4 mt-2 rounded-md border-2 border-black"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <div className="flex flex-row relative mx-4 my-2">
                    <input 
                        ref={passwordInputRef}
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
                    <FaUser className="scale-160 ml-2 mr-4"/>
                    Register account
                </button>
            </form>
        </div>
    );
}

export default Page;