'use client'

import React, { useState, useMemo } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
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

interface TeamOption {
  id: number
  group: string | null
  Team: {
    id: number
    name: string
    shortcut: string
    flagIcon?: string | null
    flagType?: string | null
  }
}

interface PlayerOption {
  id: number
  Player: { id: number; firstName: string | null; lastName: string | null; position: string | null }
  LeagueTeam: { Team: { shortcut: string } }
}

interface SearchableSelectProps {
  value: number | null
  onChange: (value: number | null) => void
  placeholder: string
  noSelectionLabel: string
  disabled?: boolean
  teams?: TeamOption[]
  players?: PlayerOption[]
  className?: string
}

function getTeamSearchableText(team: TeamOption): string {
  return [team.Team.name, team.Team.shortcut].filter(Boolean).join(' ').toLowerCase()
}

function getPlayerSearchableText(player: PlayerOption): string {
  const { firstName, lastName } = player.Player
  return [firstName, lastName, player.LeagueTeam.Team.shortcut].filter(Boolean).join(' ').toLowerCase()
}

function getPlayerDisplayName(player: PlayerOption): string {
  const { firstName, lastName } = player.Player
  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  }
  return firstName || lastName || 'Unknown'
}

export function SearchableSelect({
  value,
  onChange,
  placeholder,
  noSelectionLabel,
  disabled = false,
  teams,
  players,
  className,
}: SearchableSelectProps) {
  const t = useTranslations('user.specialBets')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const isTeamSelect = !!teams
  const isPlayerSelect = !!players

  const selectedTeam = useMemo(
    () => teams?.find((team) => team.id === value),
    [teams, value]
  )

  const selectedPlayer = useMemo(
    () => players?.find((player) => player.id === value),
    [players, value]
  )

  const filteredTeams = useMemo(() => {
    if (!teams) return []
    if (!search) return teams
    const searchLower = search.toLowerCase()
    return teams.filter((team) => getTeamSearchableText(team).includes(searchLower))
  }, [teams, search])

  const filteredPlayers = useMemo(() => {
    if (!players) return []
    if (!search) return players
    const searchLower = search.toLowerCase()
    return players.filter((player) => getPlayerSearchableText(player).includes(searchLower))
  }, [players, search])

  const handleSelect = (id: number | null) => {
    onChange(id)
    setOpen(false)
    setSearch('')
  }

  const displayValue = useMemo(() => {
    if (isTeamSelect && selectedTeam) {
      return selectedTeam.Team.name
    }
    if (isPlayerSelect && selectedPlayer) {
      return `${getPlayerDisplayName(selectedPlayer)} (${selectedPlayer.LeagueTeam.Team.shortcut})`
    }
    return null
  }, [isTeamSelect, isPlayerSelect, selectedTeam, selectedPlayer])

  const searchPlaceholder = isTeamSelect ? t('searchTeam') : t('searchPlayer')
  const noResultsText = isTeamSelect ? t('noTeamsFound') : t('noPlayersFound')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={placeholder}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className="truncate flex items-center gap-2">
            {displayValue ? (
              <>
                {isTeamSelect && selectedTeam && (
                  <TeamFlag
                    flagIcon={selectedTeam.Team.flagIcon ?? null}
                    flagType={selectedTeam.Team.flagType ?? null}
                    teamName={selectedTeam.Team.name}
                    size="sm"
                  />
                )}
                <span>{displayValue}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-1">
            {/* No selection option */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                value === null && 'bg-accent'
              )}
            >
              <Check
                className={cn(
                  'mr-2 h-4 w-4',
                  value === null ? 'opacity-100' : 'opacity-0'
                )}
              />
              <span className="text-muted-foreground italic">{noSelectionLabel}</span>
            </button>

            {/* Team options */}
            {isTeamSelect && filteredTeams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => handleSelect(team.id)}
                className={cn(
                  'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                  value === team.id && 'bg-accent'
                )}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === team.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex items-center gap-2">
                  <TeamFlag
                    flagIcon={team.Team.flagIcon ?? null}
                    flagType={team.Team.flagType ?? null}
                    teamName={team.Team.name}
                    size="sm"
                  />
                  <span>{team.Team.name}</span>
                </div>
              </button>
            ))}

            {/* Player options */}
            {isPlayerSelect && filteredPlayers.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => handleSelect(player.id)}
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
                <span>
                  {getPlayerDisplayName(player)} ({player.LeagueTeam.Team.shortcut})
                </span>
              </button>
            ))}

            {/* No results */}
            {((isTeamSelect && filteredTeams.length === 0) ||
              (isPlayerSelect && filteredPlayers.length === 0)) &&
              search && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {noResultsText}
                </div>
              )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
