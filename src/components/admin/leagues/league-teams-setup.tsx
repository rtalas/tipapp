'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { assignTeamToLeague, removeTeamFromLeague } from '@/actions/leagues'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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
  flagIcon: string | null
}

interface LeaguePlayer {
  id: number
  playerId: number
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

interface LeagueTeamsSetupProps {
  league: League
  availableTeams: Team[]
}

export function LeagueTeamsSetup({ league, availableTeams }: LeagueTeamsSetupProps) {
  const [selectedTeamId, setSelectedTeamId] = React.useState<string>('')
  const [isAddingTeam, setIsAddingTeam] = React.useState(false)

  const handleAddTeam = async () => {
    if (!selectedTeamId) return
    setIsAddingTeam(true)

    try {
      await assignTeamToLeague({
        leagueId: league.id,
        teamId: parseInt(selectedTeamId, 10),
      })
      toast.success('Team added to league')
      setSelectedTeamId('')
    } catch (error) {
      toast.error('Failed to add team')
      console.error(error)
    } finally {
      setIsAddingTeam(false)
    }
  }

  const handleRemoveTeam = async (leagueTeamId: number) => {
    try {
      await removeTeamFromLeague({ id: leagueTeamId })
      toast.success('Team removed from league')
    } catch (error) {
      toast.error('Failed to remove team')
      console.error(error)
    }
  }

  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle>Teams</CardTitle>
        <CardDescription>Add and manage teams participating in this league</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add team form */}
        <div className="flex gap-4">
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a team to add" />
            </SelectTrigger>
            <SelectContent>
              {availableTeams.length === 0 ? (
                <SelectItem value="none" disabled>
                  No teams available
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
          <Button onClick={handleAddTeam} disabled={!selectedTeamId || isAddingTeam}>
            <Plus className="mr-2 h-4 w-4" />
            Add Team
          </Button>
        </div>

        {/* Teams table */}
        {league.LeagueTeam.length > 0 ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {league.LeagueTeam.map((lt) => (
                  <TableRow key={lt.id}>
                    <TableCell className="font-medium">
                      {lt.Team.name}
                      {lt.Team.shortcut && (
                        <span className="ml-2 text-muted-foreground">({lt.Team.shortcut})</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lt.group ? <Badge variant="outline">{lt.group}</Badge> : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{lt.LeaguePlayer.length} players</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveTeam(lt.id)}
                        className="text-destructive hover:text-destructive"
                        aria-label={`Remove ${lt.Team.name}`}
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
            No teams added yet. Select a team from the dropdown above to get started.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
