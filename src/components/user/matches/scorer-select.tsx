'use client'

import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TeamFlag } from '@/components/common/team-flag'
import { cn } from '@/lib/utils'
import { SPORT_IDS } from '@/lib/constants'

interface Player {
  id: number
  topScorerRanking: number | null
  Player: {
    id: number
    firstName: string | null
    lastName: string | null
    position: string | null
  }
}

interface Team {
  name: string
  shortcut: string
  flagIcon: string | null
  flagType: string | null
}

interface ScorerSelectProps {
  value: number | null | undefined
  onChange: (value: number | null) => void
  noScorer: boolean | null | undefined
  onNoScorerChange: (value: boolean | null) => void
  homePlayers: Player[]
  awayPlayers: Player[]
  homeTeam: Team
  awayTeam: Team
  homeTeamName: string
  awayTeamName: string
  sportId: number
  disabled?: boolean
  className?: string
}

function getPlayerName(player: Player): string {
  const { firstName, lastName, position } = player.Player
  let name: string
  if (firstName && lastName) {
    name = `${firstName} ${lastName}`
  } else {
    name = firstName || lastName || 'Unknown'
  }
  if (position) {
    name += ` (${position})`
  }
  return name
}

function getSearchableText(player: Player): string {
  const { firstName, lastName, position } = player.Player
  return [firstName, lastName, position].filter(Boolean).join(' ').toLowerCase()
}

function ScorerBadge({ ranking }: { ranking: number }) {
  if (ranking < 1 || ranking > 4) return null

  return (
    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
      {ranking}
    </span>
  )
}

export function ScorerSelect({
  value,
  onChange,
  noScorer,
  onNoScorerChange,
  homePlayers,
  awayPlayers,
  homeTeam,
  awayTeam,
  homeTeamName,
  awayTeamName,
  sportId,
  disabled = false,
  className,
}: ScorerSelectProps) {
  const t = useTranslations('user.matches')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const allPlayers = useMemo(
    () => [...homePlayers, ...awayPlayers],
    [homePlayers, awayPlayers]
  )

  const selectedPlayer = useMemo(
    () => allPlayers.find((p) => p.id === value),
    [allPlayers, value]
  )

  const filteredHomePlayers = useMemo(() => {
    if (!search) return homePlayers
    const searchLower = search.toLowerCase()
    return homePlayers.filter((p) => getSearchableText(p).includes(searchLower))
  }, [homePlayers, search])

  const filteredAwayPlayers = useMemo(() => {
    if (!search) return awayPlayers
    const searchLower = search.toLowerCase()
    return awayPlayers.filter((p) => getSearchableText(p).includes(searchLower))
  }, [awayPlayers, search])

  const handleSelectPlayer = (playerId: number) => {
    onChange(playerId)
    onNoScorerChange(null) // Clear noScorer when player selected
    setOpen(false)
    setSearch('')
  }

  const handleSelectNoScorer = () => {
    onChange(null)
    onNoScorerChange(true) // Set noScorer flag
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select scorer"
          disabled={disabled}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className="truncate">
            {noScorer === true ? (
              <span className="text-muted-foreground italic">{t('noScorer')}</span>
            ) : selectedPlayer ? (
              <span className="flex items-center">
                {getPlayerName(selectedPlayer)}
                {selectedPlayer.topScorerRanking && (
                  <ScorerBadge ranking={selectedPlayer.topScorerRanking} />
                )}
              </span>
            ) : (
              t('selectScorer')
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder={t('searchPlayer')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-1">
            {/* No Scorer option (intentional prediction for 0-0 game) - Soccer only */}
            {sportId === SPORT_IDS.FOOTBALL && (
              <button
                type="button"
                onClick={handleSelectNoScorer}
                className={cn(
                  'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                  noScorer === true && 'bg-accent'
                )}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    noScorer === true ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span className="italic">{t('noScorerGame')}</span>
              </button>
            )}

            {/* Home team players */}
            {filteredHomePlayers.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <TeamFlag
                    flagIcon={homeTeam.flagIcon}
                    flagType={homeTeam.flagType}
                    teamName={homeTeam.name}
                    size="xs"
                  />
                  <span>{homeTeamName}</span>
                </div>
                {filteredHomePlayers.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => handleSelectPlayer(player.id)}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                      value === player.id && 'bg-accent'
                    )}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === player.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="flex items-center">
                      {getPlayerName(player)}
                      {player.topScorerRanking && (
                        <ScorerBadge ranking={player.topScorerRanking} />
                      )}
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* Away team players */}
            {filteredAwayPlayers.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <TeamFlag
                    flagIcon={awayTeam.flagIcon}
                    flagType={awayTeam.flagType}
                    teamName={awayTeam.name}
                    size="xs"
                  />
                  <span>{awayTeamName}</span>
                </div>
                {filteredAwayPlayers.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => handleSelectPlayer(player.id)}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                      value === player.id && 'bg-accent'
                    )}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === player.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="flex items-center">
                      {getPlayerName(player)}
                      {player.topScorerRanking && (
                        <ScorerBadge ranking={player.topScorerRanking} />
                      )}
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* No results */}
            {filteredHomePlayers.length === 0 && filteredAwayPlayers.length === 0 && search && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t('noPlayersFound')}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
