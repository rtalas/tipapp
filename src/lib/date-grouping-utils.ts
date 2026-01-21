/**
 * Utility functions for grouping and formatting dates in list views
 */

import { format, isToday, isTomorrow, startOfDay } from 'date-fns'

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
  const dateExtractor = getDate || ((item: any) => item.dateTime)

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
 */
export function getDateLabel(date: Date): string {
  if (isToday(date)) {
    return 'Today'
  }
  if (isTomorrow(date)) {
    return 'Tomorrow'
  }
  return format(date, 'EEEE, MMM d')
}
