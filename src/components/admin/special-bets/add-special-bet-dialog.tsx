'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { createSpecialBet } from '@/actions/special-bets'
import { logger } from '@/lib/client-logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type League = { id: number; name: string }
type SpecialBetType = { id: number; name: string }
type Evaluator = { id: number; name: string }

interface AddSpecialBetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leagues: League[]
  specialBetTypes: SpecialBetType[]
  evaluators: Evaluator[]
  league?: { id: number; name: string }
}

export function AddSpecialBetDialog({ open, onOpenChange, leagues, specialBetTypes, evaluators, league }: AddSpecialBetDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(league?.id.toString() || '')
  const [selectedTypeId, setSelectedTypeId] = useState<string>('')
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState<string>('')
  const [dateTime, setDateTime] = useState<string>('')

  const effectiveLeagueId = league?.id.toString() || selectedLeagueId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!effectiveLeagueId || !selectedTypeId || !selectedEvaluatorId || !dateTime) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    try {
      await createSpecialBet({
        leagueId: parseInt(effectiveLeagueId, 10),
        specialBetSingleId: parseInt(selectedTypeId, 10),
        evaluatorId: parseInt(selectedEvaluatorId, 10),
        dateTime: new Date(dateTime),
      })

      toast.success('Special bet created successfully')
      onOpenChange(false)
      resetForm()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to create special bet')
      }
      logger.error('Failed to create special bet', { error, leagueId: effectiveLeagueId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    if (!league) {
      setSelectedLeagueId('')
    }
    setSelectedTypeId('')
    setSelectedEvaluatorId('')
    setDateTime('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Special Bet</DialogTitle>
          <DialogDescription>
            Add a new special bet to a league (e.g., Tournament Winner, Top Scorer).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!league && (
            <div className="space-y-2">
              <Label htmlFor="league">League</Label>
              <Select value={selectedLeagueId} onValueChange={setSelectedLeagueId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a league" />
                </SelectTrigger>
                <SelectContent>
                  {leagues.map((league) => (
                    <SelectItem key={league.id} value={league.id.toString()}>
                      {league.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="type">Special Bet Type</Label>
            <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {specialBetTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id.toString()}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="evaluator">Evaluator</Label>
            <Select value={selectedEvaluatorId} onValueChange={setSelectedEvaluatorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select evaluator" />
              </SelectTrigger>
              <SelectContent>
                {evaluators.map((evaluator) => (
                  <SelectItem key={evaluator.id} value={evaluator.id.toString()}>
                    {evaluator.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Determines which evaluator type (team/player/value) and points are awarded.
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
              Users must submit predictions before this time.
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
              {isSubmitting ? 'Creating...' : 'Create Special Bet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
