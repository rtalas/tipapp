import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCreateDialog } from './useCreateDialog'

interface TestForm {
  name: string
  category: string
}

const emptyForm: TestForm = { name: '', category: '' }

describe('useCreateDialog', () => {
  it('should initialize with closed state and initial form data', () => {
    const { result } = renderHook(() => useCreateDialog(emptyForm))

    expect(result.current.open).toBe(false)
    expect(result.current.form).toEqual(emptyForm)
    expect(result.current.isCreating).toBe(false)
  })

  it('should open dialog and reset form on openDialog', () => {
    const { result } = renderHook(() => useCreateDialog(emptyForm))

    act(() => {
      result.current.updateForm({ name: 'Dirty' })
    })
    act(() => {
      result.current.openDialog()
    })

    expect(result.current.open).toBe(true)
    expect(result.current.form).toEqual(emptyForm)
  })

  it('should close dialog and reset form on closeDialog', () => {
    const { result } = renderHook(() => useCreateDialog(emptyForm))

    act(() => {
      result.current.openDialog()
      result.current.updateForm({ name: 'Modified' })
      result.current.startCreating()
    })
    act(() => {
      result.current.closeDialog()
    })

    expect(result.current.open).toBe(false)
    expect(result.current.form).toEqual(emptyForm)
    expect(result.current.isCreating).toBe(false)
  })

  it('should partially update form with updateForm', () => {
    const { result } = renderHook(() => useCreateDialog(emptyForm))

    act(() => {
      result.current.updateForm({ name: 'New Name' })
    })

    expect(result.current.form).toEqual({ name: 'New Name', category: '' })
  })

  it('should set isCreating on startCreating', () => {
    const { result } = renderHook(() => useCreateDialog(emptyForm))

    act(() => {
      result.current.startCreating()
    })

    expect(result.current.isCreating).toBe(true)
  })

  it('should close dialog on finishCreating', () => {
    const { result } = renderHook(() => useCreateDialog(emptyForm))

    act(() => {
      result.current.openDialog()
      result.current.startCreating()
    })
    act(() => {
      result.current.finishCreating()
    })

    expect(result.current.open).toBe(false)
    expect(result.current.isCreating).toBe(false)
    expect(result.current.form).toEqual(emptyForm)
  })

  it('should close dialog on cancelCreating', () => {
    const { result } = renderHook(() => useCreateDialog(emptyForm))

    act(() => {
      result.current.openDialog()
      result.current.startCreating()
    })
    act(() => {
      result.current.cancelCreating()
    })

    expect(result.current.open).toBe(false)
    expect(result.current.isCreating).toBe(false)
  })

  it('should close and reset state via onOpenChange(false)', () => {
    const { result } = renderHook(() => useCreateDialog(emptyForm))

    act(() => {
      result.current.openDialog()
      result.current.updateForm({ name: 'Modified' })
      result.current.startCreating()
    })

    expect(result.current.open).toBe(true)

    act(() => {
      result.current.onOpenChange(false)
    })

    expect(result.current.open).toBe(false)
    expect(result.current.form).toEqual(emptyForm)
    expect(result.current.isCreating).toBe(false)
  })
})
