import { NextRequest, NextResponse } from 'next/server'
import { seedDemo, prisma } from '../../../../prisma/seed-demo'

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

    // Run demo seeding
    await seedDemo()

    console.log('Cron: Demo database seeded successfully')

    return NextResponse.json({
      success: true,
      message: 'Demo database seeded successfully',
    })
  } catch (error) {
    console.error('Cron demo seed error:', error)
    return NextResponse.json(
      { error: 'Failed to seed demo database' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
