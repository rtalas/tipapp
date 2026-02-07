'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { updateQuestion, updateQuestionResult } from '@/actions/questions'
import { evaluateQuestionBets } from '@/actions/evaluate-questions'
import { validateQuestionEdit } from '@/lib/validation-client'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/logging/client-logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Question = {
  id: number
  text: string
  dateTime: Date
  result: boolean | null
  isEvaluated: boolean
  League: { name: string }
  UserSpecialBetQuestion: unknown[]
}

interface EditQuestionDialogProps {
  question: Question
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditQuestionDialog({ question, open, onOpenChange }: EditQuestionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [text, setText] = useState(question.text)
  const [dateTime, setDateTime] = useState(
    format(new Date(question.dateTime), "yyyy-MM-dd'T'HH:mm")
  )
  const [result, setResult] = useState<string>(
    question.result !== null ? question.result.toString() : ''
  )

  // Reset form when question changes
  useEffect(() => {
    setText(question.text)
    setDateTime(format(new Date(question.dateTime), "yyyy-MM-dd'T'HH:mm"))
    setResult(question.result !== null ? question.result.toString() : '')
  }, [question])

  const handleSaveQuestion = async () => {
    if (!text || !dateTime) {
      toast.error('Please fill in all required fields')
      return
    }

    if (text.length < 10) {
      toast.error('Question must be at least 10 characters')
      return
    }

    if (text.length > 500) {
      toast.error('Question must not exceed 500 characters')
      return
    }

    // Convert form data to proper types for validation
    const validationData = {
      id: question.id,
      text,
      dateTime: new Date(dateTime),
    }

    const validation = validateQuestionEdit(validationData)
    if (!validation.success) {
      toast.error(getErrorMessage(validation.error, 'Validation failed'))
      return
    }

    setIsSubmitting(true)

    try {
      const updateResult = await updateQuestion(validation.data)

      if (updateResult.success) {
        toast.success('Question updated successfully')
      } else {
        toast.error(getErrorMessage('error' in updateResult ? updateResult.error : undefined, 'Failed to update question'))
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update question'))
      logger.error('Failed to update question', { error, questionId: question.id })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveResult = async () => {
    if (result === '') {
      toast.error('Please select a result (Yes or No)')
      return
    }

    setIsSubmitting(true)

    try {
      await updateQuestionResult({
        questionId: question.id,
        result: result === 'true',
      })

      toast.success('Question result saved successfully')
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to save question result')
      }
      logger.error('Failed to save question result', { error, questionId: question.id })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEvaluate = async () => {
    if (result === '') {
      toast.error('Please save question result before evaluating')
      return
    }

    setIsEvaluating(true)

    try {
      const evaluationResult = await evaluateQuestionBets({ questionId: question.id })

      if (evaluationResult.success && 'results' in evaluationResult) {
        const betsCount = evaluationResult.results?.length ?? 0
        toast.success(`Question evaluated! ${betsCount} bets scored.`)
        onOpenChange(false)
      } else if (!evaluationResult.success) {
        toast.error('error' in evaluationResult ? evaluationResult.error : 'Failed to evaluate question')
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to evaluate question')
      }
      logger.error('Failed to evaluate question', { error, questionId: question.id })
    } finally {
      setIsEvaluating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Question</DialogTitle>
          <DialogDescription>
            {question.League.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Question Info Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {format(new Date(question.dateTime), 'MMM d, yyyy')}
            </span>
            {question.isEvaluated && (
              <Badge variant="evaluated">Evaluated</Badge>
            )}
          </div>

          {/* Question Details Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text">Question Text</Label>
              <Textarea
                id="text"
                placeholder="Enter the question text..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                disabled={question.isEvaluated}
                aria-describedby="text-hint"
              />
              <p id="text-hint" className="text-xs text-muted-foreground">
                {text.length}/500 characters (minimum 10)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateTime">Deadline Date & Time (UTC)</Label>
              <Input
                id="dateTime"
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                disabled={question.isEvaluated}
              />
              <p className="text-xs text-muted-foreground">
                Users cannot answer after this deadline.
              </p>
            </div>

            {!question.isEvaluated && (
              <Button
                onClick={handleSaveQuestion}
                disabled={isSubmitting}
                variant="outline"
                className="w-full"
              >
                {isSubmitting ? 'Saving...' : 'Save Question Details'}
              </Button>
            )}
          </div>

          <Separator />

          {/* Result Entry Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>What is the correct answer?</Label>
              <RadioGroup
                value={result}
                onValueChange={setResult}
                disabled={question.isEvaluated}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="yes" />
                  <Label htmlFor="yes" className="cursor-pointer font-medium">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="no" />
                  <Label htmlFor="no" className="cursor-pointer font-medium">
                    No
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {result !== '' && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="text-muted-foreground">
                  Correct answer: <span className="font-semibold text-foreground">
                    {result === 'true' ? 'Yes' : 'No'}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {question.UserSpecialBetQuestion.length} user answer{question.UserSpecialBetQuestion.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting || isEvaluating}
          >
            Close
          </Button>

          {!question.isEvaluated && (
            <>
              <Button
                onClick={handleSaveResult}
                disabled={isSubmitting || isEvaluating || result === ''}
              >
                {isSubmitting ? 'Saving...' : 'Save Result'}
              </Button>

              <Button
                onClick={handleEvaluate}
                disabled={isSubmitting || isEvaluating || (question.result === null && result === '')}
                variant="default"
              >
                {isEvaluating ? 'Evaluating...' : 'Save & Evaluate'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
