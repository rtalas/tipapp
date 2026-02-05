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
 */
export function isCurrentEvent(dateTime: Date): boolean {
  const now = new Date()
  const threeHoursAgo = new Date(now.getTime() - THREE_HOURS_MS)
  return dateTime > threeHoursAgo
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
 */
export function isScheduledEvent(dateTime: Date): boolean {
  return dateTime > new Date()
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
 */
export function getEventStatus(dateTime: Date, isEvaluated: boolean): EventStatus {
  if (isEvaluated) {
    return 'evaluated'
  }
  if (isScheduledEvent(dateTime)) {
    return 'scheduled'
  }
  return 'awaiting-evaluation'
}
