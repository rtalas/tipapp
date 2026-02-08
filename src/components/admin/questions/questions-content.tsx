'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { deleteQuestion, createQuestion } from '@/actions/questions'
import { evaluateQuestionBets } from '@/actions/evaluate-questions'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/logging/client-logger'
import { useExpandableRow } from '@/hooks/useExpandableRow'
import { useCreateDialog } from '@/hooks/useCreateDialog'
import { ContentFilterHeader } from '@/components/admin/common/content-filter-header'
import { DetailedEntityDeleteDialog } from '@/components/admin/common/detailed-entity-delete-dialog'
import { QuestionTableRow } from './question-table-row'
import { CreateQuestionDialog } from './create-question-dialog'
import { EditQuestionDialog } from './edit-question-dialog'
import { CreateQuestionBetDialog } from './create-question-bet-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type QuestionWithUserBets } from '@/actions/question-bets'
import { type UserBasic } from '@/actions/users'

type Question = QuestionWithUserBets
type User = UserBasic

interface QuestionsContentProps {
  questions: Question[]
  users: User[]
  league: { id: number; name: string }
}

interface CreateFormData {
  text: string
  dateTime: string
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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [questionToEdit, setQuestionToEdit] = useState<Question | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [createBetQuestionId, setCreateBetQuestionId] = useState<number | null>(null)

  const { isExpanded, toggleRow } = useExpandableRow()
  const createDialog = useCreateDialog<CreateFormData>({
    text: '',
    dateTime: '',
  })

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

  const handleCreateQuestion = async () => {
    if (!createDialog.form.text || !createDialog.form.dateTime) {
      toast.error(t('fillAllFields'))
      return
    }

    if (createDialog.form.text.length < 10) {
      toast.error(t('questionMinLength'))
      return
    }

    if (createDialog.form.text.length > 500) {
      toast.error(t('questionMaxLength'))
      return
    }

    createDialog.startCreating()
    try {
      await createQuestion({
        leagueId: league.id,
        text: createDialog.form.text,
        dateTime: new Date(createDialog.form.dateTime),
      })
      toast.success(t('questionCreated'))
      createDialog.finishCreating()
    } catch (error) {
      const message = getErrorMessage(error, t('questionCreateFailed'))
      toast.error(message)
      logger.error('Failed to create question', { error })
      createDialog.cancelCreating()
    }
  }

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
      {/* Header with Create Button and Filters */}
      <ContentFilterHeader
        searchPlaceholder={t('searchPlaceholder')}
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            name: 'status',
            value: statusFilter,
            onChange: setStatusFilter,
            placeholder: tCommon('status'),
            options: [
              { value: 'all', label: tSeries('allStatus') },
              { value: 'scheduled', label: tSeries('scheduled') },
              { value: 'finished', label: tSeries('finished') },
              { value: 'evaluated', label: tSeries('evaluated') },
            ],
          },
          {
            name: 'user',
            value: userFilter,
            onChange: setUserFilter,
            placeholder: tSeries('allUsers'),
            options: [
              { value: 'all', label: tSeries('allUsers') },
              ...users.map((user) => ({
                value: user.id.toString(),
                label: `${user.firstName} ${user.lastName}`,
              })),
            ],
          },
        ]}
        createButtonLabel={t('createQuestion')}
        onCreateClick={createDialog.openDialog}
      />

      {/* Questions Table */}
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
              <Button onClick={createDialog.openDialog}>
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
                  {filteredQuestions.map((q) => (
                    <QuestionTableRow
                      key={q.id}
                      question={q}
                      isExpanded={isExpanded(q.id)}
                      onToggleExpand={() => toggleRow(q.id)}
                      onEdit={() => setQuestionToEdit(q)}
                      onEvaluate={() => handleEvaluate(q.id)}
                      onDelete={() => {
                        setQuestionToDelete(q)
                        setDeleteDialogOpen(true)
                      }}
                      onAddBet={() => setCreateBetQuestionId(q.id)}
                      status={getQuestionStatus(q)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Question Dialog */}
      <CreateQuestionDialog
        open={createDialog.open}
        onOpenChange={createDialog.onOpenChange}
        formData={createDialog.form}
        onFormChange={createDialog.updateForm}
        onCreate={handleCreateQuestion}
        isCreating={createDialog.isCreating}
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
      <DetailedEntityDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('deleteTitle')}
        description={t('deleteConfirm')}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      >
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
      </DetailedEntityDeleteDialog>
    </>
  )
}
