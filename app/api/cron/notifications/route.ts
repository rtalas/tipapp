import { NextRequest, NextResponse } from 'next/server'
import { processNotifications } from '@/lib/push-notifications'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Cron not configured' },
        { status: 503 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Process and send notifications
    const result = await processNotifications()

    console.log(`Cron: Processed ${result.processed} users, sent ${result.sent}, failed ${result.failed}`)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Cron notification error:', error)
    return NextResponse.json(
      { error: 'Failed to process notifications' },
      { status: 500 }
    )
  }
}