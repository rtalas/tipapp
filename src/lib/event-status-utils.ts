/**
 * Utility functions for determining event status (current vs past)
 * and badge display logic across all bet types.
 */

const THREE_HOURS_MS = 3 * 60 * 60 * 1000

/**
 * Determines if an event should appear in the "Current" tab.
 * An event is current if:
 * - It's scheduled (dateTime > now), OR
 * - It started within the last 3 hours (dateTime > now - 3 hours)
 *
 * Note: Accepts string because dates from unstable_cache are serialized to strings
 */
export function isCurrentEvent(dateTime: Date | string): boolean {
  const now = new Date()
  const threeHoursAgo = new Date(now.getTime() - THREE_HOURS_MS)
  const eventDate = dateTime instanceof Date ? dateTime : new Date(dateTime)
  return eventDate > threeHoursAgo
}

/**
 * Determines if an event should appear in the "Past" tab.
 * An event is past if it started more than 3 hours ago.
 */
export function isPastEvent(dateTime: Date): boolean {
  return !isCurrentEvent(dateTime)
}

/**
 * Determines if an event is scheduled (hasn't started yet).
 *
 * Note: Accepts string because dates from unstable_cache are serialized to strings
 */
export function isScheduledEvent(dateTime: Date | string): boolean {
  const eventDate = dateTime instanceof Date ? dateTime : new Date(dateTime)
  return eventDate > new Date()
}

/**
 * Event status for badge display
 */
export type EventStatus = 'scheduled' | 'awaiting-evaluation' | 'evaluated'

/**
 * Gets the status of an event for badge display purposes.
 * - 'scheduled': Event hasn't started yet
 * - 'awaiting-evaluation': Event started but not evaluated
 * - 'evaluated': Event has been evaluated (show points instead)
 *
 * Note: Accepts string because dates from unstable_cache are serialized to strings
 */
export function getEventStatus(dateTime: Date | string, isEvaluated: boolean): EventStatus {
  if (isEvaluated) {
    return 'evaluated'
  }
  if (isScheduledEvent(dateTime)) {
    return 'scheduled'
  }
  return 'awaiting-evaluation'
}
