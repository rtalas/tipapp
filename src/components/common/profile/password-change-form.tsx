'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export interface UpdatePasswordInput {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface ActionResult {
  success: boolean
  error?: string
}

interface PasswordChangeFormProps {
  onUpdate: (data: UpdatePasswordInput) => Promise<ActionResult>
  variant: 'admin' | 'user'
}

/**
 * Shared password change form component for both admin and user profiles.
 * Includes password visibility toggles and validation.
 */
export function PasswordChangeForm({ onUpdate, variant }: PasswordChangeFormProps) {
  const t = useTranslations(variant === 'admin' ? 'admin.profile' : 'auth.profile')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error(variant === 'admin' ? t('passwordMismatch') : t('errorGeneric'))
      return
    }

    if (newPassword.length < 8) {
      toast.error(variant === 'admin' ? t('passwordHelper') : t('errorGeneric'))
      return
    }

    setIsSubmitting(true)

    try {
      const result = await onUpdate({
        currentPassword,
        newPassword,
        confirmPassword,
      })

      if (result.success) {
        toast.success(variant === 'admin' ? t('passwordUpdated') : t('successPassword'))
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(result.error || (variant === 'admin' ? t('passwordUpdateFailed') : t('errorGeneric')))
      }
    } catch {
      toast.error(variant === 'admin' ? t('passwordUpdateFailed') : t('errorGeneric'))
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
              <CardTitle>
                <Lock className="mr-2 inline h-5 w-5" />
                {t('password')}
              </CardTitle>
              <CardDescription>{t('changePassword')}</CardDescription>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t('changePassword')}</CardTitle>
            </div>
            <CardDescription>{t('changePassword')}</CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('currentPassword')}
                disabled={isSubmitting}
                required
                autoComplete="current-password"
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

          {variant === 'admin' && <Separator />}

          <div className="space-y-2">
            <Label htmlFor="newPassword">{t('newPassword')}</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('newPassword')}
                disabled={isSubmitting}
                required
                minLength={8}
                autoComplete="new-password"
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
            {variant === 'admin' && (
              <p className="text-xs text-muted-foreground">
                {t('passwordHelper')}
              </p>
            )}
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
                disabled={isSubmitting}
                required
                minLength={8}
                autoComplete="new-password"
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
            className={variant === 'user' ? 'w-full' : ''}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {variant === 'admin' ? t('updating') : t('savingPassword')}
              </>
            ) : (
              <>
                {variant === 'user' && <Lock className="mr-2 h-4 w-4" />}
                {variant === 'admin' ? t('updatePasswordButton') : t('savePassword')}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
