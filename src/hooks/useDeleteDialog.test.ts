import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDeleteDialog } from './useDeleteDialog'

interface TestItem {
  id: number
  name: string
}

describe('useDeleteDialog', () => {
  it('should initialize with closed state', () => {
    const { result } = renderHook(() => useDeleteDialog<TestItem>())

    expect(result.current.open).toBe(false)
    expect(result.current.itemToDelete).toBeNull()
    expect(result.current.isDeleting).toBe(false)
  })

  it('should open dialog with item on openDialog', () => {
    const { result } = renderHook(() => useDeleteDialog<TestItem>())
    const item = { id: 1, name: 'Team A' }

    act(() => {
      result.current.openDialog(item)
    })

    expect(result.current.open).toBe(true)
    expect(result.current.itemToDelete).toBe(item)
  })

  it('should reset all state on closeDialog', () => {
    const { result } = renderHook(() => useDeleteDialog<TestItem>())

    act(() => {
      result.current.openDialog({ id: 1, name: 'Team A' })
      result.current.startDeleting()
    })
    act(() => {
      result.current.closeDialog()
    })

    expect(result.current.open).toBe(false)
    expect(result.current.itemToDelete).toBeNull()
    expect(result.current.isDeleting).toBe(false)
  })

  it('should set isDeleting on startDeleting', () => {
    const { result } = renderHook(() => useDeleteDialog<TestItem>())

    act(() => {
      result.current.startDeleting()
    })

    expect(result.current.isDeleting).toBe(true)
  })

  it('should close dialog and reset on finishDeleting', () => {
    const { result } = renderHook(() => useDeleteDialog<TestItem>())

    act(() => {
      result.current.openDialog({ id: 1, name: 'Team A' })
      result.current.startDeleting()
    })
    act(() => {
      result.current.finishDeleting()
    })

    expect(result.current.open).toBe(false)
    expect(result.current.isDeleting).toBe(false)
    expect(result.current.itemToDelete).toBeNull()
  })

  it('should only reset isDeleting on cancelDeleting (keeps dialog open)', () => {
    const { result } = renderHook(() => useDeleteDialog<TestItem>())

    act(() => {
      result.current.openDialog({ id: 1, name: 'Team A' })
      result.current.startDeleting()
    })
    act(() => {
      result.current.cancelDeleting()
    })

    expect(result.current.isDeleting).toBe(false)
    expect(result.current.open).toBe(true)
    expect(result.current.itemToDelete).toEqual({ id: 1, name: 'Team A' })
  })

  it('should close and reset state via onOpenChange(false)', () => {
    const { result } = renderHook(() => useDeleteDialog<TestItem>())

    act(() => {
      result.current.openDialog({ id: 99, name: 'Test' })
      result.current.startDeleting()
    })

    expect(result.current.open).toBe(true)

    act(() => {
      result.current.onOpenChange(false)
    })

    expect(result.current.open).toBe(false)
    expect(result.current.itemToDelete).toBeNull()
    expect(result.current.isDeleting).toBe(false)
  })
})
