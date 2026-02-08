import { useState } from 'react'

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

  const openDialog = () => {
    setForm(initialData)
    setOpen(true)
  }

  const closeDialog = () => {
    setOpen(false)
    setForm(initialData)
    setIsCreating(false)
  }

  /** For Dialog onOpenChange — delegates to openDialog/closeDialog for proper cleanup */
  const onOpenChange = (value: boolean) => {
    if (!value) closeDialog()
  }

  const updateForm = (updates: Partial<T>) => {
    setForm((prev) => Object.assign({}, prev, updates))
  }

  const startCreating = () => {
    setIsCreating(true)
  }

  const finishCreating = () => {
    setIsCreating(false)
    closeDialog()
  }

  const cancelCreating = () => {
    setIsCreating(false)
    closeDialog()
  }

  return {
    open,
    form,
    isCreating,
    openDialog,
    closeDialog,
    onOpenChange,
    updateForm,
    startCreating,
    finishCreating,
    cancelCreating,
  }
}
