'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { format } from 'date-fns'
import { HelpCircle, Check, X, Lock, Clock, Users, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CountdownBadge } from '@/components/user/common/countdown-badge'
import { RefreshButton } from '@/components/user/common/refresh-button'
import { useRefresh } from '@/hooks/useRefresh'
import { cn } from '@/lib/utils'
import { groupByDate, getDateLabel } from '@/lib/date-grouping-utils'
import { saveQuestionBet } from '@/actions/user/questions'
import type { UserQuestion } from '@/actions/user/questions'

interface QuestionsListProps {
  questions: UserQuestion[]
}

type FilterType = 'current' | 'past'

export function QuestionsList({ questions }: QuestionsListProps) {
  const { isRefreshing, refresh } = useRefresh()
  const [filter, setFilter] = useState<FilterType>('current')

  // Filter questions
  const currentQuestions = questions.filter((q) => !q.isEvaluated)
  const pastQuestions = questions.filter((q) => q.isEvaluated)
  const displayedQuestions = filter === 'current' ? currentQuestions : pastQuestions

  // Group by date
  const groupedQuestions = useMemo(() => {
    const sorted = [...displayedQuestions].sort((a, b) => {
      if (filter === 'past') {
        return new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
      }
      return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    })
    return groupByDate(sorted)
  }, [displayedQuestions, filter])

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <HelpCircle className="mb-4 h-12 w-12 text-muted-foreground opacity-30" />
        <h3 className="text-lg font-medium">No questions</h3>
        <p className="text-sm text-muted-foreground">
          Questions will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">
            Yes/No Questions
          </h2>
        </div>
        <RefreshButton isRefreshing={isRefreshing} onRefresh={refresh} />
      </div>

      {/* Filter tabs */}
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

      {/* Questions grouped by date */}
      {displayedQuestions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">
            No {filter === 'current' ? 'upcoming' : 'past'} questions
          </p>
          <p className="text-sm">
            {filter === 'current'
              ? 'Questions will appear here'
              : 'No answered questions yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(groupedQuestions.entries()).map(([dateKey, dateQuestions]) => (
            <div key={dateKey} className="space-y-3">
              {/* Date Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2">
                  {getDateLabel(new Date(dateKey))}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Questions for this date */}
              {dateQuestions.map((q) => (
                <QuestionCard key={q.id} question={q} onSaved={refresh} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
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

  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(
    currentAnswer ?? null
  )
  const [isSaving, setIsSaving] = useState(false)
  const [showFriendsBets, setShowFriendsBets] = useState(false)

  const handleAnswer = async (answer: boolean) => {
    if (isLocked) return

    setSelectedAnswer(answer)
    setIsSaving(true)

    try {
      const result = await saveQuestionBet({
        leagueSpecialBetQuestionId: question.id,
        userBet: answer,
      })

      if (!result.success) {
        toast.error(result.error || 'Failed to save')
        setSelectedAnswer(currentAnswer ?? null)
      } else {
        onSaved()
      }
    } catch {
      toast.error('Failed to save')
      setSelectedAnswer(currentAnswer ?? null)
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
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 gradient-primary">
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

            {/* Friends' Picks Button */}
            <div className="pt-2 flex justify-center">
              <button
                onClick={() => setShowFriendsBets(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Friends' picks</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className={cn(
                'flex-1 h-10',
                selectedAnswer === true
                  ? 'bg-primary/20 border-primary text-primary hover:bg-primary/30'
                  : 'hover:bg-primary/10'
              )}
              onClick={() => handleAnswer(true)}
              disabled={isSaving}
            >
              <Check className="w-4 h-4 mr-1" />
              Yes
            </Button>
            <Button
              variant="outline"
              className={cn(
                'flex-1 h-10',
                selectedAnswer === false
                  ? 'bg-destructive/20 border-destructive text-destructive hover:bg-destructive/30'
                  : 'hover:bg-destructive/10'
              )}
              onClick={() => handleAnswer(false)}
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-1" />
              No
            </Button>
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
              <p className="text-center text-muted-foreground text-sm py-4">
                No friends' answers yet
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
