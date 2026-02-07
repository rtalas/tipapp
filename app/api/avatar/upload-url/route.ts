import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin, AVATAR_BUCKET } from '@/lib/supabase'

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_CONTENT_LENGTH = 5 * 1024 * 1024 // 5MB

/**
 * Generate a signed upload URL for avatar upload.
 * The URL expires after 5 minutes for security.
 */
export async function POST(request: NextRequest) {
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

  // Validate content type from request body
  let contentType = 'image/jpeg'
  try {
    const body = await request.json()
    if (body.contentType) {
      contentType = body.contentType
    }
  } catch {
    // No body or invalid JSON — use default
  }

  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: `Invalid file type. Allowed: ${ALLOWED_CONTENT_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  const userId = session.user.id
  const extension = contentType.split('/')[1] === 'jpeg' ? 'jpg' : contentType.split('/')[1]
  const fileName = `${userId}.${extension}`
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
      contentType,
      maxSize: MAX_CONTENT_LENGTH,
    })
  } catch (error) {
    console.error('Avatar upload URL error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
