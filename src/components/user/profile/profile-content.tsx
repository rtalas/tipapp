'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { User, Lock, Eye, EyeOff, Check, Loader2, Phone, Bell, ChevronLeft, ChevronRight, BellRing, BellOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { updateProfile, changePassword } from '@/actions/user/profile'
import { usePushNotifications } from '@/components/providers/service-worker-register'

// Notification time options in minutes
// 0 = Off, 5, 15, 30, 45, 60 (1h), 90 (1h 30m), 120 (2h), then by hours (180, 240, 300, etc.)
const NOTIFICATION_OPTIONS = [
  0,    // Off
  5,    // 5 min
  15,   // 15 min
  30,   // 30 min
  45,   // 45 min
  60,   // 1h
  90,   // 1h 30m
  120,  // 2h
  180,  // 3h
  240,  // 4h
  300,  // 5h
  360,  // 6h
  420,  // 7h
  480,  // 8h
  540,  // 9h
  600,  // 10h
  660,  // 11h
  720,  // 12h
  1080, // 18h
  1440, // 24h
]

// Format minutes to display string
function formatNotificationTime(minutes: number, t: (key: string, params?: any) => string): string {
  if (minutes === 0) return t('notifyOff')
  if (minutes < 60) return t('notifyMinutes', { minutes })

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return t('notifyHours', { hours })
  }

  return t('notifyHoursMinutes', { hours, minutes: remainingMinutes })
}

interface ProfileContentProps {
  profile: {
    id: number
    username: string
    email: string | null
    firstName: string | null
    lastName: string | null
    mobileNumber: string | null
    notifyHours: number // Actually stored as minutes
    createdAt: Date
  }
}

