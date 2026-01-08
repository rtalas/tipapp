'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle, Plus } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SeriesBetRow } from './series-bet-row'
import { CreateSeriesBetDialog } from './create-series-bet-dialog'

type SeriesWithBets = Awaited<ReturnType<typeof import('@/actions/series-bets').getSeriesWithUserBets>>[number]

interface SeriesCardProps {
  series: SeriesWithBets
}

export function SeriesCard({ series }: SeriesCardProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const homeTeam = series.LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam.Team
  const awayTeam = series.LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam.Team

  const hasScore = series.homeTeamScore !== null && series.awayTeamScore !== null

  const scoreDisplay = hasScore
    ? `${series.homeTeamScore}:${series.awayTeamScore}`
    : 'TBD'

  return (
    <>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={`series-${series.id}`} className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex flex-1 items-center justify-between gap-4 text-left">
              {/* Series info */}
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
                <span className="text-sm text-muted-foreground">#{series.id}</span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(series.dateTime), 'MMM d, yyyy HH:mm')}
                </span>
                <Badge variant="secondary">{series.League.name}</Badge>
                <span className="font-medium">
                  {homeTeam.shortcut} vs {awayTeam.shortcut}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({series.SpecialBetSerie.name})
                </span>
              </div>

              {/* Score and status */}
              <div className="flex items-center gap-2">
                {hasScore && <span className="font-medium">{scoreDisplay}</span>}
                {series.isEvaluated && (
                  <CheckCircle className="h-4 w-4 text-green-600" aria-label="Evaluated" />
                )}
                <Badge variant="outline">{series.UserSpecialBetSerie.length} bets</Badge>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-4 pb-4">
            {/* User bets table */}
            {series.UserSpecialBetSerie.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">No bets yet for this series</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Series Score</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                    />
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Add Missing Bet button */}
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                aria-label="Add missing bet for this series"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Missing Bet
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Create bet dialog */}
      <CreateSeriesBetDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        series={series}
      />
    </>
  )
}
