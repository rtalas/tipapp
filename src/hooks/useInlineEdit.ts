import { useState, useCallback } from 'react'

/**
 * Hook for managing inline editing state and handlers
 * Reduces component complexity by consolidating edit-related state
 *
 * @template T - The type of form data being edited
 */
export function useInlineEdit<T = unknown>() {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<T>()
  const [isSaving, setIsSaving] = useState(false)

  const startEdit = useCallback((id: number, initialData: T) => {
    setEditingId(id)
    setForm(initialData)
  }, [])

  const updateForm = useCallback((updates: Partial<T>) => {
    setForm((prev) => {
      if (!prev) return undefined
      return { ...(prev as Record<string, unknown>), ...updates } as T
    })
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setForm(undefined)
  }, [])

  const setSaving = useCallback((saving: boolean) => {
    setIsSaving(saving)
  }, [])

  const finishEdit = useCallback(() => {
    setEditingId(null)
    setForm(undefined)
    setIsSaving(false)
  }, [])

  return {
    editingId,
    form,
    isSaving,
    startEdit,
    updateForm,
    cancelEdit,
    setSaving,
    finishEdit,
  }
}
