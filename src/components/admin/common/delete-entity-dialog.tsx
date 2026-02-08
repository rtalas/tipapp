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

interface DeleteEntityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  warningMessage?: ReactNode
  onConfirm: () => void
  isDeleting: boolean
}

/**
 * Reusable delete confirmation dialog for admin entities
 *
 * @example
 * ```tsx
 * <DeleteEntityDialog
 *   open={deleteDialog.open}
 *   onOpenChange={deleteDialog.onOpenChange}
 *   title={t('deleteTitle')}
 *   description={t('deleteConfirm', { name: item.name })}
 *   warningMessage={item.count > 0 ? t('deleteWarning', { count: item.count }) : undefined}
 *   onConfirm={handleDelete}
 *   isDeleting={deleteDialog.isDeleting}
 * />
 * ```
 */
export function DeleteEntityDialog({
  open,
  onOpenChange,
  title,
  description,
  warningMessage,
  onConfirm,
  isDeleting,
}: DeleteEntityDialogProps) {
  const t = useTranslations('admin.common')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
            {warningMessage && (
              <div className="mt-2 text-sm font-semibold text-amber-600">
                {warningMessage}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
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
