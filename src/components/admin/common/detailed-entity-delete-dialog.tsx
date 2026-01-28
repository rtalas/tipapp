import { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DetailedEntityDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children?: ReactNode
  onConfirm: () => void
  isDeleting: boolean
}

/**
 * Reusable delete confirmation dialog for admin entities with detailed information display
 *
 * @example
 * ```tsx
 * <DetailedEntityDeleteDialog
 *   open={deleteDialog.open}
 *   onOpenChange={deleteDialog.setOpen}
 *   title="Delete Match"
 *   description="Are you sure you want to delete this match?"
 *   onConfirm={handleDelete}
 *   isDeleting={isDeleting}
 * >
 *   <div className="rounded-lg border p-4 space-y-2">
 *     <div className="flex items-center justify-between">
 *       <span className="text-sm text-muted-foreground">Match ID</span>
 *       <span className="font-mono">#{match.id}</span>
 *     </div>
 *     <div className="flex items-center justify-between">
 *       <span className="text-sm text-muted-foreground">Teams</span>
 *       <span>{match.homeTeam} vs {match.awayTeam}</span>
 *     </div>
 *   </div>
 * </DetailedEntityDeleteDialog>
 * ```
 */
export function DetailedEntityDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onConfirm,
  isDeleting,
}: DetailedEntityDeleteDialogProps) {
  const t = useTranslations('admin.common')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? t('deleting') : t('delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
