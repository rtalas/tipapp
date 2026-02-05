import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin, AVATAR_BUCKET } from '@/lib/supabase'

/**
 * Generate a signed upload URL for avatar upload.
 * The URL expires after 5 minutes for security.
 */
export async function POST() {
  // Check authentication
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Check if storage is configured
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Storage not configured. Set SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 503 }
    )
  }

  const userId = session.user.id
  // Use userId as filename to ensure uniqueness and easy cleanup
  // Add timestamp to prevent caching issues when updating
  const fileName = `${userId}.jpg`
  const filePath = fileName

  try {
    // Create signed upload URL (5 minute expiry)
    const { data, error } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .createSignedUploadUrl(filePath, {
        upsert: true, // Allow overwriting existing avatar
      })

    if (error) {
      console.error('Supabase signed URL error:', error)
      return NextResponse.json(
        { error: 'Failed to create upload URL' },
        { status: 500 }
      )
    }

    // Get the public URL for the file
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(filePath)

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: filePath,
      publicUrl: publicUrlData.publicUrl,
    })
  } catch (error) {
    console.error('Avatar upload URL error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
