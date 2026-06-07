import React from 'react'
import { useTranslations } from 'next-intl'
import { Minus, Plus } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { SPORT_IDS } from '@/lib/constants'

interface Team {
  id: number
  name: string
  shortcut: string
}

interface ScoreStepperProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}

/** Score field controlled solely via -/+ buttons (mirrors the user-side ScoreInput). */
function ScoreStepper({ id, label, value, onChange }: ScoreStepperProps) {
  const current = parseInt(value, 10)
  const numeric = Number.isNaN(current) ? 0 : current

  const decrement = () => onChange(String(Math.max(0, numeric - 1)))
  const increment = () => onChange(String(numeric + 1))

  return (
    <div className="flex flex-col items-center gap-2">
      <Label className="text-center">{label}</Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={decrement}
          disabled={numeric <= 0}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Decrease score"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span
          id={id}
          className="w-12 h-12 flex items-center justify-center text-2xl font-bold bg-secondary/50 border border-border rounded-lg select-none tabular-nums"
        >
          {numeric}
        </span>
        <button
          type="button"
          onClick={increment}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Increase score"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

interface ScoreEntryFormProps {
  homeTeam: { Team: Team }
  awayTeam: { Team: Team }
  sportId: number
  isPlayoffGame: boolean
  homeRegularScore: string
  awayRegularScore: string
  homeFinalScore: string
  awayFinalScore: string
  isOvertime: boolean
  isShootout: boolean
  onHomeRegularScoreChange: (value: string) => void
  onAwayRegularScoreChange: (value: string) => void
  onHomeFinalScoreChange: (value: string) => void
  onAwayFinalScoreChange: (value: string) => void
  onOvertimeChange: (checked: boolean) => void
  onShootoutChange: (checked: boolean) => void
}

export function ScoreEntryForm({
  homeTeam,
  awayTeam,
  sportId,
  isPlayoffGame,
  homeRegularScore,
  awayRegularScore,
  homeFinalScore,
  awayFinalScore,
  isOvertime,
  isShootout,
  onHomeRegularScoreChange,
  onAwayRegularScoreChange,
  onHomeFinalScoreChange,
  onAwayFinalScoreChange,
  onOvertimeChange,
  onShootoutChange,
}: ScoreEntryFormProps) {
  const t = useTranslations('admin.matches.resultDialog')
  const isFootball = sportId === SPORT_IDS.FOOTBALL
  // Football group stage has no extra time — match ends as drawn.
  // Football playoff goes to extra time then penalty shootout if still tied.
  // Hockey always allows OT/SO (regular season and playoffs).
  const showExtraTimeControls = !isFootball || isPlayoffGame
  const extendedLabel = isFootball ? t('afterExtraTime') : t('afterOvertime')

  return (
    <>
      {/* Teams display */}
      <div className="flex items-center justify-between text-center">
        <div className="flex-1">
          <p className="font-semibold">{homeTeam.Team.name}</p>
          <p className="text-sm text-muted-foreground">{t('home')}</p>
        </div>
        <div className="px-4 text-lg font-bold text-muted-foreground">{t('vs')}</div>
        <div className="flex-1">
          <p className="font-semibold">{awayTeam.Team.name}</p>
          <p className="text-sm text-muted-foreground">{t('away')}</p>
        </div>
      </div>

      <Separator />

      {/* Score entry */}
      <div className="space-y-4">
        {/* Extra time / shootout checkboxes — hidden for football group stage */}
        {showExtraTimeControls && (
          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isOvertime"
                checked={isOvertime}
                onCheckedChange={(checked) => onOvertimeChange(checked === true)}
              />
              <Label htmlFor="isOvertime" className="text-sm font-normal">
                {isFootball ? t('extraTime') : t('overtime')}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isShootout"
                checked={isShootout}
                onCheckedChange={(checked) => onShootoutChange(checked === true)}
              />
              <Label htmlFor="isShootout" className="text-sm font-normal">
                {isFootball ? t('penaltyShootout') : t('shootout')}
              </Label>
            </div>
          </div>
        )}

        {/* Regular time score */}
        <div>
          <h4 className="font-medium mb-3">
            {isOvertime || isShootout ? t('regularTimeScore') : t('finalScore')}
          </h4>
          <div className="flex items-end justify-center gap-4">
            <ScoreStepper
              id="homeRegularScore"
              label={homeTeam.Team.shortcut || t('home')}
              value={homeRegularScore}
              onChange={onHomeRegularScoreChange}
            />
            <span className="text-2xl font-bold text-muted-foreground pb-2">:</span>
            <ScoreStepper
              id="awayRegularScore"
              label={awayTeam.Team.shortcut || t('away')}
              value={awayRegularScore}
              onChange={onAwayRegularScoreChange}
            />
          </div>
        </div>

        {/* Final score (only show if overtime/shootout) */}
        {(isOvertime || isShootout) && (
          <div>
            <h4 className="font-medium mb-3">{extendedLabel}</h4>
            <div className="flex items-end justify-center gap-4">
              <ScoreStepper
                id="homeFinalScore"
                label={homeTeam.Team.shortcut || t('home')}
                value={homeFinalScore}
                onChange={onHomeFinalScoreChange}
              />
              <span className="text-2xl font-bold text-muted-foreground pb-2">:</span>
              <ScoreStepper
                id="awayFinalScore"
                label={awayTeam.Team.shortcut || t('away')}
                value={awayFinalScore}
                onChange={onAwayFinalScoreChange}
              />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
