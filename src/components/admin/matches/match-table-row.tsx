import React, { Fragment } from 'react'
import { format } from 'date-fns'
import { Edit, Trash2, ChevronDown, Calculator, Calendar } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { getMatchStatus } from '@/lib/match-utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TableCell,
  TableRow,
} from '@/components/ui/table'
import { TeamFlag } from '@/components/common/team-flag'
import { ExpandedBetsTable } from './expanded-bets-table'
import { type MatchWithUserBets } from '@/actions/user-bets'

type LeagueMatch = MatchWithUserBets

interface MatchTableRowProps {
  match: LeagueMatch
  isExpanded: boolean
  onToggleExpand: () => void
  onEditMatch: () => void
  onEditResult: () => void
  onEvaluate: () => void
  onDelete: () => void
  onAddMissingBet: () => void
  showLeagueColumn: boolean
}

export function MatchTableRow({
  match,
  isExpanded,
  onToggleExpand,
  onEditMatch,
  onEditResult,
  onEvaluate,
  onDelete,
  onAddMissingBet,
  showLeagueColumn,
}: MatchTableRowProps) {
  const t = useTranslations('admin.matches')

  const status = getMatchStatus(match.Match)
  const homeTeam = match.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.Team
  const awayTeam = match.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.Team
  const teams = `${homeTeam.name} ${t('vs')} ${awayTeam.name}`
  const homePlayers = match.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.LeaguePlayer
  const awayPlayers = match.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.LeaguePlayer
  const allPlayers = [...homePlayers, ...awayPlayers]

  return (
    <Fragment key={match.id}>
      {/* Main row - clickable to expand */}
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={onToggleExpand}
      >
        <TableCell>
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              isExpanded && 'rotate-180'
            )}
          />
        </TableCell>
        <TableCell className="font-mono text-muted-foreground">
          #{match.Match.id}
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span className="font-medium">
              {format(new Date(match.Match.dateTime), 'd.M.yyyy')}
            </span>
            <span className="text-sm text-muted-foreground">
              {format(new Date(match.Match.dateTime), 'HH:mm')}
            </span>
          </div>
        </TableCell>
        {showLeagueColumn && (
          <TableCell>
            <div className="flex items-center gap-2">
              {match.League.name}
              {match.Match.isPlayoffGame && (
                <Badge variant="warning" className="text-xs">
                  Playoff
                </Badge>
              )}
            </div>
          </TableCell>
        )}
        <TableCell>
          <div className="flex items-center gap-2">
            <TeamFlag
              flagIcon={homeTeam.flagIcon}
              flagType={homeTeam.flagType}
              teamName={homeTeam.name}
              size="xs"
            />
            <span className="font-medium">{homeTeam.name}</span>
            <span className="text-muted-foreground">{t('vs')}</span>
            <TeamFlag
              flagIcon={awayTeam.flagIcon}
              flagType={awayTeam.flagType}
              teamName={awayTeam.name}
              size="xs"
            />
            <span className="font-medium">{awayTeam.name}</span>
            {!showLeagueColumn && match.Match.isPlayoffGame && (
              <Badge variant="warning" className="text-xs">
                Playoff
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center">
          {match.Match.homeRegularScore !== null ? (
            <span className="font-mono font-bold text-base whitespace-nowrap">
              {match.Match.homeRegularScore}:{match.Match.awayRegularScore}
              {match.Match.isShootout && ' (SO)'}
              {match.Match.isOvertime && !match.Match.isShootout && ' (OT)'}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell>
          <Badge
            variant={
              status === 'evaluated'
                ? 'evaluated'
                : status === 'finished'
                ? 'finished'
                : status === 'live'
                ? 'live'
                : 'scheduled'
            }
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant="outline">{match.UserBet.length}</Badge>
        </TableCell>
        <TableCell>
          <div
            className="flex items-center gap-2"
            role="toolbar"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onEditMatch()
              }}
              aria-label={t('editMatchDetails', { teams })}
            >
              <Calendar className="h-4 w-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onEditResult()
              }}
              aria-label={t('editMatchResult', { teams })}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onEvaluate()
              }}
              aria-label={t('evaluateMatch', { teams })}
            >
              <Calculator className="h-4 w-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              aria-label={t('deleteMatch', { teams })}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded row - user bets */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={9} className="bg-muted/20 p-0">
            <ExpandedBetsTable
              userBets={match.UserBet}
              matchHomeTeam={homeTeam}
              matchAwayTeam={awayTeam}
              availablePlayers={allPlayers}
              isMatchEvaluated={match.Match.isEvaluated}
              leagueMatchId={match.id}
              matchId={match.Match.id}
              onAddMissingBet={onAddMissingBet}
            />
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  )
}
