import React, { Fragment } from 'react'
import { format } from 'date-fns'
import { Edit, Trash2, Calculator, ChevronDown, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { QuestionBetRow } from './question-bet-row'
import { type QuestionWithUserBets } from '@/actions/question-bets'

type Question = QuestionWithUserBets

interface QuestionTableRowProps {
  question: Question
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onEvaluate: () => void
  onDelete: () => void
  onAddBet: () => void
  status: 'scheduled' | 'finished' | 'evaluated'
}

export function QuestionTableRow({
  question,
  isExpanded,
  onToggleExpand,
  onEdit,
  onEvaluate,
  onDelete,
  onAddBet,
  status,
}: QuestionTableRowProps) {
  const t = useTranslations('admin.questions')
  const tCommon = useTranslations('admin.common')
  const tSeries = useTranslations('admin.series')

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
          #{question.id}
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span className="font-medium">
              {format(new Date(question.dateTime), 'd.M.yyyy')}
            </span>
            <span className="text-sm text-muted-foreground">
              {format(new Date(question.dateTime), 'HH:mm')}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <div className="max-w-md">
            <p className="line-clamp-2">{question.text}</p>
          </div>
        </TableCell>
        <TableCell className="text-center">
          {question.result !== null ? (
            <Badge variant={question.result ? 'default' : 'secondary'}>
              {question.result ? t('yes') : t('no')}
            </Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell className="text-center">
          <Badge variant="outline">{question.UserSpecialBetQuestion.length}</Badge>
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
              aria-label={t('editQuestion', { text: question.text.substring(0, 50) })}
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
              aria-label={t('evaluateQuestion', { text: question.text.substring(0, 50) })}
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
              aria-label={t('deleteQuestion', { text: question.text.substring(0, 50) })}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded row - user bets */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/20 p-0">
            <div className="p-4">
              {question.UserSpecialBetQuestion.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">{t('noUserBets')}</p>
                </div>
              ) : (
                <div className="rounded-lg border bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tSeries('user')}</TableHead>
                        <TableHead>{t('answer')}</TableHead>
                        <TableHead>{tSeries('points')}</TableHead>
                        <TableHead className="text-right">{tCommon('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {question.UserSpecialBetQuestion.map((bet) => (
                        <QuestionBetRow
                          key={bet.id}
                          bet={bet}
                          questionText={question.text}
                          isQuestionEvaluated={question.isEvaluated}
                          questionId={question.id}
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
