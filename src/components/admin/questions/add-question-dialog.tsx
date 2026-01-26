'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { createQuestion } from '@/actions/questions'
import { logger } from '@/lib/client-logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AddQuestionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  league: { id: number; name: string }
}

export function AddQuestionDialog({ open, onOpenChange, league }: AddQuestionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [text, setText] = useState('')
  const [dateTime, setDateTime] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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

    setIsSubmitting(true)

    try {
      await createQuestion({
        leagueId: league.id,
        text,
        dateTime: new Date(dateTime),
      })

      toast.success('Question created successfully')
      onOpenChange(false)
      resetForm()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to create question')
      }
      logger.error('Failed to create question', { error })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setText('')
    setDateTime('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Question</DialogTitle>
          <DialogDescription>
            Add a new question for users to answer with Yes or No.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="text">Question Text</Label>
            <Textarea
              id="text"
              placeholder="Enter the question text..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              required
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
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the deadline for answering this question. Users cannot bet after this time.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Question'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
