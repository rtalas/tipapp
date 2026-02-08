-- Make nullable booleans non-nullable (coalesce NULLs to defaults first)

-- League fields
UPDATE "League" SET "isTheMostActive" = false WHERE "isTheMostActive" IS NULL;
UPDATE "League" SET "isFinished" = false WHERE "isFinished" IS NULL;
ALTER TABLE "League" ALTER COLUMN "isTheMostActive" SET NOT NULL;
ALTER TABLE "League" ALTER COLUMN "isFinished" SET NOT NULL;

-- LeagueUser fields
UPDATE "LeagueUser" SET "active" = true WHERE "active" IS NULL;
UPDATE "LeagueUser" SET "admin" = false WHERE "admin" IS NULL;
ALTER TABLE "LeagueUser" ALTER COLUMN "active" SET NOT NULL;
ALTER TABLE "LeagueUser" ALTER COLUMN "admin" SET NOT NULL;
