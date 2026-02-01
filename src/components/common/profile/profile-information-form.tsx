'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { User, Mail, Phone, Bell, ChevronLeft, ChevronRight, BellRing, BellOff, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { usePushNotifications } from '@/components/providers/service-worker-register'

// Notification time options in minutes
const NOTIFICATION_OPTIONS = [
  0, 5, 15, 30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 1080, 1440,
]

// Format minutes to display string
function formatNotificationTime(minutes: number, t: (key: string, params?: Record<string, number>) => string): string {
  if (minutes === 0) return t('notifyOff')
  if (minutes < 60) return t('notifyMinutes', { minutes })

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return t('notifyHours', { hours })
  }

  return t('notifyHoursMinutes', { hours, minutes: remainingMinutes })
}

// Find the closest valid notification option
function findClosestOption(value: number): number {
  if (value === 0) return 0
  // Backward compatibility: if value is <= 24, assume it's in hours and convert to minutes
  const valueInMinutes = value <= 24 && value > 0 ? value * 60 : value
  const closest = NOTIFICATION_OPTIONS.reduce((prev, curr) =>
    Math.abs(curr - valueInMinutes) < Math.abs(prev - valueInMinutes) ? curr : prev
  )
  return closest
}

export interface UpdateProfileInput {
  firstName: string
  lastName: string
  email: string
  mobileNumber: string
  notifyHours: number
}

export interface ActionResult {
  success: boolean
  error?: string
}

interface ProfileInformationFormProps {
  user: {
    username: string
    firstName: string | null
    lastName: string | null
    email: string | null
    mobileNumber: string | null
    notifyHours: number
  }
  variant: 'admin' | 'user'
  onUpdate: (data: UpdateProfileInput) => Promise<ActionResult>
  showPushNotifications?: boolean
}

/**
 * Shared profile information form component for both admin and user profiles.
 * Includes personal details, notification settings, and optional push notifications toggle.
 */
export function ProfileInformationForm({
  user,
  variant,
  onUpdate,
  showPushNotifications = false,
}: ProfileInformationFormProps) {
  const router = useRouter()
  const t = useTranslations(variant === 'admin' ? 'admin.profile' : 'auth.profile')
  const pushNotifications = usePushNotifications()

  const [firstName, setFirstName] = useState(user.firstName || '')
  const [lastName, setLastName] = useState(user.lastName || '')
  const [email, setEmail] = useState(user.email || '')
  const [mobileNumber, setMobileNumber] = useState(user.mobileNumber || '')
  const [notifyMinutes, setNotifyMinutes] = useState(findClosestOption(user.notifyHours))
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await onUpdate({
        firstName,
        lastName,
        email,
        mobileNumber,
        notifyHours: notifyMinutes,
      })

      if (result.success) {
        toast.success(variant === 'admin' ? t('profileUpdated') : t('successPersonalInfo'))
        // Only refresh in admin to avoid PWA navigation issues
        if (variant === 'admin') {
          router.refresh()
        }
      } else {
        toast.error(result.error || (variant === 'admin' ? t('profileUpdateFailed') : t('errorGeneric')))
      }
    } catch {
      toast.error(variant === 'admin' ? t('profileUpdateFailed') : t('errorGeneric'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className={variant === 'user' ? 'glass-card border-0' : ''}>
      <CardHeader>
        {variant === 'admin' ? (
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('profileInformation')}</CardTitle>
              <CardDescription>{t('updatePersonalDetails')}</CardDescription>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t('personalInfo')}</CardTitle>
            </div>
            <CardDescription>{t('title')}</CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                {variant === 'admin' && <User className="mr-2 inline h-4 w-4" />}
                {t('firstName')}
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('firstName')}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">
                {variant === 'admin' && <User className="mr-2 inline h-4 w-4" />}
                {t('lastName')}
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('lastName')}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              <Mail className="mr-2 inline h-4 w-4" />
              {t('email')}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('email')}
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
          </div>

          {showPushNotifications && <div className="space-y-2">
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
                disabled={isSubmitting || !canDecrementNotify}
                className={variant === 'user' ? 'h-10 w-10 shrink-0' : ''}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className={`flex-1 text-center py-2 px-4 rounded-${variant === 'user' ? 'lg' : 'md'} ${variant === 'user' ? 'bg-secondary/30' : 'bg-background'} border ${variant === 'user' ? 'border-border' : ''} font-medium`}>
                {formatNotificationTime(notifyMinutes, t)}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleNotifyIncrement}
                disabled={isSubmitting || !canIncrementNotify}
                className={variant === 'user' ? 'h-10 w-10 shrink-0' : ''}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {notifyMinutes === 0 ? t('notifyOffHelper') : t('notificationHelper')}
            </p>
          </div>}

          {variant === 'admin' && (
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
          )}

          {variant === 'user' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">{t('username')}</Label>
                <Input
                  id="username"
                  value={user.username}
                  disabled
                  className="bg-secondary/50"
                />
                <p className="text-xs text-muted-foreground">
                  {t('usernameReadonly')}
                </p>
              </div>

              {/* Push Notifications Toggle */}
              {showPushNotifications && notifyMinutes > 0 && (
                <div className="space-y-2">
                  <Label>
                    <BellRing className="mr-2 inline h-4 w-4" />
                    {t('pushNotifications')}
                  </Label>

                  {!pushNotifications.isSupported && (
                    <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                      {t('pushUnsupported')}
                    </div>
                  )}

                  {pushNotifications.isSupported && (
                    <>
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
                    </>
                  )}
                </div>
              )}
            </>
          )}

          <Button
            type="submit"
            className={variant === 'user' ? 'w-full' : ''}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {variant === 'admin' ? t('saving') : t('savingPersonalInfo')}
              </>
            ) : (
              <>
                {variant === 'user' && <Check className="mr-2 h-4 w-4" />}
                {variant === 'admin' ? t('saveChanges') : t('savePersonalInfo')}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
