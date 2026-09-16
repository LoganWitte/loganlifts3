import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { v2 as cloudinary } from 'cloudinary'
import { NextResponse } from 'next/server'

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

function extractPublicId(cloudinaryUrl: string): string | null {
    // Extract public ID from Cloudinary URL
    // Format: https://res.cloudinary.com/[cloud_name]/image/upload/[public_id]
    const match = cloudinaryUrl.match(/\/upload\/(.+?)(?:\.|$)/)
    return match ? match[1] : null
}

export async function POST(req: Request) {
    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
        return NextResponse.json(
            { error: 'No file provided.' },
            { status: 400 }
        )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        return NextResponse.json(
            { error: 'File must be an image.' },
            { status: 400 }
        )
    }

    // Validate file size (e.g., 5MB max)
    const MAX_FILE_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
            { error: 'File size must be less than 5MB.' },
            { status: 400 }
        )
    }

    try {
        // Get current user to delete old image if it exists
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, image: true },
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 })
        }

        // Delete old image from Cloudinary if it exists
        if (user.image) {
            const publicId = extractPublicId(user.image)
            if (publicId) {
                await cloudinary.uploader.destroy(publicId).catch(() => {
                    // Continue if deletion doesn't work
                })
            }
        }

        // Convert File to Buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Upload to Cloudinary
        const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'loganlifts/profile-photos',
                    public_id: `user-${user.id}`,
                    format: 'webp', // Force webp storage
                    overwrite: true,
                    resource_type: 'auto',
                    quality: 'auto:best',
                    fetch_format: 'auto',
                },
                (error, result) => {
                    if (error) reject(error)
                    else resolve(result as { secure_url: string })
                }
            )
            stream.end(buffer)
        })

        // Update user profile with new image URL
        await prisma.user.update({
            where: { email: session.user.email },
            data: { image: result.secure_url },
        })

        return NextResponse.json({ ok: true, imageUrl: result.secure_url })

    } catch (error) {
        console.error('Profile photo upload error:', error)
        return NextResponse.json(
            { error: 'Failed to upload image. Please try again.' },
            { status: 500 }
        )
    }
}

export async function DELETE() {
    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, image: true },
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 })
        }

        if (!user.image) {
            return NextResponse.json({ error: 'No profile photo to delete.' }, { status: 400 })
        }

        // Delete from Cloudinary
        const publicId = extractPublicId(user.image)
        if (publicId) {
            await cloudinary.uploader.destroy(publicId)
        }

        // Update user
        await prisma.user.update({
            where: { email: session.user.email },
            data: { image: null },
        })

        return NextResponse.json({ ok: true })

    } catch (error) {
        console.error('Profile photo deletion error:', error)
        return NextResponse.json(
            { error: 'Failed to delete image.' },
            { status: 500 }
        )
    }
}