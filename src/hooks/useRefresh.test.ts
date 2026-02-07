import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRefresh } from './useRefresh'

const mockRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    refresh: mockRefresh,
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

describe('useRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with isRefreshing false', () => {
    const { result } = renderHook(() => useRefresh())

    expect(result.current.isRefreshing).toBe(false)
  })

  it('should set isRefreshing on refresh and clear after 500ms', () => {
    const { result } = renderHook(() => useRefresh())

    act(() => {
      result.current.refresh()
    })

    expect(result.current.isRefreshing).toBe(true)

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current.isRefreshing).toBe(false)
  })

  it('should call router.refresh on refresh', () => {
    const { result } = renderHook(() => useRefresh())

    act(() => {
      result.current.refresh()
    })

    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('should resolve refreshAsync after 500ms', async () => {
    const { result } = renderHook(() => useRefresh())
    let resolved = false

    await act(async () => {
      const promise = result.current.refreshAsync().then(() => {
        resolved = true
      })
      vi.advanceTimersByTime(500)
      await promise
    })

    expect(resolved).toBe(true)
    expect(result.current.isRefreshing).toBe(false)
  })

  it('should call router.refresh on refreshAsync', async () => {
    const { result } = renderHook(() => useRefresh())

    await act(async () => {
      const promise = result.current.refreshAsync()
      vi.advanceTimersByTime(500)
      await promise
    })

    expect(mockRefresh).toHaveBeenCalled()
  })

  it('should clean up timeout on unmount', () => {
    const { result, unmount } = renderHook(() => useRefresh())

    act(() => {
      result.current.refresh()
    })

    unmount()

    // Should not throw or cause issues when timer fires after unmount
    act(() => {
      vi.advanceTimersByTime(500)
    })
  })
})
