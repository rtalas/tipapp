'use client'

import { format } from 'date-fns'
import { Shield } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { updateProfile, updatePassword } from '@/actions/profile'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/logging/client-logger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

interface ProfileContentProps {
  user: {
    id: number
    firstName: string
    lastName: string
    username: string
    email: string
    mobileNumber: string | null
    notifyHours: number
    isSuperadmin: boolean
    createdAt: Date
    updatedAt: Date
  }
}

export function ProfileContent({ user }: ProfileContentProps) {
  const t = useTranslations('admin.profile')

  const userInitials = user.username.slice(0, 2).toUpperCase()

  const handleProfileUpdate = async (data: UpdateProfileInput): Promise<ProfileActionResult> => {
    try {
      const result = await updateProfile(data)
      if (!result.success && 'error' in result) {
        logger.error('Failed to update profile', { error: result.error })
        return { success: false, error: getErrorMessage(result.error, t('profileUpdateFailed')) }
      }
      return result
    } catch (error) {
      logger.error('Failed to update profile', { error })
      return { success: false, error: getErrorMessage(error, t('profileUpdateFailed')) }
    }
  }

  const handlePasswordUpdate = async (data: UpdatePasswordInput): Promise<PasswordActionResult> => {
    try {
      const result = await updatePassword(data)
      if (!result.success && 'error' in result) {
        logger.error('Failed to update password', { error: result.error })
        return { success: false, error: getErrorMessage(result.error, t('passwordUpdateFailed')) }
      }
      return result
    } catch (error) {
      logger.error('Failed to update password', { error })
      return { success: false, error: getErrorMessage(error, t('passwordUpdateFailed')) }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('description')}
        </p>
      </div>

      {/* Profile Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="flex items-center gap-2">
                {user.firstName} {user.lastName}
                {user.isSuperadmin && (
                  <Badge variant="admin" className="ml-2">
                    <Shield className="mr-1 h-3 w-3" />
                    {t('superadmin')}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>@{user.username}</CardDescription>
              <p className="text-sm text-muted-foreground mt-1">
                {t('memberSince', { date: format(new Date(user.createdAt), 'MMMM yyyy') })}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Profile Information Form */}
      <ProfileInformationForm
        user={{
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          mobileNumber: user.mobileNumber,
          notifyHours: user.notifyHours,
        }}
        variant="admin"
        onUpdate={handleProfileUpdate}
      />

      {/* Password Change Form */}
      <PasswordChangeForm
        variant="admin"
        onUpdate={handlePasswordUpdate}
      />

      {/* Account Details */}
      <Card>
        <CardHeader>
          <CardTitle>{t('accountDetails')}</CardTitle>
          <CardDescription>{t('accountDetailsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">{t('userId')}</span>
            <span className="text-sm font-mono">{user.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">{t('created')}</span>
            <span className="text-sm">
              {format(new Date(user.createdAt), 'PPP')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">{t('lastUpdated')}</span>
            <span className="text-sm">
              {format(new Date(user.updatedAt), 'PPP')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">{t('role')}</span>
            <span className="text-sm">
              {user.isSuperadmin ? t('roleValue') : 'User'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
