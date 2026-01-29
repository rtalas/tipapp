import React from 'react'
import { useTranslations } from 'next-intl'
import { SeriesForm } from './series-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type League = { id: number; name: string; LeagueTeam: { id: number; Team: { id: number; name: string; shortcut: string } }[] }
type SpecialBetSerie = { id: number; name: string; bestOf: number }

interface CreateFormData {
  leagueId: string
  specialBetSerieId: string
  homeTeamId: string
  awayTeamId: string
  dateTime: string
  homeTeamScore: string
  awayTeamScore: string
}

interface CreateSeriesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: CreateFormData
  onFormChange: (updates: Partial<CreateFormData>) => void
  onCreate: () => Promise<void>
  isCreating: boolean
  leagues: League[]
  specialBetSeries: SpecialBetSerie[]
  league?: { id: number; name: string }
}

export function CreateSeriesDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onCreate,
  isCreating,
  leagues,
  specialBetSeries,
  league,
}: CreateSeriesDialogProps) {
  const t = useTranslations('admin.series')
  const tCommon = useTranslations('admin.common')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('createTitle')}</DialogTitle>
          <DialogDescription>{t('createDescription')}</DialogDescription>
        </DialogHeader>

        <SeriesForm
          formData={formData}
          onChange={onFormChange}
          leagues={leagues}
          specialBetSeries={specialBetSeries}
          disabled={isCreating}
          mode="dialog"
          league={league}
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            {tCommon('cancel')}
          </Button>
          <Button onClick={onCreate} disabled={isCreating}>
            {isCreating ? t('creating') : tCommon('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
