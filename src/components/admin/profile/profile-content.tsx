'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { User, Mail, Phone, Bell, Lock, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { updateProfile, updatePassword, type UpdateProfileInput, type UpdatePasswordInput } from '@/actions/profile'
import { getErrorMessage } from '@/lib/error-handler'
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
        toast.success('Profile updated successfully')
        setIsEditingProfile(false)
      } else {
        toast.error(getErrorMessage(result.error, 'Failed to update profile'))
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update profile'))
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await updatePassword(passwordForm)

      if (result.success) {
        toast.success('Password updated successfully')
        setIsEditingPassword(false)
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
      } else {
        toast.error(getErrorMessage(result.error, 'Failed to update password'))
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update password'))
      console.error(error)
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
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
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
                    Superadmin
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>@{user.username}</CardDescription>
              <p className="text-sm text-muted-foreground mt-1">
                Member since {format(new Date(user.createdAt), 'MMMM yyyy')}
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
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </div>
            {!isEditingProfile && (
              <Button
                variant="outline"
                onClick={() => setIsEditingProfile(true)}
              >
                Edit Profile
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
                  First Name
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
                  Last Name
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
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={user.username}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Username cannot be changed
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="mr-2 inline h-4 w-4" />
                Email
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
                Mobile Number
              </Label>
              <Input
                id="mobileNumber"
                value={profileForm.mobileNumber || ''}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, mobileNumber: e.target.value })
                }
                disabled={!isEditingProfile || isSubmitting}
                placeholder="Optional"
              />
            </div>

            {/* Notification Hours */}
            <div className="space-y-2">
              <Label htmlFor="notifyHours">
                <Bell className="mr-2 inline h-4 w-4" />
                Notification Time (hours before match)
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
                Receive notifications {profileForm.notifyHours} hour(s) before matches start
              </p>
            </div>

            {isEditingProfile && (
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
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
                Password
              </CardTitle>
              <CardDescription>Change your password</CardDescription>
            </div>
            {!isEditingPassword && (
              <Button
                variant="outline"
                onClick={() => setIsEditingPassword(true)}
              >
                Change Password
              </Button>
            )}
          </div>
        </CardHeader>
        {isEditingPassword && (
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
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
                <Label htmlFor="newPassword">New Password</Label>
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
                  Must be at least 8 characters
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
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
                  {isSubmitting ? 'Updating...' : 'Update Password'}
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
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Read-only information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">User ID:</span>
            <span className="text-sm font-mono">{user.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Created:</span>
            <span className="text-sm">
              {format(new Date(user.createdAt), 'PPP')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Last Updated:</span>
            <span className="text-sm">
              {format(new Date(user.updatedAt), 'PPP')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Role:</span>
            <span className="text-sm">
              {user.isSuperadmin ? 'Superadmin' : 'User'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
