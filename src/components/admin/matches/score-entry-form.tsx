import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'

interface Team {
  id: number
  name: string
  shortcut: string
}

interface ScoreEntryFormProps {
  homeTeam: { Team: Team }
  awayTeam: { Team: Team }
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
  return (
    <>
      {/* Teams display */}
      <div className="flex items-center justify-between text-center">
        <div className="flex-1">
          <p className="font-semibold">{homeTeam.Team.name}</p>
          <p className="text-sm text-muted-foreground">Home</p>
        </div>
        <div className="px-4 text-lg font-bold text-muted-foreground">vs</div>
        <div className="flex-1">
          <p className="font-semibold">{awayTeam.Team.name}</p>
          <p className="text-sm text-muted-foreground">Away</p>
        </div>
      </div>

      <Separator />

      {/* Score entry */}
      <div className="space-y-4">
        {/* Overtime/Shootout checkboxes first */}
        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isOvertime"
              checked={isOvertime}
              onCheckedChange={(checked) => onOvertimeChange(checked === true)}
            />
            <Label htmlFor="isOvertime" className="text-sm font-normal">
              Overtime
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isShootout"
              checked={isShootout}
              onCheckedChange={(checked) => onShootoutChange(checked === true)}
            />
            <Label htmlFor="isShootout" className="text-sm font-normal">
              Shootout
            </Label>
          </div>
        </div>

        {/* Regular time score */}
        <div>
          <h4 className="font-medium mb-3">
            {isOvertime || isShootout ? 'Regular Time Score' : 'Final Score'}
          </h4>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="homeRegularScore">{homeTeam.Team.shortcut || 'Home'}</Label>
              <Input
                id="homeRegularScore"
                type="number"
                min="0"
                value={homeRegularScore}
                onChange={(e) => onHomeRegularScoreChange(e.target.value)}
                className="text-center text-2xl font-bold h-14"
                placeholder="0"
              />
            </div>
            <span className="text-2xl font-bold text-muted-foreground pt-6">:</span>
            <div className="flex-1 space-y-2">
              <Label htmlFor="awayRegularScore">{awayTeam.Team.shortcut || 'Away'}</Label>
              <Input
                id="awayRegularScore"
                type="number"
                min="0"
                value={awayRegularScore}
                onChange={(e) => onAwayRegularScoreChange(e.target.value)}
                className="text-center text-2xl font-bold h-14"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Final score (only show if overtime/shootout) */}
        {(isOvertime || isShootout) && (
          <div>
            <h4 className="font-medium mb-3">Final Score (After OT/SO)</h4>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="homeFinalScore">{homeTeam.Team.shortcut || 'Home'}</Label>
                <Input
                  id="homeFinalScore"
                  type="number"
                  min="0"
                  value={homeFinalScore}
                  onChange={(e) => onHomeFinalScoreChange(e.target.value)}
                  className="text-center text-2xl font-bold h-14"
                  placeholder="0"
                />
              </div>
              <span className="text-2xl font-bold text-muted-foreground pt-6">:</span>
              <div className="flex-1 space-y-2">
                <Label htmlFor="awayFinalScore">{awayTeam.Team.shortcut || 'Away'}</Label>
                <Input
                  id="awayFinalScore"
                  type="number"
                  min="0"
                  value={awayFinalScore}
                  onChange={(e) => onAwayFinalScoreChange(e.target.value)}
                  className="text-center text-2xl font-bold h-14"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
