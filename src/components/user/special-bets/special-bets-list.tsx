'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Trophy, Target, HelpCircle, Check, Lock, Clock, Users, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CountdownBadge } from '@/components/user/common/countdown-badge'
import { RefreshButton } from '@/components/user/common/refresh-button'
import { PullToRefresh } from '@/components/user/common/pull-to-refresh'
import { useRefresh } from '@/hooks/useRefresh'
import { cn } from '@/lib/utils'
import { groupByDate, getDateLabel } from '@/lib/date-grouping-utils'
import { getUserDisplayName, getUserInitials } from '@/lib/user-display-utils'
import { saveSpecialBet, getSpecialBetFriendPredictions } from '@/actions/user/special-bets'
import { saveQuestionBet, getQuestionFriendPredictions } from '@/actions/user/questions'
import type { UserSpecialBet, SpecialBetFriendPrediction } from '@/actions/user/special-bets'
import type { UserQuestion, QuestionFriendPrediction } from '@/actions/user/questions'

interface SpecialBetsListProps {
  specialBets: UserSpecialBet[]
  teams: Array<{ id: number; Team: { id: number; name: string; shortcut: string } }>
  players: Array<{
    id: number
    Player: { id: number; firstName: string | null; lastName: string | null }
    LeagueTeam: { Team: { shortcut: string } }
  }>
  questions: UserQuestion[]
}

type FilterType = 'current' | 'past'

// Unified item type for both special bets and questions
type UnifiedItem =
  | { type: 'specialBet'; data: UserSpecialBet; dateTime: Date; isEvaluated: boolean }
  | { type: 'question'; data: UserQuestion; dateTime: Date; isEvaluated: boolean }

