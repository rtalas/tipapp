'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { CheckCircle, Edit, Play } from 'lucide-react'
import { toast } from 'sonner'
import { evaluateMatch } from '@/actions/matches'
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
import { ResultEntrySheet } from '../matches/result-entry-sheet'

interface Team {
  id: number
  name: string
  shortcut: string
}

interface LeagueTeam {
  id: number
  Team: Team
}

interface League {
  id: number
  name: string
}

interface Match {
  id: number
  dateTime: Date
  isEvaluated: boolean
  isPlayoffGame: boolean
  homeRegularScore: number | null
  awayRegularScore: number | null
  homeFinalScore: number | null
  awayFinalScore: number | null
  isOvertime: boolean | null
  isShootout: boolean | null
  LeagueTeam_Match_homeTeamIdToLeagueTeam: LeagueTeam
  LeagueTeam_Match_awayTeamIdToLeagueTeam: LeagueTeam
}

interface LeagueMatch {
  id: number
  leagueId: number
  isDoubled: boolean | null
  League: { name: string }
  Match: Match
  _count?: { UserBet: number }
}

interface ResultsContentProps {
  pendingMatches: LeagueMatch[]
  evaluatedMatches: LeagueMatch[]
  leagues: League[]
}

export function ResultsContent({ pendingMatches, evaluatedMatches, leagues }: ResultsContentProps) {
  const [search, setSearch] = React.useState('')
  const [leagueFilter, setLeagueFilter] = React.useState<string>('all')
  const [selectedMatch, setSelectedMatch] = React.useState<LeagueMatch | null>(null)
  const [evaluateDialogOpen, setEvaluateDialogOpen] = React.useState(false)
  const [matchToEvaluate, setMatchToEvaluate] = React.useState<LeagueMatch | null>(null)
  const [isEvaluating, setIsEvaluating] = React.useState(false)

  // Filter pending matches
  const filteredPendingMatches = pendingMatches.filter((lm) => {
    // League filter
    if (leagueFilter !== 'all' && lm.leagueId !== parseInt(leagueFilter, 10)) {
      return false
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      const homeTeam = lm.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.Team.name.toLowerCase()
      const awayTeam = lm.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.Team.name.toLowerCase()
      if (!homeTeam.includes(searchLower) && !awayTeam.includes(searchLower)) {
        return false
      }
    }

    return true
  })

  const handleEvaluate = async () => {
    if (!matchToEvaluate) return
    setIsEvaluating(true)
    try {
      const result = await evaluateMatch(matchToEvaluate.Match.id)
      toast.success(`Match evaluated successfully. ${result.evaluatedBets} bets processed.`)
      setEvaluateDialogOpen(false)
      setMatchToEvaluate(null)
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to evaluate match')
      toast.error(message)
      console.error(error)
    } finally {
      setIsEvaluating(false)
    }
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-4">
          <Input
            placeholder="Search by team name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
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
        </div>
      </div>

      {/* Pending Evaluation */}
      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Evaluation</CardTitle>
              <CardDescription>
                {filteredPendingMatches.length} matches ready to be evaluated
              </CardDescription>
            </div>
            <Badge variant="warning" className="text-sm">
              {pendingMatches.length} Pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPendingMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No matches pending evaluation</p>
              <p className="text-sm text-muted-foreground mt-1">
                All finished matches have been evaluated
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>League</TableHead>
                    <TableHead>Matchup</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Bets</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPendingMatches.map((lm) => {
                    const homeTeam = lm.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.Team
                    const awayTeam = lm.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.Team

                    return (
                      <TableRow key={lm.id} className="table-row-hover">
                        <TableCell className="font-mono text-muted-foreground">
                          #{lm.Match.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {format(new Date(lm.Match.dateTime), 'MMM d, yyyy')}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(lm.Match.dateTime), 'HH:mm')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {lm.League.name}
                            {lm.isDoubled && (
                              <Badge variant="default" className="text-xs">
                                2x
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{homeTeam.name}</span>
                            <span className="text-muted-foreground">vs</span>
                            <span className="font-medium">{awayTeam.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-mono font-bold text-lg">
                              {lm.Match.homeRegularScore}
                            </span>
                            <span className="text-muted-foreground">:</span>
                            <span className="font-mono font-bold text-lg">
                              {lm.Match.awayRegularScore}
                            </span>
                            {(lm.Match.isOvertime || lm.Match.isShootout) && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {lm.Match.isShootout ? '(SO)' : '(OT)'}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{lm._count?.UserBet ?? 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedMatch(lm)}
                              aria-label={`Edit match result: ${homeTeam.name} vs ${awayTeam.name}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setMatchToEvaluate(lm)
                                setEvaluateDialogOpen(true)
                              }}
                              aria-label={`Evaluate match: ${homeTeam.name} vs ${awayTeam.name}`}
                            >
                              <Play className="h-4 w-4 text-primary" />
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

      {/* Recently Evaluated */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Recently Evaluated</CardTitle>
          <CardDescription>Last 10 evaluated matches</CardDescription>
        </CardHeader>
        <CardContent>
          {evaluatedMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No matches have been evaluated yet</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>League</TableHead>
                    <TableHead>Matchup</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Bets</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluatedMatches.map((lm) => {
                    const homeTeam = lm.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.Team
                    const awayTeam = lm.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.Team

                    return (
                      <TableRow key={lm.id} className="table-row-hover">
                        <TableCell className="font-mono text-muted-foreground">
                          #{lm.Match.id}
                        </TableCell>
                        <TableCell>
                          {format(new Date(lm.Match.dateTime), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>{lm.League.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{homeTeam.name}</span>
                            <span className="text-muted-foreground">vs</span>
                            <span className="font-medium">{awayTeam.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-mono font-bold">
                              {lm.Match.homeRegularScore}
                            </span>
                            <span className="text-muted-foreground">:</span>
                            <span className="font-mono font-bold">
                              {lm.Match.awayRegularScore}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{lm._count?.UserBet ?? 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="evaluated">Evaluated</Badge>
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

      {/* Result Entry Sheet */}
      {selectedMatch && (
        <ResultEntrySheet
          match={selectedMatch}
          open={!!selectedMatch}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
        />
      )}

      {/* Evaluate Confirmation Dialog */}
      <Dialog open={evaluateDialogOpen} onOpenChange={setEvaluateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Evaluate Match</DialogTitle>
            <DialogDescription>
              Are you sure you want to evaluate this match? This will calculate points for all
              {matchToEvaluate?._count?.UserBet ? ` ${matchToEvaluate._count.UserBet}` : ''} bets.
              {matchToEvaluate?.isDoubled && (
                <span className="block mt-2 text-primary font-medium">
                  Note: This is a double points match (2x multiplier).
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvaluateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEvaluate} disabled={isEvaluating}>
              {isEvaluating ? 'Evaluating...' : 'Evaluate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
