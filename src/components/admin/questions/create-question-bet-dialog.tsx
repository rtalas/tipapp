'use client'

import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useCreateDialog } from '@/hooks/useCreateDialog'
import { createUserQuestionBet, type QuestionWithUserBets } from '@/actions/question-bets'
import { type UserBasic } from '@/actions/users'
import { validate } from '@/lib/validation-client'
import { getErrorMessage } from '@/lib/error-handler'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type QuestionWithBets = QuestionWithUserBets
type User = UserBasic

interface CreateQuestionBetFormData {
  leagueUserId: string
  userBet: string // 'true' | 'false'
}

interface CreateQuestionBetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question: QuestionWithBets
  users: User[]
}

const initialFormData: CreateQuestionBetFormData = {
  leagueUserId: '',
  userBet: 'true',
}

export function CreateQuestionBetDialog({ open, onOpenChange, question, users }: CreateQuestionBetDialogProps) {
  const createDialog = useCreateDialog<CreateQuestionBetFormData>(initialFormData)

  // Filter users to show only those without a bet for this question
  const usersWithBets = new Set(
    question.UserSpecialBetQuestion.map((bet) => bet.LeagueUser.userId)
  )
  const availableUsers = users.filter((user) => !usersWithBets.has(user.id))

  const handleSubmit = async () => {
    if (!createDialog.form.leagueUserId) {
      toast.error('Please select a user')
      return
    }

    // Convert form data to proper types for validation
    const validationData = {
      leagueSpecialBetQuestionId: question.id,
      leagueUserId: parseInt(createDialog.form.leagueUserId),
      userBet: createDialog.form.userBet === 'true',
    }

    const validation = validate.userQuestionBetCreate(validationData)
    if (!validation.success) {
      toast.error(getErrorMessage(validation.error, 'Validation failed'))
      return
    }

    createDialog.startCreating()
    const result = await createUserQuestionBet(validation.data)

    if (result.success) {
      toast.success('Bet created successfully')
      createDialog.finishCreating()
      onOpenChange(false)
    } else {
      toast.error(getErrorMessage('error' in result ? result.error : undefined, 'Failed to create bet'))
      createDialog.cancelCreating()
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      createDialog.closeDialog()
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Missing Bet</DialogTitle>
          <DialogDescription>
            Create an answer for a user who hasn&apos;t placed a bet on this question yet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Question context */}
          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">Question:</p>
            <p className="text-sm leading-relaxed">{question.text}</p>
          </div>

          {/* User selection */}
          <div className="space-y-2">
            <Label htmlFor="user">User</Label>
            {availableUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All users have already placed bets on this question.
              </p>
            ) : (
              <Select
                value={createDialog.form.leagueUserId}
                onValueChange={(value) => createDialog.updateForm({ leagueUserId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.firstName} {user.lastName} ({user.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Answer selection */}
          {availableUsers.length > 0 && (
            <div className="space-y-2">
              <Label>User&apos;s Answer</Label>
              <RadioGroup
                value={createDialog.form.userBet}
                onValueChange={(value) => createDialog.updateForm({ userBet: value })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="yes-create" />
                  <Label htmlFor="yes-create" className="cursor-pointer">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="no-create" />
                  <Label htmlFor="no-create" className="cursor-pointer">
                    No
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={createDialog.isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createDialog.isCreating || availableUsers.length === 0}
          >
            {createDialog.isCreating ? 'Creating...' : 'Create Bet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
