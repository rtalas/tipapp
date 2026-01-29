import React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { SPORT_IDS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Team {
  id: number
  name: string
  shortcut: string
}

interface Player {
  id: number
  firstName: string | null
  lastName: string | null
  position: string | null
}

interface LeaguePlayer {
  id: number
  Player: Player
}

interface Scorer {
  playerId: string
  numberOfGoals: number
}

interface ScorersListProps {
  scorers: Scorer[]
  hasScorers: boolean
  sportId: number
  homeTeam: { Team: Team }
  awayTeam: { Team: Team }
  players: {
    home: LeaguePlayer[]
    away: LeaguePlayer[]
  }
  onAddScorer: () => void
  onRemoveScorer: (index: number) => void
  onScorerChange: (index: number, field: keyof Scorer, value: string | number) => void
  onHasScorersChange: (hasScorers: boolean) => void
}

export function ScorersList({
  scorers,
  hasScorers,
  sportId,
  homeTeam,
  awayTeam,
  players,
  onAddScorer,
  onRemoveScorer,
  onScorerChange,
  onHasScorersChange,
}: ScorersListProps) {
  return (
    <>
      <Separator />

      {/* Scorers section (T3: Context-Aware Scorer Selection) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Goal Scorers</h4>
          <div className="flex items-center gap-4">
            {/* No scorers checkbox - Soccer only (hockey always has at least one goal) */}
            {sportId === SPORT_IDS.FOOTBALL && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="noScorers"
                  checked={!hasScorers}
                  onCheckedChange={(checked) => onHasScorersChange(!checked)}
                />
                <Label htmlFor="noScorers" className="text-sm font-normal cursor-pointer">
                  No scorers (0:0 game)
                </Label>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddScorer}
              disabled={!hasScorers}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Scorer
            </Button>
          </div>
        </div>

        {!hasScorers ? (
          <p className="text-sm text-muted-foreground text-center py-4 italic">
            No scorers recorded for this match (0:0 game).
          </p>
        ) : scorers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No scorers added yet. Click &quot;Add Scorer&quot; to record goal scorers.
          </p>
        ) : (
          <div className="space-y-3">
            {scorers.map((scorer, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select
                  value={scorer.playerId}
                  onValueChange={(value) => onScorerChange(index, 'playerId', value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Home team players */}
                    <SelectGroup>
                      <SelectLabel>{homeTeam.Team.name}</SelectLabel>
                      {players.home.map((lp) => (
                        <SelectItem key={lp.id} value={lp.id.toString()}>
                          {lp.Player.firstName} {lp.Player.lastName}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    {/* Away team players */}
                    <SelectGroup>
                      <SelectLabel>{awayTeam.Team.name}</SelectLabel>
                      {players.away.map((lp) => (
                        <SelectItem key={lp.id} value={lp.id.toString()}>
                          {lp.Player.firstName} {lp.Player.lastName}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  value={scorer.numberOfGoals}
                  onChange={(e) =>
                    onScorerChange(index, 'numberOfGoals', parseInt(e.target.value, 10) || 1)
                  }
                  className="w-16 text-center"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveScorer(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
