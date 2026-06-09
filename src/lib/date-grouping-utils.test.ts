import { describe, it, expect } from 'vitest'
import { nextMorningCutoff } from './date-grouping-utils'

describe('nextMorningCutoff', () => {
  it('returns 08:00 Prague (CEST) the next morning for an evening match', () => {
    // 2026-06-11 21:00+02 → cutoff 2026-06-12 08:00+02 = 06:00 UTC
    const instant = new Date('2026-06-11T21:00:00+02:00')
    expect(nextMorningCutoff(instant)).toBe(new Date('2026-06-12T08:00:00+02:00').getTime())
  })

  it('rolls to the next calendar day based on Prague local day, not UTC', () => {
    // 2026-06-12 00:30+02 is still 11 June 22:30 UTC; Prague day is the 12th,
    // so the cutoff must be the 13th at 08:00 Prague.
    const instant = new Date('2026-06-12T00:30:00+02:00')
    expect(nextMorningCutoff(instant)).toBe(new Date('2026-06-13T08:00:00+02:00').getTime())
  })

  it('includes that night/early-morning matches but excludes the next afternoon', () => {
    const cutoff = nextMorningCutoff(new Date('2026-06-11T21:00:00+02:00'))
    const earlyMorning = new Date('2026-06-12T04:00:00+02:00').getTime()
    const nextAfternoon = new Date('2026-06-12T18:00:00+02:00').getTime()
    expect(earlyMorning).toBeLessThan(cutoff)
    expect(nextAfternoon).toBeGreaterThanOrEqual(cutoff)
  })

  it('respects a custom hour and time zone', () => {
    const instant = new Date('2026-01-15T20:00:00Z')
    // Winter: Prague is CET (+01). 10:00 next day = 09:00 UTC.
    expect(nextMorningCutoff(instant, 10)).toBe(new Date('2026-01-16T10:00:00+01:00').getTime())
  })
})
