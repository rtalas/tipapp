import { ReactNode } from 'react'
import { Users } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface FriendPredictionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: ReactNode
  sectionLabel: string
  isLocked: boolean
  isLoading: boolean
  predictions: unknown[]
  emptyMessage: string
  lockedMessage: string
  loadingMessage?: string
  children: ReactNode
}

/**
 * Reusable modal for displaying friend predictions across different bet types
 *
 * @example
 * ```tsx
 * <FriendPredictionsModal
 *   open={showModal}
 *   onOpenChange={setShowModal}
 *   title="Team A vs Team B"
 *   subtitle="Final: 3 - 2"
 *   sectionLabel="Friends' Predictions"
 *   isLocked={true}
 *   isLoading={isLoadingFriends}
 *   predictions={friendPredictions}
 *   emptyMessage="No friends' predictions yet"
 *   lockedMessage="Friends' picks will be visible after betting closes"
 * >
 *   {friendPredictions.map(pred => (
 *     <PredictionItem key={pred.id} prediction={pred} />
 *   ))}
 * </FriendPredictionsModal>
 * ```
 */
export function FriendPredictionsModal({
  open,
  onOpenChange,
  title,
  subtitle,
  sectionLabel,
  isLocked,
  isLoading,
  predictions,
  emptyMessage,
  lockedMessage,
  loadingMessage = 'Loading...',
  children,
}: FriendPredictionsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {subtitle || sectionLabel}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">{sectionLabel}</span>
          </div>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {!isLocked ? (
              <p className="text-center text-muted-foreground text-sm py-4">
                {lockedMessage}
              </p>
            ) : isLoading ? (
              <p className="text-center text-muted-foreground text-sm py-4 animate-pulse">
                {loadingMessage}
              </p>
            ) : predictions.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">
                {emptyMessage}
              </p>
            ) : (
              children
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
