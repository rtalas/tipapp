'use client'

import * as React from 'react'
import { Fragment } from 'react'
import { format } from 'date-fns'
import { Plus, Edit, Trash2, ChevronDown, Calculator } from 'lucide-react'
import { toast } from 'sonner'
import { deleteSpecialBet } from '@/actions/special-bets'
import { evaluateSpecialBetBets } from '@/actions/evaluate-special-bets'
import { getErrorMessage } from '@/lib/error-handler'
import { useExpandableRow } from '@/hooks/useExpandableRow'
import { cn } from '@/lib/utils'
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
import { SpecialBetRow } from './special-bet-row'
import { CreateSpecialBetUserBetDialog } from './create-special-bet-user-bet-dialog'

type SpecialBet = Awaited<ReturnType<typeof import('@/actions/special-bet-bets').getSpecialBetsWithUserBets>>[number]
type League = Awaited<ReturnType<typeof import('@/actions/shared-queries').getLeaguesWithTeams>>[number]
type SpecialBetType = { id: number; name: string }
type User = Awaited<ReturnType<typeof import('@/actions/users').getUsers>>[number]

interface SpecialBetsContentProps {
  specialBets: SpecialBet[]
  leagues: League[]
  specialBetTypes: SpecialBetType[]
  users: User[]
  league?: { id: number; name: string }
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

export function SpecialBetsContent({ specialBets, leagues, specialBetTypes, users, league }: SpecialBetsContentProps) {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [leagueFilter, setLeagueFilter] = React.useState<string>('all')
  const [userFilter, setUserFilter] = React.useState<string>('all')
  const [typeFilter, setTypeFilter] = React.useState<string>('all')
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [selectedSpecialBet, setSelectedSpecialBet] = React.useState<SpecialBet | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [specialBetToDelete, setSpecialBetToDelete] = React.useState<SpecialBet | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [createBetSpecialBetId, setCreateBetSpecialBetId] = React.useState<number | null>(null)

  // Expandable rows
  const { isExpanded, toggleRow } = useExpandableRow()

  // Filter special bets
  const filteredSpecialBets = specialBets.filter((sb) => {
    const status = getSpecialBetStatus(sb)
    const resultInfo = getResultTypeAndDisplay(sb)

    // Status filter
    if (statusFilter !== 'all' && status !== statusFilter) {
      return false
    }

    // League filter (only if not on league-specific page)
    if (!league && leagueFilter !== 'all' && sb.leagueId !== parseInt(leagueFilter, 10)) {
      return false
    }

    // User filter - show only special bets where this user has bets
    if (userFilter !== 'all') {
      const userId = parseInt(userFilter, 10)
      const hasUserBet = sb.UserSpecialBetSingle.some((bet) => bet.LeagueUser.userId === userId)
      if (!hasUserBet) {
        return false
      }
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

  const handleEvaluate = async (specialBetId: number) => {
    try {
      const result = await evaluateSpecialBetBets({ specialBetId })

      if (result.success) {
        toast.success(`Special bet evaluated! ${result.totalUsersEvaluated} user(s) updated.`)
      } else {
        toast.error(getErrorMessage(result.error, 'Failed to evaluate special bet'))
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to evaluate special bet'))
      console.error(error)
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
          {!league && (
            <Select value={leagueFilter} onValueChange={setLeagueFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="League" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leagues</SelectItem>
                {leagues.map((lg) => (
                  <SelectItem key={lg.id} value={lg.id.toString()}>
                    {lg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.firstName} {user.lastName}
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
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Date & Time</TableHead>
                    {!league && <TableHead>League</TableHead>}
                    <TableHead>Special Bet</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead className="text-center">Bets</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSpecialBets.map((sb) => {
                    const status = getSpecialBetStatus(sb)
                    const resultInfo = getResultTypeAndDisplay(sb)
                    const expanded = isExpanded(sb.id)
                    const league = leagues.find((l) => l.id === sb.leagueId)

                    return (
                      <Fragment key={sb.id}>
                        {/* Main row - clickable to expand */}
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleRow(sb.id)}
                        >
                          <TableCell>
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 transition-transform',
                                expanded && 'rotate-180'
                              )}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">
                            #{sb.id}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {format(new Date(sb.dateTime), 'd.M.yyyy')}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(sb.dateTime), 'HH:mm')}
                              </span>
                            </div>
                          </TableCell>
                          {!league && <TableCell>{sb.League.name}</TableCell>}
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{sb.SpecialBetSingle.name}</span>
                              <Badge variant="outline" className="w-fit text-xs">
                                {sb.SpecialBetSingle.SpecialBetSingleType.name !== 'none' ? sb.SpecialBetSingle.SpecialBetSingleType.name : 'not set'}
                              </Badge>
                            </div>
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
                          <TableCell className="text-center">
                            <Badge variant="outline">{sb.UserSpecialBetSingle.length}</Badge>
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
                                  handleEvaluate(sb.id)
                                }}
                                aria-label={`Evaluate special bet: ${sb.SpecialBetSingle.name}`}
                              >
                                <Calculator className="h-4 w-4 text-blue-600" />
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

                        {/* Expanded row - user bets */}
                        {expanded && (
                          <TableRow>
                            <TableCell colSpan={10} className="bg-muted/20 p-0">
                              <div className="p-4">
                                {sb.UserSpecialBetSingle.length === 0 ? (
                                  <div className="py-8 text-center">
                                    <p className="text-muted-foreground">No bets yet for this special bet</p>
                                  </div>
                                ) : (
                                  <div className="rounded-lg border bg-background">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>User</TableHead>
                                          <TableHead>Prediction</TableHead>
                                          <TableHead>Points</TableHead>
                                          <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {sb.UserSpecialBetSingle.map((bet) => (
                                          <SpecialBetRow
                                            key={bet.id}
                                            bet={bet}
                                            specialBet={sb}
                                            league={league}
                                            isEvaluated={sb.isEvaluated}
                                            specialBetId={sb.id}
                                          />
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}

                                {/* Add Missing Bet button */}
                                <div className="mt-4 flex justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCreateBetSpecialBetId(sb.id)}
                                    aria-label="Add missing bet for this special bet"
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Missing Bet
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
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
        league={league}
      />

      {/* Result Entry Dialog */}
      {selectedSpecialBet && (
        <ResultEntryDialog
          specialBet={{
            ...selectedSpecialBet,
            _count: { UserSpecialBetSingle: selectedSpecialBet.UserSpecialBetSingle.length }
          }}
          leagues={leagues}
          open={!!selectedSpecialBet}
          onOpenChange={(open) => !open && setSelectedSpecialBet(null)}
        />
      )}

      {/* Create Bet Dialog */}
      {createBetSpecialBetId && (
        <CreateSpecialBetUserBetDialog
          open={createBetSpecialBetId !== null}
          onOpenChange={(open) => !open && setCreateBetSpecialBetId(null)}
          specialBet={filteredSpecialBets.find((sb) => sb.id === createBetSpecialBetId)!}
          league={leagues.find((l) => l.id === filteredSpecialBets.find((sb) => sb.id === createBetSpecialBetId)?.leagueId)}
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
          {specialBetToDelete && (() => {
            const deleteResultInfo = getResultTypeAndDisplay(specialBetToDelete)
            return (
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Bet ID:</span>
                  <span className="font-mono">#{specialBetToDelete.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Date:</span>
                  <span>{format(new Date(specialBetToDelete.dateTime), 'd.M.yyyy HH:mm')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <span className="font-medium">{specialBetToDelete.SpecialBetSingle.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <Badge variant="outline" className="text-xs">
                    {deleteResultInfo.type !== 'none' ? deleteResultInfo.type : 'not set'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Points:</span>
                  <span>{specialBetToDelete.points} pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">League:</span>
                  <span>{specialBetToDelete.League.name}</span>
                </div>
              </div>
            )
          })()}
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
