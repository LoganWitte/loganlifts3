'use client'

import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from "react";
import Image from 'next/image';
import { FaUser, FaTrash, FaImage, FaEyeSlash, FaEye, FaKey } from 'react-icons/fa6'
import { checkPassword, checkUsername } from "@/lib/credentialChecks";
import Link from 'next/link';

const Page = () => {

    const { data, status, update } = useSession();

    // Redirect to home page if user is not already signed in
    const router = useRouter();
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push('/');
        }
    }, [router, status]);

    // Extracts & sanitizes user data: name, email, image
    const currentUsername: string = useMemo(() => {
        if (status === "loading") return "user";
        if (status === "unauthenticated") return "user";
        if (!data || !data.user || !data.user.name) return "user";
        if (data.user.name.length <= 0) return "user";
        return data.user.name;
    }, [data, status]);

    const email: string = useMemo(() => {
        if (status === "loading") return "email@address.com";
        if (status === "unauthenticated") return "email@address.com";
        if (!data || !data.user || !data.user.email) return "email@address.com";
        if (data.user.email.length <= 0) return "email@address.com";
        return data.user.email;
    }, [data, status]);

    const imageURL: string | undefined = useMemo(() => {
        if (status === "loading") return undefined;
        if (status === "unauthenticated") return undefined;
        if (!data || !data.user || !data.user.image) return undefined;
        if (data.user.image.length <= 0) return undefined;
        return data.user.image;
    }, [data, status]);

    const userHasPassword: boolean = useMemo(() => {
        if (status === "loading") return false;
        if (status === "unauthenticated") return false;
        if (!data || !data.user || !data.user.hasPassword) return false;
        return data.user.hasPassword;
    }, [data, status])

    // Form inputs
    const [newUsername, setNewUsername] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [oldPasswordVisible, setOldPasswordVisible] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordVisible, setNewPasswordVisible] = useState(false);

    // Form outputs
    const [usernameErrors, setUsernameErrors] = useState<string[]>([]);
    const [updateNameOutput, setUpdateNameOutput] = useState<string[]>([]);
    const [updateNameOutputColor, setUpdateNameOutputColor] = useState<"black" | "red" | "green">("black");
    const [usernameHighlighted, setUsernameHighlighted] = useState(false);
    const [formLoading1, setFormLoading1] = useState(false);

    const [oldPasswordErrors, setOldPasswordErrors] = useState<string[]>([]);
    const [oldPasswordHighlighted, setOldPasswordHighlighted] = useState(false);
    const [newPasswordErrors, setNewPasswordErrors] = useState<string[]>([]);
    const [newPasswordHighlighted, setNewPasswordHighlighted] = useState(false);
    const [formLoading2, setFormLoading2] = useState(false);
    const [updatePasswordOutput, setUpdatePasswordOutput] = useState<string[]>([]);
    const [updatePasswordOutputColor, setUpdatePasswordOutputColor] = useState<"black" | "red" | "green">("black");
    const [passwordIncorrectResponse, setPasswordIncorrectResponse] = useState(false);

    function handleEditImage() {
        // TODO - implement profile image editing
    }

    function handleRemoveImage() {
        const result = window.confirm("Are you sure you would like to remove your existing profile photo? This action is permanent.");
        // TODO - implement profile image deletion
        console.log(result ? "Deleting profile image" : "Preserving profile image");
    }

    // Form submit handlers
    async function handleUpdateNameSubmit() {

        document.body.style.cursor = "wait";
        setFormLoading1(true);

        // Clears output fields
        setUpdateNameOutput([]);
        setUpdateNameOutputColor("black");
        setUsernameHighlighted(false);
        setUsernameErrors([]);

        // Checks validity of username field
        const usernameCheck = checkUsername(newUsername);

        // Handles error with username
        if (!usernameCheck.status) {
            setUsernameErrors(usernameCheck.errors);
            setUsernameHighlighted(true);
            document.body.style.cursor = "default";
            setFormLoading1(false);
            return;
        }

        // Updates username using '/api/account/username' endpoint
        const result = await fetch('/api/account/username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                newUsername: newUsername,
            }),
        });

        // Displays error / success from above endpoint
        const data = await result.json();
        if (!result.ok) {
            setUpdateNameOutput([data.error ?? "Something went wrong. Try again later."]);
            setUpdateNameOutputColor("red");
            document.body.style.cursor = "default";
            setFormLoading1(false);
            return;
        }
        else {
            setUpdateNameOutput(["Username successfully updated."]);
            setUpdateNameOutputColor("green");
            setNewUsername("");
            document.body.style.cursor = "default";
            setFormLoading1(false);
            await update(); // Updates { data, status } ('useSession')
            return;
        }

    }

    async function handleUpdatePasswordSubmit() {

        document.body.style.cursor = "wait";
        setFormLoading2(true);

        // Clears output fields
        setUpdatePasswordOutput([]);
        setUpdatePasswordOutputColor("black");
        setOldPasswordHighlighted(false);
        setNewPasswordHighlighted(false);
        setOldPasswordErrors([]);
        setNewPasswordErrors([]);
        setPasswordIncorrectResponse(false);

        // Checks validity of input fields
        const oldPasswordPresent = userHasPassword ? oldPassword.length > 0 : false;
        const newPasswordCheck = checkPassword(newPassword);

        // Highlights invalid input fields & displays their errors
        if (userHasPassword && !oldPasswordPresent) {
            setOldPasswordErrors(["Old password missing."])
            setOldPasswordHighlighted(true);
        }
        if (!newPasswordCheck.status) {
            setNewPasswordErrors(newPasswordCheck.errors);
            setNewPasswordHighlighted(true);
        }

        // Returns before hitting API if any inputs are invalid
        if ((userHasPassword && !oldPasswordPresent) || !newPasswordCheck.status) {
            document.body.style.cursor = "default";
            setFormLoading2(false);
            return;
        }

        // Updates password using '/api/account/password' endpoint
        const result = await fetch('/api/account/password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentPassword: userHasPassword ? oldPassword : null,
                newPassword: newPassword,
            }),
        });

        // Displays error / success from above endpoint
        const data = await result.json();
        if (!result.ok) {
            if (data.error === "Current password is incorrect.") {
                setPasswordIncorrectResponse(true);
            }
            setUpdatePasswordOutput([data.error ?? "Something went wrong. Try again later."]);
            setUpdatePasswordOutputColor("red");
            document.body.style.cursor = "default";
            setFormLoading2(false);
            return;
        }
        else {
            setUpdatePasswordOutput(["Password successfully updated."]);
            setUpdatePasswordOutputColor("green");
            setOldPassword("");
            setNewPassword("");
            document.body.style.cursor = "default";
            setFormLoading2(false);
            await update(); // Updates { data, status } ('useSession')
            return;
        }
    }

    return (
        <div className="flex flex-col items-center justify-center text-center p-4 sm:m-4 bg-slate-200 sm:border-t border-b sm:border-l sm:border-r border-black text-black min-w-full sm:min-w-160">

            <div className="flex flex-row justify-center text-xl sm:text-2xl font-semibold mb-2">
                Account
            </div>

            <div className="flex flex-row justify-center sm:text-lg mx-4">
                <span className="mr-1">Username:</span>
                &quot;
                <span className="font-bold">{currentUsername}</span>
                &quot;
            </div>

            <div className="flex flex-row justify-center sm:text-lg mx-4 mb-2">
                <span className="mr-1">Email address: &quot;<span className="font-bold">{email}&quot;</span></span>
            </div>

            <div className="flex flex-col items-center justify-center mx-4 mb-2 gap-2">

                <Image
                    className="border border-black"
                    src={imageURL !== undefined ? imageURL : "/default_avatar.webp"}
                    alt={imageURL !== undefined ? "User's profile image" : "Blank profile image"}
                    width={300}
                    height={300}
                />

                <button
                    className="flex flex-row items-center justify-center sm:text-lg font-medium p-2 rounded-md border-2 border-black text-black bg-orange-500 w-full 
                    hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"
                    onClick={handleEditImage}
                >
                    <FaImage className="text-2xl mr-1" />
                    {imageURL !== undefined ? "Upload new profile photo" : "Upload profile photo"}
                </button>

                {imageURL !== undefined && <button
                    className="flex flex-row items-center justify-center sm:text-lg font-medium p-2 rounded-md border-2 border-black text-black bg-orange-500 w-full 
                    hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"
                    onClick={handleRemoveImage}
                >
                    <FaTrash className="text-2xl mr-1" />
                    Remove existing profile photo
                </button>}

            </div>

            <form
                className="flex flex-col mb-2 min-w-[80%]"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (formLoading1) return;
                    handleUpdateNameSubmit();
                }}
            >

                <div className="flex flex-row justify-center sm:text-lg mx-4 font-bold">
                    Update username:
                </div>

                <input
                    type="text"
                    className={`
                        flex flex-row justify-center p-2 mx-4 rounded-md border-2 mt-1
                        ${usernameHighlighted ? "border-red-600 text-red-600" : "border-black text-black"}
                    `}
                    placeholder="New username"
                    value={newUsername}
                    onChange={
                        (e) => {
                            setNewUsername(e.target.value);
                            setUsernameHighlighted(false);
                            setUsernameErrors([]);
                            setUpdateNameOutput([]);
                            setUpdateNameOutputColor("black");
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

                <button
                    type="submit"
                    className={`flex flex-row items-center justify-center sm:text-lg font-medium p-2 mx-4 mt-2 rounded-md border-2 border-black  text-black 
                        ${formLoading1 ? "bg-[oklch(63.5%_0.213_47.604)] hover:cursor-wait" : "bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"}`}
                >
                    <FaUser className="scale-160 ml-2 mr-4" />
                    Update username
                </button>

                {updateNameOutput.length > 0 && (
                    <ul className={`w-full flex flex-col items-start text-sm list-disc mt-1 ${updateNameOutputColor === "red" ? "text-red-600" : updateNameOutputColor === "green" ? "text-green-600" : "text-black"}`}>
                        {updateNameOutput.map((error, i) => {
                            return <li key={i} className="mx-7">{error}</li>
                        })}
                    </ul>
                )}

            </form>

            <form
                className="flex flex-col mb-3 min-w-[80%]"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (formLoading2) return;
                    handleUpdatePasswordSubmit();
                }}
            >

                <div className="flex flex-row justify-center sm:text-lg mx-4 font-bold mb-1">
                    Update password:
                </div>

                {userHasPassword && <div className="flex flex-row relative mx-4">

                    <input
                        type={oldPasswordVisible ? "text" : "password"}
                        className={`
                                            w-full flex justify-center p-2 rounded-md border-2 
                                            ${oldPasswordHighlighted ? "border-red-600 text-red-600" : "border-black text-black"}
                                        `}
                        placeholder="Old password"
                        value={oldPassword}
                        onChange={
                            (e) => {
                                setOldPassword(e.target.value);
                                setOldPasswordHighlighted(false);
                                setOldPasswordErrors([]);
                                setUpdatePasswordOutput([]);
                                setPasswordIncorrectResponse(false);
                                setUpdatePasswordOutputColor("black");
                            }
                        }
                    />

                    <button
                        type="button"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 hover:cursor-pointer rounded-full p-1 scale-125 hover:bg-stone-400 opacity-75"
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        onClick={(e) => setOldPasswordVisible(!oldPasswordVisible)}
                    >
                        {oldPasswordVisible ? <FaEyeSlash /> : <FaEye />}
                    </button>

                </div>}

                {oldPasswordErrors.length > 0 && (
                    <ul className="w-full flex flex-col items-start text-sm text-red-600 list-disc mt-1">
                        {oldPasswordErrors.map((error, i) => {
                            return <li key={i} className="mx-7">{error}</li>
                        })}
                    </ul>
                )}

                <div className="flex flex-row relative mx-4 mt-2">

                    <input
                        type={newPasswordVisible ? "text" : "password"}
                        className={`
                                            w-full flex justify-center p-2 rounded-md border-2 
                                            ${newPasswordHighlighted ? "border-red-600 text-red-600" : "border-black text-black"}
                                        `}
                        placeholder="New password"
                        value={newPassword}
                        onChange={
                            (e) => {
                                setNewPassword(e.target.value);
                                setNewPasswordHighlighted(false);
                                setNewPasswordErrors([]);
                                setUpdatePasswordOutput([]);
                                setPasswordIncorrectResponse(false);
                                setUpdatePasswordOutputColor("black");
                            }
                        }
                    />

                    <button
                        type="button"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 hover:cursor-pointer rounded-full p-1 scale-125 hover:bg-stone-400 opacity-75"
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        onClick={(e) => setNewPasswordVisible(!newPasswordVisible)}
                    >
                        {newPasswordVisible ? <FaEyeSlash /> : <FaEye />}
                    </button>

                </div>

                {newPasswordErrors.length > 0 && (
                    <ul className="w-full flex flex-col items-start text-sm text-red-600 list-disc mt-1">
                        {newPasswordErrors.map((error, i) => {
                            return <li key={i} className="mx-7">{error}</li>
                        })}
                    </ul>
                )}

                <button
                    type="submit"
                    className={`flex flex-row items-center justify-center sm:text-lg font-medium p-2 mx-4 mt-2 rounded-md border-2 border-black  text-black 
                                        ${formLoading2 ? "bg-[oklch(63.5%_0.213_47.604)] hover:cursor-wait" : "bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"}`}
                >
                    <FaKey className="scale-160 ml-2 mr-4" />
                    Update password
                </button>

                {updatePasswordOutput.length > 0 && (
                    <ul className={`w-full flex flex-col items-start text-sm list-disc mt-1 ${updatePasswordOutputColor === "red" ? "text-red-600" : updatePasswordOutputColor === "green" ? "text-green-600" : "text-black"}`}>
                        {updatePasswordOutput.map((error, i) => {
                            return <li key={i} className="mx-7">{error}</li>
                        })}
                        {passwordIncorrectResponse &&
                            <li className="mx-7 text-black">
                                Click<Link className="mx-1 text-blue-600 underline sm:no-underline hover:underline"
                                    href={`/reset-password/request${email !== "email@address.com" ? "?email=" + email : ""}`}>here</Link>to reset password.
                            </li>
                        }
                    </ul>

                )}

            </form>


        </div>
    );
}

export default Page;