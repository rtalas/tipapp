import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInlineEdit } from './useInlineEdit'

interface TestForm {
  name: string
  value: number
}

describe('useInlineEdit', () => {
  it('should initialize with null/false defaults', () => {
    const { result } = renderHook(() => useInlineEdit<TestForm>())

    expect(result.current.editingId).toBeNull()
    expect(result.current.form).toBeNull()
    expect(result.current.isSaving).toBe(false)
  })

  it('should set editingId and form on startEdit', () => {
    const { result } = renderHook(() => useInlineEdit<TestForm>())

    act(() => {
      result.current.startEdit(5, { name: 'Test', value: 42 })
    })

    expect(result.current.editingId).toBe(5)
    expect(result.current.form).toEqual({ name: 'Test', value: 42 })
  })

  it('should partially update form with updateForm', () => {
    const { result } = renderHook(() => useInlineEdit<TestForm>())

    act(() => {
      result.current.startEdit(1, { name: 'Original', value: 10 })
    })
    act(() => {
      result.current.updateForm({ name: 'Updated' })
    })

    expect(result.current.form).toEqual({ name: 'Updated', value: 10 })
  })

  it('should not crash on updateForm when form is null', () => {
    const { result } = renderHook(() => useInlineEdit<TestForm>())

    act(() => {
      result.current.updateForm({ name: 'Whatever' })
    })

    expect(result.current.form).toBeNull()
  })

  it('should reset all state on cancelEdit', () => {
    const { result } = renderHook(() => useInlineEdit<TestForm>())

    act(() => {
      result.current.startEdit(3, { name: 'Test', value: 1 })
    })
    act(() => {
      result.current.cancelEdit()
    })

    expect(result.current.editingId).toBeNull()
    expect(result.current.form).toBeNull()
  })

  it('should toggle saving state with setSaving', () => {
    const { result } = renderHook(() => useInlineEdit<TestForm>())

    act(() => {
      result.current.setSaving(true)
    })
    expect(result.current.isSaving).toBe(true)

    act(() => {
      result.current.setSaving(false)
    })
    expect(result.current.isSaving).toBe(false)
  })

  it('should reset all state on finishEdit', () => {
    const { result } = renderHook(() => useInlineEdit<TestForm>())

    act(() => {
      result.current.startEdit(7, { name: 'Test', value: 99 })
      result.current.setSaving(true)
    })
    act(() => {
      result.current.finishEdit()
    })

    expect(result.current.editingId).toBeNull()
    expect(result.current.form).toBeNull()
    expect(result.current.isSaving).toBe(false)
  })

  it('should allow switching between different edits', () => {
    const { result } = renderHook(() => useInlineEdit<TestForm>())

    act(() => {
      result.current.startEdit(1, { name: 'First', value: 1 })
    })
    expect(result.current.editingId).toBe(1)

    act(() => {
      result.current.startEdit(2, { name: 'Second', value: 2 })
    })
    expect(result.current.editingId).toBe(2)
    expect(result.current.form).toEqual({ name: 'Second', value: 2 })
  })
})
