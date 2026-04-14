import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isCurrentEvent,
  isScheduledEvent,
  getEventStatus,
  isCurrentTabEvent,
} from './event-status-utils'

describe('event-status-utils', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-07T15:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('isCurrentEvent', () => {
    it('returns true for future event', () => {
      const future = new Date('2026-02-07T18:00:00Z')
      expect(isCurrentEvent(future)).toBe(true)
    })

    it('returns true for event that started less than 3 hours ago', () => {
      const recent = new Date('2026-02-07T13:00:00Z') // 2 hours ago
      expect(isCurrentEvent(recent)).toBe(true)
    })

    it('returns true for event that started exactly at the 3-hour boundary', () => {
      // 3 hours ago = 12:00:00, boundary is exclusive (eventDate > threeHoursAgo)
      const boundary = new Date('2026-02-07T12:00:01Z') // just inside 3h window
      expect(isCurrentEvent(boundary)).toBe(true)
    })

    it('returns false for event that started more than 3 hours ago', () => {
      const old = new Date('2026-02-07T11:00:00Z') // 4 hours ago
      expect(isCurrentEvent(old)).toBe(false)
    })

    it('accepts string dates (from unstable_cache serialization)', () => {
      const futureStr = '2026-02-07T18:00:00Z'
      expect(isCurrentEvent(futureStr)).toBe(true)

      const oldStr = '2026-02-07T10:00:00Z'
      expect(isCurrentEvent(oldStr)).toBe(false)
    })
  })


  describe('isScheduledEvent', () => {
    it('returns true for future event', () => {
      const future = new Date('2026-02-07T16:00:00Z')
      expect(isScheduledEvent(future)).toBe(true)
    })

    it('returns false for past event', () => {
      const past = new Date('2026-02-07T14:00:00Z')
      expect(isScheduledEvent(past)).toBe(false)
    })

    it('returns false for event at current time', () => {
      const now = new Date('2026-02-07T15:00:00Z')
      expect(isScheduledEvent(now)).toBe(false)
    })

    it('accepts string dates (from unstable_cache serialization)', () => {
      expect(isScheduledEvent('2026-02-07T16:00:00Z')).toBe(true)
      expect(isScheduledEvent('2026-02-07T14:00:00Z')).toBe(false)
    })
  })

  describe('isCurrentTabEvent', () => {
    const WINDOW_8H = 8 * 60 * 60 * 1000
    const WINDOW_12H = 12 * 60 * 60 * 1000

    it('returns true when not evaluated, regardless of updatedAt', () => {
      const oldDate = new Date('2026-02-07T00:00:00Z') // long ago
      expect(isCurrentTabEvent(false, oldDate, WINDOW_8H)).toBe(true)
    })

    it('returns true when evaluated within the window', () => {
      const sixHoursAgo = new Date('2026-02-07T09:00:00Z') // 6h ago, within 8h window
      expect(isCurrentTabEvent(true, sixHoursAgo, WINDOW_8H)).toBe(true)
    })

    it('returns false when evaluated outside the window', () => {
      const nineHoursAgo = new Date('2026-02-07T06:00:00Z') // 9h ago, outside 8h window
      expect(isCurrentTabEvent(true, nineHoursAgo, WINDOW_8H)).toBe(false)
    })

    it('respects different window sizes (12h)', () => {
      const tenHoursAgo = new Date('2026-02-07T05:00:00Z') // 10h ago
      expect(isCurrentTabEvent(true, tenHoursAgo, WINDOW_8H)).toBe(false)
      expect(isCurrentTabEvent(true, tenHoursAgo, WINDOW_12H)).toBe(true)
    })

    it('returns false when evaluated exactly at the window boundary', () => {
      // exactly 8h ago = boundary is exclusive (updatedAt > now - window)
      const exactlyAtBoundary = new Date('2026-02-07T07:00:00Z') // exactly 8h ago
      expect(isCurrentTabEvent(true, exactlyAtBoundary, WINDOW_8H)).toBe(false)
    })

    it('accepts string dates', () => {
      expect(isCurrentTabEvent(false, '2026-02-07T00:00:00Z', WINDOW_8H)).toBe(true)
      expect(isCurrentTabEvent(true, '2026-02-07T09:00:00Z', WINDOW_8H)).toBe(true)
      expect(isCurrentTabEvent(true, '2026-02-07T06:00:00Z', WINDOW_8H)).toBe(false)
    })
  })

  describe('getEventStatus', () => {
    it('returns "evaluated" when isEvaluated is true regardless of time', () => {
      const future = new Date('2026-02-07T18:00:00Z')
      expect(getEventStatus(future, true)).toBe('evaluated')

      const past = new Date('2026-02-07T10:00:00Z')
      expect(getEventStatus(past, true)).toBe('evaluated')
    })

    it('returns "scheduled" for future non-evaluated event', () => {
      const future = new Date('2026-02-07T16:00:00Z')
      expect(getEventStatus(future, false)).toBe('scheduled')
    })

    it('returns "awaiting-evaluation" for started non-evaluated event', () => {
      const started = new Date('2026-02-07T14:00:00Z')
      expect(getEventStatus(started, false)).toBe('awaiting-evaluation')
    })

    it('accepts string dates', () => {
      expect(getEventStatus('2026-02-07T16:00:00Z', false)).toBe('scheduled')
      expect(getEventStatus('2026-02-07T14:00:00Z', false)).toBe('awaiting-evaluation')
      expect(getEventStatus('2026-02-07T14:00:00Z', true)).toBe('evaluated')
    })
  })
})
