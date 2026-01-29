-- Add evaluatorId column to LeagueSpecialBetSingle
-- This links each special bet to a specific evaluator that determines how points are calculated

-- Step 1: Add the column as nullable first
ALTER TABLE "LeagueSpecialBetSingle" ADD COLUMN "evaluatorId" INTEGER;

-- Step 2: Create default evaluators for leagues that have special bets but no special evaluators
-- This ensures all special bets can be linked to an evaluator
INSERT INTO "Evaluator" (name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
SELECT
  'Default Special Bet Evaluator',
  (SELECT id FROM "EvaluatorType" WHERE name = 'exact_team' LIMIT 1),
  lsbs."leagueId",
  'special',
  5,
  NOW(),
  NOW()
FROM "LeagueSpecialBetSingle" lsbs
WHERE lsbs."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Evaluator" e
    WHERE e."leagueId" = lsbs."leagueId"
      AND e.entity = 'special'
      AND e."deletedAt" IS NULL
  )
GROUP BY lsbs."leagueId"
ON CONFLICT DO NOTHING;

-- Step 3: For existing records, set evaluatorId to the first 'special' entity evaluator in their league
UPDATE "LeagueSpecialBetSingle" lsbs
SET "evaluatorId" = (
  SELECT e.id
  FROM "Evaluator" e
  WHERE e."leagueId" = lsbs."leagueId"
    AND e.entity = 'special'
    AND e."deletedAt" IS NULL
  ORDER BY e.id ASC
  LIMIT 1
)
WHERE "evaluatorId" IS NULL;

-- Step 4: Make the column NOT NULL (this should now work since all records have evaluatorId)
ALTER TABLE "LeagueSpecialBetSingle" ALTER COLUMN "evaluatorId" SET NOT NULL;

-- Step 5: Add foreign key constraint
ALTER TABLE "LeagueSpecialBetSingle"
  ADD CONSTRAINT "LeagueSpecialBetSingle_evaluatorId_fkey"
  FOREIGN KEY ("evaluatorId")
  REFERENCES "Evaluator"("id")
  ON DELETE NO ACTION
  ON UPDATE CASCADE;

-- Step 6: Add index for better query performance
CREATE INDEX "LeagueSpecialBetSingle_evaluatorId_idx" ON "LeagueSpecialBetSingle"("evaluatorId");
