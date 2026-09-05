'use client'

import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation'
import { useEffect } from "react";

const Page = () => {

    const { status } = useSession();
    const router = useRouter();
    
    // Redirect to home page if user is not already signed in
    useEffect(() => {
        if(status === "unauthenticated") {
            console.log("Sent");
            router.push('/');
        }
    }, [router, status]);

    return(
        <div className=""></div>
    );
}

export default Page;