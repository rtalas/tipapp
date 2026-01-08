'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SeriesCard } from './series-card'

type SeriesWithBets = Awaited<ReturnType<typeof import('@/actions/series-bets').getSeriesWithUserBets>>[number]
type League = { id: number; name: string }
type User = { id: number; firstName: string | null; lastName: string | null; username: string }

interface SeriesPicksContentProps {
  series: SeriesWithBets[]
  leagues: League[]
  users: User[]
}

export function SeriesPicksContent({ series, leagues, users }: SeriesPicksContentProps) {
  const [search, setSearch] = useState('')
  const [leagueFilter, setLeagueFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'evaluated' | 'unevaluated'>('all')

  // Filter series based on all filters
  const filteredSeries = useMemo(() => {
    return series.filter((s) => {
      // League filter
      if (leagueFilter !== 'all' && s.leagueId !== parseInt(leagueFilter)) {
        return false
      }

      // Status filter
      if (statusFilter === 'evaluated' && !s.isEvaluated) return false
      if (statusFilter === 'unevaluated' && s.isEvaluated) return false

      // User filter (check if any bet belongs to user)
      if (userFilter !== 'all') {
        const hasUserBet = s.UserSpecialBetSerie.some(
          (bet) => bet.LeagueUser.User.id === parseInt(userFilter)
        )
        if (!hasUserBet) return false
      }

      // Search filter (team names)
      if (search) {
        const searchLower = search.toLowerCase()
        const homeTeam =
          s.LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam.Team.name.toLowerCase()
        const awayTeam =
          s.LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam.Team.name.toLowerCase()
        return `${homeTeam} ${awayTeam}`.includes(searchLower)
      }

      return true
    })
  }, [series, search, leagueFilter, userFilter, statusFilter])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Series Predictions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* Search by team name */}
          <Input
            placeholder="Search by team name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:max-w-xs"
            aria-label="Search by team name"
          />

          {/* League filter */}
          <Select value={leagueFilter} onValueChange={setLeagueFilter}>
            <SelectTrigger className="md:w-[200px]" aria-label="Filter by league">
              <SelectValue placeholder="All Leagues" />
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

          {/* User filter */}
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="md:w-[200px]" aria-label="Filter by user">
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

          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as 'all' | 'evaluated' | 'unevaluated')}
          >
            <SelectTrigger className="md:w-[200px]" aria-label="Filter by evaluation status">
              <SelectValue placeholder="All Series" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Series</SelectItem>
              <SelectItem value="evaluated">Evaluated</SelectItem>
              <SelectItem value="unevaluated">Not Evaluated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Series list */}
        {filteredSeries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">No series found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters or search criteria
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSeries.map((s) => (
              <SeriesCard key={s.id} series={s} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
