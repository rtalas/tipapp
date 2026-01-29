-- Add new evaluator type (only if it doesn't exist)
INSERT INTO "EvaluatorType" (name, "createdAt", "updatedAt")
SELECT 'group_stage_team', NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EvaluatorType" WHERE name = 'group_stage_team'
);

-- Create junction table for advancing teams
CREATE TABLE "LeagueSpecialBetSingleTeamAdvanced" (
  id SERIAL PRIMARY KEY,
  "leagueSpecialBetSingleId" INTEGER NOT NULL,
  "leagueTeamId" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  "deletedAt" TIMESTAMPTZ,

  CONSTRAINT "LeagueSpecialBetSingleTeamAdvanced_leagueSpecialBetSingleId_fkey"
    FOREIGN KEY ("leagueSpecialBetSingleId")
    REFERENCES "LeagueSpecialBetSingle"(id) ON DELETE CASCADE,
  CONSTRAINT "LeagueSpecialBetSingleTeamAdvanced_leagueTeamId_fkey"
    FOREIGN KEY ("leagueTeamId")
    REFERENCES "LeagueTeam"(id) ON DELETE NO ACTION
);

-- Add indexes
CREATE INDEX "LeagueSpecialBetSingleTeamAdvanced_leagueSpecialBetSingleId_idx"
  ON "LeagueSpecialBetSingleTeamAdvanced"("leagueSpecialBetSingleId");
CREATE INDEX "LeagueSpecialBetSingleTeamAdvanced_leagueTeamId_idx"
  ON "LeagueSpecialBetSingleTeamAdvanced"("leagueTeamId");

-- Prevent duplicate advancing teams
CREATE UNIQUE INDEX "LeagueSpecialBetSingleTeamAdvanced_unique"
  ON "LeagueSpecialBetSingleTeamAdvanced"(
    "leagueSpecialBetSingleId", "leagueTeamId", "deletedAt"
  ) NULLS NOT DISTINCT;

-- Add group column to LeagueSpecialBetSingle
ALTER TABLE "LeagueSpecialBetSingle"
ADD COLUMN "group" VARCHAR(255);
