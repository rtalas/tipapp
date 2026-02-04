import React, { Fragment } from 'react'
import { Edit, Trash2, Calculator, ChevronDown, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TeamFlag } from '@/components/common/team-flag'
import {
  TableCell,
  TableRow,
  TableHead,
  TableHeader,
  TableBody,
  Table,
} from '@/components/ui/table'
import { SeriesBetRow } from './series-bet-row'
import { type SeriesWithUserBets } from '@/actions/series-bets'

type Series = SeriesWithUserBets

interface SeriesTableRowProps {
  series: Series
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onEvaluate: () => void
  onDelete: () => void
  onAddBet: () => void
  showLeagueColumn: boolean
}

function getSeriesStatus(series: Series): 'scheduled' | 'finished' | 'evaluated' {
  if (series.isEvaluated) return 'evaluated'
  if (series.homeTeamScore !== null && series.awayTeamScore !== null) return 'finished'
  return 'scheduled'
}

export function SeriesTableRow({
  series,
  isExpanded,
  onToggleExpand,
  onEdit,
  onEvaluate,
  onDelete,
  onAddBet,
  showLeagueColumn,
}: SeriesTableRowProps) {
  const t = useTranslations('admin.series')
  const tCommon = useTranslations('admin.common')

  const status = getSeriesStatus(series)
  const homeTeam = series.LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam.Team
  const awayTeam = series.LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam.Team

  return (
    <Fragment>
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
          #{series.id}
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span className="font-medium">
              {format(new Date(series.dateTime), 'd.M.yyyy')}
            </span>
            <span className="text-sm text-muted-foreground">
              {format(new Date(series.dateTime), 'HH:mm')}
            </span>
          </div>
        </TableCell>
        {showLeagueColumn && <TableCell>{series.League.name}</TableCell>}
        <TableCell>
          <span className="text-sm text-muted-foreground">
            {series.SpecialBetSerie.name} ({t('bestOf', { count: series.SpecialBetSerie.bestOf })})
          </span>
        </TableCell>
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
          </div>
        </TableCell>
        <TableCell className="text-center">
          {series.homeTeamScore !== null ? (
            <div className="flex items-center justify-center gap-1">
              <span className="font-mono font-bold text-lg">
                {series.homeTeamScore}
              </span>
              <span className="text-muted-foreground">:</span>
              <span className="font-mono font-bold text-lg">
                {series.awayTeamScore}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell className="text-center">
          <Badge variant="outline">{series.UserSpecialBetSerie.length}</Badge>
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
            {t(status)}
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
                onEdit()
              }}
              aria-label={t('editSeriesResult', { matchup: `${homeTeam.name} ${t('vs')} ${awayTeam.name}` })}
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
              aria-label={t('evaluateSeries', { matchup: `${homeTeam.name} ${t('vs')} ${awayTeam.name}` })}
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
              aria-label={t('deleteSeries', { matchup: `${homeTeam.name} ${t('vs')} ${awayTeam.name}` })}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded row - user bets */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={10} className="bg-muted/20 p-0">
            <div className="p-4">
              {series.UserSpecialBetSerie.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">{t('noUserBets')}</p>
                </div>
              ) : (
                <div className="rounded-lg border bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('user')}</TableHead>
                        <TableHead>{t('homeScore')}</TableHead>
                        <TableHead>{t('awayScore')}</TableHead>
                        <TableHead>{t('points')}</TableHead>
                        <TableHead className="text-right">{tCommon('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {series.UserSpecialBetSerie.map((bet) => (
                        <SeriesBetRow
                          key={bet.id}
                          bet={bet}
                          seriesHomeTeam={homeTeam}
                          seriesAwayTeam={awayTeam}
                          isSeriesEvaluated={series.isEvaluated}
                          seriesId={series.id}
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
                  onClick={onAddBet}
                  aria-label={t('addMissingBetAria')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('addMissingBet')}
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  )
}
