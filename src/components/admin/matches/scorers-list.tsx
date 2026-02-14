'use client'

import { useState } from 'react'
import { Plus, Trash2, Search, Check, ChevronsUpDown } from 'lucide-react'
import { SPORT_IDS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

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

function getPlayerName(lp: LeaguePlayer): string {
  const { firstName, lastName } = lp.Player
  if (firstName && lastName) return `${firstName} ${lastName}`
  return firstName || lastName || 'Unknown'
}

function sortPlayers(players: LeaguePlayer[]): LeaguePlayer[] {
  return [...players].sort((a, b) => {
    const lastA = (a.Player.lastName ?? '').toLowerCase()
    const lastB = (b.Player.lastName ?? '').toLowerCase()
    if (lastA !== lastB) return lastA.localeCompare(lastB)
    const firstA = (a.Player.firstName ?? '').toLowerCase()
    const firstB = (b.Player.firstName ?? '').toLowerCase()
    return firstA.localeCompare(firstB)
  })
}

interface ScorerSelectProps {
  value: string
  allPlayers: LeaguePlayer[]
  homeTeamName: string
  awayTeamName: string
  homePlayers: LeaguePlayer[]
  awayPlayers: LeaguePlayer[]
  onChange: (value: string) => void
}

function ScorerSelect({
  value,
  allPlayers,
  homeTeamName,
  awayTeamName,
  homePlayers,
  awayPlayers,
  onChange,
}: ScorerSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedPlayer = allPlayers.find((lp) => lp.id.toString() === value)

  const searchLower = search.toLowerCase()
  const filteredHome = search
    ? homePlayers.filter((lp) =>
        getPlayerName(lp).toLowerCase().includes(searchLower)
      )
    : homePlayers
  const filteredAway = search
    ? awayPlayers.filter((lp) =>
        getPlayerName(lp).toLowerCase().includes(searchLower)
      )
    : awayPlayers

  const handleSelect = (id: string) => {
    onChange(id)
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex-1 justify-between font-normal"
        >
          <span className="truncate">
            {selectedPlayer ? getPlayerName(selectedPlayer) : 'Select player'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Search player..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div
          className="h-[260px] overflow-y-auto"
          onWheelCapture={(e) => {
            e.stopPropagation()
            e.currentTarget.scrollTop += e.deltaY
          }}
        >
          <div className="p-1">
            {filteredHome.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {homeTeamName}
                </div>
                {filteredHome.map((lp) => (
                  <button
                    key={lp.id}
                    type="button"
                    onClick={() => handleSelect(lp.id.toString())}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                      value === lp.id.toString() && 'bg-accent'
                    )}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === lp.id.toString() ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {getPlayerName(lp)}
                  </button>
                ))}
              </>
            )}

            {filteredAway.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {awayTeamName}
                </div>
                {filteredAway.map((lp) => (
                  <button
                    key={lp.id}
                    type="button"
                    onClick={() => handleSelect(lp.id.toString())}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                      value === lp.id.toString() && 'bg-accent'
                    )}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === lp.id.toString() ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {getPlayerName(lp)}
                  </button>
                ))}
              </>
            )}

            {filteredHome.length === 0 && filteredAway.length === 0 && search && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No players found.
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
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
  const sortedHome = sortPlayers(players.home)
  const sortedAway = sortPlayers(players.away)
  const allPlayers = [...sortedHome, ...sortedAway]

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
                <ScorerSelect
                  value={scorer.playerId}
                  allPlayers={allPlayers}
                  homeTeamName={homeTeam.Team.name}
                  awayTeamName={awayTeam.Team.name}
                  homePlayers={sortedHome}
                  awayPlayers={sortedAway}
                  onChange={(value) => onScorerChange(index, 'playerId', value)}
                />
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
