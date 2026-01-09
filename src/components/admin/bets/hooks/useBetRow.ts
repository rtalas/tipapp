import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/error-handler'

interface UseBetRowOptions<TFormData> {
  validateEdit: (data: TFormData) => boolean
  updateAction: (id: number, data: TFormData) => Promise<{ success?: boolean; error?: string }>
  deleteAction: (id: number) => Promise<{ success?: boolean; error?: string }>
  betId: number
  entityType?: string // e.g., "Match", "Series", "Special Bet"
}

/**
 * Shared state management hook for bet row components
 * Consolidates delete dialog state and common action handlers
 * Used by: user-bet-row, series-bet-row, special-bet-row
 */
export function useBetRow<TFormData>({
  validateEdit,
  updateAction,
  deleteAction,
  betId,
  entityType = 'Bet',
}: UseBetRowOptions<TFormData>) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSaveEdit = async (formData: TFormData, callbacks: { onSuccess: () => void; onError: () => void }) => {
    // Validate
    if (!validateEdit(formData)) {
      return
    }

    try {
      callbacks.onSuccess() // Start saving state
      const result = await updateAction(betId, formData)

      if (result.error) {
        toast.error(result.error)
        callbacks.onError()
        return
      }

      toast.success(`${entityType} updated successfully`)
    } catch (error) {
      toast.error(getErrorMessage(error))
      callbacks.onError()
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const result = await deleteAction(betId)

      if (result.error) {
        toast.error(result.error)
        setIsDeleting(false)
        return
      }

      toast.success(`${entityType} deleted successfully`)
      setDeleteDialogOpen(false)
    } catch (error) {
      toast.error(getErrorMessage(error))
      setIsDeleting(false)
    }
  }

  const openDeleteDialog = () => setDeleteDialogOpen(true)
  const closeDeleteDialog = () => setDeleteDialogOpen(false)

  return {
    // Delete dialog state
    deleteDialogOpen,
    isDeleting,
    openDeleteDialog,
    closeDeleteDialog,
    setDeleteDialogOpen,

    // Action handlers
    handleSaveEdit,
    handleDelete,
  }
}
