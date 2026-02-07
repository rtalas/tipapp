'use client'

import { useMemo, useState } from 'react'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { updateProfile, updateAvatar } from '@/actions/user/profile'
import { updatePassword } from '@/actions/profile'
import {
  ProfileInformationForm,
  type UpdateProfileInput,
  type ActionResult as ProfileActionResult,
} from '@/components/common/profile/profile-information-form'
import {
  PasswordChangeForm,
  type UpdatePasswordInput,
  type ActionResult as PasswordActionResult,
} from '@/components/common/profile/password-change-form'
import { AvatarUpload } from './avatar-upload'

interface ProfileContentProps {
  profile: {
    id: number
    username: string
    email: string | null
    firstName: string | null
    lastName: string | null
    mobileNumber: string | null
    notifyHours: number
    createdAt: Date
    avatarUrl: string | null
  }
}

export function ProfileContent({ profile }: ProfileContentProps) {
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(profile.avatarUrl)

  // Get user initials
  const userInitials = useMemo(() => {
    if (profile.firstName && profile.lastName) {
      return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
    }
    return profile.username.slice(0, 2).toUpperCase()
  }, [profile])

  const handleAvatarChange = async (newUrl: string | null) => {
    const result = await updateAvatar(newUrl)
    if (result.success) {
      setCurrentAvatarUrl(newUrl)
    } else {
      throw new Error(result.error || 'Failed to update avatar')
    }
  }

  const handleProfileUpdate = async (data: UpdateProfileInput): Promise<ProfileActionResult> => {
    const result = await updateProfile(data)
    if ('error' in result) {
      return { success: false, error: result.error }
    }
    return result
  }

  const handlePasswordUpdate = async (data: UpdatePasswordInput): Promise<PasswordActionResult> => {
    const result = await updatePassword(data)
    if ('error' in result) {
      return { success: false, error: result.error }
    }
    return result
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* User Info Card */}
      <Card className="glass-card border-0">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <AvatarUpload
              avatarUrl={currentAvatarUrl}
              initials={userInitials}
              onAvatarChange={handleAvatarChange}
            />
            <div className="text-center">
              <p className="text-xl font-bold">
                {profile.firstName && profile.lastName
                  ? `${profile.firstName} ${profile.lastName}`
                  : profile.username}
              </p>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details Form */}
      <ProfileInformationForm
        user={{
          username: profile.username,
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          mobileNumber: profile.mobileNumber,
          notifyHours: profile.notifyHours,
        }}
        variant="user"
        onUpdate={handleProfileUpdate}
        showPushNotifications={false} /* TODO */
      />

      {/* Change Password Form */}
      <PasswordChangeForm
        variant="user"
        onUpdate={handlePasswordUpdate}
      />
    </div>
  )
}
