'use client'

import { useSession, signOut } from "next-auth/react";
import { useState, useMemo, useRef } from "react";
import Image from 'next/image';
import { FaUser, FaTrash, FaImage, FaEyeSlash, FaEye, FaKey, FaWeightScale, FaUserXmark, FaAddressCard, FaGlobe, FaLock } from 'react-icons/fa6'
import { checkBio, checkPassword, checkUsername, normalizeBio } from "@/lib/credentialChecks";
import { MAX_BIO_LENGTH, MAX_BODY_WEIGHT } from "@/lib/constants";
import type { PrivacySettings } from "@/lib/models";
import { kgsToPounds, poundsToKgs } from "@/lib/formulas";
import Link from 'next/link';
import ContentsLinks from "@/app/components/ContentsLinks";
import UnitToggle from "@/app/components/UnitToggle";
import { useUnitContext } from "@/app/components/contextProviders/UnitProvider";

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

    // Value the user must type to delete their account: their username, or their email if they have no username.
    // null while the session is loading.
    const deleteConfirmTarget: string | null = useMemo(() =>
        data?.user?.name || data?.user?.email || null,
        [data]
    );
    const hasUsername: boolean = !!data?.user?.name;


    // Form inputs
    const [newUsername, setNewUsername] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [oldPasswordVisible, setOldPasswordVisible] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordVisible, setNewPasswordVisible] = useState(false);
    const [newBodyWeight, setNewBodyWeight] = useState('');
    // Unit for entering & displaying body weight, shared with the rest of the site ('UnitProvider')
    const { useKgs, setUseKgs } = useUnitContext();
    const bodyWeightUnit: "lbs" | "kg" = useKgs ? "kg" : "lbs";
    const setBodyWeightUnit = (unit: "lbs" | "kg") => setUseKgs(unit === "kg");
    // Values returned by '/api/account/bodyweight' after saving. These take priority over the session values,
    // so the page never displays a stale value while (or if) the session is still refreshing.
    const [savedBodyWeight, setSavedBodyWeight] = useState<{ value: number | null } | null>(null);
    const [savedAutoUpdate, setSavedAutoUpdate] = useState<boolean | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    // null until the user edits the bio field, which shows the current bio until then
    const [bioDraft, setBioDraft] = useState<string | null>(null);
    // Values returned by '/api/account/bio' & '/api/account/privacy' after saving, taking priority over the session (like 'savedBodyWeight')
    const [savedBio, setSavedBio] = useState<{ value: string | null } | null>(null);
    const [savedPrivacy, setSavedPrivacy] = useState<PrivacySettings | null>(null);
    // Value returned by '/api/account/preferences/useKgs' after saving, taking priority over the session (like 'savedPrivacy')
    const [savedPrefersKgs, setSavedPrefersKgs] = useState<boolean | null>(null);

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

    const [deleteConfirmationErrors, setDeleteConfirmationErrors] = useState<string[]>([]);
    const [deleteConfirmationHighlighted, setDeleteConfirmationHighlighted] = useState(false);
    const [deleteAccountOutput, setDeleteAccountOutput] = useState<string[]>([]);
    const [deleteAccountOutputColor, setDeleteAccountOutputColor] = useState<"black" | "red" | "green">("black");
    const [formLoading4, setFormLoading4] = useState(false);

    const [bioErrors, setBioErrors] = useState<string[]>([]);
    const [bioHighlighted, setBioHighlighted] = useState(false);
    const [updateBioOutput, setUpdateBioOutput] = useState<string[]>([]);
    const [updateBioOutputColor, setUpdateBioOutputColor] = useState<"black" | "red" | "green">("black");
    const [formLoading5, setFormLoading5] = useState(false);

    const [updatePrivacyOutput, setUpdatePrivacyOutput] = useState<string[]>([]);
    const [updatePrivacyOutputColor, setUpdatePrivacyOutputColor] = useState<"black" | "red" | "green">("black");
    const [formLoading6, setFormLoading6] = useState(false);

    const [updateGeneralOutput, setUpdateGeneralOutput] = useState<string[]>([]);
    const [updateGeneralOutputColor, setUpdateGeneralOutputColor] = useState<"black" | "red" | "green">("black");
    const [formLoading7, setFormLoading7] = useState(false);

    const currentBio: string | null = useMemo(() =>
        savedBio !== null ? savedBio.value : (data?.user?.bio ?? null),
        [data, savedBio]
    );

    // The bio field's value: the user's edits, or the current bio if they haven't edited it
    const bioInput: string = bioDraft ?? currentBio ?? "";

    // Counted on the normalized text, matching 'checkBio'
    const bioLength: number = useMemo(() =>
        normalizeBio(bioInput).length,
        [bioInput]
    );

    // Defaults match the database defaults
    const currentPrivacy: PrivacySettings = useMemo(() =>
        savedPrivacy ?? {
            profilePublic: data?.user?.profilePublic ?? false,
            profilePhotoPublic: data?.user?.profilePhotoPublic ?? true,
            bioPublic: data?.user?.bioPublic ?? true,
            bodyWeightPublic: data?.user?.bodyWeightPublic ?? false,
            liftsPublic: data?.user?.liftsPublic ?? false,
        },
        [data, savedPrivacy]
    );

    // Defaults to pounds, matching the database default
    const currentPrefersKgs: boolean = useMemo(() =>
        savedPrefersKgs ?? data?.user?.prefersKgs ?? false,
        [data, savedPrefersKgs]
    );

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

    // Sends a bio update ('POST' to set, 'DELETE' to remove) to '/api/account/bio', displaying the result
    // Returns whether the update succeeded
    async function submitBioUpdate(method: 'POST' | 'DELETE', successMessage: string): Promise<boolean> {

        document.body.style.cursor = "wait";
        setFormLoading5(true);

        // Clears output fields
        setUpdateBioOutput([]);
        setUpdateBioOutputColor("black");
        setBioHighlighted(false);
        setBioErrors([]);

        // Updates bio using '/api/account/bio' endpoint
        const result = await fetch('/api/account/bio', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: method === 'POST' ? JSON.stringify({ bio: bioInput }) : undefined,
        });

        // Displays error / success from above endpoint
        const data = await result.json();
        if (!result.ok) {
            const errorMsg = data.error ?? "Something went wrong. Try again later.";
            setUpdateBioOutput([errorMsg]);
            setUpdateBioOutputColor("red");
            if (data.details?.bio) {
                setBioErrors(data.details.bio);
                setBioHighlighted(true);
            }
            setTimeout(() => {
                setUpdateBioOutput([]);
                setBioHighlighted(false);
                setBioErrors([]);
            }, 5000);
            document.body.style.cursor = "default";
            setFormLoading5(false);
            return false;
        }
        else {
            setSavedBio({ value: data.bio });
            setBioDraft(null); // Shows the saved (normalized) bio in the field
            setUpdateBioOutput([successMessage]);
            setUpdateBioOutputColor("green");
            setTimeout(() => {
                setUpdateBioOutput([]);
                setBioHighlighted(false);
                setBioErrors([]);
            }, 3000);
            document.body.style.cursor = "default";
            setFormLoading5(false);
            await update(); // Updates { data, status } ('useSession')
            return true;
        }
    }

    async function handleUpdateBioSubmit() {

        // Checks validity of bio field
        const bioCheck = checkBio(bioInput);
        const empty = normalizeBio(bioInput).length === 0;

        let errors: string[] = [];
        if (!bioCheck.status) {
            errors = bioCheck.errors;
        }
        else if (empty && currentBio === null) {
            errors = ["Bio missing."];
        }

        // Handles error with bio
        if (errors.length > 0) {
            setUpdateBioOutput([]);
            setBioErrors(errors);
            setBioHighlighted(true);
            setTimeout(() => {
                setBioErrors([]);
                setBioHighlighted(false);
            }, 5000);
            return;
        }

        // An empty bio removes the existing one
        await submitBioUpdate('POST', empty ? "Bio removed." : "Bio successfully updated.");
    }

    function handleRemoveBio() {
        const confirmed = window.confirm("Are you sure you would like to remove your bio?");
        if (!confirmed) return;

        submitBioUpdate('DELETE', "Bio removed.");
    }

    // Sends privacy setting changes to '/api/account/privacy', displaying the result
    // The new values are shown immediately, reverting if saving fails (like the 'Auto-update' checkbox)
    async function handlePrivacyChange(changes: Partial<PrivacySettings>, successMessage: string) {

        const previous = currentPrivacy;
        setSavedPrivacy({ ...currentPrivacy, ...changes });

        document.body.style.cursor = "wait";
        setFormLoading6(true);

        // Clears output fields
        setUpdatePrivacyOutput([]);
        setUpdatePrivacyOutputColor("black");

        // Updates privacy settings using '/api/account/privacy' endpoint
        const result = await fetch('/api/account/privacy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(changes),
        });

        // Displays error / success from above endpoint
        const data = await result.json();
        if (!result.ok) {
            setSavedPrivacy(previous);
            const errorMsg = data.error ?? "Something went wrong. Try again later.";
            setUpdatePrivacyOutput([errorMsg]);
            setUpdatePrivacyOutputColor("red");
            setTimeout(() => {
                setUpdatePrivacyOutput([]);
            }, 5000);
            document.body.style.cursor = "default";
            setFormLoading6(false);
            return;
        }
        else {
            setSavedPrivacy({
                profilePublic: data.profilePublic,
                profilePhotoPublic: data.profilePhotoPublic,
                bioPublic: data.bioPublic,
                bodyWeightPublic: data.bodyWeightPublic,
                liftsPublic: data.liftsPublic,
            });
            setUpdatePrivacyOutput([successMessage]);
            setUpdatePrivacyOutputColor("green");
            setTimeout(() => {
                setUpdatePrivacyOutput([]);
            }, 3000);
            document.body.style.cursor = "default";
            setFormLoading6(false);
            await update(); // Updates { data, status } ('useSession')
            return;
        }
    }

    // Saves the preferred unit immediately, and switches the displayed unit to match
    async function handleUnitPreferenceChange(newPrefersKgs: boolean) {
        if (formLoading7 || newPrefersKgs === currentPrefersKgs) return;

        const previous = currentPrefersKgs;
        setSavedPrefersKgs(newPrefersKgs);
        setUseKgs(newPrefersKgs);

        document.body.style.cursor = "wait";
        setFormLoading7(true);

        // Clears output fields
        setUpdateGeneralOutput([]);
        setUpdateGeneralOutputColor("black");

        // Updates the preferred unit using '/api/account/preferences/useKgs' endpoint
        const result = await fetch('/api/account/preferences/useKgs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ useKgs: newPrefersKgs }),
        });

        // Displays error / success from above endpoint
        const data = await result.json();
        if (!result.ok) {
            setSavedPrefersKgs(previous);
            setUseKgs(previous);
            const errorMsg = data.error ?? "Something went wrong. Try again later.";
            setUpdateGeneralOutput([errorMsg]);
            setUpdateGeneralOutputColor("red");
            setTimeout(() => {
                setUpdateGeneralOutput([]);
            }, 5000);
            document.body.style.cursor = "default";
            setFormLoading7(false);
            return;
        }
        else {
            setSavedPrefersKgs(data.prefersKgs);
            setUpdateGeneralOutput([`Weights are now shown in ${data.prefersKgs ? "kilograms" : "pounds"} by default.`]);
            setUpdateGeneralOutputColor("green");
            setTimeout(() => {
                setUpdateGeneralOutput([]);
            }, 3000);
            document.body.style.cursor = "default";
            setFormLoading7(false);
            await update(); // Updates { data, status } ('useSession')
            return;
        }
    }

    async function handleDeleteAccountSubmit() {

        // Clears output fields
        setDeleteAccountOutput([]);
        setDeleteAccountOutputColor("black");
        setDeleteConfirmationHighlighted(false);
        setDeleteConfirmationErrors([]);

        // Checks that the user typed their entire username (or email, if they have no username)
        let error = "";
        if (deleteConfirmTarget === null) {
            error = "Account still loading. Try again in a moment.";
        }
        else if (deleteConfirmation.trim().length === 0) {
            error = hasUsername ? "Username missing." : "Email address missing.";
        }
        else if (deleteConfirmation.trim() !== deleteConfirmTarget) {
            error = hasUsername ? "Username does not match." : "Email address does not match.";
        }

        // Handles error with confirmation field
        if (error !== "") {
            setDeleteConfirmationErrors([error]);
            setDeleteConfirmationHighlighted(true);
            setTimeout(() => {
                setDeleteConfirmationErrors([]);
                setDeleteConfirmationHighlighted(false);
            }, 5000);
            return;
        }

        const confirmed = window.confirm(`Are you sure you would like to permanently delete your account "${deleteConfirmTarget}"? This also deletes all of your logged lifts and custom exercises. This action is permanent and cannot be undone.`);
        if (!confirmed) return;

        document.body.style.cursor = "wait";
        setFormLoading4(true);

        // Deletes account using '/api/account/delete' endpoint
        const result = await fetch('/api/account/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                confirmUsername: deleteConfirmation.trim(),
            }),
        });

        // Displays error / success from above endpoint
        const data = await result.json();
        if (!result.ok) {
            const errorMsg = data.error ?? "Something went wrong. Try again later.";
            setDeleteAccountOutput([errorMsg]);
            setDeleteAccountOutputColor("red");
            setTimeout(() => {
                setDeleteAccountOutput([]);
                setDeleteConfirmationHighlighted(false);
                setDeleteConfirmationErrors([]);
            }, 5000);
            document.body.style.cursor = "default";
            setFormLoading4(false);
            return;
        }
        else {
            setDeleteAccountOutput(["Account deleted. Signing out..."]);
            setDeleteAccountOutputColor("green");
            document.body.style.cursor = "default";
            // Signs out & returns to the home page, as the account no longer exists
            await signOut({ redirectTo: '/' });
            return;
        }
    }

    return (
        <div className="flex flex-col items-center justify-center text-center p-4 sm:m-4 bg-slate-200 sm:border-t border-b sm:border-l sm:border-r border-black text-black min-w-full sm:min-w-160">

            <div className="flex flex-row justify-center text-xl sm:text-2xl font-semibold mb-2">
                Account
            </div>

            <div className="mb-3">
                <ContentsLinks links={[
                    { id: "profile-photo", label: "Profile photo" },
                    { id: "username", label: "Username" },
                    { id: "bio", label: "Bio" },
                    { id: "body-weight", label: "Body weight" },
                    { id: "password", label: "Password" },
                    { id: "general-settings", label: "General settings" },
                    { id: "privacy", label: "Privacy" },
                    { id: "delete-account", label: "Delete account" },
                ]} />
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

            <div id="profile-photo" className="scroll-mt-4 flex flex-col items-center justify-center mx-4 mb-2 gap-2">

                <Image
                    className="border-2 border-black"
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
                id="username"
                className="scroll-mt-4 flex flex-col mb-2 min-w-[80%]"
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
                id="bio"
                className="scroll-mt-4 flex flex-col mb-2 min-w-[80%]"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (formLoading5) return;
                    handleUpdateBioSubmit();
                }}
            >

                <div className="flex flex-row justify-center sm:text-lg mx-4 font-bold">
                    Update bio:
                </div>

                <textarea
                    rows={4}
                    className={`
                        p-2 mx-4 rounded-md border-2 mt-1 resize-y
                        ${bioHighlighted ? "border-red-600 text-red-600" : "border-black text-black"}
                    `}
                    placeholder="Tell others about yourself"
                    value={bioInput}
                    onChange={
                        (e) => {
                            setBioDraft(e.target.value);
                            setBioHighlighted(false);
                            setBioErrors([]);
                            setUpdateBioOutput([]);
                            setUpdateBioOutputColor("black");
                        }
                    }
                />

                <div className={`mx-4 text-xs text-right ${bioLength > MAX_BIO_LENGTH ? "text-red-600" : "text-stone-600"}`}>
                    {bioLength}/{MAX_BIO_LENGTH}
                </div>

                {bioErrors.length > 0 && (
                    <ul className="w-full flex flex-col items-start text-sm text-red-600 list-disc mt-1">
                        {bioErrors.map((error, i) => {
                            return <li key={i} className="mx-7">{error}</li>
                        })}
                    </ul>
                )}

                <button
                    type="submit"
                    className={`flex flex-row items-center justify-center sm:text-lg font-medium p-2 mx-4 mt-2 rounded-md border-2 border-black  text-black
                        ${formLoading5 ? "bg-[oklch(63.5%_0.213_47.604)] hover:cursor-wait" : "bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"}`}
                >
                    <FaAddressCard className="scale-160 ml-2 mr-4" />
                    Update bio
                </button>

                {currentBio !== null && <button
                    type="button"
                    className={`flex flex-row items-center justify-center sm:text-lg font-medium p-2 mx-4 mt-2 rounded-md border-2 border-black  text-black
                        ${formLoading5 ? "bg-[oklch(63.5%_0.213_47.604)] hover:cursor-wait" : "bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"}`}
                    onClick={() => {
                        if (formLoading5) return;
                        handleRemoveBio();
                    }}
                >
                    <FaTrash className="scale-160 ml-2 mr-4" />
                    Remove bio
                </button>}

                {updateBioOutput.length > 0 && (
                    <ul className={`w-full flex flex-col items-start text-sm list-disc mt-1 ${updateBioOutputColor === "red" ? "text-red-600" : updateBioOutputColor === "green" ? "text-green-600" : "text-black"}`}>
                        {updateBioOutput.map((error, i) => {
                            return <li key={i} className="mx-7">{error}</li>
                        })}
                    </ul>
                )}

            </form>

            <form
                id="body-weight"
                className="scroll-mt-4 flex flex-col mb-2 min-w-[80%]"
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
                id="password"
                className="scroll-mt-4 flex flex-col mb-3 min-w-[80%]"
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

            <div id="general-settings" className="scroll-mt-4 flex flex-col mb-3 min-w-[80%]">

                <div className="flex flex-row justify-center sm:text-lg mx-4 font-bold mb-1">
                    General settings:
                </div>

                {/* Saves immediately when toggled */}
                <div className={`flex flex-row flex-wrap items-center justify-center gap-x-3 mx-4 ${formLoading7 ? "hover:cursor-wait" : ""}`}>
                    <span className="sm:text-lg font-medium mb-2">Preferred unit:</span>
                    <UnitToggle falseString="Pounds" trueString="Kilograms" value={currentPrefersKgs} setValue={handleUnitPreferenceChange} />
                </div>

                {/* 'w-0 min-w-full' fills the section's width without widening it */}
                <div className="w-0 min-w-full px-4 text-xs text-stone-600">
                    Used for weights across the site each time you visit. Unit toggles on other pages only change it until you reload.
                </div>

                {updateGeneralOutput.length > 0 && (
                    <ul className={`w-full flex flex-col items-start text-sm list-disc mt-1 ${updateGeneralOutputColor === "red" ? "text-red-600" : updateGeneralOutputColor === "green" ? "text-green-600" : "text-black"}`}>
                        {updateGeneralOutput.map((error, i) => {
                            return <li key={i} className="mx-7">{error}</li>
                        })}
                    </ul>
                )}

            </div>

            {/* A form only so 'autoComplete="off"' stops browsers (e.g. Firefox) restoring the controls' disabled / checked
                state after a reload, which wouldn't match the server-rendered HTML (hydration mismatch). Nothing is submitted. */}
            <form
                id="privacy"
                className="scroll-mt-4 flex flex-col mb-3 min-w-[80%]"
                autoComplete="off"
                onSubmit={(e) => e.preventDefault()}
            >

                <div className="flex flex-row justify-center sm:text-lg mx-4 font-bold">
                    Privacy settings:
                </div>

                {/* 'w-0 min-w-full' fills the section's width without widening it */}
                <div className="w-0 min-w-full px-4 text-sm text-stone-600">
                    A private profile is hidden from everyone, including your username.
                    The settings below only apply once your profile is public.
                </div>

                {/* Saves immediately when clicked */}
                <button
                    type="button"
                    disabled={formLoading6 || (!hasUsername && !currentPrivacy.profilePublic)}
                    className={`flex flex-row items-center justify-center sm:text-lg font-medium p-2 mx-4 mt-2 rounded-md border-2 border-black  text-black
                        ${formLoading6 ? "bg-[oklch(63.5%_0.213_47.604)] hover:cursor-wait"
                            : (!hasUsername && !currentPrivacy.profilePublic) ? "bg-stone-300 text-stone-600 hover:cursor-not-allowed"
                                : "bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"}`}
                    onClick={() => handlePrivacyChange(
                        { profilePublic: !currentPrivacy.profilePublic },
                        currentPrivacy.profilePublic ? "Your profile is now private." : "Your profile is now public."
                    )}
                >
                    {currentPrivacy.profilePublic ? <FaLock className="scale-160 ml-2 mr-4" /> : <FaGlobe className="scale-160 ml-2 mr-4" />}
                    {currentPrivacy.profilePublic ? "Make profile private" : "Make profile public"}
                </button>

                {!hasUsername && !currentPrivacy.profilePublic && (
                    <div className="w-0 min-w-full px-4 mt-1 text-xs text-stone-600">
                        Set a username in &quot;Update username&quot; before making your profile public.
                    </div>
                )}

                {/* Each saves immediately when toggled. Greyed out (but keeping their values) while the profile is private. */}
                {([
                    ["profilePhotoPublic", "Make profile photo public", "Profile photo is"],
                    ["bioPublic", "Make bio public", "Bio is"],
                    ["bodyWeightPublic", "Make body weight public", "Body weight is"],
                    ["liftsPublic", "Make lifts public", "Lifts are"],
                ] as const).map(([key, label, messagePrefix]) => {
                    const disabled = formLoading6 || !currentPrivacy.profilePublic;
                    return (
                        <label
                            key={key}
                            className={`flex flex-row items-center gap-2 mx-4 mt-2 text-left sm:text-lg font-medium
                                ${!currentPrivacy.profilePublic ? "opacity-50 hover:cursor-not-allowed" : formLoading6 ? "hover:cursor-wait" : "hover:cursor-pointer"}`}
                        >
                            <input
                                type="checkbox"
                                className={`accent-orange-500 scale-125 ${!currentPrivacy.profilePublic ? "hover:cursor-not-allowed" : formLoading6 ? "hover:cursor-wait" : "hover:cursor-pointer"}`}
                                checked={currentPrivacy[key]}
                                disabled={disabled}
                                onChange={(e) => handlePrivacyChange(
                                    { [key]: e.target.checked },
                                    `${messagePrefix} now ${e.target.checked ? "public" : "private"}.`
                                )}
                            />
                            {label}
                        </label>
                    );
                })}

                {updatePrivacyOutput.length > 0 && (
                    <ul className={`w-full flex flex-col items-start text-sm list-disc mt-1 ${updatePrivacyOutputColor === "red" ? "text-red-600" : updatePrivacyOutputColor === "green" ? "text-green-600" : "text-black"}`}>
                        {updatePrivacyOutput.map((error, i) => {
                            return <li key={i} className="mx-7">{error}</li>
                        })}
                    </ul>
                )}

                {data?.user?.id && (
                    <Link
                        className="mx-4 text-blue-600 underline sm:no-underline hover:underline mt-1"
                        href={`/profiles/${data.user.id}`}
                    >
                        View your profile
                    </Link>
                )}

            </form>

            <form
                id="delete-account"
                className="scroll-mt-4 flex flex-col mb-3 min-w-[80%]"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (formLoading4) return;
                    handleDeleteAccountSubmit();
                }}
            >

                <div className="flex flex-row justify-center sm:text-lg mx-4 font-bold">
                    Delete account:
                </div>

                {/* 'w-0 min-w-full' fills the form's width without widening it */}
                <div className="w-0 min-w-full px-4 text-sm text-stone-600">
                    Type your {hasUsername ? "username" : "email address"}{deleteConfirmTarget !== null && <> (&quot;<span className="font-bold">{deleteConfirmTarget}</span>&quot;)</>} to confirm.
                    This permanently deletes your account, your logged lifts, and your custom exercises.
                </div>

                <input
                    type="text"
                    autoComplete="off"
                    className={`
                        flex flex-row justify-center p-2 mx-4 rounded-md border-2 mt-1
                        ${deleteConfirmationHighlighted ? "border-red-600 text-red-600" : "border-black text-black"}
                    `}
                    placeholder={hasUsername ? "Username" : "Email address"}
                    value={deleteConfirmation}
                    onChange={
                        (e) => {
                            setDeleteConfirmation(e.target.value);
                            setDeleteConfirmationHighlighted(false);
                            setDeleteConfirmationErrors([]);
                            setDeleteAccountOutput([]);
                            setDeleteAccountOutputColor("black");
                        }
                    }
                />

                {deleteConfirmationErrors.length > 0 && (
                    <ul className="w-full flex flex-col items-start text-sm text-red-600 list-disc mt-1">
                        {deleteConfirmationErrors.map((error, i) => {
                            return <li key={i} className="mx-7">{error}</li>
                        })}
                    </ul>
                )}

                <button
                    type="submit"
                    className={`flex flex-row items-center justify-center sm:text-lg font-medium p-2 mx-4 mt-2 rounded-md border-2 border-black  text-black 
                        ${formLoading4 ? "bg-[oklch(63.5%_0.213_47.604)] hover:cursor-wait" : "bg-orange-500 hover:bg-[oklch(63.5%_0.213_47.604)] hover:cursor-pointer"}`}
                >
                    <FaUserXmark className="scale-160 ml-2 mr-4" />
                    Delete account
                </button>

                {deleteAccountOutput.length > 0 && (
                    <ul className={`w-full flex flex-col items-start text-sm list-disc mt-1 ${deleteAccountOutputColor === "red" ? "text-red-600" : deleteAccountOutputColor === "green" ? "text-green-600" : "text-black"}`}>
                        {deleteAccountOutput.map((error, i) => {
                            return <li key={i} className="mx-7">{error}</li>
                        })}
                    </ul>
                )}

            </form>


        </div>
    );
}

export default Page;
