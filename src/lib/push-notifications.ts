import webpush from 'web-push'
import { prisma } from '@/lib/prisma'
import { NOTIFICATION_EVENT_TYPES, type NotificationEventType } from '@/lib/constants'

// Configure VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@tipapp.com'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

export function getVapidPublicKey(): string | undefined {
  return vapidPublicKey
}

interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: {
    url?: string
    [key: string]: unknown
  }
}

interface SubscriptionData {
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Send a push notification to a single subscription
 */
export async function sendPushNotification(
  subscription: SubscriptionData,
  payload: PushPayload
): Promise<boolean> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('VAPID keys not configured')
    return false
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  }

  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    )
    return true
  } catch (error) {
    // Handle expired/invalid subscriptions
    if (error instanceof webpush.WebPushError) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        // Subscription expired or unsubscribed - mark as deleted
        await prisma.pushSubscription.updateMany({
          where: {
            endpoint: subscription.endpoint,
            deletedAt: null,
          },
          data: {
            deletedAt: new Date(),
          },
        })
        console.log(`Marked expired subscription as deleted: ${subscription.endpoint.slice(0, 50)}...`)
      }
    }
    console.error('Failed to send push notification:', error)
    return false
  }
}

// ── Notification finding ──────────────────────────────────────────────

interface EventNotification {
  userId: number
  eventId: number
  eventType: NotificationEventType
  leagueId: number
  title: string
  body: string
  tag: string
  url: string
  subscriptions: SubscriptionData[]
}

/**
 * Fetch all active league users who have notifications enabled and push subscriptions.
 * Returns a Map grouped by leagueId for O(1) lookup.
 */
async function fetchNotifiableLeagueUsers(leagueIds: number[]) {
  const allLeagueUsers = leagueIds.length === 0 ? [] : await prisma.leagueUser.findMany({
    where: {
      leagueId: { in: leagueIds },
      deletedAt: null,
      active: true,
      User: {
        deletedAt: null,
        notifyHours: { gt: 0 },
      },
    },
    include: {
      User: {
        include: {
          PushSubscription: {
            where: { deletedAt: null },
          },
        },
      },
    },
  })

  const byLeagueId = new Map<number, typeof allLeagueUsers>()
  for (const lu of allLeagueUsers) {
    const list = byLeagueId.get(lu.leagueId) || []
    list.push(lu)
    byLeagueId.set(lu.leagueId, list)
  }
  return byLeagueId
}

/**
 * Filter league users who need a notification for a specific event.
 */
function filterUsersForEvent(params: {
  now: Date
  leagueId: number
  eventId: number
  eventType: NotificationEventType
  eventDateTime: Date
  leagueUsersByLeagueId: Awaited<ReturnType<typeof fetchNotifiableLeagueUsers>>
  usersWithBetLeagueUserIds: Set<number>
  notifiedUserIds: Set<number>
  title: string
  body: string
  tag: string
  url: string
}): EventNotification[] {
  const minutesUntilEvent = (params.eventDateTime.getTime() - params.now.getTime()) / (60 * 1000)
  const leagueUsers = params.leagueUsersByLeagueId.get(params.leagueId) || []
  const results: EventNotification[] = []

  for (const leagueUser of leagueUsers) {
    if (params.usersWithBetLeagueUserIds.has(leagueUser.id)) continue
    if (params.notifiedUserIds.has(leagueUser.userId)) continue
    if (leagueUser.User.PushSubscription.length === 0) continue

    // notifyHours is stored as minutes
    const userNotifyMinutes = leagueUser.User.notifyHours
    if (minutesUntilEvent > userNotifyMinutes) continue

    results.push({
      userId: leagueUser.userId,
      eventId: params.eventId,
      eventType: params.eventType,
      leagueId: params.leagueId,
      title: params.title,
      body: params.body,
      tag: params.tag,
      url: params.url,
      subscriptions: leagueUser.User.PushSubscription.map((sub) => ({
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
      })),
    })
  }

  return results
}

