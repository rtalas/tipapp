/**
 * Utility functions for grouping and formatting dates in list views
 */

import { format, isToday, isTomorrow, startOfDay } from 'date-fns'
import type { Locale } from 'date-fns'

/**
 * Group items by date (ignoring time)
 * Returns a Map with ISO date strings as keys and arrays of items as values
 *
 * @param items - Array of items to group
 * @param getDate - Function to extract the date from each item (optional, defaults to item.dateTime)
 */
export function groupByDate<T>(
  items: T[],
  getDate?: (item: T) => Date
): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  const dateExtractor = getDate || ((item: T) => (item as { dateTime: Date }).dateTime)

  items.forEach((item) => {
    const date = startOfDay(dateExtractor(item))
    const key = date.toISOString()

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(item)
  })

  return groups
}

/**
 * Offset (in ms) of `timeZone` from UTC at the given instant. Positive east of UTC.
 * e.g. Europe/Prague in summer (CEST) = +2h = 7_200_000.
 */
function zonedOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - date.getTime()
}

/**
 * UTC timestamp (ms) for `hour:00` on the calendar day *after* the given instant's
 * day, interpreted in `timeZone`. DST-safe.
 *
 * Used to cap the final daily question's match window: with no following question
 * to bound it, the window would otherwise swallow every remaining match. Anchoring
 * the end at e.g. 08:00 next morning (Prague) keeps it to that night's / early-morning
 * games — matches stored in Europe/Prague run as late as ~04:00.
 */
export function nextMorningCutoff(instant: Date, hour = 8, timeZone = 'Europe/Prague'): number {
  // Calendar Y-M-D of the instant in the target zone.
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(instant)
    .split('-')
    .map(Number)

  // Wall-clock `hour:00` next day, resolved to a real UTC instant via the zone's
  // offset at roughly that moment (offset query is safe: DST never flips at 08:00).
  const wallNextMorningUtc = Date.UTC(year, month - 1, day + 1, hour, 0, 0)
  return wallNextMorningUtc - zonedOffsetMs(new Date(wallNextMorningUtc), timeZone)
}

/**
 * Get a human-readable label for a date
 * Returns "Today", "Tomorrow", or formatted date string
 * @param date - The date to format
 * @param locale - Optional date-fns locale for localized day/month names
 * @param translations - Optional translations for Today/Tomorrow
 */
export function getDateLabel(
  date: Date,
  locale?: Locale,
  translations?: { today: string; tomorrow: string }
): string {
  if (isToday(date)) {
    return translations?.today ?? 'Today'
  }
  if (isTomorrow(date)) {
    return translations?.tomorrow ?? 'Tomorrow'
  }
  // Czech format: "pátek, 13.2." - English format: "Friday, Feb 13"
  const isCzech = locale?.code === 'cs'
  const dateFormat = isCzech ? 'EEEE, d.M.' : 'EEEE, MMM d'
  return format(date, dateFormat, { locale })
}
