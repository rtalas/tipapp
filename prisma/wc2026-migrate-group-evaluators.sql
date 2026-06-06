-- ============================================================================
-- WC 2026 — MIGRACE: rozdělit "Pořadí ve skupině" na 3 evaluatory per pozice
-- ============================================================================
-- Pro každou WC 2026 ligu, která má jediný evaluator "Pořadí ve skupině"
-- (původní seed před requiresUserMark featurou):
--   1) Vytvoří 3 nové evaluatory: 2./3./4. místo s odlišnými configy
--   2) Přepojí existující LeagueSpecialBetSingle záznamy podle názvu pozice
--      ("2. místo — skupina X" → ev_group_second atd.)
--   3) Soft-deletuje starý sdílený evaluator
--
-- Idempotentní: pokud liga už má rozdělené evaluatory, přeskočí.
-- Bezpečná: user bets (UserSpecialBetSingle) odkazují na LeagueSpecialBetSingle
-- (ne na evaluator přímo), takže existující tipy zůstanou nedotčené.
--
-- Spuštění:
--   psql "$DATABASE_URL" -f prisma/wc2026-migrate-group-evaluators.sql
-- nebo přes Supabase SQL Editor.
-- ============================================================================

BEGIN;

DO $migrate$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_league RECORD;
    v_old_eval_id INT;
    v_eval_type_id INT;
    v_new_second_id INT;
    v_new_third_id INT;
    v_new_fourth_id INT;
    v_updated_count INT;
BEGIN
    -- Resolve evaluator type ID for group_stage_team
    SELECT id INTO v_eval_type_id
    FROM "EvaluatorType"
    WHERE name = 'group_stage_team' AND "deletedAt" IS NULL
    ORDER BY id LIMIT 1;

    IF v_eval_type_id IS NULL THEN
        RAISE EXCEPTION 'group_stage_team evaluator type not found';
    END IF;

    -- Loop over WC 2026 leagues that still have the legacy shared evaluator
    FOR v_league IN
        SELECT DISTINCT l.id, l.name
        FROM "League" l
        JOIN "Evaluator" e ON e."leagueId" = l.id
        WHERE l.name LIKE '%MS ve fotbale 2026%'
          AND l."deletedAt" IS NULL
          AND e.entity = 'special_bet'
          AND e.name = 'Pořadí ve skupině'
          AND e."deletedAt" IS NULL
    LOOP
        RAISE NOTICE '─── Migrating league % (%) ───', v_league.id, v_league.name;

        -- Find the legacy evaluator
        SELECT id INTO v_old_eval_id
        FROM "Evaluator"
        WHERE "leagueId" = v_league.id
          AND entity = 'special_bet'
          AND name = 'Pořadí ve skupině'
          AND "deletedAt" IS NULL
        ORDER BY id LIMIT 1;

        -- Create 2. místo (winner=7, advance=4, no user mark)
        INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, config, "createdAt", "updatedAt")
        VALUES (
            '2. místo ve skupině',
            v_eval_type_id,
            v_league.id, 'special_bet',
            7,
            '{"winnerPoints": 7, "advancePoints": 4}'::jsonb,
            v_now, v_now
        ) RETURNING id INTO v_new_second_id;

        -- Create 3. místo (winner=7, advance=4, requiresUserMark=true)
        INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, config, "createdAt", "updatedAt")
        VALUES (
            '3. místo ve skupině',
            v_eval_type_id,
            v_league.id, 'special_bet',
            7,
            '{"winnerPoints": 7, "advancePoints": 4, "requiresUserMark": true}'::jsonb,
            v_now, v_now
        ) RETURNING id INTO v_new_third_id;

        -- Create 4. místo (winner=7, advance=0)
        INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, config, "createdAt", "updatedAt")
        VALUES (
            '4. místo ve skupině',
            v_eval_type_id,
            v_league.id, 'special_bet',
            7,
            '{"winnerPoints": 7, "advancePoints": 0}'::jsonb,
            v_now, v_now
        ) RETURNING id INTO v_new_fourth_id;

        RAISE NOTICE '  Created evaluators: 2nd=%, 3rd=%, 4th=%',
            v_new_second_id, v_new_third_id, v_new_fourth_id;

        -- Reassign LeagueSpecialBetSingle rows by name prefix
        UPDATE "LeagueSpecialBetSingle"
        SET "evaluatorId" = v_new_second_id, "updatedAt" = v_now
        WHERE "leagueId" = v_league.id
          AND "evaluatorId" = v_old_eval_id
          AND "deletedAt" IS NULL
          AND name LIKE '2. místo%';
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        RAISE NOTICE '  Reassigned % bets to 2nd-place evaluator', v_updated_count;

        UPDATE "LeagueSpecialBetSingle"
        SET "evaluatorId" = v_new_third_id, "updatedAt" = v_now
        WHERE "leagueId" = v_league.id
          AND "evaluatorId" = v_old_eval_id
          AND "deletedAt" IS NULL
          AND name LIKE '3. místo%';
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        RAISE NOTICE '  Reassigned % bets to 3rd-place evaluator', v_updated_count;

        UPDATE "LeagueSpecialBetSingle"
        SET "evaluatorId" = v_new_fourth_id, "updatedAt" = v_now
        WHERE "leagueId" = v_league.id
          AND "evaluatorId" = v_old_eval_id
          AND "deletedAt" IS NULL
          AND name LIKE '4. místo%';
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        RAISE NOTICE '  Reassigned % bets to 4th-place evaluator', v_updated_count;

        -- Safety check: any bets left pointing at the legacy evaluator?
        SELECT COUNT(*) INTO v_updated_count
        FROM "LeagueSpecialBetSingle"
        WHERE "leagueId" = v_league.id
          AND "evaluatorId" = v_old_eval_id
          AND "deletedAt" IS NULL;

        IF v_updated_count > 0 THEN
            RAISE EXCEPTION 'League %: % bets still reference legacy evaluator (unexpected name prefix?). Rolling back.',
                v_league.id, v_updated_count;
        END IF;

        -- Soft-delete the legacy evaluator
        UPDATE "Evaluator"
        SET "deletedAt" = v_now, "updatedAt" = v_now
        WHERE id = v_old_eval_id;
        RAISE NOTICE '  Soft-deleted legacy evaluator id=%', v_old_eval_id;
    END LOOP;
END $migrate$;

COMMIT;

-- ============================================================================
-- VERIFIKACE (read-only): zobrazí, kolik bet je teď pod kterým evaluatorem
-- per liga.
-- ============================================================================
SELECT
    l.id AS league_id,
    l.name AS league_name,
    e.name AS evaluator_name,
    e.config,
    COUNT(lsbs.id) AS bet_count
FROM "League" l
JOIN "Evaluator" e ON e."leagueId" = l.id
LEFT JOIN "LeagueSpecialBetSingle" lsbs
    ON lsbs."evaluatorId" = e.id AND lsbs."deletedAt" IS NULL
WHERE l.name LIKE '%MS ve fotbale 2026%'
  AND l."deletedAt" IS NULL
  AND e.entity = 'special_bet'
  AND e."deletedAt" IS NULL
GROUP BY l.id, l.name, e.id, e.name, e.config
ORDER BY l.id, e.name;
