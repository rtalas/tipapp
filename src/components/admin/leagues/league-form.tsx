'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { createLeague } from '@/actions/leagues'
import { logger } from '@/lib/logging/client-logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Sport {
  id: number
  name: string
}

interface LeagueFormProps {
  sports: Sport[]
}

export function LeagueForm({ sports }: LeagueFormProps) {
  const t = useTranslations('admin.leagueNew')
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentYear = new Date().getFullYear()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await createLeague({
        name: formData.get('name') as string,
        sportId: Number(formData.get('sportId')),
        seasonFrom: Number(formData.get('seasonFrom')),
        seasonTo: Number(formData.get('seasonTo')),
        isActive: formData.get('isActive') === 'on',
        isPublic: formData.get('isPublic') === 'on',
      })

      if (result.success && 'leagueId' in result) {
        toast.success(t('leagueCreated'))
        router.push(`/admin/leagues/${result.leagueId}/setup`)
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('leagueCreateFailed'))
      }
      logger.error('Failed to create league', { error })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{t('leagueDetails')}</CardTitle>
          <CardDescription>
            {t('leagueDetailsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('leagueName')}</Label>
            <Input
              id="name"
              name="name"
              placeholder={t('leagueNameExample')}
              required
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sportId">{t('sport')}</Label>
            <Select name="sportId" required>
              <SelectTrigger>
                <SelectValue placeholder={t('selectSport')} />
              </SelectTrigger>
              <SelectContent>
                {sports.map((sport) => (
                  <SelectItem key={sport.id} value={sport.id.toString()}>
                    {sport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seasonFrom">{t('seasonFrom')}</Label>
              <Input
                id="seasonFrom"
                name="seasonFrom"
                type="number"
                min={2000}
                max={2100}
                defaultValue={currentYear}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seasonTo">{t('seasonTo')}</Label>
              <Input
                id="seasonTo"
                name="seasonTo"
                type="number"
                min={2000}
                max={2100}
                defaultValue={currentYear}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{t('settings')}</CardTitle>
          <CardDescription>
            {t('settingsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">{t('active')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('activeHelper')}
              </p>
            </div>
            <Switch id="isActive" name="isActive" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isPublic">{t('public')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('publicHelper')}
              </p>
            </div>
            <Switch id="isPublic" name="isPublic" defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{t('scoringRules')}</CardTitle>
          <CardDescription>
            {t('scoringRulesDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">{t('exactScore')}</span>
              <span className="font-mono text-sm font-medium">10 pts</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">{t('oneTeamScore')}</span>
              <span className="font-mono text-sm font-medium">1 pt</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">{t('question')}</span>
              <span className="font-mono text-sm font-medium">6 pts</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">{t('scoreDifference')}</span>
              <span className="font-mono text-sm font-medium">3 pts</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">{t('scorer')}</span>
              <span className="font-mono text-sm font-medium">R1:2 R2:3 R3:4 R4:6 U:8</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">{t('seriesExact')}</span>
              <span className="font-mono text-sm font-medium">14 pts</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">{t('seriesWinner')}</span>
              <span className="font-mono text-sm font-medium">8 pts</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">{t('winner')}</span>
              <span className="font-mono text-sm font-medium">5 pts</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('creating') : t('create')}
        </Button>
      </div>
    </form>
  )
}
