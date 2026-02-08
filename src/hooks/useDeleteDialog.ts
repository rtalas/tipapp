import { useState } from 'react'

/**
 * Hook for managing delete confirmation dialog state
 * Consolidates all delete-related state and handlers
 *
 * @template T - The type of item being deleted
 */
export function useDeleteDialog<T>() {
  const [open, setOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<T | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const openDialog = (item: T) => {
    setItemToDelete(item)
    setOpen(true)
  }

  const closeDialog = () => {
    setOpen(false)
    setItemToDelete(null)
    setIsDeleting(false)
  }

  /** For Dialog onOpenChange — delegates to openDialog/closeDialog for proper cleanup */
  const onOpenChange = (value: boolean) => {
    if (!value) closeDialog()
  }

  const startDeleting = () => {
    setIsDeleting(true)
  }

  const finishDeleting = () => {
    setIsDeleting(false)
    closeDialog()
  }

  const cancelDeleting = () => {
    setIsDeleting(false)
  }

  return {
    open,
    itemToDelete,
    isDeleting,
    openDialog,
    closeDialog,
    onOpenChange,
    startDeleting,
    finishDeleting,
    cancelDeleting,
  }
}
