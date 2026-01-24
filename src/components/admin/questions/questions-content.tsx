'use client'

import * as React from 'react'
import { Fragment } from 'react'
import { format } from 'date-fns'
import { Plus, Edit, Trash2, ChevronDown, Calculator } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { deleteQuestion } from '@/actions/questions'
import { evaluateQuestionBets } from '@/actions/evaluate-questions'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/client-logger'
import { useExpandableRow } from '@/hooks/useExpandableRow'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AddQuestionDialog } from './add-question-dialog'
import { EditQuestionDialog } from './edit-question-dialog'
import { QuestionBetRow } from './question-bet-row'
import { CreateQuestionBetDialog } from './create-question-bet-dialog'
import { type QuestionWithUserBets } from '@/actions/question-bets'
import { type UserBasic } from '@/actions/users'

type Question = QuestionWithUserBets
type User = UserBasic

interface QuestionsContentProps {
  questions: Question[]
  users: User[]
  league: { id: number; name: string }
}

function getQuestionStatus(question: Question): 'scheduled' | 'finished' | 'evaluated' {
  if (question.isEvaluated) return 'evaluated'
  if (question.result !== null) return 'finished'
  return 'scheduled'
}

export function QuestionsContent({ questions, users, league }: QuestionsContentProps) {
  const t = useTranslations('admin.questions')
  const tCommon = useTranslations('admin.common')
  const tSeries = useTranslations('admin.series')
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [userFilter, setUserFilter] = React.useState<string>('all')
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [questionToEdit, setQuestionToEdit] = React.useState<Question | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [questionToDelete, setQuestionToDelete] = React.useState<Question | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [createBetQuestionId, setCreateBetQuestionId] = React.useState<number | null>(null)

  // Expandable rows
  const { isExpanded, toggleRow } = useExpandableRow()

  // Filter questions with optimized string search
  const filteredQuestions = questions.filter((q) => {
    const status = getQuestionStatus(q)

    // Status filter
    if (statusFilter !== 'all' && status !== statusFilter) {
      return false
    }

    // User filter - show only questions where this user has bets
    if (userFilter !== 'all') {
      const userId = parseInt(userFilter, 10)
      const hasUserBet = q.UserSpecialBetQuestion.some((bet) => bet.LeagueUser.userId === userId)
      if (!hasUserBet) {
        return false
      }
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      return q.text.toLowerCase().includes(searchLower)
    }

    return true
  })

  const handleDelete = async () => {
    if (!questionToDelete) return
    setIsDeleting(true)
    try {
      await deleteQuestion(questionToDelete.id)
      toast.success(t('questionDeleted'))
      setDeleteDialogOpen(false)
      setQuestionToDelete(null)
    } catch (error) {
      const message = getErrorMessage(error, t('questionDeleteFailed'))
      toast.error(message)
      logger.error('Failed to delete question', { error, questionId: questionToDelete?.id })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEvaluate = async (questionId: number) => {
    try {
      const result = await evaluateQuestionBets({
        questionId,
      })

      if (result.success && 'totalUsersEvaluated' in result) {
        toast.success(t('questionEvaluated', { count: result.totalUsersEvaluated }))
      } else if (!result.success) {
        toast.error(getErrorMessage('error' in result ? result.error : undefined, t('questionEvaluateFailed')))
      }
    } catch (error) {
      toast.error(getErrorMessage(error, t('questionEvaluateFailed')))
      logger.error('Failed to evaluate question', { error, questionId })
    }
  }

  const createBetQuestion = filteredQuestions.find((q) => q.id === createBetQuestionId)

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={tCommon('status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tSeries('allStatus')}</SelectItem>
              <SelectItem value="scheduled">{tSeries('scheduled')}</SelectItem>
              <SelectItem value="finished">{tSeries('finished')}</SelectItem>
              <SelectItem value="evaluated">{tSeries('evaluated')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={tSeries('allUsers')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tSeries('allUsers')}</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.firstName} {user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('createQuestion')}
        </Button>
      </div>

      {/* Questions table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{t('allQuestions')}</CardTitle>
          <CardDescription>
            {t('questionsFound', { count: filteredQuestions.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">{t('noQuestionsFound')}</p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('createFirstQuestion')}
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[80px]">{tSeries('id')}</TableHead>
                    <TableHead>{tSeries('dateTime')}</TableHead>
                    <TableHead>{t('question')}</TableHead>
                    <TableHead className="text-center">{t('result')}</TableHead>
                    <TableHead className="text-center">{tSeries('bets')}</TableHead>
                    <TableHead>{tCommon('status')}</TableHead>
                    <TableHead className="w-[80px]">{tCommon('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.map((q) => {
                    const status = getQuestionStatus(q)
                    const expanded = isExpanded(q.id)

                    return (
                      <Fragment key={q.id}>
                        {/* Main row - clickable to expand */}
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleRow(q.id)}
                        >
                          <TableCell>
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 transition-transform',
                                expanded && 'rotate-180'
                              )}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">
                            #{q.id}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {format(new Date(q.dateTime), 'd.M.yyyy')}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(q.dateTime), 'HH:mm')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-md">
                              <p className="line-clamp-2">{q.text}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {q.result !== null ? (
                              <Badge variant={q.result ? 'default' : 'secondary'}>
                                {q.result ? t('yes') : t('no')}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{q.UserSpecialBetQuestion.length}</Badge>
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
                                  setQuestionToEdit(q)
                                }}
                                aria-label={t('editQuestion', { text: q.text.substring(0, 50) })}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEvaluate(q.id)
                                }}
                                aria-label={t('evaluateQuestion', { text: q.text.substring(0, 50) })}
                              >
                                <Calculator className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setQuestionToDelete(q)
                                  setDeleteDialogOpen(true)
                                }}
                                aria-label={t('deleteQuestion', { text: q.text.substring(0, 50) })}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded row - user bets */}
                        {expanded && (
                          <TableRow>
                            <TableCell colSpan={8} className="bg-muted/20 p-0">
                              <div className="p-4">
                                {q.UserSpecialBetQuestion.length === 0 ? (
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
                                        {q.UserSpecialBetQuestion.map((bet) => (
                                          <QuestionBetRow
                                            key={bet.id}
                                            bet={bet}
                                            questionText={q.text}
                                            isQuestionEvaluated={q.isEvaluated}
                                            questionId={q.id}
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
                                    onClick={() => setCreateBetQuestionId(q.id)}
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
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Question Dialog */}
      <AddQuestionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        league={league}
      />

      {/* Edit Question Dialog */}
      {questionToEdit && (
        <EditQuestionDialog
          question={questionToEdit}
          open={!!questionToEdit}
          onOpenChange={(open) => !open && setQuestionToEdit(null)}
        />
      )}

      {/* Create Bet Dialog */}
      {createBetQuestion && (
        <CreateQuestionBetDialog
          open={createBetQuestionId !== null}
          onOpenChange={(open) => !open && setCreateBetQuestionId(null)}
          question={createBetQuestion}
          users={users}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('deleteConfirm')}
            </DialogDescription>
          </DialogHeader>
          {questionToDelete && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('questionId')}</span>
                <span className="font-mono">#{questionToDelete.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{tSeries('date')}</span>
                <span>{format(new Date(questionToDelete.dateTime), 'd.M.yyyy HH:mm')}</span>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-muted-foreground">{t('questionLabel')}</span>
                <p className="mt-1 font-medium">{questionToDelete.text}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{tSeries('leagueLabel')}</span>
                <span>{questionToDelete.League.name}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? tCommon('deleting') : tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
