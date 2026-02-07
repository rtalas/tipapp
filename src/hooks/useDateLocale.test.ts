import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { cs, enUS } from 'date-fns/locale'

vi.mock('next-intl', () => ({
  useLocale: vi.fn(),
}))

import { useLocale } from 'next-intl'
import { useDateLocale } from './useDateLocale'

const mockUseLocale = vi.mocked(useLocale)

describe('useDateLocale', () => {
  it('should return Czech locale for cs', () => {
    mockUseLocale.mockReturnValue('cs')
    const { result } = renderHook(() => useDateLocale())
    expect(result.current).toBe(cs)
  })

  it('should return English locale for en', () => {
    mockUseLocale.mockReturnValue('en')
    const { result } = renderHook(() => useDateLocale())
    expect(result.current).toBe(enUS)
  })

  it('should return English locale for unknown locale', () => {
    mockUseLocale.mockReturnValue('de')
    const { result } = renderHook(() => useDateLocale())
    expect(result.current).toBe(enUS)
  })
})