export function ProfileContent({ profile }: ProfileContentProps) {
  const router = useRouter()
  const t = useTranslations('auth.profile')
  const pushNotifications = usePushNotifications()

  // Profile form state
  const [firstName, setFirstName] = useState(profile.firstName || '')
  const [lastName, setLastName] = useState(profile.lastName || '')
  const [email, setEmail] = useState(profile.email || '')
  const [mobileNumber, setMobileNumber] = useState(profile.mobileNumber || '')

  // Find the closest valid notification option to the current value
  const findClosestOption = (value: number): number => {
    if (value === 0) return 0
    // Backward compatibility: if value is <= 24, assume it's in hours and convert to minutes
    const valueInMinutes = value <= 24 && value > 0 ? value * 60 : value
    const closest = NOTIFICATION_OPTIONS.reduce((prev, curr) =>
      Math.abs(curr - valueInMinutes) < Math.abs(prev - valueInMinutes) ? curr : prev
    )
    return closest
  }

  const [notifyMinutes, setNotifyMinutes] = useState(findClosestOption(profile.notifyHours))
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Get user initials
  const userInitials = useMemo(() => {
    if (profile.firstName && profile.lastName) {
      return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
    }
    return profile.username.slice(0, 2).toUpperCase()
  }, [profile])

  // Notification time handlers
  const handleNotifyDecrement = () => {
    const currentIndex = NOTIFICATION_OPTIONS.indexOf(notifyMinutes)
    if (currentIndex > 0) {
      setNotifyMinutes(NOTIFICATION_OPTIONS[currentIndex - 1])
    }
  }

  const handleNotifyIncrement = () => {
    const currentIndex = NOTIFICATION_OPTIONS.indexOf(notifyMinutes)
    if (currentIndex < NOTIFICATION_OPTIONS.length - 1) {
      setNotifyMinutes(NOTIFICATION_OPTIONS[currentIndex + 1])
    }
  }

  const canDecrementNotify = NOTIFICATION_OPTIONS.indexOf(notifyMinutes) > 0
  const canIncrementNotify = NOTIFICATION_OPTIONS.indexOf(notifyMinutes) < NOTIFICATION_OPTIONS.length - 1

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingProfile(true)

    try {
      const result = await updateProfile({
        firstName,
        lastName,
        email,
        mobileNumber,
        notifyHours: notifyMinutes, // Store minutes in notifyHours field
      })

      if (result.success) {
        toast.success(t('successPersonalInfo'))
        router.refresh()
      } else {
        toast.error(result.error || t('errorGeneric'))
      }
    } catch {
      toast.error(t('errorGeneric'))
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error(t('errorGeneric'))
      return
    }

    if (newPassword.length < 6) {
      toast.error(t('errorGeneric'))
      return
    }

    setIsChangingPassword(true)

    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      })

      if (result.success) {
        toast.success(t('successPassword'))
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(result.error || t('errorGeneric'))
      }
    } catch {
      toast.error(t('errorGeneric'))
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
        {/* User Info Card */}
        <Card className="glass-card border-0">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-20 w-20 ring-4 ring-primary/30">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
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
        <Card className="glass-card border-0">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t('personalInfo')}</CardTitle>
            </div>
            <CardDescription>{t('title')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t('firstName')}</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t('firstName')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t('lastName')}</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={t('lastName')}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('email')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobileNumber">
                  <Phone className="mr-2 inline h-4 w-4" />
                  {t('mobileNumber')}
                </Label>
                <Input
                  id="mobileNumber"
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder={t('mobileOptional')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notifyHours">
                  <Bell className="mr-2 inline h-4 w-4" />
                  {t('notificationTime')}
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleNotifyDecrement}
                    disabled={!canDecrementNotify}
                    className="h-10 w-10 shrink-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 text-center py-2 px-4 rounded-lg bg-secondary/30 border border-border font-medium">
                    {formatNotificationTime(notifyMinutes, t)}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleNotifyIncrement}
                    disabled={!canIncrementNotify}
                    className="h-10 w-10 shrink-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {notifyMinutes === 0 ? t('notifyOffHelper') : t('notificationHelper')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">{t('username')}</Label>
                <Input
                  id="username"
                  value={profile.username}
                  disabled
                  className="bg-secondary/50"
                />
                <p className="text-xs text-muted-foreground">
                  {t('usernameReadonly')}
                </p>
              </div>

              {/* Push Notifications Toggle */}
              {pushNotifications.isSupported && notifyMinutes > 0 && (
                <div className="space-y-2">
                  <Label>
                    <BellRing className="mr-2 inline h-4 w-4" />
                    {t('pushNotifications')}
                  </Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant={pushNotifications.isSubscribed ? 'default' : 'outline'}
                      size="sm"
                      disabled={pushNotifications.isLoading || pushNotifications.permissionState === 'denied'}
                      onClick={async () => {
                        if (pushNotifications.isSubscribed) {
                          const success = await pushNotifications.unsubscribe()
                          if (success) {
                            toast.success(t('pushDisabled'))
                          } else {
                            toast.error(t('pushError'))
                          }
                        } else {
                          const success = await pushNotifications.subscribe()
                          if (success) {
                            toast.success(t('pushEnabled'))
                          } else if (pushNotifications.permissionState === 'denied') {
                            toast.error(t('pushDenied'))
                          } else {
                            toast.error(t('pushError'))
                          }
                        }
                      }}
                      className="flex-1"
                    >
                      {pushNotifications.isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : pushNotifications.isSubscribed ? (
                        <BellRing className="mr-2 h-4 w-4" />
                      ) : (
                        <BellOff className="mr-2 h-4 w-4" />
                      )}
                      {pushNotifications.isSubscribed ? t('pushOn') : t('pushOff')}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {pushNotifications.permissionState === 'denied'
                      ? t('pushDeniedHelper')
                      : pushNotifications.isSubscribed
                        ? t('pushOnHelper')
                        : t('pushOffHelper')}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isUpdatingProfile}
              >
                {isUpdatingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('savingPersonalInfo')}
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {t('savePersonalInfo')}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password Form */}
        <Card className="glass-card border-0">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t('changePassword')}</CardTitle>
            </div>
            <CardDescription>{t('changePassword')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t('currentPassword')}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('newPassword')}</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('newPassword')}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('confirmPassword')}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('savingPassword')}
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    {t('savePassword')}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
    </div>
  )
}
