'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { HelpCircle, Clock, Check, Users, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/common/user-avatar'
import { CountdownBadge } from '@/components/user/common/countdown-badge'
import { StatusBadge } from '@/components/user/common/status-badge'
import { FriendPredictionsModal } from '@/components/user/common/friend-predictions-modal'
import { cn } from '@/lib/utils'
import { getUserDisplayName } from '@/lib/user-display-utils'
import { useFriendPredictions } from '@/hooks/useFriendPredictions'
import { saveQuestionBet, getQuestionFriendPredictions } from '@/actions/user/questions'
import type { UserQuestion, QuestionFriendPrediction } from '@/actions/user/questions'

interface QuestionCardProps {
  question: UserQuestion
  onSaved: () => void
}

export function QuestionCard({ question, onSaved }: QuestionCardProps) {
  const t = useTranslations('user.questions')
  const isLocked = !question.isBettingOpen
  const isEvaluated = question.isEvaluated
  const currentAnswer = question.userBet?.userBet

  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(
    currentAnswer ?? null
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(currentAnswer !== undefined && currentAnswer !== null)
  const friends = useFriendPredictions<QuestionFriendPrediction>({
    isLocked,
    entityId: question.id,
    entityName: 'question',
    fetchPredictions: getQuestionFriendPredictions,
    errorToast: t('friendsLoadError'),
  })

  const handleAnswer = (answer: boolean | null) => {
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
        toast.error(result.error || t('saveError'))
      } else {
        setIsSaved(true)
        onSaved()
      }
    } catch {
      toast.error(t('saveError'))
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
                {/* Status badge: Scheduled or Awaiting evaluation */}
                <StatusBadge dateTime={question.dateTime} isEvaluated={isEvaluated} />
                {/* Countdown and time badges - only show for non-evaluated events */}
                {!isEvaluated && !isLocked && <CountdownBadge deadline={question.dateTime} />}
                {!isEvaluated && (
                  <span className="badge-upcoming flex items-center gap-0.5 text-[9px] sm:text-[10px]">
                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    {format(question.dateTime, 'HH:mm')}
                  </span>
                )}
                {/* Points badge - only show for evaluated questions */}
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
                  <span className="text-xs text-muted-foreground">{t('yourAnswer')}</span>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isCorrect ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {selectedAnswer === true
                      ? t('yes')
                      : selectedAnswer === false
                        ? t('no')
                        : t('noAnswer')}
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
                  <span className="text-xs text-muted-foreground">{t('correctAnswer')}</span>
                  <span className="text-sm font-semibold text-primary">
                    {question.result ? t('yes') : t('no')}
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
                {t('yes')}
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
                {t('no')}
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
                {t('noAnswer')}
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
                <span className="animate-pulse">{t('saving')}</span>
              ) : isSaved ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {t('saved')}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {t('save')}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Friends' Picks Button - Only when betting is closed */}
        {isLocked && (
          <div className="mt-3 pt-3 border-t border-border/30 flex justify-center">
            <button
              onClick={friends.open}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t('friendsPicks')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Friends Predictions Modal */}
      <FriendPredictionsModal
        open={friends.showModal}
        onOpenChange={friends.setShowModal}
        title={question.text}
        subtitle={
          isEvaluated && question.result !== null
            ? `${t('correctAnswer')}: ${question.result ? t('yes') : t('no')}`
            : undefined
        }
        sectionLabel={t('friendsAnswers')}
        isLocked={isLocked}
        isLoading={friends.isLoading}
        predictions={friends.predictions}
        emptyMessage={t('noFriendsAnswers')}
        lockedMessage={t('friendsPicksLater')}
        loadingMessage={t('loading')}
      >
        {friends.predictions.map((prediction) => {
          const user = prediction.LeagueUser.User
          const displayName = getUserDisplayName(user)

          const answerDisplay =
            prediction.userBet === true
              ? t('yes')
              : prediction.userBet === false
                ? t('no')
                : t('noAnswer')

          const isPredictionCorrect =
            isEvaluated && question.result !== null && prediction.userBet === question.result

          return (
            <div
              key={prediction.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
            >
              <div className="flex items-center gap-3">
                <UserAvatar
                  avatarUrl={user.avatarUrl}
                  firstName={user.firstName}
                  lastName={user.lastName}
                  username={user.username}
                  size="sm"
                />
                <span className="font-medium text-sm">{displayName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'font-bold text-sm',
                    isPredictionCorrect ? 'text-primary' : 'text-foreground'
                  )}
                >
                  {answerDisplay}
                </span>
                {prediction.totalPoints !== 0 && (
                  <span
                    className={cn(
                      'text-xs font-semibold px-1.5 py-0.5 rounded',
                      prediction.totalPoints > 0
                        ? 'text-primary bg-primary/20'
                        : 'text-destructive bg-destructive/20'
                    )}
                  >
                    {prediction.totalPoints > 0 ? '+' : ''}
                    {prediction.totalPoints}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </FriendPredictionsModal>
    </>
  )
}
