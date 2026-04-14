-- Migration: Add Tournament model and link to LeagueTeam + LeagueSpecialBetSingle
-- Run with: psql $DATABASE_URL -f migrations/add_tournament.sql

CREATE TABLE "Tournament" (
  "id"        SERIAL        NOT NULL,
  "name"      VARCHAR(255)  NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  "deletedAt" TIMESTAMPTZ(6),
  CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Tournament_deletedAt_idx" ON "Tournament"("deletedAt");

ALTER TABLE "LeagueTeam"
  ADD COLUMN "tournamentId" INTEGER;

ALTER TABLE "LeagueTeam"
  ADD CONSTRAINT "LeagueTeam_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "LeagueSpecialBetSingle"
  ADD COLUMN "tournamentId" INTEGER;

ALTER TABLE "LeagueSpecialBetSingle"
  ADD CONSTRAINT "LeagueSpecialBetSingle_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
