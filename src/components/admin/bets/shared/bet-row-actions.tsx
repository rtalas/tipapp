import { Edit, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BetRowActionsProps {
  isEditing: boolean
  isSaving: boolean
  userName: string
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onDelete: () => void
}

/**
 * Shared action buttons for bet row components
 * Shows Edit/Delete buttons when not editing, Save/Cancel when editing
 * Used by: user-bet-row, series-bet-row, special-bet-row
 */
export function BetRowActions({
  isEditing,
  isSaving,
  userName,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: BetRowActionsProps) {
  if (isEditing) {
    return (
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancelEdit}
          disabled={isSaving}
          aria-label="Cancel edit"
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSaveEdit}
          disabled={isSaving}
          aria-label="Save bet changes"
        >
          <Check className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onStartEdit}
        aria-label={`Edit bet for ${userName}`}
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        aria-label={`Delete bet for ${userName}`}
      >
        <Trash2 className="h-4 w-4 text-red-600" />
      </Button>
    </div>
  )
}
