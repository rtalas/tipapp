import { useState, useCallback } from 'react'

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

  const openDialog = useCallback((item: T) => {
    setItemToDelete(item)
    setOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setOpen(false)
    setItemToDelete(null)
    setIsDeleting(false)
  }, [])

  const startDeleting = useCallback(() => {
    setIsDeleting(true)
  }, [])

  const finishDeleting = useCallback(() => {
    setIsDeleting(false)
    closeDialog()
  }, [closeDialog])

  const cancelDeleting = useCallback(() => {
    setIsDeleting(false)
  }, [])

  return {
    open,
    setOpen,
    itemToDelete,
    setItemToDelete,
    isDeleting,
    openDialog,
    closeDialog,
    startDeleting,
    finishDeleting,
    cancelDeleting,
  }
}