/**
 * Build a Map of eventId → Set of notified userIds from SentNotification records.
 */
async function fetchSentNotifications(eventType: NotificationEventType, eventIds: number[]) {
  if (eventIds.length === 0) return new Map<number, Set<number>>()

  const sent = await prisma.sentNotification.findMany({
    where: { eventType, eventId: { in: eventIds }, deletedAt: null },
    select: { userId: true, eventId: true },
  })

  const byEventId = new Map<number, Set<number>>()
  for (const sn of sent) {
    const set = byEventId.get(sn.eventId) || new Set<number>()
    set.add(sn.userId)
    byEventId.set(sn.eventId, set)
  }
  return byEventId
}

// ── Per-event-type finders ────────────────────────────────────────────

const NOTIFY_TITLE = 'Připomínka tipování'
const NOTIFY_SUFFIX = 'Nezapomeň tipovat!'

async function findMatchNotifications(
  now: Date,
  maxDateTime: Date,
  leagueUsersByLeagueId: Awaited<ReturnType<typeof fetchNotifiableLeagueUsers>>,
): Promise<EventNotification[]> {
  const upcomingMatches = await prisma.leagueMatch.findMany({
    where: {
      deletedAt: null,
      Match: {
        deletedAt: null,
        dateTime: { gt: now, lte: maxDateTime },
      },
      League: { deletedAt: null, isActive: true },
    },
    include: {
      Match: {
        include: {
          LeagueTeam_Match_homeTeamIdToLeagueTeam: { include: { Team: true } },
          LeagueTeam_Match_awayTeamIdToLeagueTeam: { include: { Team: true } },
        },
      },
      UserBet: { where: { deletedAt: null }, select: { leagueUserId: true } },
    },
  })

  if (upcomingMatches.length === 0) return []

  const sentByEventId = await fetchSentNotifications(
    NOTIFICATION_EVENT_TYPES.MATCH,
    upcomingMatches.map((m) => m.id),
  )

  const results: EventNotification[] = []
  for (const lm of upcomingMatches) {
    const home = lm.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.Team.name
    const away = lm.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.Team.name

    results.push(...filterUsersForEvent({
      now,
      leagueId: lm.leagueId,
      eventId: lm.id,
      eventType: NOTIFICATION_EVENT_TYPES.MATCH,
      eventDateTime: lm.Match.dateTime,
      leagueUsersByLeagueId,
      usersWithBetLeagueUserIds: new Set(lm.UserBet.map((b) => b.leagueUserId)),
      notifiedUserIds: sentByEventId.get(lm.id) || new Set(),
      title: NOTIFY_TITLE,
      body: `${home} vs ${away} - ${NOTIFY_SUFFIX}`,
      tag: `match-${lm.id}`,
      url: `/${lm.leagueId}/matches`,
    }))
  }
  return results
}

async function findSeriesNotifications(
  now: Date,
  maxDateTime: Date,
  leagueUsersByLeagueId: Awaited<ReturnType<typeof fetchNotifiableLeagueUsers>>,
): Promise<EventNotification[]> {
  const upcomingSeries = await prisma.leagueSpecialBetSerie.findMany({
    where: {
      deletedAt: null,
      dateTime: { gt: now, lte: maxDateTime },
      League: { deletedAt: null, isActive: true },
    },
    include: {
      SpecialBetSerie: true,
      LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam: { include: { Team: true } },
      LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam: { include: { Team: true } },
      UserSpecialBetSerie: { where: { deletedAt: null }, select: { leagueUserId: true } },
    },
  })

  if (upcomingSeries.length === 0) return []

  const sentByEventId = await fetchSentNotifications(
    NOTIFICATION_EVENT_TYPES.SERIES,
    upcomingSeries.map((s) => s.id),
  )

  const results: EventNotification[] = []
  for (const serie of upcomingSeries) {
    const home = serie.LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam.Team.name
    const away = serie.LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam.Team.name

    results.push(...filterUsersForEvent({
      now,
      leagueId: serie.leagueId,
      eventId: serie.id,
      eventType: NOTIFICATION_EVENT_TYPES.SERIES,
      eventDateTime: serie.dateTime,
      leagueUsersByLeagueId,
      usersWithBetLeagueUserIds: new Set(serie.UserSpecialBetSerie.map((b) => b.leagueUserId)),
      notifiedUserIds: sentByEventId.get(serie.id) || new Set(),
      title: NOTIFY_TITLE,
      body: `${home} vs ${away} (série) - ${NOTIFY_SUFFIX}`,
      tag: `series-${serie.id}`,
      url: `/${serie.leagueId}/series`,
    }))
  }
  return results
}

