'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteSpecialBet } from '@/actions/special-bets'
import { getErrorMessage } from '@/lib/error-handler'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AddSpecialBetDialog } from './add-special-bet-dialog'
import { ResultEntryDialog } from './result-entry-dialog'

type League = Awaited<ReturnType<typeof import('@/actions/special-bets').getLeaguesWithTeamsAndPlayers>>[number]
type SpecialBet = Awaited<ReturnType<typeof import('@/actions/special-bets').getSpecialBets>>[number]
type SpecialBetType = { id: number; name: string }

interface SpecialBetsContentProps {
  specialBets: SpecialBet[]
  leagues: League[]
  specialBetTypes: SpecialBetType[]
}

function getSpecialBetStatus(specialBet: SpecialBet): 'scheduled' | 'finished' | 'evaluated' {
  if (specialBet.isEvaluated) return 'evaluated'
  const hasResult = specialBet.specialBetTeamResultId !== null ||
                   specialBet.specialBetPlayerResultId !== null ||
                   specialBet.specialBetValue !== null
  if (hasResult) return 'finished'
  return 'scheduled'
}

function getResultTypeAndDisplay(specialBet: SpecialBet): { type: string; display: string } {
  if (specialBet.specialBetTeamResultId) {
    return {
      type: 'team',
      display: specialBet.LeagueTeam?.Team.name || 'Unknown',
    }
  }
  if (specialBet.specialBetPlayerResultId) {
    const player = specialBet.LeaguePlayer
    return {
      type: 'player',
      display: player ? `${player.Player.firstName} ${player.Player.lastName}` : 'Unknown',
    }
  }
  if (specialBet.specialBetValue !== null) {
    return {
      type: 'value',
      display: specialBet.specialBetValue.toString(),
    }
  }
  return { type: 'none', display: '-' }
}

export function SpecialBetsContent({ specialBets, leagues, specialBetTypes }: SpecialBetsContentProps) {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [leagueFilter, setLeagueFilter] = React.useState<string>('all')
  const [typeFilter, setTypeFilter] = React.useState<string>('all')
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [selectedSpecialBet, setSelectedSpecialBet] = React.useState<SpecialBet | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [specialBetToDelete, setSpecialBetToDelete] = React.useState<SpecialBet | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Filter special bets
  const filteredSpecialBets = specialBets.filter((sb) => {
    const status = getSpecialBetStatus(sb)
    const resultInfo = getResultTypeAndDisplay(sb)

    // Status filter
    if (statusFilter !== 'all' && status !== statusFilter) {
      return false
    }

    // League filter
    if (leagueFilter !== 'all' && sb.leagueId !== parseInt(leagueFilter, 10)) {
      return false
    }

    // Type filter
    if (typeFilter !== 'all' && resultInfo.type !== typeFilter) {
      return false
    }

    // Search filter (by special bet type name)
    if (search) {
      const searchLower = search.toLowerCase()
      const specialBetName = sb.SpecialBetSingle.name.toLowerCase()
      return specialBetName.includes(searchLower)
    }

    return true
  })

  const handleDelete = async () => {
    if (!specialBetToDelete) return
    setIsDeleting(true)
    try {
      await deleteSpecialBet(specialBetToDelete.id)
      toast.success('Special bet deleted successfully')
      setDeleteDialogOpen(false)
      setSpecialBetToDelete(null)
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to delete special bet')
      toast.error(message)
      console.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-4 flex-wrap">
          <Input
            placeholder="Search by special bet type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="finished">Finished</SelectItem>
              <SelectItem value="evaluated">Evaluated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={leagueFilter} onValueChange={setLeagueFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="League" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leagues</SelectItem>
              {leagues.map((league) => (
                <SelectItem key={league.id} value={league.id.toString()}>
                  {league.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="team">Team</SelectItem>
              <SelectItem value="player">Player</SelectItem>
              <SelectItem value="value">Value</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Special Bet
        </Button>
      </div>

      {/* Special Bets table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>All Special Bets</CardTitle>
          <CardDescription>
            {filteredSpecialBets.length} special bet{filteredSpecialBets.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSpecialBets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">No special bets found</p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first special bet
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>League</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Bets</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSpecialBets.map((sb) => {
                    const status = getSpecialBetStatus(sb)
                    const resultInfo = getResultTypeAndDisplay(sb)

                    return (
                      <TableRow
                        key={sb.id}
                        className="table-row-hover cursor-pointer"
                        onClick={() => setSelectedSpecialBet(sb)}
                      >
                        <TableCell className="font-mono text-muted-foreground">
                          #{sb.id}
                        </TableCell>
                        <TableCell>
                          {format(new Date(sb.dateTime), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>{sb.League.name}</TableCell>
                        <TableCell>
                          <span className="text-sm">{sb.SpecialBetSingle.name}</span>
                        </TableCell>
                        <TableCell>
                          {resultInfo.type !== 'none' && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {resultInfo.type}
                              </Badge>
                              <span className="text-sm">{resultInfo.display}</span>
                            </div>
                          )}
                          {resultInfo.type === 'none' && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{sb.points} pts</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {sb._count.UserSpecialBetSingle} bet{sb._count.UserSpecialBetSingle !== 1 ? 's' : ''}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              status === 'evaluated'
                                ? 'evaluated'
                                : status === 'finished'
                                ? 'finished'
                                : 'scheduled'
                            }
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedSpecialBet(sb)
                              }}
                              aria-label={`Edit special bet: ${sb.SpecialBetSingle.name}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSpecialBetToDelete(sb)
                                setDeleteDialogOpen(true)
                              }}
                              aria-label={`Delete special bet: ${sb.SpecialBetSingle.name}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Special Bet Dialog */}
      <AddSpecialBetDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        leagues={leagues}
        specialBetTypes={specialBetTypes}
      />

      {/* Result Entry Dialog */}
      {selectedSpecialBet && (
        <ResultEntryDialog
          specialBet={selectedSpecialBet}
          leagues={leagues}
          open={!!selectedSpecialBet}
          onOpenChange={(open) => !open && setSelectedSpecialBet(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Special Bet</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this special bet? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
