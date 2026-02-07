import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExpandableRow } from './useExpandableRow'

describe('useExpandableRow', () => {
  it('should initialize with no expanded rows', () => {
    const { result } = renderHook(() => useExpandableRow())

    expect(result.current.expandedIds.size).toBe(0)
    expect(result.current.isExpanded(1)).toBe(false)
  })

  it('should expand a row on toggleRow', () => {
    const { result } = renderHook(() => useExpandableRow())

    act(() => {
      result.current.toggleRow(5)
    })

    expect(result.current.isExpanded(5)).toBe(true)
  })

  it('should collapse an expanded row on toggleRow', () => {
    const { result } = renderHook(() => useExpandableRow())

    act(() => {
      result.current.toggleRow(5)
    })
    act(() => {
      result.current.toggleRow(5)
    })

    expect(result.current.isExpanded(5)).toBe(false)
  })

  it('should track multiple expanded rows independently', () => {
    const { result } = renderHook(() => useExpandableRow())

    act(() => {
      result.current.toggleRow(1)
      result.current.toggleRow(3)
      result.current.toggleRow(5)
    })

    expect(result.current.isExpanded(1)).toBe(true)
    expect(result.current.isExpanded(2)).toBe(false)
    expect(result.current.isExpanded(3)).toBe(true)
    expect(result.current.isExpanded(5)).toBe(true)
  })

  it('should collapse all rows on collapseAll', () => {
    const { result } = renderHook(() => useExpandableRow())

    act(() => {
      result.current.toggleRow(1)
      result.current.toggleRow(2)
      result.current.toggleRow(3)
    })
    act(() => {
      result.current.collapseAll()
    })

    expect(result.current.expandedIds.size).toBe(0)
    expect(result.current.isExpanded(1)).toBe(false)
    expect(result.current.isExpanded(2)).toBe(false)
    expect(result.current.isExpanded(3)).toBe(false)
  })

  it('should handle collapseAll when nothing is expanded', () => {
    const { result } = renderHook(() => useExpandableRow())

    act(() => {
      result.current.collapseAll()
    })

    expect(result.current.expandedIds.size).toBe(0)
  })

  it('should expose expandedIds as a Set', () => {
    const { result } = renderHook(() => useExpandableRow())

    act(() => {
      result.current.toggleRow(10)
      result.current.toggleRow(20)
    })

    expect(result.current.expandedIds).toBeInstanceOf(Set)
    expect(result.current.expandedIds.has(10)).toBe(true)
    expect(result.current.expandedIds.has(20)).toBe(true)
  })
})
