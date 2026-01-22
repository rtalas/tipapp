#!/usr/bin/env tsx

/**
 * One-time migration script to populate default prizes for existing leagues.
 *
 * This script adds three default prize tiers to all active leagues:
 * - 1st place: 1,000 Kč
 * - 2nd place: 600 Kč
 * - 3rd place: 200 Kč
 *
 * Run this script manually after deployment:
 * npx tsx scripts/migrate-default-prizes.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting prize migration...')

  // Fetch all active leagues
  const activeLeagues = await prisma.league.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
    },
  })

  console.log(`Found ${activeLeagues.length} active leagues`)

  if (activeLeagues.length === 0) {
    console.log('No active leagues found. Exiting.')
    return
  }

  const now = new Date()
  let migratedCount = 0

  for (const league of activeLeagues) {
    // Check if league already has prizes
    const existingPrizes = await prisma.leaguePrize.findMany({
      where: {
        leagueId: league.id,
        deletedAt: null,
      },
    })

    if (existingPrizes.length > 0) {
      console.log(`⏭️  Skipping league "${league.name}" (already has ${existingPrizes.length} prizes)`)
      continue
    }

    // Create default prizes
    await prisma.leaguePrize.createMany({
      data: [
        {
          leagueId: league.id,
          rank: 1,
          amount: 100000, // 1,000 Kč (in minor units)
          currency: 'CZK',
          createdAt: now,
          updatedAt: now,
        },
        {
          leagueId: league.id,
          rank: 2,
          amount: 60000, // 600 Kč (in minor units)
          currency: 'CZK',
          createdAt: now,
          updatedAt: now,
        },
        {
          leagueId: league.id,
          rank: 3,
          amount: 20000, // 200 Kč (in minor units)
          currency: 'CZK',
          createdAt: now,
          updatedAt: now,
        },
      ],
    })

    console.log(`✅ Migrated league "${league.name}" (ID: ${league.id})`)
    migratedCount++
  }

  console.log(`\n🎉 Migration complete! ${migratedCount} leagues updated.`)
}

main()
  .catch((error) => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
