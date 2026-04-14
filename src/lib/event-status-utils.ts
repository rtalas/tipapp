/**
 * Utility functions for determining event status (current vs past)
 * and badge display logic across all bet types.
 */

import { EVENT_DURATION_MS } from '@/lib/constants'

/**
 * Determines if an event should appear in the "current" tab based on evaluation status.
 *
 * An event is current if:
 * - It has NOT been evaluated yet (waiting for results), OR
 * - It was evaluated within the last `postEvalWindowMs` milliseconds
 *   (so users can see their scores before the event moves to "past")
 *
 * Uses `updatedAt` as a proxy for when evaluation occurred.
 * Note: Accepts strings because dates from unstable_cache are serialized to strings.
 */
export function isCurrentTabEvent(
  isEvaluated: boolean,
  updatedAt: Date | string,
  postEvalWindowMs: number
): boolean {
  if (!isEvaluated) return true
  const now = new Date()
  const updatedAtDate = updatedAt instanceof Date ? updatedAt : new Date(updatedAt)
  return updatedAtDate > new Date(now.getTime() - postEvalWindowMs)
}

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
  const threeHoursAgo = new Date(now.getTime() - EVENT_DURATION_MS)
  const eventDate = dateTime instanceof Date ? dateTime : new Date(dateTime)
  return eventDate > threeHoursAgo
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
