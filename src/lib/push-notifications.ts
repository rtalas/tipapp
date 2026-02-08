import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

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

interface UserNeedingNotification {
  userId: number
  leagueMatchId: number
  matchDateTime: Date
  homeTeamName: string
  awayTeamName: string
  leagueId: number
  subscriptions: SubscriptionData[]
}

/**
 * Find users who need notifications for upcoming matches
 * Returns users who:
 * - Are active league members
 * - Have notifyHours > 0 (notifications enabled)
 * - Match is within their notification window
 * - Have NOT placed a bet
 * - Have NOT been notified
 * - Have active push subscriptions
 */
export async function findUsersNeedingNotification(): Promise<UserNeedingNotification[]> {
  const now = new Date()
  const maxNotifyWindow = 24 * 60 // 24 hours in minutes (max notification window)
  const maxDateTime = new Date(now.getTime() + maxNotifyWindow * 60 * 1000)

  // Find all matches starting within the max notification window
  const upcomingMatches = await prisma.leagueMatch.findMany({
    where: {
      deletedAt: null,
      Match: {
        deletedAt: null,
        dateTime: {
          gt: now,
          lte: maxDateTime,
        },
      },
      League: {
        deletedAt: null,
        isActive: true,
      },
    },
    include: {
      Match: {
        include: {
          LeagueTeam_Match_homeTeamIdToLeagueTeam: {
            include: { Team: true },
          },
          LeagueTeam_Match_awayTeamIdToLeagueTeam: {
            include: { Team: true },
          },
        },
      },
      League: true,
      UserBet: {
        where: { deletedAt: null },
        select: { leagueUserId: true },
      },
      SentNotification: {
        select: { userId: true },
      },
    },
  })

  // Batch-fetch all active league users for all relevant leagues (single query)
  const leagueIds = [...new Set(upcomingMatches.map((m) => m.leagueId))]
  const allLeagueUsers = await prisma.leagueUser.findMany({
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

  // Group league users by leagueId for O(1) lookup
  const leagueUsersByLeagueId = new Map<number, typeof allLeagueUsers>()
  for (const lu of allLeagueUsers) {
    const list = leagueUsersByLeagueId.get(lu.leagueId) || []
    list.push(lu)
    leagueUsersByLeagueId.set(lu.leagueId, list)
  }

  const usersToNotify: UserNeedingNotification[] = []

  for (const leagueMatch of upcomingMatches) {
    const matchDateTime = leagueMatch.Match.dateTime
    const minutesUntilMatch = (matchDateTime.getTime() - now.getTime()) / (60 * 1000)

    // Find active users in this league who haven't bet and haven't been notified
    const usersWithBetIds = new Set(leagueMatch.UserBet.map((bet) => bet.leagueUserId))
    const notifiedUserIds = new Set(leagueMatch.SentNotification.map((sn) => sn.userId))

    const leagueUsers = leagueUsersByLeagueId.get(leagueMatch.leagueId) || []

    for (const leagueUser of leagueUsers) {
      // Skip if user already placed a bet
      if (usersWithBetIds.has(leagueUser.id)) continue

      // Skip if user already notified for this match
      if (notifiedUserIds.has(leagueUser.userId)) continue

      // Skip if user has no push subscriptions
      if (leagueUser.User.PushSubscription.length === 0) continue

      // Check if match is within user's notification window
      // notifyHours is stored as minutes
      const userNotifyMinutes = leagueUser.User.notifyHours
      if (minutesUntilMatch > userNotifyMinutes) continue

      usersToNotify.push({
        userId: leagueUser.userId,
        leagueMatchId: leagueMatch.id,
        matchDateTime,
        homeTeamName: leagueMatch.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.Team.name,
        awayTeamName: leagueMatch.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.Team.name,
        leagueId: leagueMatch.leagueId,
        subscriptions: leagueUser.User.PushSubscription.map((sub) => ({
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        })),
      })
    }
  }

  return usersToNotify
}

interface NotificationResult {
  processed: number
  sent: number
  failed: number
}

/**
 * Process and send all pending notifications
 */
export async function processNotifications(): Promise<NotificationResult> {
  const usersToNotify = await findUsersNeedingNotification()

  const result: NotificationResult = {
    processed: usersToNotify.length,
    sent: 0,
    failed: 0,
  }

  for (const user of usersToNotify) {
    // Create notification payload
    const payload: PushPayload = {
      title: 'Bet Reminder',
      body: `${user.homeTeamName} vs ${user.awayTeamName} - Place your bet before the match starts!`,
      icon: '/favicon-32x32.png',
      badge: '/favicon-32x32.png',
      tag: `match-${user.leagueMatchId}`,
      data: {
        url: `/${user.leagueId}/matches`,
      },
    }

    // Send to all user's subscriptions
    let anySent = false
    for (const subscription of user.subscriptions) {
      const sent = await sendPushNotification(subscription, payload)
      if (sent) anySent = true
    }

    if (anySent) {
      // Record that notification was sent (prevents duplicate notifications)
      try {
        await prisma.sentNotification.create({
          data: {
            userId: user.userId,
            leagueMatchId: user.leagueMatchId,
          },
        })
        result.sent++
      } catch (error) {
        // Unique constraint violation means already notified
        console.error('Failed to record sent notification:', error)
        result.failed++
      }
    } else {
      result.failed++
    }
  }

  return result
}
