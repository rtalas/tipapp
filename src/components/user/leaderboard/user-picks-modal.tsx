'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UserAvatar } from '@/components/common/user-avatar'
import { cn } from '@/lib/utils'
import type { LeaderboardEntry } from '@/types/user'
import type { UserPicksData } from '@/actions/user/leaderboard'
import { getUserPicks } from '@/actions/user/leaderboard'

interface UserPicksModalProps {
  selectedUser: LeaderboardEntry | null
  leagueId: number
  onClose: () => void
}

export function UserPicksModal({ selectedUser, leagueId, onClose }: UserPicksModalProps) {
  const t = useTranslations('user.leaderboard')
  const [state, setState] = useState<{
    userPicks: UserPicksData | null
    isLoading: boolean
    hasError: boolean
  }>({ userPicks: null, isLoading: false, hasError: false })

  const selectedUserId = selectedUser?.leagueUserId ?? null

  useEffect(() => {
    if (!selectedUserId) return

    let cancelled = false

    void (async () => {
      setState({ userPicks: null, isLoading: true, hasError: false })
      try {
        const data = await getUserPicks(leagueId, selectedUserId)
        if (!cancelled) setState({ userPicks: data, isLoading: false, hasError: false })
      } catch {
        if (!cancelled) {
          setState(prev => ({ ...prev, isLoading: false, hasError: true }))
          toast.error(t('picksLoadError'))
        }
      }
    })()

    return () => { cancelled = true }
  }, [selectedUserId, leagueId, t])

  const { userPicks, isLoading, hasError } = state

  const displayName = selectedUser
    ? getDisplayName(selectedUser.firstName, selectedUser.lastName, selectedUser.username)
    : ''

  return (
    <Dialog open={!!selectedUser} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {selectedUser && (
              <>
                <UserAvatar
                  avatarUrl={selectedUser.avatarUrl}
                  firstName={selectedUser.firstName}
                  lastName={selectedUser.lastName}
                  username={selectedUser.username}
                  size="lg"
                  className="ring-2 ring-primary"
                />
                <div>
                  <DialogTitle>{displayName}</DialogTitle>
                  <DialogDescription>
                    {selectedUser.totalPoints} {t('points')} · {t('rankNumber', { rank: selectedUser.rank })}
                  </DialogDescription>
                </div>
              </>
            )}
          </div>
        </DialogHeader>
        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : userPicks ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Matches */}
              {userPicks.matches.length > 0 && (
                <PickSection title={`${t('matchPredictions')} (${userPicks.matches.length})`}>
                  {userPicks.matches.map((match) => (
                    <PickCard key={match.id} points={match.totalPoints}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1">
                          <span className="text-xs font-medium text-foreground">
                            {match.homeTeamFlag} {match.homeTeamName} vs {match.awayTeamName} {match.awayTeamFlag}
                          </span>
                          {match.isEvaluated && match.actualHomeScore !== null && match.actualAwayScore !== null && (
                            <span className="text-xs font-semibold text-foreground ml-2">
                              ({match.actualHomeScore}:{match.actualAwayScore}
                              {match.actualOvertime && ' OT'})
                            </span>
                          )}
                        </div>
                        <PointsBadge points={match.totalPoints} />
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Tip:</span>
                        <span className="font-mono font-medium">
                          {match.homeScore}:{match.awayScore}
                          {match.overtime && ' (OT)'}
                        </span>
                        {match.scorerName && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="flex items-center gap-1">
                              {match.scorerName}
                              {match.scorerCorrect && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 inline-block" />
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </PickCard>
                  ))}
                </PickSection>
              )}

              {/* Series */}
              {userPicks.series.length > 0 && (
                <PickSection title={`${t('seriesPredictions')} (${userPicks.series.length})`}>
                  {userPicks.series.map((series) => (
                    <PickCard key={series.id} points={series.totalPoints}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1">
                          <span className="text-xs font-medium text-foreground">
                            {series.seriesName}
                          </span>
                          {series.isEvaluated && series.actualHomeScore !== null && series.actualAwayScore !== null && (
                            <span className="text-xs font-semibold text-foreground ml-2">
                              ({series.actualHomeScore}:{series.actualAwayScore})
                            </span>
                          )}
                        </div>
                        <PointsBadge points={series.totalPoints} />
                      </div>
                      {series.homeScore !== null && series.awayScore !== null && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Tip:</span>
                          <span className="font-mono font-medium">
                            {series.homeScore}:{series.awayScore}
                          </span>
                        </div>
                      )}
                    </PickCard>
                  ))}
                </PickSection>
              )}

              {/* Special Bets */}
              {userPicks.specialBets.length > 0 && (
                <PickSection title={`${t('specialBets')} (${userPicks.specialBets.length})`}>
                  {userPicks.specialBets.map((bet) => (
                    <PickCard key={bet.id} points={bet.totalPoints}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-foreground flex-1">
                          {bet.betName}
                        </span>
                        <PointsBadge points={bet.totalPoints} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {bet.prediction}
                      </div>
                    </PickCard>
                  ))}
                </PickSection>
              )}

              {/* Questions */}
              {userPicks.questions.length > 0 && (
                <PickSection title={`${t('questions')} (${userPicks.questions.length})`}>
                  {userPicks.questions.map((question) => (
                    <PickCard
                      key={question.id}
                      points={question.totalPoints}
                      allowNegative
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-foreground flex-1">
                          {question.question}
                        </span>
                        <PointsBadge points={question.totalPoints} allowNegative />
                      </div>
                      {question.answer !== null && (
                        <div className="text-xs text-muted-foreground">
                          {question.answer ? t('yes') : t('no')}
                        </div>
                      )}
                    </PickCard>
                  ))}
                </PickSection>
              )}

              {/* Empty state */}
              {userPicks.matches.length === 0 &&
                userPicks.series.length === 0 &&
                userPicks.specialBets.length === 0 &&
                userPicks.questions.length === 0 && (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    {t('noPicksYet')}
                  </p>
                )}
            </div>
          ) : hasError ? (
            <p className="text-center text-destructive py-8 text-sm">
              {t('picksLoadError')}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PickSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function PickCard({
  points,
  allowNegative,
  children,
}: {
  points: number
  allowNegative?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg bg-secondary/30 border',
        points > 0
          ? 'border-green-500/30'
          : allowNegative && points < 0
            ? 'border-red-500/30'
            : 'border-transparent'
      )}
    >
      {children}
    </div>
  )
}

function PointsBadge({ points, allowNegative }: { points: number; allowNegative?: boolean }) {
  return (
    <span
      className={cn(
        'text-xs font-bold shrink-0',
        points > 0
          ? 'text-green-500'
          : allowNegative && points < 0
            ? 'text-red-500'
            : 'text-muted-foreground'
      )}
    >
      {points > 0 ? '+' : ''}
      {points}
    </span>
  )
}

function getDisplayName(
  firstName: string | null,
  lastName: string | null,
  username: string
): string {
  if (firstName && lastName) return `${firstName} ${lastName}`
  if (firstName) return firstName
  if (lastName) return lastName
  return username
}
