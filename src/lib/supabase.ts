import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not configured. Avatar uploads will not work. ' +
    'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
  )
}

/**
 * Supabase client for client-side operations (public).
 * Uses the anon key which respects RLS policies.
 */
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

/**
 * Supabase admin client for server-side operations.
 * Uses the service role key which bypasses RLS.
 * Only use this on the server (API routes, server actions).
 */
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

/**
 * Check if Supabase storage is configured
 */
export function isStorageConfigured(): boolean {
  return supabase !== null
}

/**
 * Avatar storage bucket name
 */
export const AVATAR_BUCKET = 'Avatars'

/**
 * Get the public URL for an avatar
 */
export function getAvatarPublicUrl(path: string): string | null {
  if (!supabase) return null

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
