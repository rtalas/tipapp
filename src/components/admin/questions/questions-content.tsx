'use client'

import * as React from 'react'
import { Fragment } from 'react'
import { format } from 'date-fns'
import { Plus, Edit, Trash2, ChevronDown, Calculator } from 'lucide-react'
import { toast } from 'sonner'
import { deleteQuestion } from '@/actions/questions'
import { evaluateQuestionBets } from '@/actions/evaluate-questions'
import { getErrorMessage } from '@/lib/error-handler'
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

type Question = Awaited<ReturnType<typeof import('@/actions/question-bets').getQuestionsWithUserBets>>[number]
type User = Awaited<ReturnType<typeof import('@/actions/users').getUsers>>[number]

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
      toast.success('Question deleted successfully')
      setDeleteDialogOpen(false)
      setQuestionToDelete(null)
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to delete question')
      toast.error(message)
      console.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEvaluate = async (questionId: number) => {
    try {
      const result = await evaluateQuestionBets({
        questionId,
      })

      if (result.success) {
        toast.success(
          `Question evaluated! ${result.totalUsersEvaluated} user(s) updated.`
        )
      } else {
        toast.error(getErrorMessage(result.error, 'Failed to evaluate question'))
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to evaluate question'))
      console.error(error)
    }
  }

  const createBetQuestion = filteredQuestions.find((q) => q.id === createBetQuestionId)

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <Input
            placeholder="Search by question text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="finished">Finished</SelectItem>
              <SelectItem value="evaluated">Evaluated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
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
          Create Question
        </Button>
      </div>

      {/* Questions table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>All Questions</CardTitle>
          <CardDescription>
            {filteredQuestions.length} questions found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">No questions found</p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first question
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead className="text-center">Result</TableHead>
                    <TableHead className="text-center">Bets</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
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
                                {q.result ? 'Yes' : 'No'}
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
                              {status.charAt(0).toUpperCase() + status.slice(1)}
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
                                aria-label={`Edit question: ${q.text.substring(0, 50)}`}
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
                                aria-label={`Evaluate question: ${q.text.substring(0, 50)}`}
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
                                aria-label={`Delete question: ${q.text.substring(0, 50)}`}
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
                                    <p className="text-muted-foreground">No bets yet for this question</p>
                                  </div>
                                ) : (
                                  <div className="rounded-lg border bg-background">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>User</TableHead>
                                          <TableHead>Answer</TableHead>
                                          <TableHead>Points</TableHead>
                                          <TableHead className="text-right">Actions</TableHead>
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
                                    aria-label="Add missing bet for this question"
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Missing Bet
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
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {questionToDelete && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Question ID:</span>
                <span className="font-mono">#{questionToDelete.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Date:</span>
                <span>{format(new Date(questionToDelete.dateTime), 'd.M.yyyy HH:mm')}</span>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-muted-foreground">Question:</span>
                <p className="mt-1 font-medium">{questionToDelete.text}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">League:</span>
                <span>{questionToDelete.League.name}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
