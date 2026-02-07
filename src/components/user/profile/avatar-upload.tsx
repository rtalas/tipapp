'use client'

import { useState, useRef } from 'react'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  resizeImageForAvatar,
  isValidImageType,
  isValidFileSize,
  MAX_RAW_FILE_SIZE,
} from '@/lib/image-utils'
import { supabase, AVATAR_BUCKET, isStorageConfigured } from '@/lib/supabase'

interface AvatarUploadProps {
  /** Current avatar URL */
  avatarUrl: string | null
  /** User initials for fallback */
  initials: string
  /** Callback when avatar is updated */
  onAvatarChange: (newUrl: string | null) => Promise<void>
}

export function AvatarUpload({
  avatarUrl,
  initials,
  onAvatarChange,
}: AvatarUploadProps) {
  const t = useTranslations('auth.profile')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Display current avatar or preview
  const displayUrl = previewUrl || avatarUrl

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!isValidImageType(file)) {
      toast.error(t('avatarInvalidType'))
      return
    }

    // Validate file size
    if (!isValidFileSize(file)) {
      toast.error(t('avatarTooLarge', { maxSize: Math.round(MAX_RAW_FILE_SIZE / 1024 / 1024) }))
      return
    }

    // Check if storage is configured
    if (!isStorageConfigured() || !supabase) {
      toast.error(t('avatarStorageNotConfigured'))
      return
    }

    setIsUploading(true)

    try {
      // Resize image
      const resizedBlob = await resizeImageForAvatar(file)

      // Get signed upload URL from our API
      const urlResponse = await fetch('/api/avatar/upload-url', {
        method: 'POST',
      })

      if (!urlResponse.ok) {
        throw new Error('Failed to get upload URL')
      }

      const { token, path, publicUrl } = await urlResponse.json()

      // Upload to Supabase Storage using signed URL
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .uploadToSignedUrl(path, token, resizedBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadError) {
        throw uploadError
      }

      // Add cache-busting parameter to force browser refresh
      const newUrl = `${publicUrl}?t=${Date.now()}`

      // Show preview immediately
      setPreviewUrl(newUrl)

      // Update database via server action
      await onAvatarChange(newUrl)

      toast.success(t('avatarUpdated'))
    } catch (error) {
      console.error('Avatar upload error:', error)
      toast.error(t('avatarUploadFailed'))
      setPreviewUrl(null)
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async () => {
    if (!avatarUrl && !previewUrl) return

    setIsUploading(true)

    try {
      await onAvatarChange(null)
      setPreviewUrl(null)
      toast.success(t('avatarDeleted'))
    } catch (error) {
      console.error('Avatar delete error:', error)
      toast.error(t('avatarDeleteFailed'))
    } finally {
      setIsUploading(false)
    }
  }

  const handleAvatarClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar with camera overlay */}
      <button
        type="button"
        onClick={handleAvatarClick}
        disabled={isUploading}
        className="relative group cursor-pointer disabled:cursor-wait"
        aria-label={t('changeAvatar')}
      >
        <Avatar className="h-20 w-20 ring-4 ring-primary/30">
          {displayUrl && (
            <AvatarImage
              src={displayUrl}
              alt={t('avatar')}
            />
          )}
          <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Overlay */}
        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isUploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </div>
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {/* Delete button (only show if has avatar) */}
      {(avatarUrl || previewUrl) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isUploading}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {t('removeAvatar')}
        </Button>
      )}

      {/* Helper text */}
      <p className="text-xs text-muted-foreground text-center">
        {t('avatarHint')}
      </p>
    </div>
  )
}