async function findSpecialBetNotifications(
  now: Date,
  maxDateTime: Date,
  leagueUsersByLeagueId: Awaited<ReturnType<typeof fetchNotifiableLeagueUsers>>,
): Promise<EventNotification[]> {
  const upcomingBets = await prisma.leagueSpecialBetSingle.findMany({
    where: {
      deletedAt: null,
      dateTime: { gt: now, lte: maxDateTime },
      League: { deletedAt: null, isActive: true },
    },
    include: {
      UserSpecialBetSingle: { where: { deletedAt: null }, select: { leagueUserId: true } },
    },
  })

  if (upcomingBets.length === 0) return []

  const sentByEventId = await fetchSentNotifications(
    NOTIFICATION_EVENT_TYPES.SPECIAL_BET,
    upcomingBets.map((b) => b.id),
  )

  const results: EventNotification[] = []
  for (const bet of upcomingBets) {
    results.push(...filterUsersForEvent({
      now,
      leagueId: bet.leagueId,
      eventId: bet.id,
      eventType: NOTIFICATION_EVENT_TYPES.SPECIAL_BET,
      eventDateTime: bet.dateTime,
      leagueUsersByLeagueId,
      usersWithBetLeagueUserIds: new Set(bet.UserSpecialBetSingle.map((b) => b.leagueUserId)),
      notifiedUserIds: sentByEventId.get(bet.id) || new Set(),
      title: NOTIFY_TITLE,
      body: `${bet.name} - ${NOTIFY_SUFFIX}`,
      tag: `special-bet-${bet.id}`,
      url: `/${bet.leagueId}/special-bets`,
    }))
  }
  return results
}

async function findQuestionNotifications(
  now: Date,
  maxDateTime: Date,
  leagueUsersByLeagueId: Awaited<ReturnType<typeof fetchNotifiableLeagueUsers>>,
): Promise<EventNotification[]> {
  const upcomingQuestions = await prisma.leagueSpecialBetQuestion.findMany({
    where: {
      deletedAt: null,
      dateTime: { gt: now, lte: maxDateTime },
      League: { deletedAt: null, isActive: true },
    },
    include: {
      UserSpecialBetQuestion: { where: { deletedAt: null }, select: { leagueUserId: true } },
    },
  })

  if (upcomingQuestions.length === 0) return []

  const sentByEventId = await fetchSentNotifications(
    NOTIFICATION_EVENT_TYPES.QUESTION,
    upcomingQuestions.map((q) => q.id),
  )

  const results: EventNotification[] = []
  for (const question of upcomingQuestions) {
    const truncatedText = question.text.length > 80
      ? question.text.slice(0, 80) + '...'
      : question.text

    results.push(...filterUsersForEvent({
      now,
      leagueId: question.leagueId,
      eventId: question.id,
      eventType: NOTIFICATION_EVENT_TYPES.QUESTION,
      eventDateTime: question.dateTime,
      leagueUsersByLeagueId,
      usersWithBetLeagueUserIds: new Set(question.UserSpecialBetQuestion.map((b) => b.leagueUserId)),
      notifiedUserIds: sentByEventId.get(question.id) || new Set(),
      title: NOTIFY_TITLE,
      body: `${truncatedText} - ${NOTIFY_SUFFIX}`,
      tag: `question-${question.id}`,
      url: `/${question.leagueId}/questions`,
    }))
  }
  return results
}

