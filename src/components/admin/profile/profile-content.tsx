'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { User, Mail, Phone, Bell, Lock, Shield } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { updateProfile, updatePassword, type UpdateProfileInput, type UpdatePasswordInput } from '@/actions/profile'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/client-logger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

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
  const [isEditingProfile, setIsEditingProfile] = React.useState(false)
  const [isEditingPassword, setIsEditingPassword] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Profile form state
  const [profileForm, setProfileForm] = React.useState<UpdateProfileInput>({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    mobileNumber: user.mobileNumber || '',
    notifyHours: user.notifyHours,
  })

  // Password form state
  const [passwordForm, setPasswordForm] = React.useState<UpdatePasswordInput>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const userInitials = user.username.slice(0, 2).toUpperCase()

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await updateProfile(profileForm)

      if (result.success) {
        toast.success(t('profileUpdated'))
        setIsEditingProfile(false)
      } else {
        toast.error(getErrorMessage('error' in result ? result.error : undefined, t('profileUpdateFailed')))
      }
    } catch (error) {
      toast.error(getErrorMessage(error, t('profileUpdateFailed')))
      logger.error('Failed to update profile', { error })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t('passwordMismatch'))
      return
    }

    setIsSubmitting(true)

    try {
      const result = await updatePassword(passwordForm)

      if (result.success) {
        toast.success(t('passwordUpdated'))
        setIsEditingPassword(false)
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
      } else {
        toast.error(getErrorMessage('error' in result ? result.error : undefined, t('passwordUpdateFailed')))
      }
    } catch (error) {
      toast.error(getErrorMessage(error, t('passwordUpdateFailed')))
      logger.error('Failed to update password', { error })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelProfile = () => {
    setProfileForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobileNumber: user.mobileNumber || '',
      notifyHours: user.notifyHours,
    })
    setIsEditingProfile(false)
  }

  const handleCancelPassword = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    setIsEditingPassword(false)
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

      {/* Profile Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('profileInformation')}</CardTitle>
              <CardDescription>{t('updatePersonalDetails')}</CardDescription>
            </div>
            {!isEditingProfile && (
              <Button
                variant="outline"
                onClick={() => setIsEditingProfile(true)}
              >
                {t('editProfile')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  <User className="mr-2 inline h-4 w-4" />
                  {t('firstName')}
                </Label>
                <Input
                  id="firstName"
                  value={profileForm.firstName}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, firstName: e.target.value })
                  }
                  disabled={!isEditingProfile || isSubmitting}
                  required
                />
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  <User className="mr-2 inline h-4 w-4" />
                  {t('lastName')}
                </Label>
                <Input
                  id="lastName"
                  value={profileForm.lastName}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, lastName: e.target.value })
                  }
                  disabled={!isEditingProfile || isSubmitting}
                  required
                />
              </div>
            </div>

            {/* Username (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="username">{t('username')}</Label>
              <Input
                id="username"
                value={user.username}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                {t('usernameReadonly')}
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="mr-2 inline h-4 w-4" />
                {t('email')}
              </Label>
              <Input
                id="email"
                type="email"
                value={profileForm.email}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, email: e.target.value })
                }
                disabled={!isEditingProfile || isSubmitting}
                required
              />
            </div>

            {/* Mobile Number */}
            <div className="space-y-2">
              <Label htmlFor="mobileNumber">
                <Phone className="mr-2 inline h-4 w-4" />
                {t('mobileNumber')}
              </Label>
              <Input
                id="mobileNumber"
                value={profileForm.mobileNumber || ''}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, mobileNumber: e.target.value })
                }
                disabled={!isEditingProfile || isSubmitting}
                placeholder={t('mobileOptional')}
              />
            </div>

            {/* Notification Hours */}
            <div className="space-y-2">
              <Label htmlFor="notifyHours">
                <Bell className="mr-2 inline h-4 w-4" />
                {t('notificationTime')}
              </Label>
              <Input
                id="notifyHours"
                type="number"
                min="0"
                max="24"
                value={profileForm.notifyHours}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    notifyHours: parseInt(e.target.value, 10) || 0,
                  })
                }
                disabled={!isEditingProfile || isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                {t('notificationHelper', { hours: profileForm.notifyHours })}
              </p>
            </div>

            {isEditingProfile && (
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('saving') : t('saveChanges')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelProfile}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Password Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                <Lock className="mr-2 inline h-5 w-5" />
                {t('password')}
              </CardTitle>
              <CardDescription>{t('changePassword')}</CardDescription>
            </div>
            {!isEditingPassword && (
              <Button
                variant="outline"
                onClick={() => setIsEditingPassword(true)}
              >
                {t('changePasswordButton')}
              </Button>
            )}
          </div>
        </CardHeader>
        {isEditingPassword && (
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      currentPassword: e.target.value,
                    })
                  }
                  disabled={isSubmitting}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Separator />

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('newPassword')}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword: e.target.value,
                    })
                  }
                  disabled={isSubmitting}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">
                  {t('passwordHelper')}
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  disabled={isSubmitting}
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('updating') : t('updatePasswordButton')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelPassword}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

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
