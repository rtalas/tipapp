-- Opt-in indicator on a special bet that surfaces the running tally
-- of goals across evaluated matches in the league (e.g. tournament total goals).
ALTER TABLE "LeagueSpecialBetSingle"
  ADD COLUMN "showGoalProgress" BOOLEAN NOT NULL DEFAULT false;
