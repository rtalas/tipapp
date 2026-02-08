'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import { updateSeries } from '@/actions/series'
import { logger } from '@/lib/logging/client-logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface EditSeriesDialogProps {
  series: {
    id: number
    dateTime: Date
    LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam: { Team: { name: string } }
    LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam: { Team: { name: string } }
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditSeriesDialog({
  series,
  open,
  onOpenChange,
}: EditSeriesDialogProps) {
  const t = useTranslations('admin.series')
  const tCommon = useTranslations('admin.common')
  const tMatches = useTranslations('admin.matches')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dateTime, setDateTime] = useState<string>(() => {
    const date = new Date(series.dateTime)
    return format(date, "yyyy-MM-dd'T'HH:mm")
  })

  const homeTeam = series.LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam.Team.name
  const awayTeam = series.LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam.Team.name
  const matchup = `${homeTeam} ${t('vs')} ${awayTeam}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!dateTime) {
      toast.error(tMatches('form.requiredFields'))
      return
    }

    setIsSubmitting(true)

    try {
      const result = await updateSeries({
        seriesId: series.id,
        dateTime: new Date(dateTime),
      })

      if (!result.success) {
        toast.error('error' in result ? result.error : t('editDetailsDialog.failed'))
      } else {
        toast.success(t('editDetailsDialog.success'))
        onOpenChange(false)
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('editDetailsDialog.failed'))
      }
      logger.error('Failed to update series', { error, seriesId: series.id })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('editDetailsDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('editDetailsDialog.description', { matchup })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dateTime">{tMatches('form.dateTimeUtc')}</Label>
            <Input
              id="dateTime"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              {tMatches('form.dateTimeHint')}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('editDetailsDialog.updating') : t('editDetailsDialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
