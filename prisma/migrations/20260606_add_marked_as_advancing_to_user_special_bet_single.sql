-- Add markedAsAdvancing flag to UserSpecialBetSingle
-- Nullable boolean — only meaningful for group_stage_team bets with requiresUserMark config.
-- Indicates whether the user has marked this prediction as one of the top-8 advancing 3rd-place teams.

ALTER TABLE "UserSpecialBetSingle"
  ADD COLUMN IF NOT EXISTS "markedAsAdvancing" BOOLEAN;
