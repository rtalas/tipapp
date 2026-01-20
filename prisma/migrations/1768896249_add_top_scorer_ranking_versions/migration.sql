-- TopScorerRankingVersion table (already created via prisma db push)
-- This migration file documents the schema and backfills existing data

-- Create table (if not exists - for documentation purposes)
CREATE TABLE IF NOT EXISTS "TopScorerRankingVersion" (
    "id" SERIAL NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "leaguePlayerId" INTEGER NOT NULL,
    "ranking" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(6) NOT NULL,
    "effectiveTo" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "createdByUserId" INTEGER,

    CONSTRAINT "TopScorerRankingVersion_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys (if not exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TopScorerRankingVersion_leagueId_fkey') THEN
        ALTER TABLE "TopScorerRankingVersion" ADD CONSTRAINT "TopScorerRankingVersion_leagueId_fkey"
            FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TopScorerRankingVersion_leaguePlayerId_fkey') THEN
        ALTER TABLE "TopScorerRankingVersion" ADD CONSTRAINT "TopScorerRankingVersion_leaguePlayerId_fkey"
            FOREIGN KEY ("leaguePlayerId") REFERENCES "LeaguePlayer"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TopScorerRankingVersion_createdByUserId_fkey') THEN
        ALTER TABLE "TopScorerRankingVersion" ADD CONSTRAINT "TopScorerRankingVersion_createdByUserId_fkey"
            FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add indexes for efficient time-based lookups (if not exist)
CREATE INDEX IF NOT EXISTS "TopScorerRankingVersion_leagueId_effectiveFrom_idx"
    ON "TopScorerRankingVersion"("leagueId", "effectiveFrom");
CREATE INDEX IF NOT EXISTS "TopScorerRankingVersion_leaguePlayerId_effectiveFrom_idx"
    ON "TopScorerRankingVersion"("leaguePlayerId", "effectiveFrom");
CREATE INDEX IF NOT EXISTS "TopScorerRankingVersion_leagueId_effectiveTo_idx"
    ON "TopScorerRankingVersion"("leagueId", "effectiveTo");

-- Backfill existing rankings from LeaguePlayer.topScorerRanking
-- Use league's createdAt as effectiveFrom (conservative choice for historical data)
INSERT INTO "TopScorerRankingVersion" (
    "leagueId",
    "leaguePlayerId",
    "ranking",
    "effectiveFrom",
    "effectiveTo",
    "createdAt",
    "createdByUserId"
)
SELECT
    lt."leagueId",
    lp."id",
    lp."topScorerRanking",
    l."createdAt",  -- Use league creation time as effective start
    NULL,           -- Current version (no end date)
    NOW(),          -- Migration timestamp
    NULL            -- No user attribution for migrated data
FROM "LeaguePlayer" lp
JOIN "LeagueTeam" lt ON lp."leagueTeamId" = lt."id"
JOIN "League" l ON lt."leagueId" = l."id"
WHERE lp."topScorerRanking" IS NOT NULL
  AND lp."deletedAt" IS NULL
  AND lt."deletedAt" IS NULL
  AND l."deletedAt" IS NULL
  -- Avoid duplicates if migration runs multiple times
  AND NOT EXISTS (
      SELECT 1 FROM "TopScorerRankingVersion" tsrv
      WHERE tsrv."leaguePlayerId" = lp."id"
        AND tsrv."effectiveTo" IS NULL
  );
