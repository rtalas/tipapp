'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Users, Trophy } from 'lucide-react'
import { assignPlayerToLeagueTeam, removePlayerFromLeagueTeam, updateTopScorerRanking } from '@/actions/leagues'
import { logger } from '@/lib/client-logger'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Team {
  id: number
  name: string
  shortcut: string | null
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
  topScorerRanking: number | null
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

interface LeaguePlayersSetupProps {
  league: League
  allPlayers: Player[]
}

export function LeaguePlayersSetup({ league, allPlayers }: LeaguePlayersSetupProps) {
  const [selectedLeagueTeamId, setSelectedLeagueTeamId] = React.useState<string>('')
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<string>('')
  const [isAddingPlayer, setIsAddingPlayer] = React.useState(false)
  const [openRankingPopover, setOpenRankingPopover] = React.useState<number | null>(null)

  // Get players already assigned to any team in this league
  const assignedPlayerIds = new Set(
    league.LeagueTeam.flatMap((lt) => lt.LeaguePlayer.map((lp) => lp.playerId))
  )
  const unassignedPlayers = allPlayers.filter((p) => !assignedPlayerIds.has(p.id))

  const handleAddPlayer = async () => {
    if (!selectedLeagueTeamId || !selectedPlayerId) return
    setIsAddingPlayer(true)

    try {
      await assignPlayerToLeagueTeam({
        leagueTeamId: parseInt(selectedLeagueTeamId, 10),
        playerId: parseInt(selectedPlayerId, 10),
      })
      toast.success('Player added to team')
      setSelectedPlayerId('')
    } catch (error) {
      toast.error('Failed to add player')
      logger.error('Failed to add player to team', { error, leagueTeamId: selectedLeagueTeamId, playerId: selectedPlayerId })
    } finally {
      setIsAddingPlayer(false)
    }
  }

  const handleRemovePlayer = async (leaguePlayerId: number) => {
    try {
      await removePlayerFromLeagueTeam({ id: leaguePlayerId })
      toast.success('Player removed from team')
    } catch (error) {
      toast.error('Failed to remove player')
      logger.error('Failed to remove player from team', { error, leaguePlayerId })
    }
  }

  const handleUpdateRanking = async (leaguePlayerId: number, ranking: string) => {
    try {
      const rankingValue = ranking === 'none' ? null : parseInt(ranking, 10)
      await updateTopScorerRanking({
        leaguePlayerId,
        topScorerRanking: rankingValue,
      })
      toast.success('Ranking updated')
      setOpenRankingPopover(null)
    } catch (error) {
      toast.error('Failed to update ranking')
      logger.error('Failed to update top scorer ranking', { error, leaguePlayerId, ranking })
    }
  }

  const getRankingBadge = (ranking: number) => {
    const labels: Record<number, string> = {
      1: '⭐',
      2: '⭐⭐',
      3: '⭐⭐⭐',
      4: '⭐⭐⭐⭐',
    }
    return labels[ranking] || ''
  }

  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle>Players</CardTitle>
        <CardDescription>Assign players to teams for scorer predictions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add player form */}
        {league.LeagueTeam.length > 0 ? (
          <div className="flex gap-4">
            <Select value={selectedLeagueTeamId} onValueChange={setSelectedLeagueTeamId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select team" />
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
                <SelectValue placeholder="Select a player to add" />
              </SelectTrigger>
              <SelectContent>
                {unassignedPlayers.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No players available
                  </SelectItem>
                ) : (
                  unassignedPlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id.toString()}>
                      {player.firstName} {player.lastName}
                      {player.position && (
                        <span className="ml-2 text-muted-foreground">({player.position})</span>
                      )}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Button
              onClick={handleAddPlayer}
              disabled={!selectedLeagueTeamId || !selectedPlayerId || isAddingPlayer}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Player
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground">Add teams first before assigning players.</p>
        )}

        {/* Players by team */}
        {league.LeagueTeam.filter((lt) => lt.LeaguePlayer.length > 0).map((lt) => (
          <div key={lt.id} className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              {lt.Team.name}
            </h4>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lt.LeaguePlayer.map((lp) => (
                    <TableRow key={lp.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {lp.Player.firstName} {lp.Player.lastName}
                          {lp.topScorerRanking && (
                            <Badge variant="secondary" className="text-xs">
                              <Trophy className="h-3 w-3 mr-1" />
                              {getRankingBadge(lp.topScorerRanking)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{lp.Player.position || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Popover
                            open={openRankingPopover === lp.id}
                            onOpenChange={(open) => setOpenRankingPopover(open ? lp.id : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Set ranking for ${lp.Player.firstName} ${lp.Player.lastName}`}
                              >
                                <Trophy className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48" align="end">
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm">Top Scorer Ranking</h4>
                                <div className="space-y-1">
                                  <Button
                                    variant={lp.topScorerRanking === null ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() => handleUpdateRanking(lp.id, 'none')}
                                  >
                                    No ranking
                                  </Button>
                                  <Button
                                    variant={lp.topScorerRanking === 1 ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() => handleUpdateRanking(lp.id, '1')}
                                  >
                                    ⭐ 1st Best
                                  </Button>
                                  <Button
                                    variant={lp.topScorerRanking === 2 ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() => handleUpdateRanking(lp.id, '2')}
                                  >
                                    ⭐⭐ 2nd Best
                                  </Button>
                                  <Button
                                    variant={lp.topScorerRanking === 3 ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() => handleUpdateRanking(lp.id, '3')}
                                  >
                                    ⭐⭐⭐ 3rd Best
                                  </Button>
                                  <Button
                                    variant={lp.topScorerRanking === 4 ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() => handleUpdateRanking(lp.id, '4')}
                                  >
                                    ⭐⭐⭐⭐ 4th Best
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemovePlayer(lp.id)}
                            className="text-destructive hover:text-destructive"
                            aria-label={`Remove ${lp.Player.firstName} ${lp.Player.lastName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}

        {league.LeagueTeam.length > 0 &&
          league.LeagueTeam.every((lt) => lt.LeaguePlayer.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              No players assigned yet. Select a team and add players above.
            </div>
          )}
      </CardContent>
    </Card>
  )
}
