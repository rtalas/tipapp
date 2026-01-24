'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Plus, Trash2, Users } from 'lucide-react'
import {
  assignTeamToLeague,
  removeTeamFromLeague,
  assignPlayerToLeagueTeam,
  removePlayerFromLeagueTeam,
} from '@/actions/leagues'
import { logger } from '@/lib/client-logger'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'

interface Team {
  id: number
  name: string
  shortcut: string | null
  flagIcon: string | null
}

interface Player {
  id: number
  firstName: string | null
  lastName: string | null
  position: string | null
}

interface LeaguePlayer {
  id: number
  playerId: number
  Player: Player
  seasonGames: number | null
  seasonGoals: number | null
}

interface LeagueTeam {
  id: number
  teamId: number
  group: string | null
  Team: Team
  LeaguePlayer: LeaguePlayer[]
}

interface League {
  id: number
  name: string
  sportId: number
  LeagueTeam: LeagueTeam[]
}

interface LeagueSetupTabsProps {
  league: League
  availableTeams: Team[]
  allPlayers: Player[]
}

export function LeagueSetupTabs({
  league,
  availableTeams,
  allPlayers,
}: LeagueSetupTabsProps) {
  const t = useTranslations('admin.leagueSetup')
  const tCommon = useTranslations('admin.common')
  const [selectedTeamId, setSelectedTeamId] = React.useState<string>('')
  const [selectedLeagueTeamId, setSelectedLeagueTeamId] = React.useState<string>('')
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<string>('')
  const [isAddingTeam, setIsAddingTeam] = React.useState(false)
  const [isAddingPlayer, setIsAddingPlayer] = React.useState(false)

  // Get players already assigned to any team in this league
  const assignedPlayerIds = new Set(
    league.LeagueTeam.flatMap((lt) => lt.LeaguePlayer.map((lp) => lp.playerId))
  )
  const unassignedPlayers = allPlayers.filter((p) => !assignedPlayerIds.has(p.id))

  const handleAddTeam = async () => {
    if (!selectedTeamId) return
    setIsAddingTeam(true)

    try {
      await assignTeamToLeague({
        leagueId: league.id,
        teamId: parseInt(selectedTeamId, 10),
      })
      toast.success(t('teamAdded'))
      setSelectedTeamId('')
    } catch (error) {
      toast.error(t('teamAddFailed'))
      logger.error('Failed to add team to league', { error, leagueId: league.id, teamId: selectedTeamId })
    } finally {
      setIsAddingTeam(false)
    }
  }

  const handleRemoveTeam = async (leagueTeamId: number) => {
    try {
      await removeTeamFromLeague({ id: leagueTeamId })
      toast.success(t('teamRemoved'))
    } catch (error) {
      toast.error(t('teamRemoveFailed'))
      logger.error('Failed to remove team from league', { error, leagueTeamId })
    }
  }

  const handleAddPlayer = async () => {
    if (!selectedLeagueTeamId || !selectedPlayerId) return
    setIsAddingPlayer(true)

    try {
      await assignPlayerToLeagueTeam({
        leagueTeamId: parseInt(selectedLeagueTeamId, 10),
        playerId: parseInt(selectedPlayerId, 10),
      })
      toast.success(t('playerAdded'))
      setSelectedPlayerId('')
    } catch (error) {
      toast.error(t('playerAddFailed'))
      logger.error('Failed to add player to team', { error, leagueTeamId: selectedLeagueTeamId, playerId: selectedPlayerId })
    } finally {
      setIsAddingPlayer(false)
    }
  }

  const handleRemovePlayer = async (leaguePlayerId: number) => {
    try {
      await removePlayerFromLeagueTeam({ id: leaguePlayerId })
      toast.success(t('playerRemoved'))
    } catch (error) {
      toast.error(t('playerRemoveFailed'))
      logger.error('Failed to remove player from team', { error, leaguePlayerId })
    }
  }

  return (
    <div className="space-y-6">
      {/* Teams Section */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{t('teamsSection')}</CardTitle>
          <CardDescription>
            {t('teamsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add team form */}
          <div className="flex gap-4">
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={t('selectTeam')} />
              </SelectTrigger>
              <SelectContent>
                {availableTeams.length === 0 ? (
                  <SelectItem value="none" disabled>
                    {t('noTeamsAvailable')}
                  </SelectItem>
                ) : (
                  availableTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name} {team.shortcut && `(${team.shortcut})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddTeam}
              disabled={!selectedTeamId || isAddingTeam}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('addTeam')}
            </Button>
          </div>

          {/* Teams table */}
          {league.LeagueTeam.length > 0 ? (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('team')}</TableHead>
                    <TableHead>{t('group')}</TableHead>
                    <TableHead>{t('players')}</TableHead>
                    <TableHead className="w-[80px]">{tCommon('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {league.LeagueTeam.map((lt) => (
                    <TableRow key={lt.id}>
                      <TableCell className="font-medium">
                        {lt.Team.name}
                        {lt.Team.shortcut && (
                          <span className="ml-2 text-muted-foreground">
                            ({lt.Team.shortcut})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lt.group ? (
                          <Badge variant="outline">{lt.group}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {lt.LeaguePlayer.length} players
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTeam(lt.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t('noTeamsAdded')}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Players Section */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{t('playersSection')}</CardTitle>
          <CardDescription>
            {t('playersDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add player form */}
          {league.LeagueTeam.length > 0 ? (
            <div className="flex gap-4">
              <Select
                value={selectedLeagueTeamId}
                onValueChange={setSelectedLeagueTeamId}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t('selectTeamFirst')} />
                </SelectTrigger>
                <SelectContent>
                  {league.LeagueTeam.map((lt) => (
                    <SelectItem key={lt.id} value={lt.id.toString()}>
                      {lt.Team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedPlayerId}
                onValueChange={setSelectedPlayerId}
                disabled={!selectedLeagueTeamId}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t('selectPlayer')} />
                </SelectTrigger>
                <SelectContent>
                  {unassignedPlayers.length === 0 ? (
                    <SelectItem value="none" disabled>
                      {t('noPlayersAvailable')}
                    </SelectItem>
                  ) : (
                    unassignedPlayers.map((player) => (
                      <SelectItem key={player.id} value={player.id.toString()}>
                        {player.firstName} {player.lastName}
                        {player.position && (
                          <span className="ml-2 text-muted-foreground">
                            ({player.position})
                          </span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Button
                onClick={handleAddPlayer}
                disabled={
                  !selectedLeagueTeamId || !selectedPlayerId || isAddingPlayer
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('addPlayer')}
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">
              {t('addTeamFirst')}
            </p>
          )}

          {/* Players by team */}
          {league.LeagueTeam.filter((lt) => lt.LeaguePlayer.length > 0).map(
            (lt) => (
              <div key={lt.id} className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {lt.Team.name}
                </h4>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('player')}</TableHead>
                        <TableHead>{t('position')}</TableHead>
                        <TableHead className="w-[80px]">{tCommon('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lt.LeaguePlayer.map((lp) => (
                        <TableRow key={lp.id}>
                          <TableCell className="font-medium">
                            {lp.Player.firstName} {lp.Player.lastName}
                          </TableCell>
                          <TableCell>
                            {lp.Player.position || '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemovePlayer(lp.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )
          )}

          {league.LeagueTeam.length > 0 &&
            league.LeagueTeam.every((lt) => lt.LeaguePlayer.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                {t('noPlayersAssigned')}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
