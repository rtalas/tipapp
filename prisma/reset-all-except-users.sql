-- Reset entire database EXCEPT the "User" table
-- Usage: psql $DATABASE_URL -f prisma/reset-all-except-users.sql
-- Safe to run multiple times (idempotent)

BEGIN;

TRUNCATE
  "AuditLog",
  "Evaluator",
  "EvaluatorType",
  "League",
  "LeagueMatch",
  "LeaguePhase",
  "LeaguePlayer",
  "LeaguePrize",
  "LeagueSpecialBetQuestion",
  "LeagueSpecialBetSerie",
  "LeagueSpecialBetSingle",
  "LeagueSpecialBetSingleTeamAdvanced",
  "LeagueTeam",
  "LeagueUser",
  "Match",
  "MatchPhase",
  "MatchScorer",
  "Message",
  "PasswordResetToken",
  "Player",
  "PushSubscription",
  "SentNotification",
  "SpecialBetSerie",
  "SpecialBetSingle",
  "SpecialBetSingleType",
  "Sport",
  "Team",
  "TopScorerRankingVersion",
  "UserBet",
  "UserRequest",
  "UserSetting",
  "UserSpecialBetQuestion",
  "UserSpecialBetSerie",
  "UserSpecialBetSingle"
CASCADE;

-- Reset all sequences so IDs start from 1
DO $$
DECLARE
  seq RECORD;
BEGIN
  FOR seq IN
    SELECT c.oid::regclass AS seqname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S'
      AND n.nspname = 'public'
      -- Skip User table sequence
      AND c.relname != 'User_id_seq'
  LOOP
    EXECUTE format('ALTER SEQUENCE %s RESTART WITH 1', seq.seqname);
  END LOOP;
END $$;

COMMIT;
