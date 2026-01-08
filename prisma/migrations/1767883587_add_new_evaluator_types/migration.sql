-- Add new evaluator types
INSERT INTO "EvaluatorType" ("name", "createdAt", "updatedAt")
SELECT 'score_one_team', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "EvaluatorType" WHERE "name" = 'score_one_team')
ON CONFLICT DO NOTHING;

INSERT INTO "EvaluatorType" ("name", "createdAt", "updatedAt")
SELECT 'exact_team', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "EvaluatorType" WHERE "name" = 'exact_team')
ON CONFLICT DO NOTHING;

INSERT INTO "EvaluatorType" ("name", "createdAt", "updatedAt")
SELECT 'exact_player', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "EvaluatorType" WHERE "name" = 'exact_player')
ON CONFLICT DO NOTHING;

INSERT INTO "EvaluatorType" ("name", "createdAt", "updatedAt")
SELECT 'exact_value', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "EvaluatorType" WHERE "name" = 'exact_value')
ON CONFLICT DO NOTHING;

INSERT INTO "EvaluatorType" ("name", "createdAt", "updatedAt")
SELECT 'closest_value', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "EvaluatorType" WHERE "name" = 'closest_value')
ON CONFLICT DO NOTHING;

INSERT INTO "EvaluatorType" ("name", "createdAt", "updatedAt")
SELECT 'series_exact', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "EvaluatorType" WHERE "name" = 'series_exact')
ON CONFLICT DO NOTHING;

INSERT INTO "EvaluatorType" ("name", "createdAt", "updatedAt")
SELECT 'series_winner', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "EvaluatorType" WHERE "name" = 'series_winner')
ON CONFLICT DO NOTHING;

INSERT INTO "EvaluatorType" ("name", "createdAt", "updatedAt")
SELECT 'question', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "EvaluatorType" WHERE "name" = 'question')
ON CONFLICT DO NOTHING;

INSERT INTO "EvaluatorType" ("name", "createdAt", "updatedAt")
SELECT 'draw', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "EvaluatorType" WHERE "name" = 'draw')
ON CONFLICT DO NOTHING;

INSERT INTO "EvaluatorType" ("name", "createdAt", "updatedAt")
SELECT 'soccer_playoff_advance', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "EvaluatorType" WHERE "name" = 'soccer_playoff_advance')
ON CONFLICT DO NOTHING;
