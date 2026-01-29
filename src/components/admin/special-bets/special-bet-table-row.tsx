import React, { Fragment } from 'react'
import { format } from 'date-fns'
import { Edit, Trash2, ChevronDown, Calculator, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Table,
  TableBody,
} from '@/components/ui/table'
import { SpecialBetRow } from './special-bet-row'
import { type SpecialBetWithUserBets } from '@/actions/special-bet-bets'
import { type LeagueWithTeams } from '@/actions/shared-queries'

type SpecialBet = SpecialBetWithUserBets
type League = LeagueWithTeams

interface SpecialBetTableRowProps {
  specialBet: SpecialBet
  league?: League
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onEvaluate: () => void
  onDelete: () => void
  onAddMissingBet: () => void
  showLeagueColumn: boolean
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

export function SpecialBetTableRow({
  specialBet,
  league,
  isExpanded,
  onToggleExpand,
  onEdit,
  onEvaluate,
  onDelete,
  onAddMissingBet,
  showLeagueColumn,
}: SpecialBetTableRowProps) {
  const t = useTranslations('admin.specialBets')
  const tCommon = useTranslations('admin.common')
  const tSeries = useTranslations('admin.series')

  const status = getSpecialBetStatus(specialBet)
  const resultInfo = getResultTypeAndDisplay(specialBet)

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
          #{specialBet.id}
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span className="font-medium">
              {format(new Date(specialBet.dateTime), 'd.M.yyyy')}
            </span>
            <span className="text-sm text-muted-foreground">
              {format(new Date(specialBet.dateTime), 'HH:mm')}
            </span>
          </div>
        </TableCell>
        {showLeagueColumn && <TableCell>{specialBet.League.name}</TableCell>}
        <TableCell>
          <div className="flex flex-col gap-1">
            <span className="font-medium">{specialBet.SpecialBetSingle.name}</span>
            <Badge variant="outline" className="w-fit text-xs">
              {specialBet.SpecialBetSingle.SpecialBetSingleType.name !== 'none' ? specialBet.SpecialBetSingle.SpecialBetSingleType.name : t('notSet')}
            </Badge>
          </div>
        </TableCell>
        <TableCell>
          {resultInfo.type !== 'none' && (
            <div className="flex items-center gap-2">
              <span className="text-sm">{resultInfo.display}</span>
            </div>
          )}
          {resultInfo.type === 'none' && (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell>{specialBet.points} {t('pts')}</TableCell>
        <TableCell className="text-center">
          <Badge variant="outline">{specialBet.UserSpecialBetSingle.length}</Badge>
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
            {tSeries(status)}
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
              aria-label={t('editSpecialBet', { name: specialBet.SpecialBetSingle.name })}
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
              aria-label={t('evaluateSpecialBet', { name: specialBet.SpecialBetSingle.name })}
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
              aria-label={t('deleteSpecialBet', { name: specialBet.SpecialBetSingle.name })}
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
              {specialBet.UserSpecialBetSingle.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">{t('noUserBets')}</p>
                </div>
              ) : (
                <div className="rounded-lg border bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tSeries('user')}</TableHead>
                        <TableHead>{t('prediction')}</TableHead>
                        <TableHead>{tSeries('points')}</TableHead>
                        <TableHead className="text-right">{tCommon('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {specialBet.UserSpecialBetSingle.map((bet) => (
                        <SpecialBetRow
                          key={bet.id}
                          bet={bet}
                          specialBet={specialBet}
                          league={league}
                          isEvaluated={specialBet.isEvaluated}
                          specialBetId={specialBet.id}
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
                  onClick={onAddMissingBet}
                  aria-label={tSeries('addMissingBetAria')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {tSeries('addMissingBet')}
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  )
}