// ── Orchestrator ──────────────────────────────────────────────────────

interface NotificationResult {
  processed: number
  sent: number
  failed: number
}

/**
 * Process and send all pending notifications for all event types.
 */
export async function processNotifications(): Promise<NotificationResult> {
  const now = new Date()
  const maxDateTime = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  // Fetch all upcoming events in parallel to collect league IDs
  const [matches, series, specialBets, questions] = await Promise.all([
    prisma.leagueMatch.findMany({
      where: { deletedAt: null, Match: { deletedAt: null, dateTime: { gt: now, lte: maxDateTime } }, League: { deletedAt: null, isActive: true } },
      select: { leagueId: true },
      distinct: ['leagueId'],
    }),
    prisma.leagueSpecialBetSerie.findMany({
      where: { deletedAt: null, dateTime: { gt: now, lte: maxDateTime }, League: { deletedAt: null, isActive: true } },
      select: { leagueId: true },
      distinct: ['leagueId'],
    }),
    prisma.leagueSpecialBetSingle.findMany({
      where: { deletedAt: null, dateTime: { gt: now, lte: maxDateTime }, League: { deletedAt: null, isActive: true } },
      select: { leagueId: true },
      distinct: ['leagueId'],
    }),
    prisma.leagueSpecialBetQuestion.findMany({
      where: { deletedAt: null, dateTime: { gt: now, lte: maxDateTime }, League: { deletedAt: null, isActive: true } },
      select: { leagueId: true },
      distinct: ['leagueId'],
    }),
  ])

  const allLeagueIds = [...new Set([
    ...matches.map((m) => m.leagueId),
    ...series.map((s) => s.leagueId),
    ...specialBets.map((sb) => sb.leagueId),
    ...questions.map((q) => q.leagueId),
  ])]

  if (allLeagueIds.length === 0) {
    return { processed: 0, sent: 0, failed: 0 }
  }

  // Fetch all notifiable league users once
  const leagueUsersByLeagueId = await fetchNotifiableLeagueUsers(allLeagueIds)

  // Find notifications for all event types in parallel
  const [matchNotifs, seriesNotifs, specialBetNotifs, questionNotifs] = await Promise.all([
    findMatchNotifications(now, maxDateTime, leagueUsersByLeagueId),
    findSeriesNotifications(now, maxDateTime, leagueUsersByLeagueId),
    findSpecialBetNotifications(now, maxDateTime, leagueUsersByLeagueId),
    findQuestionNotifications(now, maxDateTime, leagueUsersByLeagueId),
  ])

  const allNotifications = [...matchNotifs, ...seriesNotifs, ...specialBetNotifs, ...questionNotifs]

  const result: NotificationResult = {
    processed: allNotifications.length,
    sent: 0,
    failed: 0,
  }

  for (const event of allNotifications) {
    const payload: PushPayload = {
      title: event.title,
      body: event.body,
      icon: '/favicon-32x32.png',
      badge: '/favicon-32x32.png',
      tag: event.tag,
      data: { url: event.url },
    }

    // Send to all user's subscriptions
    let anySent = false
    for (const subscription of event.subscriptions) {
      const sent = await sendPushNotification(subscription, payload)
      if (sent) anySent = true
    }

    if (anySent) {
      // Record that notification was sent (prevents duplicate notifications)
      try {
        const existing = await prisma.sentNotification.findFirst({
          where: {
            userId: event.userId,
            eventType: event.eventType,
            eventId: event.eventId,
          },
        })
        if (existing) {
          await prisma.sentNotification.updateMany({
            where: { id: existing.id },
            data: { deletedAt: null, sentAt: new Date() },
          })
        } else {
          await prisma.sentNotification.create({
            data: {
              userId: event.userId,
              eventType: event.eventType,
              eventId: event.eventId,
            },
          })
        }
        result.sent++
      } catch (error) {
        console.error('Failed to record sent notification:', error)
        result.failed++
      }
    } else {
      result.failed++
    }
  }

  return result
}