export function SpecialBetsList({
  specialBets,
  teams,
  players,
  questions,
}: SpecialBetsListProps) {
  const { isRefreshing, refresh, refreshAsync } = useRefresh()
  const [filter, setFilter] = React.useState<FilterType>('current')

  // Combine special bets and questions into unified items
  const allItems: UnifiedItem[] = React.useMemo(() => {
    const betItems: UnifiedItem[] = specialBets.map((bet) => ({
      type: 'specialBet' as const,
      data: bet,
      dateTime: new Date(bet.dateTime),
      isEvaluated: bet.isEvaluated,
    }))

    const questionItems: UnifiedItem[] = questions.map((q) => ({
      type: 'question' as const,
      data: q,
      dateTime: new Date(q.dateTime),
      isEvaluated: q.isEvaluated,
    }))

    return [...betItems, ...questionItems]
  }, [specialBets, questions])

  // Filter items - current = not evaluated, past = evaluated
  const currentItems = allItems.filter((item) => !item.isEvaluated)
  const pastItems = allItems.filter((item) => item.isEvaluated)
  const displayedItems = filter === 'current' ? currentItems : pastItems

  // Group by date
  const groupedItems = React.useMemo(() => {
    const sorted = [...displayedItems].sort((a, b) => {
      if (filter === 'past') {
        return b.dateTime.getTime() - a.dateTime.getTime()
      }
      return a.dateTime.getTime() - b.dateTime.getTime()
    })
    return groupByDate(sorted)
  }, [displayedItems, filter])

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Trophy className="mb-4 h-12 w-12 text-muted-foreground opacity-30" />
        <h3 className="text-lg font-medium">No special bets</h3>
        <p className="text-sm text-muted-foreground">
          Special bets will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Fixed Header */}
      <div className="fixed top-14 left-0 right-0 z-30 glass-card border-b-0 rounded-b-2xl">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* Title */}
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">
              Long-Term Predictions
            </h2>
          </div>

          {/* Filter tabs and refresh */}
          <div className="flex items-center justify-between gap-2">
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as FilterType)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 bg-secondary/50">
                <TabsTrigger value="current" className="data-[state=active]:bg-card">
                  Current
                </TabsTrigger>
                <TabsTrigger value="past" className="data-[state=active]:bg-card">
                  Past
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <RefreshButton isRefreshing={isRefreshing} onRefresh={refresh} />
          </div>
        </div>
      </div>

      {/* Content with padding for fixed header */}
      <PullToRefresh onRefresh={refreshAsync}>
        <div className="pt-32 space-y-4">

        {/* Items grouped by date */}
        {displayedItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">
              No {filter === 'current' ? 'upcoming' : 'past'} bets
            </p>
            <p className="text-sm">
              {filter === 'current'
                ? 'Special bets will appear here'
                : 'No completed bets yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(groupedItems.entries()).map(([dateKey, dateItems]) => (
              <div key={dateKey} className="space-y-3">
                {/* Date Divider */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2">
                    {getDateLabel(new Date(dateKey))}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Items for this date */}
                {dateItems.map((item) =>
                  item.type === 'specialBet' ? (
                    <SpecialBetCard
                      key={`bet-${item.data.id}`}
                      specialBet={item.data}
                      teams={teams}
                      players={players}
                      onSaved={refresh}
                    />
                  ) : (
                    <QuestionCard
                      key={`q-${item.data.id}`}
                      question={item.data}
                      onSaved={refresh}
                    />
                  )
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      </PullToRefresh>
    </div>
  )
}

function SpecialBetCard({
  specialBet,
  teams,
  players,
  onSaved,
}: {
  specialBet: UserSpecialBet
  teams: SpecialBetsListProps['teams']
  players: SpecialBetsListProps['players']
  onSaved: () => void
}) {
  const isLocked = !specialBet.isBettingOpen
  const isEvaluated = specialBet.isEvaluated
  const betType = specialBet.SpecialBetSingle.SpecialBetSingleType?.name || 'value'

  const [teamId, setTeamId] = React.useState<number | null>(
    specialBet.userBet?.teamResultId ?? null
  )
  const [playerId, setPlayerId] = React.useState<number | null>(
    specialBet.userBet?.playerResultId ?? null
  )
  const [value, setValue] = React.useState<number | null>(
    specialBet.userBet?.value ?? null
  )
  const [isSaving, setIsSaving] = React.useState(false)
  const [isSaved, setIsSaved] = React.useState(!!specialBet.userBet)
  const [showFriendsBets, setShowFriendsBets] = React.useState(false)
  const [friendPredictions, setFriendPredictions] = React.useState<SpecialBetFriendPrediction[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = React.useState(false)

  const isTeamBet = betType.toLowerCase().includes('team') || betType.toLowerCase().includes('champion')
  const isPlayerBet = betType.toLowerCase().includes('player') || betType.toLowerCase().includes('scorer')

  const handleSave = async () => {
    if (isLocked) return

    setIsSaving(true)
    try {
      const result = await saveSpecialBet({
        leagueSpecialBetSingleId: specialBet.id,
        teamResultId: teamId,
        playerResultId: playerId,
        value: value,
      })

      if (!result.success) {
        toast.error(result.error || 'Failed to save')
        setIsSaved(false)
      } else {
        setIsSaved(true)
        onSaved()
      }
    } catch {
      toast.error('Failed to save')
      setIsSaved(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTeamChange = (val: string) => {
    setIsSaved(false)
    if (val === 'none') {
      setTeamId(null)
    } else {
      setTeamId(parseInt(val, 10))
      setPlayerId(null)
      setValue(null)
    }
  }

  const handlePlayerChange = (val: string) => {
    setIsSaved(false)
    if (val === 'none') {
      setPlayerId(null)
    } else {
      setPlayerId(parseInt(val, 10))
      setTeamId(null)
      setValue(null)
    }
  }

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSaved(false)
    const v = e.target.value === '' ? null : parseInt(e.target.value, 10)
    setValue(v)
    setTeamId(null)
    setPlayerId(null)
  }

  const handleOpenFriendsBets = async () => {
    setShowFriendsBets(true)
    if (isLocked && friendPredictions.length === 0) {
      setIsLoadingFriends(true)
      try {
        const result = await getSpecialBetFriendPredictions(specialBet.id)
        setFriendPredictions(result.predictions)
      } catch (error) {
        console.error('Failed to load friend predictions:', error)
      } finally {
        setIsLoadingFriends(false)
      }
    }
  }

  // Get display values
  const selectedTeamName = teams.find((t) => t.id === teamId)?.Team.name
  const selectedPlayer = players.find((p) => p.id === playerId)
  const selectedPlayerName = selectedPlayer
    ? `${selectedPlayer.Player.firstName} ${selectedPlayer.Player.lastName}`
    : null

  const userSelection = selectedTeamName || selectedPlayerName || (value !== null ? value.toString() : null)

  // Check if correct
  const actualResult =
    specialBet.LeagueTeam?.Team.name ||
    (specialBet.LeaguePlayer &&
      `${specialBet.LeaguePlayer.Player.firstName} ${specialBet.LeaguePlayer.Player.lastName}`) ||
    specialBet.specialBetValue?.toString()
  const isCorrect = isEvaluated && userSelection === actualResult

  return (
    <>
      <div
        className={cn(
          'glass-card rounded-xl p-3 sm:p-4 animate-fade-in',
          isLocked && !isEvaluated && 'opacity-80'
        )}
      >
        <div className="flex items-start gap-2 sm:gap-3 mb-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 gradient-hockey">
            {isPlayerBet ? (
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            ) : (
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm text-foreground leading-tight flex-1 min-w-0">
                {specialBet.SpecialBetSingle.name}
              </h3>
              <div className="flex items-center gap-1 shrink-0">
                {isLocked && !isEvaluated && (
                  <span className="badge-locked flex items-center gap-0.5 text-[9px] sm:text-[10px]">
                    <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span className="hidden xs:inline">Locked</span>
                  </span>
                )}
                {!isLocked && <CountdownBadge deadline={specialBet.dateTime} />}
                {!isLocked && (
                  <span className="badge-upcoming flex items-center gap-0.5 text-[9px] sm:text-[10px]">
                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    {format(specialBet.dateTime, 'HH:mm')}
                  </span>
                )}
                {isEvaluated && specialBet.userBet && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold',
                      specialBet.userBet.totalPoints > 0
                        ? 'bg-primary/20 text-primary'
                        : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    +{specialBet.userBet.totalPoints}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {isLocked ? (
          <div className="space-y-2">
            {/* Your Selection */}
            <div className="p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Your pick:</span>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isCorrect ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {userSelection || 'No selection'}
                  </span>
                  {isCorrect && (
                    <CheckCircle className="w-4 h-4 text-primary fill-primary/20" />
                  )}
                </div>
              </div>
            </div>
            {/* Actual Result */}
            {actualResult && (
              <div className="p-3 rounded-lg bg-primary/10">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Winner:</span>
                  <span className="text-sm font-semibold text-primary">
                    {actualResult}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Team selection */}
            {isTeamBet && (
              <Select
                value={teamId?.toString() || 'none'}
                onValueChange={handleTeamChange}
                disabled={isLocked}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select team..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No selection</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.Team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Player selection */}
            {isPlayerBet && (
              <Select
                value={playerId?.toString() || 'none'}
                onValueChange={handlePlayerChange}
                disabled={isLocked}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select player..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No selection</SelectItem>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.Player.firstName} {p.Player.lastName} ({p.LeagueTeam.Team.shortcut})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Value input */}
            {!isTeamBet && !isPlayerBet && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Enter Value
                </Label>
                <Input
                  type="number"
                  value={value ?? ''}
                  onChange={handleValueChange}
                  disabled={isLocked}
                  placeholder="Enter your prediction"
                />
              </div>
            )}

            <Button
              className={cn(
                'w-full',
                isSaved
                  ? 'bg-primary/20 text-primary hover:bg-primary/30'
                  : 'gradient-hockey'
              )}
              size="sm"
              disabled={isSaving || (!teamId && !playerId && value === null)}
              onClick={handleSave}
            >
              {isSaving ? (
                <span className="animate-pulse">Saving...</span>
              ) : isSaved ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Saved
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        )}

        {/* Friends' Picks Button - Only when betting is closed */}
        {isLocked && (
          <div className="mt-3 pt-3 border-t border-border/30 flex justify-center">
            <button
              onClick={handleOpenFriendsBets}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Friends' picks</span>
            </button>
          </div>
        )}
      </div>

      {/* Friends Predictions Modal */}
      <Dialog open={showFriendsBets} onOpenChange={setShowFriendsBets}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{specialBet.SpecialBetSingle.name}</DialogTitle>
            {actualResult && (
              <p className="text-sm text-muted-foreground">
                Winner: {actualResult}
              </p>
            )}
          </DialogHeader>
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Friends' Predictions</span>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {!isLocked ? (
                <p className="text-center text-muted-foreground text-sm py-4">
                  Friends' picks will be visible after betting closes
                </p>
              ) : isLoadingFriends ? (
                <p className="text-center text-muted-foreground text-sm py-4 animate-pulse">
                  Loading...
                </p>
              ) : friendPredictions.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No friends' predictions yet
                </p>
              ) : (
                friendPredictions.map((prediction) => {
                  const user = prediction.LeagueUser.User
                  const displayName = getUserDisplayName(user)
                  const initials = getUserInitials(user)

                  // Get display value for the prediction
                  const predictionDisplay =
                    prediction.LeagueTeam?.Team.name ||
                    (prediction.LeaguePlayer &&
                      `${prediction.LeaguePlayer.Player.firstName} ${prediction.LeaguePlayer.Player.lastName}`) ||
                    prediction.value?.toString() ||
                    'No selection'

                  return (
                    <div
                      key={prediction.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/20 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{displayName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">
                          {predictionDisplay}
                        </span>
                        {prediction.totalPoints > 0 && (
                          <span className="text-xs font-semibold text-primary bg-primary/20 px-1.5 py-0.5 rounded">
                            +{prediction.totalPoints}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function QuestionCard({
  question,
  onSaved,
}: {
  question: UserQuestion
  onSaved: () => void
}) {
  const isLocked = !question.isBettingOpen
  const isEvaluated = question.isEvaluated
  const currentAnswer = question.userBet?.userBet

  const [selectedAnswer, setSelectedAnswer] = React.useState<boolean | null>(
    currentAnswer ?? null
  )
  const [isSaving, setIsSaving] = React.useState(false)
  const [isSaved, setIsSaved] = React.useState(currentAnswer !== undefined && currentAnswer !== null)
  const [showFriendsBets, setShowFriendsBets] = React.useState(false)
  const [friendPredictions, setFriendPredictions] = React.useState<QuestionFriendPrediction[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = React.useState(false)

  const handleOpenFriendsBets = async () => {
    setShowFriendsBets(true)
    if (isLocked && friendPredictions.length === 0) {
      setIsLoadingFriends(true)
      try {
        const result = await getQuestionFriendPredictions(question.id)
        setFriendPredictions(result.predictions)
      } catch (error) {
        console.error('Failed to load friend predictions:', error)
      } finally {
        setIsLoadingFriends(false)
      }
    }
  }

  const handleAnswer = async (answer: boolean | null) => {
    if (isLocked) return

    setSelectedAnswer(answer)
    setIsSaved(false)
  }

  const handleSave = async () => {
    if (isLocked || selectedAnswer === null) return

    setIsSaving(true)

    try {
      const result = await saveQuestionBet({
        leagueSpecialBetQuestionId: question.id,
        userBet: selectedAnswer,
      })

      if (!result.success) {
        toast.error(result.error || 'Failed to save')
      } else {
        setIsSaved(true)
        onSaved()
      }
    } catch {
      toast.error('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const isCorrect = isEvaluated && question.result !== null && selectedAnswer === question.result

  return (
    <>
      <div
        className={cn(
          'glass-card rounded-xl p-3 sm:p-4 animate-fade-in',
          isLocked && !isEvaluated && 'opacity-80'
        )}
      >
        <div className="flex items-start gap-2 sm:gap-3 mb-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 gradient-hockey">
            <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm text-foreground leading-tight flex-1 min-w-0">
                {question.text}
              </h3>
              <div className="flex items-center gap-1 shrink-0">
                {isLocked && !isEvaluated && (
                  <span className="badge-locked flex items-center gap-0.5 text-[9px] sm:text-[10px]">
                    <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span className="hidden xs:inline">Locked</span>
                  </span>
                )}
                {!isLocked && <CountdownBadge deadline={question.dateTime} />}
                {!isLocked && (
                  <span className="badge-upcoming flex items-center gap-0.5 text-[9px] sm:text-[10px]">
                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    {format(question.dateTime, 'HH:mm')}
                  </span>
                )}
                {isEvaluated && question.userBet && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold',
                      question.userBet.totalPoints > 0
                        ? 'bg-primary/20 text-primary'
                        : question.userBet.totalPoints < 0
                          ? 'bg-destructive/20 text-destructive'
                          : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    {question.userBet.totalPoints > 0 ? '+' : ''}
                    {question.userBet.totalPoints}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {isLocked ? (
          <div className="space-y-2">
            {/* Your answer and result */}
            <div className="p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Your answer:</span>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isCorrect ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {selectedAnswer === true
                      ? 'Yes'
                      : selectedAnswer === false
                        ? 'No'
                        : 'No answer'}
                  </span>
                  {isEvaluated &&
                    selectedAnswer !== null &&
                    (isCorrect ? (
                      <CheckCircle className="w-4 h-4 text-primary fill-primary/20" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive fill-destructive/20" />
                    ))}
                </div>
              </div>
            </div>

            {/* Actual answer */}
            {isEvaluated && question.result !== null && (
              <div className="p-3 rounded-lg bg-primary/10">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Correct answer:</span>
                  <span className="text-sm font-semibold text-primary">
                    {question.result ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Yes/No/No Answer buttons */}
            <div className="flex gap-2">
              <Button
                variant={selectedAnswer === true ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'flex-1',
                  selectedAnswer === true && 'gradient-hockey text-white border-0'
                )}
                onClick={() => handleAnswer(true)}
              >
                Yes
              </Button>
              <Button
                variant={selectedAnswer === false ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'flex-1',
                  selectedAnswer === false && 'gradient-hockey text-white border-0'
                )}
                onClick={() => handleAnswer(false)}
              >
                No
              </Button>
              <Button
                variant={selectedAnswer === null ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'flex-1',
                  selectedAnswer === null && 'bg-muted text-muted-foreground hover:bg-muted'
                )}
                onClick={() => handleAnswer(null)}
              >
                No Answer
              </Button>
            </div>
            <Button
              className={cn(
                'w-full',
                isSaved
                  ? 'bg-primary/20 text-primary hover:bg-primary/30'
                  : 'gradient-hockey'
              )}
              size="sm"
              disabled={isSaving || isSaved}
              onClick={handleSave}
            >
              {isSaving ? (
                <span className="animate-pulse">Saving...</span>
              ) : isSaved ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Saved
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        )}

        {/* Friends' Picks Button - Only when betting is closed */}
        {isLocked && (
          <div className="mt-3 pt-3 border-t border-border/30 flex justify-center">
            <button
              onClick={handleOpenFriendsBets}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Friends' picks</span>
            </button>
          </div>
        )}
      </div>

      {/* Friends Predictions Modal */}
      <Dialog open={showFriendsBets} onOpenChange={setShowFriendsBets}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{question.text}</DialogTitle>
            {isEvaluated && question.result !== null && (
              <p className="text-sm text-muted-foreground">
                Correct answer: {question.result ? 'Yes' : 'No'}
              </p>
            )}
          </DialogHeader>
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Friends' Answers</span>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {!isLocked ? (
                <p className="text-center text-muted-foreground text-sm py-4">
                  Friends' picks will be visible after betting closes
                </p>
              ) : isLoadingFriends ? (
                <p className="text-center text-muted-foreground text-sm py-4 animate-pulse">
                  Loading...
                </p>
              ) : friendPredictions.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No friends' answers yet
                </p>
              ) : (
                friendPredictions.map((prediction) => {
                  const user = prediction.LeagueUser.User
                  const displayName = getUserDisplayName(user)
                  const initials = getUserInitials(user)

                  const answerDisplay = prediction.userBet === true
                    ? 'Yes'
                    : prediction.userBet === false
                      ? 'No'
                      : 'No answer'

                  const isCorrect = isEvaluated && question.result !== null && prediction.userBet === question.result

                  return (
                    <div
                      key={prediction.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/20 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{displayName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'font-bold text-sm',
                          isCorrect ? 'text-primary' : 'text-foreground'
                        )}>
                          {answerDisplay}
                        </span>
                        {prediction.totalPoints !== 0 && (
                          <span className={cn(
                            'text-xs font-semibold px-1.5 py-0.5 rounded',
                            prediction.totalPoints > 0
                              ? 'text-primary bg-primary/20'
                              : 'text-destructive bg-destructive/20'
                          )}>
                            {prediction.totalPoints > 0 ? '+' : ''}{prediction.totalPoints}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
