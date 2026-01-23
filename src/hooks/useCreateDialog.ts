import { useState, useCallback } from 'react'

/**
 * Hook for managing create dialog state
 * Consolidates create form state and dialog open/close handlers
 *
 * @template T - The type of form data
 * @param initialData - Default empty form state
 */
export function useCreateDialog<T = unknown>(initialData: T) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<T>(initialData)
  const [isCreating, setIsCreating] = useState(false)

  const openDialog = useCallback(() => {
    setForm(initialData)
    setOpen(true)
  }, [initialData])

  const closeDialog = useCallback(() => {
    setOpen(false)
    setForm(initialData)
    setIsCreating(false)
  }, [initialData])

  const updateForm = useCallback((updates: Partial<T>) => {
    setForm((prev) => Object.assign({}, prev, updates))
  }, [])

  const startCreating = useCallback(() => {
    setIsCreating(true)
  }, [])

  const finishCreating = useCallback(() => {
    setIsCreating(false)
    closeDialog()
  }, [closeDialog])

  const cancelCreating = useCallback(() => {
    setIsCreating(false)
    closeDialog()
  }, [closeDialog])

  return {
    open,
    setOpen,
    form,
    setForm,
    isCreating,
    openDialog,
    closeDialog,
    updateForm,
    startCreating,
    finishCreating,
    cancelCreating,
  }
}
