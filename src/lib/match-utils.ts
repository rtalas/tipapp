import { EVENT_DURATION_MS } from '@/lib/constants'

// Helper to get match status
export function getMatchStatus(match: {
  dateTime: Date
  isEvaluated: boolean
}): 'scheduled' | 'live' | 'finished' | 'evaluated' {
  const now = new Date()
  const matchTime = new Date(match.dateTime)
  const matchEndEstimate = new Date(matchTime.getTime() + EVENT_DURATION_MS)

  if (match.isEvaluated) return 'evaluated'
  if (now < matchTime) return 'scheduled'
  if (now >= matchTime && now <= matchEndEstimate) return 'live'
  return 'finished'
}

// A match is a "placeholder" until both teams are assigned.
// Placeholders show in the schedule but cannot be bet on.
export function isMatchPlaceholder(match: {
  homeTeamId: number | null
  awayTeamId: number | null
}): boolean {
  return match.homeTeamId === null || match.awayTeamId === null
}

