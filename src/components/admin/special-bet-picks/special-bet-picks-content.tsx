'use client'

import { useState, useMemo } from 'react'
import { Prisma } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SpecialBetCard } from './special-bet-card'

type SpecialBetWithBets = Awaited<ReturnType<typeof import('@/actions/special-bet-bets').getSpecialBetsWithUserBets>>[number]
type LeagueWithTeams = Prisma.LeagueGetPayload<{
  include: {
    LeagueTeam: {
      include: {
        Team: true
        LeaguePlayer: {
          include: { Player: true }
        }
      }
    }
  }
}>
type User = { id: number; firstName: string | null; lastName: string | null; username: string }

interface SpecialBetPicksContentProps {
  specialBets: SpecialBetWithBets[]
  leagues: LeagueWithTeams[]
  users: User[]
}

export function SpecialBetPicksContent({ specialBets, leagues, users }: SpecialBetPicksContentProps) {
  const [search, setSearch] = useState('')
  const [leagueFilter, setLeagueFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'evaluated' | 'unevaluated'>('all')

  // Filter special bets based on all filters
  const filteredSpecialBets = useMemo(() => {
    return specialBets.filter((sb) => {
      // League filter
      if (leagueFilter !== 'all' && sb.leagueId !== parseInt(leagueFilter)) {
        return false
      }

      // Status filter
      if (statusFilter === 'evaluated' && !sb.isEvaluated) return false
      if (statusFilter === 'unevaluated' && sb.isEvaluated) return false

      // User filter (check if any bet belongs to user)
      if (userFilter !== 'all') {
        const hasUserBet = sb.UserSpecialBetSingle.some(
          (bet) => bet.LeagueUser.User.id === parseInt(userFilter)
        )
        if (!hasUserBet) return false
      }

      // Search filter (special bet type name)
      if (search) {
        const searchLower = search.toLowerCase()
        const specialBetName = sb.SpecialBetSingle.name.toLowerCase()
        return specialBetName.includes(searchLower)
      }

      return true
    })
  }, [specialBets, search, leagueFilter, userFilter, statusFilter])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Special Bet Predictions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* Search by special bet type */}
          <Input
            placeholder="Search by special bet type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:max-w-xs"
            aria-label="Search by special bet type"
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
              <SelectValue placeholder="All Special Bets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Special Bets</SelectItem>
              <SelectItem value="evaluated">Evaluated</SelectItem>
              <SelectItem value="unevaluated">Not Evaluated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Special Bets list */}
        {filteredSpecialBets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">No special bets found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters or search criteria
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSpecialBets.map((sb) => {
              const league = leagues.find((l) => l.id === sb.leagueId)
              return <SpecialBetCard key={sb.id} specialBet={sb} league={league} />
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
