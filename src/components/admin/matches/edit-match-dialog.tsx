'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import { updateMatch } from '@/actions/matches'
import { logger } from '@/lib/logging/client-logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TeamFlag } from '@/components/common/team-flag'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Team {
  id: number
  name: string
  shortcut: string
  flagIcon?: string | null
  flagType?: string | null
}

interface LeagueTeam {
  id: number
  Team: Team
}

interface MatchPhase {
  id: number
  name: string
  rank: number
  bestOf: number | null
}

interface Match {
  id: number
  dateTime: Date
  matchPhaseId: number | null
  gameNumber: number | null
  isPlayoffGame: boolean
  homePlaceholder?: string | null
  awayPlaceholder?: string | null
  LeagueTeam_Match_homeTeamIdToLeagueTeam: LeagueTeam | null
  LeagueTeam_Match_awayTeamIdToLeagueTeam: LeagueTeam | null
  MatchPhase?: MatchPhase | null
}

interface LeagueMatch {
  id: number
  isDoubled: boolean
  leagueId: number
  Match: Match
}

interface EditMatchDialogProps {
  match: LeagueMatch
  open: boolean
  onOpenChange: (open: boolean) => void
  phases: MatchPhase[]
  leagueTeams: LeagueTeam[]
}

export function EditMatchDialog({
  match,
  open,
  onOpenChange,
  phases,
  leagueTeams,
}: EditMatchDialogProps) {
  const t = useTranslations('admin.matches')
  const tCommon = useTranslations('admin.common')

  const homeTeam = match.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam
  const awayTeam = match.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam
  const initialHomePh = match.Match.homePlaceholder ?? ''
  const initialAwayPh = match.Match.awayPlaceholder ?? ''
  // While at least one side is missing a team, the match is still a placeholder and
  // BOTH sides remain editable (team can be swapped, or even swapped back to a placeholder).
  const isPlaceholder = !homeTeam || !awayTeam

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dateTime, setDateTime] = useState<string>(() =>
    format(new Date(match.Match.dateTime), "yyyy-MM-dd'T'HH:mm")
  )
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>(
    match.Match.matchPhaseId?.toString() || ''
  )
  const [gameNumber, setGameNumber] = useState<string>(
    match.Match.gameNumber?.toString() || ''
  )
  // Per side: 'team' mode (pick from select) or 'placeholder' mode (text input)
  const [homeMode, setHomeMode] = useState<'team' | 'placeholder'>(homeTeam ? 'team' : 'placeholder')
  const [awayMode, setAwayMode] = useState<'team' | 'placeholder'>(awayTeam ? 'team' : 'placeholder')
  const [homeTeamPick, setHomeTeamPick] = useState<string>(homeTeam?.id.toString() ?? '')
  const [awayTeamPick, setAwayTeamPick] = useState<string>(awayTeam?.id.toString() ?? '')
  const [homePh, setHomePh] = useState<string>(initialHomePh)
  const [awayPh, setAwayPh] = useState<string>(initialAwayPh)

  const selectedPhase = phases.find((p) => p.id.toString() === selectedPhaseId)
  const homeLabel = homeTeam ? homeTeam.Team.name : initialHomePh || t('tbd')
  const awayLabel = awayTeam ? awayTeam.Team.name : initialAwayPh || t('tbd')

  // Exclude the opposite side's selection from each select
  const homeAvailable = leagueTeams.filter((lt) =>
    awayMode === 'team' && lt.id.toString() === awayTeamPick ? false : true
  )
  const awayAvailable = leagueTeams.filter((lt) =>
    homeMode === 'team' && lt.id.toString() === homeTeamPick ? false : true
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dateTime) {
      toast.error(t('form.requiredFields'))
      return
    }

    setIsSubmitting(true)

    try {
      const payload: Parameters<typeof updateMatch>[0] = {
        matchId: match.Match.id,
        dateTime: new Date(dateTime),
        matchPhaseId: selectedPhaseId ? parseInt(selectedPhaseId, 10) : null,
        gameNumber: gameNumber ? parseInt(gameNumber, 10) : null,
      }

      // Send team/placeholder changes only while the match is still a placeholder.
      if (isPlaceholder) {
        if (homeMode === 'team' && homeTeamPick && parseInt(homeTeamPick, 10) !== homeTeam?.id) {
          payload.homeTeamId = parseInt(homeTeamPick, 10)
        } else if (homeMode === 'placeholder' && homePh.trim() && (homePh.trim() !== initialHomePh || homeTeam)) {
          payload.homePlaceholder = homePh.trim()
        }
        if (awayMode === 'team' && awayTeamPick && parseInt(awayTeamPick, 10) !== awayTeam?.id) {
          payload.awayTeamId = parseInt(awayTeamPick, 10)
        } else if (awayMode === 'placeholder' && awayPh.trim() && (awayPh.trim() !== initialAwayPh || awayTeam)) {
          payload.awayPlaceholder = awayPh.trim()
        }
      }

      await updateMatch(payload)
      toast.success(t('editDialog.success'))
      onOpenChange(false)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('editDialog.failed'))
      }
      logger.error('Failed to update match', { error, matchId: match.Match.id })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('editDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('editDialog.description', { teams: `${homeLabel} vs ${awayLabel}` })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('form.homeTeam')}</Label>
                {isPlaceholder && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline"
                    onClick={() => setHomeMode(homeMode === 'team' ? 'placeholder' : 'team')}
                  >
                    {homeMode === 'team' ? t('form.usePlaceholder') : t('form.useTeam')}
                  </button>
                )}
              </div>
              {!isPlaceholder && homeTeam ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded px-3 py-2">
                  <TeamFlag
                    flagIcon={homeTeam.Team.flagIcon ?? null}
                    flagType={homeTeam.Team.flagType ?? null}
                    teamName={homeTeam.Team.name}
                    size="sm"
                  />
                  <span>{homeTeam.Team.name}</span>
                </div>
              ) : homeMode === 'team' ? (
                <Select value={homeTeamPick} onValueChange={setHomeTeamPick}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('form.selectTeam')} />
                  </SelectTrigger>
                  <SelectContent>
                    {homeAvailable.map((lt) => (
                      <SelectItem key={lt.id} value={lt.id.toString()}>
                        {lt.Team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={homePh}
                  onChange={(e) => setHomePh(e.target.value)}
                  maxLength={100}
                  placeholder={t('form.placeholderHint')}
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('form.awayTeam')}</Label>
                {isPlaceholder && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline"
                    onClick={() => setAwayMode(awayMode === 'team' ? 'placeholder' : 'team')}
                  >
                    {awayMode === 'team' ? t('form.usePlaceholder') : t('form.useTeam')}
                  </button>
                )}
              </div>
              {!isPlaceholder && awayTeam ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded px-3 py-2">
                  <TeamFlag
                    flagIcon={awayTeam.Team.flagIcon ?? null}
                    flagType={awayTeam.Team.flagType ?? null}
                    teamName={awayTeam.Team.name}
                    size="sm"
                  />
                  <span>{awayTeam.Team.name}</span>
                </div>
              ) : awayMode === 'team' ? (
                <Select value={awayTeamPick} onValueChange={setAwayTeamPick}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('form.selectTeam')} />
                  </SelectTrigger>
                  <SelectContent>
                    {awayAvailable.map((lt) => (
                      <SelectItem key={lt.id} value={lt.id.toString()}>
                        {lt.Team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={awayPh}
                  onChange={(e) => setAwayPh(e.target.value)}
                  maxLength={100}
                  placeholder={t('form.placeholderHint')}
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateTime">{t('form.dateTimeUtc')}</Label>
            <Input
              id="dateTime"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              {t('form.dateTimeHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="matchPhase">{t('form.matchPhase')}</Label>
            <Select
              value={selectedPhaseId || undefined}
              onValueChange={(value) => setSelectedPhaseId(value || '')}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('form.phasePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {phases.map((phase) => (
                  <SelectItem key={phase.id} value={phase.id.toString()}>
                    {phase.name} {phase.bestOf ? t('form.bestOf', { count: phase.bestOf }) : t('form.single')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPhase?.bestOf && selectedPhase.bestOf > 1 && (
            <div className="space-y-2">
              <Label htmlFor="gameNumber">{t('form.gameNumber')}</Label>
              <Input
                id="gameNumber"
                type="number"
                min="1"
                max={selectedPhase.bestOf}
                value={gameNumber}
                onChange={(e) => setGameNumber(e.target.value)}
                placeholder={`1-${selectedPhase.bestOf}`}
              />
            </div>
          )}

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
              {isSubmitting ? t('editDialog.updating') : t('editDialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
