'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle, Plus } from 'lucide-react'
import { Prisma } from '@prisma/client'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SpecialBetRow } from './special-bet-row'
import { CreateSpecialBetDialog } from './create-special-bet-dialog'

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

interface SpecialBetCardProps {
  specialBet: SpecialBetWithBets
  league?: LeagueWithTeams
}

function getResultDisplay(specialBet: SpecialBetWithBets): string {
  if (specialBet.specialBetTeamResultId && specialBet.LeagueTeam) {
    return specialBet.LeagueTeam.Team.name
  }
  if (specialBet.specialBetPlayerResultId && specialBet.LeaguePlayer) {
    const player = specialBet.LeaguePlayer.Player
    return `${player.firstName} ${player.lastName}`
  }
  if (specialBet.specialBetValue !== null) {
    return specialBet.specialBetValue.toString()
  }
  return 'TBD'
}

export function SpecialBetCard({ specialBet, league }: SpecialBetCardProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const hasResult = specialBet.specialBetTeamResultId !== null ||
                    specialBet.specialBetPlayerResultId !== null ||
                    specialBet.specialBetValue !== null

  const resultDisplay = getResultDisplay(specialBet)

  return (
    <>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={`special-bet-${specialBet.id}`} className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex flex-1 items-center justify-between gap-4 text-left">
              {/* Special Bet info */}
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
                <span className="text-sm text-muted-foreground">#{specialBet.id}</span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(specialBet.dateTime), 'MMM d, yyyy HH:mm')}
                </span>
                <Badge variant="secondary">{specialBet.League.name}</Badge>
                <span className="font-medium">
                  {specialBet.SpecialBetSingle.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {specialBet.points} pts
                </span>
              </div>

              {/* Result and status */}
              <div className="flex items-center gap-2">
                {hasResult && <span className="font-medium">{resultDisplay}</span>}
                {specialBet.isEvaluated && (
                  <CheckCircle className="h-4 w-4 text-green-600" aria-label="Evaluated" />
                )}
                <Badge variant="outline">{specialBet.UserSpecialBetSingle.length} bets</Badge>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-4 pb-4">
            {/* User bets table */}
            {specialBet.UserSpecialBetSingle.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">No bets yet for this special bet</p>
              </div>
            ) : (
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
                  {specialBet.UserSpecialBetSingle.map((bet) => (
                    <SpecialBetRow
                      key={bet.id}
                      bet={bet}
                      specialBet={specialBet}
                      league={league}
                      isEvaluated={specialBet.isEvaluated}
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
                aria-label="Add missing bet for this special bet"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Missing Bet
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Create bet dialog */}
      <CreateSpecialBetDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        specialBet={specialBet}
        league={league}
      />
    </>
  )
}
