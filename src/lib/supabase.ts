import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
 * Check if Supabase storage is configured
 */
export function isStorageConfigured(): boolean {
  return supabase !== null
}

/**
 * Avatar storage bucket name
 */
export const AVATAR_BUCKET = 'Avatars'
