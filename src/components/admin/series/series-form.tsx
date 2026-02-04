import React from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TeamFlag } from '@/components/common/team-flag'

type League = { id: number; name: string; LeagueTeam: { id: number; Team: { id: number; name: string; shortcut: string; flagIcon: string | null; flagType: string | null } }[] }
type SpecialBetSerie = { id: number; name: string; bestOf: number }

interface SeriesFormData {
  leagueId: string
  specialBetSerieId: string
  homeTeamId: string
  awayTeamId: string
  dateTime: string
  homeTeamScore: string
  awayTeamScore: string
}

interface SeriesFormProps {
  formData: SeriesFormData
  onChange: (updates: Partial<SeriesFormData>) => void
  leagues: League[]
  specialBetSeries: SpecialBetSerie[]
  disabled?: boolean
  mode: 'inline' | 'dialog'
  league?: { id: number; name: string }
}

export function SeriesForm({ formData, onChange, leagues, specialBetSeries, disabled = false, mode, league }: SeriesFormProps) {
  const t = useTranslations('admin.series')
  const tCommon = useTranslations('admin.common')

  const inputClassName = mode === 'inline' ? 'h-8' : ''

  // Get available teams for selected league
  const selectedLeague = leagues.find((l) => l.id === parseInt(formData.leagueId || '0', 10))
  const availableTeams = selectedLeague?.LeagueTeam || []

  return (
    <div className={mode === 'inline' ? 'space-y-2' : 'space-y-4'}>
      {!league && (
        <div>
          {mode === 'dialog' && <label className="text-sm font-medium">{t('league')}</label>}
          <Select
            value={formData.leagueId}
            onValueChange={(value) => onChange({ leagueId: value, homeTeamId: '', awayTeamId: '' })}
            disabled={disabled}
          >
            <SelectTrigger className={inputClassName} aria-label={t('league')}>
              <SelectValue placeholder={t('selectLeague')} />
            </SelectTrigger>
            <SelectContent>
              {leagues.map((lg) => (
                <SelectItem key={lg.id} value={lg.id.toString()}>
                  {lg.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        {mode === 'dialog' && <label className="text-sm font-medium">{t('type')}</label>}
        <Select
          value={formData.specialBetSerieId}
          onValueChange={(value) => onChange({ specialBetSerieId: value })}
          disabled={disabled}
        >
          <SelectTrigger className={inputClassName} aria-label={t('type')}>
            <SelectValue placeholder={t('selectType')} />
          </SelectTrigger>
          <SelectContent>
            {specialBetSeries.map((sbs) => (
              <SelectItem key={sbs.id} value={sbs.id.toString()}>
                {sbs.name} ({t('bestOf', { count: sbs.bestOf })})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        {mode === 'dialog' && <label className="text-sm font-medium">{t('homeTeam')}</label>}
        <Select
          value={formData.homeTeamId}
          onValueChange={(value) => onChange({ homeTeamId: value })}
          disabled={disabled || !formData.leagueId}
        >
          <SelectTrigger className={inputClassName} aria-label={t('homeTeam')}>
            <SelectValue placeholder={t('selectHomeTeam')} />
          </SelectTrigger>
          <SelectContent>
            {availableTeams.map((lt) => (
              <SelectItem key={lt.id} value={lt.id.toString()}>
                <div className="flex items-center gap-2">
                  <TeamFlag
                    flagIcon={lt.Team.flagIcon}
                    flagType={lt.Team.flagType}
                    teamName={lt.Team.name}
                    size="xs"
                  />
                  <span>{lt.Team.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        {mode === 'dialog' && <label className="text-sm font-medium">{t('awayTeam')}</label>}
        <Select
          value={formData.awayTeamId}
          onValueChange={(value) => onChange({ awayTeamId: value })}
          disabled={disabled || !formData.leagueId}
        >
          <SelectTrigger className={inputClassName} aria-label={t('awayTeam')}>
            <SelectValue placeholder={t('selectAwayTeam')} />
          </SelectTrigger>
          <SelectContent>
            {availableTeams
              .filter((lt) => lt.id.toString() !== formData.homeTeamId)
              .map((lt) => (
                <SelectItem key={lt.id} value={lt.id.toString()}>
                  <div className="flex items-center gap-2">
                    <TeamFlag
                      flagIcon={lt.Team.flagIcon}
                      flagType={lt.Team.flagType}
                      teamName={lt.Team.name}
                      size="xs"
                    />
                    <span>{lt.Team.name}</span>
                  </div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        {mode === 'dialog' && <label className="text-sm font-medium">{t('dateTime')}</label>}
        <Input
          type="datetime-local"
          value={formData.dateTime}
          onChange={(e) => onChange({ dateTime: e.target.value })}
          className={inputClassName}
          disabled={disabled}
          aria-label={t('dateTime')}
        />
      </div>

      {mode === 'dialog' && (
        <>
          <div>
            <label className="text-sm font-medium">{t('homeScore')}</label>
            <Input
              type="number"
              value={formData.homeTeamScore}
              onChange={(e) => onChange({ homeTeamScore: e.target.value })}
              placeholder={t('homeScoreOptional')}
              disabled={disabled}
              aria-label={t('homeScore')}
            />
          </div>

          <div>
            <label className="text-sm font-medium">{t('awayScore')}</label>
            <Input
              type="number"
              value={formData.awayTeamScore}
              onChange={(e) => onChange({ awayTeamScore: e.target.value })}
              placeholder={t('awayScoreOptional')}
              disabled={disabled}
              aria-label={t('awayScore')}
            />
          </div>
        </>
      )}
    </div>
  )
}
