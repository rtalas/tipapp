-- Personal jokers feature
-- League: per-league configurable count of personal jokers (0 = feature disabled)
-- LeagueMatch: admin flag to block jokers on this match (e.g. obvious matches)
-- UserBet: flag indicating this user spent a joker on the match

ALTER TABLE "League" ADD COLUMN "jokerCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "LeagueMatch" ADD COLUMN "jokerBlocked" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "UserBet" ADD COLUMN "usedJoker" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "UserBet_leagueUserId_usedJoker_deletedAt_idx"
  ON "UserBet" ("leagueUserId", "usedJoker", "deletedAt");
