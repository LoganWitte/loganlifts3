'use client'

import { useSession } from "next-auth/react";
import { useState, useMemo, useRef } from "react";
import Image from 'next/image';
import { FaUser, FaTrash, FaImage, FaEyeSlash, FaEye, FaKey, FaWeightScale } from 'react-icons/fa6'
import { checkPassword, checkUsername } from "@/lib/credentialChecks";
import { MAX_BODY_WEIGHT } from "@/lib/constants";
import { kgsToPounds, poundsToKgs } from "@/lib/formulas";
import Link from 'next/link';

const Page = () => {

    const { data, update } = useSession();

    const currentUsername: string = useMemo(() =>
        data?.user?.name || "user",
        [data]
    );

    const email: string = useMemo(() =>
        data?.user?.email || "email@address.com",
        [data]
    );

    const imageURL: string | undefined = useMemo(() =>
        data?.user?.image || undefined,
        [data]
    );

    const userHasPassword: boolean = useMemo(() =>
        data?.user?.hasPassword ?? false,
        [data]
    );


    // Form inputs
    const [newUsername, setNewUsername] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [oldPasswordVisible, setOldPasswordVisible] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordVisible, setNewPasswordVisible] = useState(false);
    const [newBodyWeight, setNewBodyWeight] = useState('');
    const [bodyWeightUnit, setBodyWeightUnit] = useState<"lbs" | "kg">("lbs");
    // Values returned by '/api/account/bodyweight' after saving. These take priority over the session values,
    // so the page never displays a stale value while (or if) the session is still refreshing.
    const [savedBodyWeight, setSavedBodyWeight] = useState<{ value: number | null } | null>(null);
    const [savedAutoUpdate, setSavedAutoUpdate] = useState<boolean | null>(null);

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

    const [bodyWeightErrors, setBodyWeightErrors] = useState<string[]>([]);
    const [bodyWeightHighlighted, setBodyWeightHighlighted] = useState(false);
    const [updateBodyWeightOutput, setUpdateBodyWeightOutput] = useState<string[]>([]);
    const [updateBodyWeightOutputColor, setUpdateBodyWeightOutputColor] = useState<"black" | "red" | "green">("black");
    const [formLoading3, setFormLoading3] = useState(false);

    // Stored in pounds
    const currentBodyWeight: number | null = useMemo(() =>
        savedBodyWeight !== null ? savedBodyWeight.value : (data?.user?.bodyWeight ?? null),
        [data, savedBodyWeight]
    );

    // Defaults to true, matching the database default
    const currentBodyWeightAutoUpdate: boolean = useMemo(() =>
        savedAutoUpdate ?? data?.user?.bodyWeightAutoUpdate ?? true,
        [data, savedAutoUpdate]
    );

    // Image upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageLoading, setImageLoading] = useState(false);
    const [imageError, setImageError] = useState<string>('');
    const [imageSuccess, setImageSuccess] = useState<string>('');

    // Formats a body weight (stored in pounds) in the currently selected unit
    function formatBodyWeight(pounds: number): string {
        return bodyWeightUnit === "kg" ? `${poundsToKgs(pounds)} kg` : `${pounds} lbs`;
    }

    function handleEditImage() {
        fileInputRef.current?.click();
    }

    async function handleImageFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            setImageError('File size must be less than 5MB.');
            setTimeout(() => setImageError(''), 5000);
            return;
        }

        document.body.style.cursor = "wait";
        setImageLoading(true);
        setImageError('');
        setImageSuccess('');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/account/profile-photo', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.error ?? 'Failed to upload image.';
                setImageError(errorMsg);
                setTimeout(() => setImageError(''), 5000);
                document.body.style.cursor = "default";
                setImageLoading(false);
                return;
            }

            setImageSuccess('Profile photo updated successfully.');
            setTimeout(() => setImageSuccess(''), 3000);
            if (fileInputRef.current) fileInputRef.current.value = '';
            document.body.style.cursor = "default";
            setImageLoading(false);
            await update();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            setImageError('Failed to upload image. Please try again.');
            setTimeout(() => setImageError(''), 5000);
            document.body.style.cursor = "default";
            setImageLoading(false);
        }
    }

    function handleRemoveImage() {
        const confirmed = window.confirm("Are you sure you would like to remove your existing profile photo? This action is permanent.");
        if (!confirmed) return;

        deleteProfileImage();
    }

    async function deleteProfileImage() {
        document.body.style.cursor = "wait";
        setImageLoading(true);
        setImageError('');
        setImageSuccess('');

        try {
            const response = await fetch('/api/account/profile-photo', {
                method: 'DELETE',
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.error ?? 'Failed to delete image.';
                setImageError(errorMsg);
                setTimeout(() => setImageError(''), 5000);
                document.body.style.cursor = "default";
                setImageLoading(false);
                return;
            }

            setImageSuccess('Profile photo removed successfully.');
            setTimeout(() => setImageSuccess(''), 3000);
            document.body.style.cursor = "default";
            setImageLoading(false);
            await update();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            setImageError('Failed to delete image. Please try again.');
            setTimeout(() => setImageError(''), 5000);
            document.body.style.cursor = "default";
            setImageLoading(false);
        }
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
            setTimeout(() => {
                setUsernameErrors([]);
                setUsernameHighlighted(false);
            }, 5000);
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
            const errorMsg = data.error ?? "Something went wrong. Try again later.";
            setUpdateNameOutput([errorMsg]);
            setUpdateNameOutputColor("red");
            setTimeout(() => {
                setUpdateNameOutput([]);
                setUsernameHighlighted(false);
                setUsernameErrors([]);
            }, 5000);
            document.body.style.cursor = "default";
            setFormLoading1(false);
            return;
        }
        else {
            setUpdateNameOutput(["Username successfully updated."]);
            setUpdateNameOutputColor("green");
            setTimeout(() => {
                setUpdateNameOutput([]);
                setUsernameHighlighted(false);
                setUsernameErrors([]);
            }, 3000);
            setNewUsername("");
            document.body.style.cursor = "default";
            setFormLoading1(false);
            await update();
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
            setTimeout(() => {
                setOldPasswordErrors([]);
                setOldPasswordHighlighted(false);
                setNewPasswordErrors([]);
                setNewPasswordHighlighted(false);
            }, 5000);
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
            const errorMsg = data.error ?? "Something went wrong. Try again later.";
            setUpdatePasswordOutput([errorMsg]);
            setUpdatePasswordOutputColor("red");
            setTimeout(() => {
                setUpdatePasswordOutput([]);
                setOldPasswordHighlighted(false);
                setNewPasswordHighlighted(false);
                setOldPasswordErrors([]);
                setNewPasswordErrors([]);
            }, 5000);
            document.body.style.cursor = "default";
            setFormLoading2(false);
            return;
        }
        else {
            setUpdatePasswordOutput(["Password successfully updated."]);
            setUpdatePasswordOutputColor("green");
            setTimeout(() => {
                setUpdatePasswordOutput([]);
                setOldPasswordHighlighted(false);
                setNewPasswordHighlighted(false);
                setOldPasswordErrors([]);
                setNewPasswordErrors([]);
            }, 3000);
            setOldPassword("");
            setNewPassword("");
            document.body.style.cursor = "default";
            setFormLoading2(false);
            await update();
            return;
        }
    }

    // Sends body weight and / or auto-update changes to '/api/account/bodyweight', displaying the result
    // Returns whether the update succeeded
    async function submitBodyWeightUpdate(body: { bodyWeight?: number | null, bodyWeightAutoUpdate?: boolean }, successMessage: string): Promise<boolean> {

        document.body.style.cursor = "wait";
        setFormLoading3(true);

        // Clears output fields
        setUpdateBodyWeightOutput([]);
        setUpdateBodyWeightOutputColor("black");
        setBodyWeightHighlighted(false);
        setBodyWeightErrors([]);

        // Updates body weight using '/api/account/bodyweight' endpoint
        const result = await fetch('/api/account/bodyweight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        // Displays error / success from above endpoint
        const data = await result.json();
        if (!result.ok) {
            const errorMsg = data.error ?? "Something went wrong. Try again later.";
            setUpdateBodyWeightOutput([errorMsg]);
            setUpdateBodyWeightOutputColor("red");
            if (data.details?.bodyWeight) {
                setBodyWeightErrors(data.details.bodyWeight);
                setBodyWeightHighlighted(true);
            }
            setTimeout(() => {
                setUpdateBodyWeightOutput([]);
                setBodyWeightHighlighted(false);
                setBodyWeightErrors([]);
            }, 5000);
            document.body.style.cursor = "default";
            setFormLoading3(false);
            return false;
        }
        else {
            setSavedBodyWeight({ value: data.bodyWeight });
            setSavedAutoUpdate(data.bodyWeightAutoUpdate);
            setUpdateBodyWeightOutput([successMessage]);
            setUpdateBodyWeightOutputColor("green");
            setTimeout(() => {
                setUpdateBodyWeightOutput([]);
                setBodyWeightHighlighted(false);
                setBodyWeightErrors([]);
            }, 3000);
            document.body.style.cursor = "default";
            setFormLoading3(false);
            await update(); // Updates { data, status } ('useSession')
            return true;
        }
    }

    async function handleUpdateBodyWeightSubmit() {

        // Checks validity of body weight field, converting to pounds if necessary
        const input = newBodyWeight.trim();
        const value = Number(input);
        const pounds = bodyWeightUnit === "kg" ? kgsToPounds(value) : Math.round(value * 100) / 100;
        const maxInUnit = bodyWeightUnit === "kg" ? `${poundsToKgs(MAX_BODY_WEIGHT)} kg` : `${MAX_BODY_WEIGHT} lbs`;

        let error = "";
        if (input.length === 0) {
            error = "Body weight missing.";
        }
        else if (!Number.isFinite(value) || pounds <= 0) {
            error = "Body weight must be a positive number.";
        }
        else if (pounds > MAX_BODY_WEIGHT) {
            error = `Body weight must be at most ${maxInUnit}.`;
        }

        // Handles error with body weight
        if (error !== "") {
            setUpdateBodyWeightOutput([]);
            setBodyWeightErrors([error]);
            setBodyWeightHighlighted(true);
            setTimeout(() => {
                setBodyWeightErrors([]);
                setBodyWeightHighlighted(false);
            }, 5000);
            return;
        }

        const success = await submitBodyWeightUpdate({ bodyWeight: pounds }, `Body weight updated to ${formatBodyWeight(pounds)}.`);
        if (success) setNewBodyWeight("");
    }

    async function handleRemoveBodyWeight() {
        await submitBodyWeightUpdate({ bodyWeight: null }, "Body weight removed.");
    }

    async function handleAutoUpdateToggle(checked: boolean) {
        // Shows the new value immediately, reverting if saving fails
        const previous = currentBodyWeightAutoUpdate;
        setSavedAutoUpdate(checked);
        const success = await submitBodyWeightUpdate(
            { bodyWeightAutoUpdate: checked },
            checked ? "Auto-update turned on." : "Auto-update turned off."
        );
        if (!success) setSavedAutoUpdate(previous);
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

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileSelect}
                    className="hidden"
                />

                <button
                    type="button"
                    disabled={imageLoading}
                    className={`flex flex-row items-center justify-center sm:text-lg font-medium p-2 rounded-md border-2 border-black text-black w-full 
                    ${imageLoading ? "bg-[oklch(63.5%_0.213_47.604)] hover:cursor-wait" : "bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"}`}
                    onClick={handleEditImage}
                >
                    <FaImage className="text-2xl mr-1" />
                    {imageURL !== undefined ? "Upload new profile photo" : "Upload profile photo"}
                </button>

                {imageURL !== undefined && <button
                    type="button"
                    disabled={imageLoading}
                    className={`flex flex-row items-center justify-center sm:text-lg font-medium p-2 rounded-md border-2 border-black text-black w-full 
                    ${imageLoading ? "bg-[oklch(63.5%_0.213_47.604)] hover:cursor-wait" : "bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"}`}
                    onClick={handleRemoveImage}
                >
                    <FaTrash className="text-2xl mr-1" />
                    Remove existing profile photo
                </button>}

                {imageError && (
                    <ul className="w-full flex flex-col items-start text-sm text-red-600 list-disc">
                        <li className="mx-7">{imageError}</li>
                    </ul>
                )}

                {imageSuccess && (
                    <ul className="w-full flex flex-col items-start text-sm text-green-600 list-disc">
                        <li className="mx-7">{imageSuccess}</li>
                    </ul>
                )}

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
                className="flex flex-col mb-2 min-w-[80%]"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (formLoading3) return;
                    handleUpdateBodyWeightSubmit();
                }}
            >

                <div className="flex flex-row justify-center sm:text-lg mx-4 font-bold">
                    Update body weight:
                </div>

                <div className="flex flex-row justify-center sm:text-lg mx-4">
                    <span className="mr-1">Current body weight:</span>
                    {currentBodyWeight !== null
                        ? <span className="font-bold">{formatBodyWeight(currentBodyWeight)}</span>
                        : <span className="text-stone-600">Not set</span>
                    }
                </div>

                <div className="flex flex-row gap-2 mx-4 mt-1">

                    <input
                        type="number"
                        min={0}
                        step="any"
                        className={`
                            grow min-w-0 p-2 rounded-md border-2
                            ${bodyWeightHighlighted ? "border-red-600 text-red-600" : "border-black text-black"}
                        `}
                        placeholder={`New body weight (${bodyWeightUnit})`}
                        value={newBodyWeight}
                        onChange={
                            (e) => {
                                setNewBodyWeight(e.target.value);
                                setBodyWeightHighlighted(false);
                                setBodyWeightErrors([]);
                                setUpdateBodyWeightOutput([]);
                                setUpdateBodyWeightOutputColor("black");
                            }
                        }
                    />

                    <select
                        aria-label="Body weight unit"
                        className="p-2 rounded-md border-2 border-black text-black bg-white hover:cursor-pointer"
                        value={bodyWeightUnit}
                        onChange={(e) => setBodyWeightUnit(e.target.value as "lbs" | "kg")}
                    >
                        <option value="lbs">lbs</option>
                        <option value="kg">kg</option>
                    </select>

                </div>

                {bodyWeightErrors.length > 0 && (
                    <ul className="w-full flex flex-col items-start text-sm text-red-600 list-disc mt-1">
                        {bodyWeightErrors.map((error, i) => {
                            return <li key={i} className="mx-7">{error}</li>
                        })}
                    </ul>
                )}

                <button
                    type="submit"
                    className={`flex flex-row items-center justify-center sm:text-lg font-medium p-2 mx-4 mt-2 rounded-md border-2 border-black  text-black 
                        ${formLoading3 ? "bg-[oklch(63.5%_0.213_47.604)] hover:cursor-wait" : "bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"}`}
                >
                    <FaWeightScale className="scale-160 ml-2 mr-4" />
                    Update body weight
                </button>

                {currentBodyWeight !== null && <button
                    type="button"
                    className={`flex flex-row items-center justify-center sm:text-lg font-medium p-2 mx-4 mt-2 rounded-md border-2 border-black  text-black 
                        ${formLoading3 ? "bg-[oklch(63.5%_0.213_47.604)] hover:cursor-wait" : "bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"}`}
                    onClick={() => {
                        if (formLoading3) return;
                        handleRemoveBodyWeight();
                    }}
                >
                    <FaTrash className="scale-160 ml-2 mr-4" />
                    Remove body weight
                </button>}

                {/* Saves immediately when toggled */}
                <label className={`flex flex-row items-center gap-2 mx-4 mt-2 text-left sm:text-lg font-medium ${formLoading3 ? "hover:cursor-wait" : "hover:cursor-pointer"}`}>
                    <input
                        type="checkbox"
                        className={`accent-orange-500 scale-125 ${formLoading3 ? "hover:cursor-wait" : "hover:cursor-pointer"}`}
                        checked={currentBodyWeightAutoUpdate}
                        disabled={formLoading3}
                        onChange={(e) => handleAutoUpdateToggle(e.target.checked)}
                    />
                    Auto-update
                </label>

                {/* 'w-0 min-w-full' fills the form's width without widening it */}
                <div className="w-0 min-w-full pl-10 pr-4 text-xs text-left text-stone-600">
                    When on, logging a lift with a body weight also updates your body weight here,
                    as long as that lift is your most recent one. Turn this off to only change it manually.
                </div>

                {updateBodyWeightOutput.length > 0 && (
                    <ul className={`w-full flex flex-col items-start text-sm list-disc mt-1 ${updateBodyWeightOutputColor === "red" ? "text-red-600" : updateBodyWeightOutputColor === "green" ? "text-green-600" : "text-black"}`}>
                        {updateBodyWeightOutput.map((error, i) => {
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
                    </ul>

                )}

                {userHasPassword &&
                    <Link
                        className="mx-4 text-blue-600 underline sm:no-underline hover:underline mt-1"
                        href={`/reset-password/request${email !== "email@address.com" ? "?email=" + email : ""}`}
                    >
                        Forgot Password?
                    </Link>
                }

            </form>


        </div>
    );
}

export default Page;