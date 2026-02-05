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
