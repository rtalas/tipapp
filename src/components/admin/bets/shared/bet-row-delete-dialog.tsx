import { AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface BetRowDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  userName: string
  isDeleting: boolean
  isEvaluated: boolean
  entityType?: string // e.g., "Match", "Series", "Special Bet"
}

/**
 * Shared delete confirmation dialog for all bet row components
 * Used by: user-bet-row, series-bet-row, special-bet-row
 */
export function BetRowDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  userName,
  isDeleting,
  isEvaluated,
  entityType = 'Match',
}: BetRowDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Bet</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the bet for {userName}? This action cannot be undone.
            {isEvaluated && (
              <div className="mt-2 flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{entityType} is already evaluated</span>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
