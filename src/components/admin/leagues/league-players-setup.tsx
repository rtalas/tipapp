'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Users } from 'lucide-react'
import { assignPlayerToLeagueTeam, removePlayerFromLeagueTeam } from '@/actions/leagues'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
      console.error(error)
    } finally {
      setIsAddingPlayer(false)
    }
  }

  const handleRemovePlayer = async (leaguePlayerId: number) => {
    try {
      await removePlayerFromLeagueTeam(leaguePlayerId)
      toast.success('Player removed from team')
    } catch (error) {
      toast.error('Failed to remove player')
      console.error(error)
    }
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
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lt.LeaguePlayer.map((lp) => (
                    <TableRow key={lp.id}>
                      <TableCell className="font-medium">
                        {lp.Player.firstName} {lp.Player.lastName}
                      </TableCell>
                      <TableCell>{lp.Player.position || '-'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePlayer(lp.id)}
                          className="text-destructive hover:text-destructive"
                          aria-label={`Remove ${lp.Player.firstName} ${lp.Player.lastName}`}
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
