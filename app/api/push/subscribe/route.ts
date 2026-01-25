import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { nullableUniqueConstraint } from '@/lib/prisma-utils'
import { getVapidPublicKey } from '@/lib/push-notifications'
import { z } from 'zod'

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = parseInt(session.user.id, 10)
    const body = await request.json()
    const validatedData = subscriptionSchema.parse(body)

    // Get user agent for debugging
    const userAgent = request.headers.get('user-agent') || undefined

    // Upsert subscription (handles re-subscription after browser restart)
    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint_deletedAt: nullableUniqueConstraint({
          userId,
          endpoint: validatedData.endpoint,
          deletedAt: null,
        }),
      },
      update: {
        p256dh: validatedData.keys.p256dh,
        auth: validatedData.keys.auth,
        userAgent,
        updatedAt: new Date(),
      },
      create: {
        userId,
        endpoint: validatedData.endpoint,
        p256dh: validatedData.keys.p256dh,
        auth: validatedData.keys.auth,
        userAgent,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      )
    }

    console.error('Failed to save push subscription:', error)
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve VAPID public key
export async function GET() {
  const vapidPublicKey = getVapidPublicKey()

  if (!vapidPublicKey) {
    return NextResponse.json(
      { error: 'Push notifications not configured' },
      { status: 503 }
    )
  }

  return NextResponse.json({ vapidPublicKey })
}
