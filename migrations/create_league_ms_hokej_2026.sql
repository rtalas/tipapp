-- Create league: MS Hokej 2026
-- Run with: psql $DATABASE_URL -f migrations/create_league_ms_hokej_2026.sql
--            (or via Supabase SQL Editor; Prisma db execute also works)
--
-- Source for groups + schedule: https://www.iihf.com/en/events/2026/wm/schedule
-- Tournament: 15-31 May 2026, Zürich (Swiss Life Arena) + Fribourg (BCF Arena)
--
-- Portability: this script looks up teams by shortcut, MatchPhase by name, and
-- EvaluatorType by name — so it works on any DB regardless of specific IDs.
-- Missing hockey teams and missing Group A/B MatchPhases are auto-created.
--
-- Creates:
--   * League "MS Hokej 2026" (Hockey, season 2026, active + public)
--   * 16 LeagueTeams (group A @ Zürich: FIN, GER, USA, SUI, GBR, AUT, HUN, LAT;
--                    group B @ Fribourg: CAN, SWE, CZE, DEN, SVK, NOR, ITA, SLO)
--   * 16 Evaluators (match + question + special-bet rules)
--   * 20 LeagueSpecialBetSingles (Vítěz/Stříbro/Bronz MS, group placements + Sestup, players, total goals)
--   * 6 LeaguePrizes (3 prizes + 3 fines)
--   * 56 Matches + LeagueMatches (full preliminary round: Group A & B)
--   * 5 LeagueSpecialBetQuestions (daily yes/no questions, first 5 days)
--   * ~403 Players + LeaguePlayers (rosters from Wikipedia 2026 IIHF WC page,
--     position G/D/F, clubName captured; topScorerRanking 1-4 per team set
--     from Tipsport "nejlepší střelec týmu" odds — drives the rank-based bonus
--     in the scorer evaluator (1.nej=2b, 2.nej=3b, 3.nej=4b, 4.nej=6b))
--
-- NOT created (per spec or unknown teams):
--   * Denní ANO-NE otázky pro pozdější dny — added later
--   * Playoff Matches (4 QF + 2 SF + Bronze + Gold) — teams unknown until groups end,
--     admin creates them after preliminary round. Dates/times for reference:
--       28 May 16:20+20:20 local: 4× QF (Swiss Life + BCF, 2 per venue)
--       30 May 15:20 + 20:00 local: 2× SF @ Swiss Life
--       31 May 15:30 local: Bronze; 20:20 local: Gold @ Swiss Life

BEGIN;

-- ===== Helper functions (cleaned up at session end via pg_temp schema) =====
CREATE OR REPLACE FUNCTION pg_temp.evaluator_type_id(p_name TEXT) RETURNS INT AS $func$
DECLARE v_id INT;
BEGIN
  SELECT id INTO v_id FROM "EvaluatorType"
   WHERE name = p_name AND "deletedAt" IS NULL ORDER BY id LIMIT 1;
  IF v_id IS NULL THEN RAISE EXCEPTION 'EvaluatorType "%" not found in DB', p_name; END IF;
  RETURN v_id;
END;
$func$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.find_or_create_match_phase(p_name TEXT, p_rank INT) RETURNS INT AS $func$
DECLARE v_id INT; v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT id INTO v_id FROM "MatchPhase"
   WHERE name = p_name AND "deletedAt" IS NULL ORDER BY id LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO "MatchPhase" (name, rank, "createdAt", "updatedAt")
    VALUES (p_name, p_rank, v_now, v_now)
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$func$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.find_or_create_hockey_team(
  p_shortcut TEXT, p_name TEXT, p_flag TEXT, p_sport_id INT
) RETURNS INT AS $func$
DECLARE v_id INT; v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT id INTO v_id FROM "Team"
   WHERE shortcut = p_shortcut AND "sportId" = p_sport_id AND "deletedAt" IS NULL
   ORDER BY id LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO "Team" (name, shortcut, "sportId", "flagIcon", "flagType", "createdAt", "updatedAt")
    VALUES (p_name, p_shortcut, p_sport_id, p_flag, 'icon', v_now, v_now)
    RETURNING id INTO v_id;
  ELSE
    -- Backfill flag fields if existing team is missing them (don't overwrite existing values)
    UPDATE "Team" SET
      "flagIcon" = COALESCE("flagIcon", p_flag),
      "flagType" = COALESCE("flagType", 'icon'),
      "updatedAt" = v_now
    WHERE id = v_id
      AND ("flagIcon" IS NULL OR "flagType" IS NULL);
  END IF;
  RETURN v_id;
END;
$func$ LANGUAGE plpgsql;

-- Creates a new Player row and links it to a LeagueTeam via LeaguePlayer.
-- Always creates a fresh Player so the same person can appear in multiple
-- tournaments without re-using stale season stats from prior leagues.
CREATE OR REPLACE FUNCTION pg_temp.add_roster_player(
  p_league_team_id INT, p_first TEXT, p_last TEXT, p_position TEXT, p_club TEXT
) RETURNS VOID AS $func$
DECLARE v_player_id INT; v_now TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO "Player" ("firstName", "lastName", position, "isActive", "createdAt", "updatedAt")
  VALUES (p_first, p_last, p_position, TRUE, v_now, v_now)
  RETURNING id INTO v_player_id;

  INSERT INTO "LeaguePlayer" ("leagueTeamId", "playerId", "clubName", "createdAt", "updatedAt")
  VALUES (p_league_team_id, v_player_id, p_club, v_now, v_now);
END;
$func$ LANGUAGE plpgsql;

-- Marks the rank (1-4) of a top scorer on a single LeaguePlayer row, matched
-- by team + first/last name. Used to enable the rank-based scorer evaluator
-- bonus (1.nej=2b, 2.nej=3b, 3.nej=4b, 4.nej=6b; everyone else = 8b unranked).
CREATE OR REPLACE FUNCTION pg_temp.set_top_scorer_rank(
  p_league_team_id INT, p_first TEXT, p_last TEXT, p_rank INT
) RETURNS VOID AS $func$
DECLARE v_now TIMESTAMPTZ := NOW(); v_updated INT;
BEGIN
  UPDATE "LeaguePlayer" lp
     SET "topScorerRanking" = p_rank, "updatedAt" = v_now
    FROM "Player" p
   WHERE lp."playerId" = p.id
     AND lp."leagueTeamId" = p_league_team_id
     AND p."firstName" = p_first
     AND p."lastName"  = p_last
     AND lp."deletedAt" IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'set_top_scorer_rank: no LeaguePlayer matched team=% name="% %"',
      p_league_team_id, p_first, p_last;
  END IF;
END;
$func$ LANGUAGE plpgsql;

-- ===== Main script =====
DO $$
DECLARE
  v_now       TIMESTAMPTZ := NOW();
  v_deadline  TIMESTAMPTZ := '2026-05-15 14:20:00+00';  -- first match 15.5. 16:20 CEST = 14:20 UTC
  v_league_id INT;
  v_sport_id  INT;

  v_phase_group_a INT;
  v_phase_group_b INT;

  -- Team IDs (resolved via shortcut, auto-created if missing)
  v_team_fin INT; v_team_ger INT; v_team_usa INT; v_team_sui INT;
  v_team_gbr INT; v_team_aut INT; v_team_hun INT; v_team_lat INT;
  v_team_can INT; v_team_swe INT; v_team_cze INT; v_team_den INT;
  v_team_svk INT; v_team_nor INT; v_team_ita INT; v_team_slo INT;

  -- LeagueTeam IDs (captured after their INSERT)
  v_lt_fin INT; v_lt_ger INT; v_lt_usa INT; v_lt_sui INT;
  v_lt_gbr INT; v_lt_aut INT; v_lt_hun INT; v_lt_lat INT;
  v_lt_can INT; v_lt_swe INT; v_lt_cze INT; v_lt_den INT;
  v_lt_svk INT; v_lt_nor INT; v_lt_ita INT; v_lt_slo INT;

  -- Evaluator IDs
  v_eval_exact_score     INT;
  v_eval_score_diff      INT;
  v_eval_one_team_score  INT;
  v_eval_winner          INT;
  v_eval_scorer          INT;
  v_eval_question        INT;
  v_eval_team_50         INT;
  v_eval_team_40         INT;
  v_eval_team_30         INT;
  v_eval_team_14         INT;
  v_eval_group_team      INT;
  v_eval_player_goalie   INT;
  v_eval_player_defender INT;
  v_eval_player_forward  INT;
  v_eval_player_any      INT;
  v_eval_closest_60      INT;

  v_info_text TEXT;
BEGIN
  -- ===== 0. Prerequisites (sport, phases, teams) =====
  SELECT id INTO v_sport_id FROM "Sport"
   WHERE name = 'Hockey' AND "deletedAt" IS NULL ORDER BY id LIMIT 1;
  IF v_sport_id IS NULL THEN
    RAISE EXCEPTION 'Sport "Hockey" not found in DB — seed Sport first';
  END IF;

  v_phase_group_a := pg_temp.find_or_create_match_phase('Group A', 1);
  v_phase_group_b := pg_temp.find_or_create_match_phase('Group B', 2);

  -- Group A teams
  v_team_fin := pg_temp.find_or_create_hockey_team('FIN', 'Finland',       '🇫🇮', v_sport_id);
  v_team_ger := pg_temp.find_or_create_hockey_team('GER', 'Germany',       '🇩🇪', v_sport_id);
  v_team_usa := pg_temp.find_or_create_hockey_team('USA', 'USA',           '🇺🇸', v_sport_id);
  v_team_sui := pg_temp.find_or_create_hockey_team('SUI', 'Switzerland',   '🇨🇭', v_sport_id);
  v_team_gbr := pg_temp.find_or_create_hockey_team('GBR', 'Great Britain', '🇬🇧', v_sport_id);
  v_team_aut := pg_temp.find_or_create_hockey_team('AUT', 'Austria',       '🇦🇹', v_sport_id);
  v_team_hun := pg_temp.find_or_create_hockey_team('HUN', 'Hungary',       '🇭🇺', v_sport_id);
  v_team_lat := pg_temp.find_or_create_hockey_team('LAT', 'Latvia',        '🇱🇻', v_sport_id);
  -- Group B teams
  v_team_can := pg_temp.find_or_create_hockey_team('CAN', 'Canada',        '🇨🇦', v_sport_id);
  v_team_swe := pg_temp.find_or_create_hockey_team('SWE', 'Sweden',        '🇸🇪', v_sport_id);
  v_team_cze := pg_temp.find_or_create_hockey_team('CZE', 'Czechia',       '🇨🇿', v_sport_id);
  v_team_den := pg_temp.find_or_create_hockey_team('DEN', 'Denmark',       '🇩🇰', v_sport_id);
  v_team_svk := pg_temp.find_or_create_hockey_team('SVK', 'Slovakia',      '🇸🇰', v_sport_id);
  v_team_nor := pg_temp.find_or_create_hockey_team('NOR', 'Norway',        '🇳🇴', v_sport_id);
  v_team_ita := pg_temp.find_or_create_hockey_team('ITA', 'Italy',         '🇮🇹', v_sport_id);
  v_team_slo := pg_temp.find_or_create_hockey_team('SLO', 'Slovenia',      '🇸🇮', v_sport_id);

  -- ===== 0b. infoText =====
  v_info_text :=
'Pravidla tipovačky:
-	Vklad do tipovačky je 300 Kč, placeni budou první 3, posledním třem tipérům se účast o nějakou stovku prodraží.
-	Tipují se všechny zápasy MS a několik speciálních tipů.
-	U jednotlivých zápasů se tipuje přesný výsledek po 60.minutách, vítěz zápasu a střelec daného zápasu.
-	Nejlepší čtyři střelci týmu podle SK Tipsport jsou za menší počet bodů.
-	Střelec zápasu se bere včetně prodloužení nebo rozhodujícího nájezdu. Takový gól se započítává i do celkového počtu gólů.
-	Tip na zápas se uznává pouze do oficiálně uvedeného začátku zápasu.
-	Zápasy od čtvrtfinále MS se počítají za dvojnásobné body.
-	Při rovnosti bodů na konci tipovačky rozhoduje počet přesných výsledků a poté body za vítěze zápasů.
-	Kdo trefí přesný počet celkových gólů, dostane 60 bodů. Pokud to nikdo netrefí, nejbližší tipér dostane 25 bodů.
-	Každý den je navíc nepovinná ANO-NE otázka.

Bodování:
5b			Vítěz zápasu
10b			Přesný výsledek
1b			Počet gólů jednoho týmu
3b			Správný gólový rozdíl
8b			Střelec
2b			Nej.střelec jako střelec
3b			2.Nej.střelec jako střelec
4b			3.Nej.střelec jako střelec
6b			4.Nej.střelec jako střelec
14b			Přesné umístění ve skupině MS, Sestup
8b			Postupující ve skupině MS
50b			Vítěz MS
40b			Stříbro MS
30b			Bronz MS
30b			Nejlepší brankář, obránce, útočník
30b			Nejproduktivnější hráč, střelec, MVP
60/25b	Celkový počet gólů
8/-4b		ANO-NE Otázka správně/špatně
0b			ANO-NE Otázka netipována';

  -- ===== 1. League =====
  INSERT INTO "League" (
    name, "sportId", "isActive", "isTheMostActive", "seasonFrom", "seasonTo",
    "isFinished", "isPublic", "createdAt", "updatedAt", "isChatEnabled", "infoText"
  )
  VALUES (
    'MS Hokej 2026', v_sport_id, TRUE, FALSE, 2026, 2026,
    FALSE, TRUE, v_now, v_now, TRUE, v_info_text
  )
  RETURNING id INTO v_league_id;

  -- ===== 2. LeagueTeams =====
  -- Group A (Swiss Life Arena, Zürich)
  INSERT INTO "LeagueTeam" ("leagueId", "teamId", "group", "createdAt", "updatedAt") VALUES (v_league_id, v_team_fin, 'A', v_now, v_now) RETURNING id INTO v_lt_fin;
  INSERT INTO "LeagueTeam" ("leagueId", "teamId", "group", "createdAt", "updatedAt") VALUES (v_league_id, v_team_ger, 'A', v_now, v_now) RETURNING id INTO v_lt_ger;
  INSERT INTO "LeagueTeam" ("leagueId", "teamId", "group", "createdAt", "updatedAt") VALUES (v_league_id, v_team_usa, 'A', v_now, v_now) RETURNING id INTO v_lt_usa;
  INSERT INTO "LeagueTeam" ("leagueId", "teamId", "group", "createdAt", "updatedAt") VALUES (v_league_id, v_team_sui, 'A', v_now, v_now) RETURNING id INTO v_lt_sui;
  INSERT INTO "LeagueTeam" ("leagueId", "teamId", "group", "createdAt", "updatedAt") VALUES (v_league_id, v_team_gbr, 'A', v_now, v_now) RETURNING id INTO v_lt_gbr;
  INSERT INTO "LeagueTeam" ("leagueId", "teamId", "group", "createdAt", "updatedAt") VALUES (v_league_id, v_team_aut, 'A', v_now, v_now) RETURNING id INTO v_lt_aut;
  INSERT INTO "LeagueTeam" ("leagueId", "teamId", "group", "createdAt", "updatedAt") VALUES (v_league_id, v_team_hun, 'A', v_now, v_now) RETURNING id INTO v_lt_hun;
  INSERT INTO "LeagueTeam" ("leagueId", "teamId", "group", "createdAt", "updatedAt") VALUES (v_league_id, v_team_lat, 'A', v_now, v_now) RETURNING id INTO v_lt_lat;
  -- Group B (BCF Arena, Fribourg)
  INSERT INTO "LeagueTeam" ("leagueId", "teamId", "group", "createdAt", "updatedAt") VALUES (v_league_id, v_team_can, 'B', v_now, v_now) RETURNING id INTO v_lt_can;
  INSERT INTO "LeagueTeam" ("leagueId", "teamId", "group", "createdAt", "updatedAt") VALUES (v_league_id, v_team_swe, 'B', v_now, v_now) RETURNING id INTO v_lt_swe;
  INSERT INTO "LeagueTeam" ("leagueId", "teamId", "group", "createdAt", "updatedAt") VALUES (v_league_id, v_team_cze, 'B', v_now, v_now) RETURNING id INTO v_lt_cze;
  INSERT INTO "LeagueTeam" ("leagueId", "teamId", "group", "createdAt", "updatedAt") VALUES (v_league_id, v_team_den, 'B', v_now, v_now) RETURNING id INTO v_lt_den;
  INSERT INTO "LeagueTeam" ("leagueId", "teamId", "group", "createdAt", "updatedAt") VALUES (v_league_id, v_team_svk, 'B', v_now, v_now) RETURNING id INTO v_lt_svk;
  INSERT INTO "LeagueTeam" ("leagueId", "teamId", "group", "createdAt", "updatedAt") VALUES (v_league_id, v_team_nor, 'B', v_now, v_now) RETURNING id INTO v_lt_nor;
  INSERT INTO "LeagueTeam" ("leagueId", "teamId", "group", "createdAt", "updatedAt") VALUES (v_league_id, v_team_ita, 'B', v_now, v_now) RETURNING id INTO v_lt_ita;
  INSERT INTO "LeagueTeam" ("leagueId", "teamId", "group", "createdAt", "updatedAt") VALUES (v_league_id, v_team_slo, 'B', v_now, v_now) RETURNING id INTO v_lt_slo;

  -- ===== 3. Evaluators =====
  -- Match evaluators
  INSERT INTO "Evaluator" (name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
  VALUES ('Přesný výsledek', pg_temp.evaluator_type_id('exact_score'), v_league_id, 'match', 10, v_now, v_now)
  RETURNING id INTO v_eval_exact_score;

  INSERT INTO "Evaluator" (name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
  VALUES ('Skóre rozdíl', pg_temp.evaluator_type_id('score_difference'), v_league_id, 'match', 3, v_now, v_now)
  RETURNING id INTO v_eval_score_diff;

  INSERT INTO "Evaluator" (name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
  VALUES ('Skóre jednoho týmu', pg_temp.evaluator_type_id('one_team_score'), v_league_id, 'match', 1, v_now, v_now)
  RETURNING id INTO v_eval_one_team_score;

  INSERT INTO "Evaluator" (name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
  VALUES ('Vítěz zápasu', pg_temp.evaluator_type_id('winner'), v_league_id, 'match', 5, v_now, v_now)
  RETURNING id INTO v_eval_winner;

  -- Scorer: rank-based (1.nej=2b, 2.nej=3b, 3.nej=4b, 4.nej=6b, unranked=8b)
  INSERT INTO "Evaluator" (name, "evaluatorTypeId", "leagueId", entity, points, config, "createdAt", "updatedAt")
  VALUES (
    'Střelec', pg_temp.evaluator_type_id('scorer'), v_league_id, 'match', 0,
    '{"rankedPoints":{"1":2,"2":3,"3":4,"4":6},"unrankedPoints":8}'::JSONB,
    v_now, v_now
  )
  RETURNING id INTO v_eval_scorer;

  -- Question evaluator
  INSERT INTO "Evaluator" (name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
  VALUES ('Otázka', pg_temp.evaluator_type_id('question'), v_league_id, 'question', 8, v_now, v_now)
  RETURNING id INTO v_eval_question;

  -- Special-bet evaluators
  INSERT INTO "Evaluator" (name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
  VALUES ('Tým 50b', pg_temp.evaluator_type_id('exact_team'), v_league_id, 'special', 50, v_now, v_now)
  RETURNING id INTO v_eval_team_50;

  INSERT INTO "Evaluator" (name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
  VALUES ('Tým 40b', pg_temp.evaluator_type_id('exact_team'), v_league_id, 'special', 40, v_now, v_now)
  RETURNING id INTO v_eval_team_40;

  INSERT INTO "Evaluator" (name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
  VALUES ('Tým 30b', pg_temp.evaluator_type_id('exact_team'), v_league_id, 'special', 30, v_now, v_now)
  RETURNING id INTO v_eval_team_30;

  INSERT INTO "Evaluator" (name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
  VALUES ('Tým 14b', pg_temp.evaluator_type_id('exact_team'), v_league_id, 'special', 14, v_now, v_now)
  RETURNING id INTO v_eval_team_14;

  -- Group placement (14b exact / 8b advanced fallback)
  INSERT INTO "Evaluator" (name, "evaluatorTypeId", "leagueId", entity, points, config, "createdAt", "updatedAt")
  VALUES (
    'Skupina 14/8b', pg_temp.evaluator_type_id('group_stage_team'), v_league_id, 'special', 14,
    '{"winnerPoints":14,"advancePoints":8}'::JSONB,
    v_now, v_now
  )
  RETURNING id INTO v_eval_group_team;

  -- Player evaluators (position-filtered)
  INSERT INTO "Evaluator" (name, "evaluatorTypeId", "leagueId", entity, points, config, "createdAt", "updatedAt")
  VALUES ('Brankář 30b', pg_temp.evaluator_type_id('exact_player'), v_league_id, 'special', 30, '{"positions":["G"]}'::JSONB, v_now, v_now)
  RETURNING id INTO v_eval_player_goalie;

  INSERT INTO "Evaluator" (name, "evaluatorTypeId", "leagueId", entity, points, config, "createdAt", "updatedAt")
  VALUES ('Obránce 30b', pg_temp.evaluator_type_id('exact_player'), v_league_id, 'special', 30, '{"positions":["D"]}'::JSONB, v_now, v_now)
  RETURNING id INTO v_eval_player_defender;

  INSERT INTO "Evaluator" (name, "evaluatorTypeId", "leagueId", entity, points, config, "createdAt", "updatedAt")
  VALUES ('Útočník 30b', pg_temp.evaluator_type_id('exact_player'), v_league_id, 'special', 30, '{"positions":["F"]}'::JSONB, v_now, v_now)
  RETURNING id INTO v_eval_player_forward;

  INSERT INTO "Evaluator" (name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
  VALUES ('Hráč 30b', pg_temp.evaluator_type_id('exact_player'), v_league_id, 'special', 30, v_now, v_now)
  RETURNING id INTO v_eval_player_any;

  -- Closest value (60b exact / 24b closest via 0.4 multiplier)
  INSERT INTO "Evaluator" (name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
  VALUES ('Hodnota 60b', pg_temp.evaluator_type_id('closest_value'), v_league_id, 'special', 60, v_now, v_now)
  RETURNING id INTO v_eval_closest_60;

  -- ===== 4. LeagueSpecialBetSingle =====
  -- Tournament medals (exact_team)
  INSERT INTO "LeagueSpecialBetSingle" (
    "leagueId", name, points, "evaluatorId", "dateTime", "createdAt", "updatedAt"
  ) VALUES
    (v_league_id, 'Vítěz MS', 50, v_eval_team_50, v_deadline, v_now, v_now),
    (v_league_id, 'Stříbro MS', 40, v_eval_team_40, v_deadline, v_now, v_now),
    (v_league_id, 'Bronz MS', 30, v_eval_team_30, v_deadline, v_now, v_now);

  -- Group A placements (1.-4. místo via group_stage_team 14/8, Sestup via exact_team 14/0)
  INSERT INTO "LeagueSpecialBetSingle" (
    "leagueId", name, points, "evaluatorId", "group", "dateTime", "createdAt", "updatedAt"
  ) VALUES
    (v_league_id, '1.místo ve skupině A',  14, v_eval_group_team, 'A', v_deadline, v_now, v_now),
    (v_league_id, '2.místo ve skupině A',  14, v_eval_group_team, 'A', v_deadline, v_now, v_now),
    (v_league_id, '3.místo ve skupině A',  14, v_eval_group_team, 'A', v_deadline, v_now, v_now),
    (v_league_id, '4.místo ve skupině A',  14, v_eval_group_team, 'A', v_deadline, v_now, v_now),
    (v_league_id, 'Sestup ze skupiny A',   14, v_eval_team_14,    'A', v_deadline, v_now, v_now);

  -- Group B placements
  INSERT INTO "LeagueSpecialBetSingle" (
    "leagueId", name, points, "evaluatorId", "group", "dateTime", "createdAt", "updatedAt"
  ) VALUES
    (v_league_id, '1.místo ve skupině B',  14, v_eval_group_team, 'B', v_deadline, v_now, v_now),
    (v_league_id, '2.místo ve skupině B',  14, v_eval_group_team, 'B', v_deadline, v_now, v_now),
    (v_league_id, '3.místo ve skupině B',  14, v_eval_group_team, 'B', v_deadline, v_now, v_now),
    (v_league_id, '4.místo ve skupině B',  14, v_eval_group_team, 'B', v_deadline, v_now, v_now),
    (v_league_id, 'Sestup ze skupiny B',   14, v_eval_team_14,    'B', v_deadline, v_now, v_now);

  -- Individual awards
  INSERT INTO "LeagueSpecialBetSingle" (
    "leagueId", name, points, "evaluatorId", "dateTime", "createdAt", "updatedAt"
  ) VALUES
    (v_league_id, 'Nejlepší brankář',       30, v_eval_player_goalie,   v_deadline, v_now, v_now),
    (v_league_id, 'Nejlepší obránce',       30, v_eval_player_defender, v_deadline, v_now, v_now),
    (v_league_id, 'Nejlepší útočník',       30, v_eval_player_forward,  v_deadline, v_now, v_now),
    (v_league_id, 'Nejproduktivnější hráč', 30, v_eval_player_any,      v_deadline, v_now, v_now),
    (v_league_id, 'Nejlepší střelec',       30, v_eval_player_any,      v_deadline, v_now, v_now),
    (v_league_id, 'MVP turnaje',            30, v_eval_player_any,      v_deadline, v_now, v_now);

  -- Total goals (closest_value)
  INSERT INTO "LeagueSpecialBetSingle" (
    "leagueId", name, points, "evaluatorId", "dateTime", "createdAt", "updatedAt"
  ) VALUES
    (v_league_id, 'Celkový počet gólů na turnaji', 60, v_eval_closest_60, v_deadline, v_now, v_now);

  -- ===== 5. LeaguePrizes (amounts in halers: 1 Kč = 100 halers) =====
  INSERT INTO "LeaguePrize" ("leagueId", rank, amount, currency, type, "createdAt", "updatedAt") VALUES
    -- Prizes (top 3)
    (v_league_id, 1, 200000, 'CZK', 'prize', v_now, v_now),  -- 2000 Kč
    (v_league_id, 2, 100000, 'CZK', 'prize', v_now, v_now),  -- 1000 Kč
    (v_league_id, 3,  60000, 'CZK', 'prize', v_now, v_now),  --  600 Kč
    -- Fines (bottom 3)
    (v_league_id, 1,  30000, 'CZK', 'fine',  v_now, v_now),  --  300 Kč (last place)
    (v_league_id, 2,  20000, 'CZK', 'fine',  v_now, v_now),  --  200 Kč (second-to-last)
    (v_league_id, 3,  10000, 'CZK', 'fine',  v_now, v_now);  --  100 Kč (third-from-last)

  -- ===== 6. Matches (preliminary round, 56 games) =====
  -- Times are stored in UTC. Local time in Switzerland (May) is CEST = UTC+2.
  -- 12:20 local = 10:20 UTC,  16:20 local = 14:20 UTC,  20:20 local = 18:20 UTC.

  WITH m AS (
    INSERT INTO "Match" (
      "dateTime", "homeTeamId", "awayTeamId", "matchPhaseId",
      "isOvertime", "isShootout", "isEvaluated", "isPlayoffGame",
      "createdAt", "updatedAt"
    )
    VALUES
      -- 15 May
      ('2026-05-15 14:20:00+00', v_lt_fin, v_lt_ger, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-15 14:20:00+00', v_lt_can, v_lt_swe, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-15 18:20:00+00', v_lt_usa, v_lt_sui, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-15 18:20:00+00', v_lt_cze, v_lt_den, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      -- 16 May
      ('2026-05-16 10:20:00+00', v_lt_gbr, v_lt_aut, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-16 10:20:00+00', v_lt_svk, v_lt_nor, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-16 14:20:00+00', v_lt_hun, v_lt_fin, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-16 14:20:00+00', v_lt_ita, v_lt_can, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-16 18:20:00+00', v_lt_sui, v_lt_lat, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-16 18:20:00+00', v_lt_slo, v_lt_cze, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      -- 17 May
      ('2026-05-17 10:20:00+00', v_lt_gbr, v_lt_usa, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-17 10:20:00+00', v_lt_ita, v_lt_svk, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-17 14:20:00+00', v_lt_aut, v_lt_hun, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-17 14:20:00+00', v_lt_den, v_lt_swe, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-17 18:20:00+00', v_lt_ger, v_lt_lat, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-17 18:20:00+00', v_lt_nor, v_lt_slo, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      -- 18 May
      ('2026-05-18 14:20:00+00', v_lt_fin, v_lt_usa, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-18 14:20:00+00', v_lt_can, v_lt_den, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-18 18:20:00+00', v_lt_ger, v_lt_sui, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-18 18:20:00+00', v_lt_swe, v_lt_cze, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      -- 19 May
      ('2026-05-19 14:20:00+00', v_lt_lat, v_lt_aut, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-19 14:20:00+00', v_lt_ita, v_lt_nor, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-19 18:20:00+00', v_lt_hun, v_lt_gbr, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-19 18:20:00+00', v_lt_slo, v_lt_svk, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      -- 20 May
      ('2026-05-20 14:20:00+00', v_lt_aut, v_lt_sui, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-20 14:20:00+00', v_lt_cze, v_lt_ita, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-20 18:20:00+00', v_lt_usa, v_lt_ger, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-20 18:20:00+00', v_lt_swe, v_lt_slo, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      -- 21 May
      ('2026-05-21 14:20:00+00', v_lt_lat, v_lt_fin, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-21 14:20:00+00', v_lt_can, v_lt_nor, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-21 18:20:00+00', v_lt_sui, v_lt_gbr, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-21 18:20:00+00', v_lt_den, v_lt_svk, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      -- 22 May
      ('2026-05-22 14:20:00+00', v_lt_ger, v_lt_hun, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-22 14:20:00+00', v_lt_can, v_lt_slo, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-22 18:20:00+00', v_lt_fin, v_lt_gbr, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-22 18:20:00+00', v_lt_swe, v_lt_ita, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      -- 23 May
      ('2026-05-23 10:20:00+00', v_lt_lat, v_lt_usa, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-23 10:20:00+00', v_lt_den, v_lt_slo, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-23 14:20:00+00', v_lt_sui, v_lt_hun, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-23 14:20:00+00', v_lt_svk, v_lt_cze, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-23 18:20:00+00', v_lt_aut, v_lt_ger, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-23 18:20:00+00', v_lt_nor, v_lt_swe, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      -- 24 May
      ('2026-05-24 14:20:00+00', v_lt_gbr, v_lt_lat, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-24 14:20:00+00', v_lt_den, v_lt_ita, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-24 18:20:00+00', v_lt_fin, v_lt_aut, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-24 18:20:00+00', v_lt_svk, v_lt_can, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      -- 25 May
      ('2026-05-25 14:20:00+00', v_lt_usa, v_lt_hun, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-25 14:20:00+00', v_lt_cze, v_lt_nor, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-25 18:20:00+00', v_lt_ger, v_lt_gbr, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-25 18:20:00+00', v_lt_slo, v_lt_ita, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      -- 26 May
      ('2026-05-26 10:20:00+00', v_lt_hun, v_lt_lat, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-26 10:20:00+00', v_lt_nor, v_lt_den, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-26 14:20:00+00', v_lt_usa, v_lt_aut, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-26 14:20:00+00', v_lt_swe, v_lt_svk, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-26 18:20:00+00', v_lt_sui, v_lt_fin, v_phase_group_a, FALSE, FALSE, FALSE, FALSE, v_now, v_now),
      ('2026-05-26 18:20:00+00', v_lt_cze, v_lt_can, v_phase_group_b, FALSE, FALSE, FALSE, FALSE, v_now, v_now)
    RETURNING id
  )
  INSERT INTO "LeagueMatch" ("leagueId", "matchId", "isDoubled", "createdAt", "updatedAt")
  SELECT v_league_id, id, FALSE, v_now, v_now FROM m;

  -- ===== 7. LeagueSpecialBetQuestion (daily ANO-NE, first 5 tournament days) =====
  -- Deadline = start of that day's first match. Stored in UTC.
  INSERT INTO "LeagueSpecialBetQuestion" (
    "leagueId", text, "dateTime", "createdAt", "updatedAt"
  ) VALUES
    (v_league_id, 'Počet gólů sk.A > sk.B?',         '2026-05-15 14:20:00+00', v_now, v_now),
    (v_league_id, 'Počet gólů vč. P/N > 32?',        '2026-05-16 10:20:00+00', v_now, v_now),
    (v_league_id, 'Bude prodloužení?',               '2026-05-17 10:20:00+00', v_now, v_now),
    (v_league_id, 'Gól do prázdné v posl.minutě?',   '2026-05-18 14:20:00+00', v_now, v_now),
    (v_league_id, 'Gól do času 4:00?',               '2026-05-19 14:20:00+00', v_now, v_now);

  -- ===== 8. LeaguePlayer (rosters from Wikipedia, 2026 IIHF WC) =====
  -- Source: https://en.wikipedia.org/wiki/2026_IIHF_World_Championship_rosters
  -- Positions: G = goaltender, D = defender, F = forward.
  -- topScorerRanking is set in section 9 below (sourced from Tipsport odds)
  -- so the scorer evaluator awards the rank-based bonus
  -- (1.nej=2b, 2.nej=3b, 3.nej=4b, 4.nej=6b; otherwise 8b unranked).

  -- ----- Group A -----

  -- Finland
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Olli', 'Määttä', 'D', 'Calgary Flames');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Mikko', 'Lehtonen', 'D', 'ZSC Lions');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Henri', 'Jokiharju', 'D', 'Boston Bruins');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Jesse', 'Puljujärvi', 'F', 'Genève-Servette Hockey Club');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Anton', 'Lundell', 'F', 'Florida Panthers');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Aleksander', 'Barkov', 'F', 'Florida Panthers');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Vili', 'Saarijärvi', 'D', 'Genève-Servette Hockey Club');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Waltteri', 'Merelä', 'F', 'SC Bern');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Patrik', 'Puistola', 'F', 'Örebro HK');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Sami', 'Päivärinta', 'F', 'HPK');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Hannes', 'Björninen', 'F', 'SCL Tigers');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Janne', 'Kuokkanen', 'F', 'Malmö Redhawks');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Harri', 'Säteri', 'G', 'EHC Biel');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Justus', 'Annunen', 'G', 'Nashville Predators');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Nikolas', 'Matinpalo', 'D', 'Ottawa Senators');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Aatu', 'Räty', 'F', 'Vancouver Canucks');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Eemil', 'Erholtz', 'F', 'Oulun Kärpät');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Ville', 'Heinola', 'D', 'Winnipeg Jets');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Mikael', 'Seppälä', 'D', 'HC Sparta Praha');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Urho', 'Vaakanainen', 'D', 'New York Rangers');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Sakari', 'Manninen', 'F', 'Genève-Servette Hockey Club');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Joonas', 'Korpisalo', 'G', 'Boston Bruins');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Saku', 'Mäenalanen', 'F', 'SCL Tigers');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Teuvo', 'Teräväinen', 'F', 'Chicago Blackhawks');
  PERFORM pg_temp.add_roster_player(v_lt_fin, 'Lenni', 'Hämeenaho', 'F', 'New Jersey Devils');

  -- Germany
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Jonas', 'Stettmer', 'G', 'Eisbären Berlin');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Kai', 'Wissmann', 'D', 'Eisbären Berlin');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Maximilian', 'Kastner', 'F', 'EHC Red Bull München');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Leon', 'Gawanke', 'D', 'Adler Mannheim');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Eric', 'Mik', 'D', 'Eisbären Berlin');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Stefan', 'Loibl', 'F', 'Straubing Tigers');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Nico', 'Krämmer', 'F', 'Fischtown Pinguins');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Leon', 'Hüttl', 'D', 'ERC Ingolstadt');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Philipp', 'Grubauer', 'G', 'Seattle Kraken');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Maximilian', 'Franzreb', 'G', 'Adler Mannheim');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Fabio', 'Wagner', 'D', 'EHC Red Bull München');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Alexander', 'Ehl', 'F', 'Adler Mannheim');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Joshua', 'Samanski', 'F', 'Edmonton Oilers');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Phillip', 'Sinn', 'D', 'EHC Red Bull München');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Moritz', 'Seider', 'D', 'Detroit Red Wings');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Manuel', 'Wiederer', 'F', 'Eisbären Berlin');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Parker', 'Tuomie', 'F', 'Kölner Haie');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Marcus', 'Weber', 'D', 'Nürnberg Ice Tigers');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Marc', 'Michaelis', 'F', 'Adler Mannheim');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Daniel', 'Fischbuch', 'F', 'Iserlohn Roosters');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Dominik', 'Kahun', 'F', 'Lausanne HC');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Lukas', 'Reichel', 'F', 'Boston Bruins');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Samuel', 'Dove-McFalls', 'F', 'Nürnberg Ice Tigers');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Frederik', 'Tiffels', 'F', 'Eisbären Berlin');
  PERFORM pg_temp.add_roster_player(v_lt_ger, 'Andreas', 'Eder', 'F', 'EHC Red Bull München');

  -- United States
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Devin', 'Cooley', 'G', 'Calgary Flames');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Ryan', 'Ufko', 'D', 'Milwaukee Admirals');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Ryan', 'Leonard', 'F', 'Washington Capitals');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'James', 'Hagens', 'F', 'Boston Bruins');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Oliver', 'Moore', 'F', 'Chicago Blackhawks');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Tommy', 'Novak', 'F', 'Pittsburgh Penguins');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Mason', 'Lohrei', 'D', 'Boston Bruins');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Will', 'Borgen', 'D', 'New York Rangers');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Sam', 'Lafferty', 'F', 'Chicago Blackhawks');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Matthew', 'Tkachuk', 'F', 'Florida Panthers');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Alex', 'Steeves', 'F', 'Boston Bruins');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Isaac', 'Howard', 'F', 'Bakersfield Condors');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Mathieu', 'Olivier', 'F', 'Columbus Blue Jackets');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Max', 'Plante', 'F', 'Minnesota Duluth Bulldogs');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Matt', 'Coronato', 'F', 'Calgary Flames');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Drew', 'Commesso', 'G', 'Rockford Ice Hogs');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Wyatt', 'Kaiser', 'D', 'Chicago Blackhawks');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Paul', 'Cotter', 'F', 'New Jersey Devils');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Ryan', 'Lindgren', 'D', 'Seattle Kraken');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Joseph', 'Woll', 'G', 'Toronto Maple Leafs');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Max', 'Sasson', 'F', 'Vancouver Canucks');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Declan', 'Carlile', 'D', 'Tampa Bay Lightning');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Justin', 'Faulk', 'D', 'Detroit Red Wings');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Connor', 'Clifton', 'D', 'Pittsburgh Penguins');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Danny', 'Nelson', 'F', 'Notre Dame Fighting Irish');
  PERFORM pg_temp.add_roster_player(v_lt_usa, 'Ryker', 'Lee', 'F', 'Michigan State Spartans');

  -- Switzerland
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Simon', 'Knak', 'F', 'HC Davos');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Damien', 'Riat', 'F', 'Lausanne HC');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Nico', 'Hischier', 'F', 'New Jersey Devils');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Dean', 'Kukan', 'D', 'ZSC Lions');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Ken', 'Jäger', 'F', 'Lausanne HC');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Reto', 'Berra', 'G', 'HC Fribourg-Gottéron');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Nino', 'Niederreiter', 'F', 'Winnipeg Jets');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Sandro', 'Aeschlimann', 'G', 'HC Davos');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Timo', 'Meier', 'F', 'New Jersey Devils');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Pius', 'Suter', 'F', 'St. Louis Blues');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Christian', 'Marti', 'D', 'ZSC Lions');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Tim', 'Berni', 'D', 'Genève-Servette Hockey Club');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Denis', 'Malgin', 'F', 'ZSC Lions');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Leonardo', 'Genoni', 'G', 'EV Zug');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Dominik', 'Egli', 'D', 'Frölunda HC');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Calvin', 'Thürkauf', 'F', 'HC Lugano');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Nicolas', 'Baechler', 'F', 'ZSC Lions');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Sven', 'Andrighetto', 'F', 'ZSC Lions');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'J. J.', 'Moser', 'D', 'Tampa Bay Lightning');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Christoph', 'Bertschy', 'F', 'HC Fribourg-Gottéron');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Roman', 'Josi', 'D', 'Nashville Predators');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Lukas', 'Frick', 'D', 'HC Davos');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Sven', 'Jung', 'D', 'HC Davos');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Attilio', 'Biasca', 'F', 'HC Fribourg-Gottéron');
  PERFORM pg_temp.add_roster_player(v_lt_sui, 'Théo', 'Rochette', 'F', 'Lausanne HC');

  -- Great Britain
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Liam', 'Steele', 'D', 'Sheffield Steeldogs');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Ben', 'Davies', 'F', 'Cardiff Devils');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Robert', 'Lachowicz', 'F', 'Glasgow Clan');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Bradley', 'Jenion', 'D', 'Manchester Storm');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Brett', 'Perlini', 'F', 'Cardiff Devils');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Liam', 'Kirk', 'F', 'Eisbären Berlin');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Jack', 'Hopkins', 'F', 'Coventry Blaze');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Mark', 'Richardson', 'D', 'Cardiff Devils');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Sam', 'Lyne', 'F', 'Colgate University');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Mat', 'Robson', 'G', 'Coventry Blaze');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Josh', 'Tetlow', 'D', 'Nottingham Panthers');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Cole', 'Shudra', 'F', 'Sheffield Steelers');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Ben', 'Bowns', 'G', 'Cardiff Devils');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Lucas', 'Brine', 'G', 'Glasgow Clan');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Johnny', 'Curran', 'F', 'Dundee Stars');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'David', 'Clements', 'D', 'Coventry Blaze');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Logan', 'Neilson', 'F', 'Cardiff Devils');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Ivan Björkly', 'Nordström', 'F', 'Sheffield Steelers');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Joseph', 'Hazeldine', 'D', 'HK Olimpija');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Ollie', 'Betteridge', 'F', 'Nottingham Panthers');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Robert', 'Dowd', 'F', 'Sheffield Steelers');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Bayley', 'Harewood', 'F', 'Cardiff Devils');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Nathanael', 'Halbert', 'D', 'Glasgow Clan');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Travis', 'Brown', 'D', 'Guildford Flames');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Joshua', 'Waller', 'F', 'Guildford Flames');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Cade', 'Neilson', 'F', 'Glasgow Clan');
  PERFORM pg_temp.add_roster_player(v_lt_gbr, 'Archie', 'Hazeldine', 'F', 'Coventry Blaze');

  -- Austria
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Peter', 'Schneider', 'F', 'Red Bull Salzburg');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Ramon', 'Schnetzer', 'D', 'Pioneers Vorarlberg');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Dominic', 'Hackl', 'D', 'Vienna Capitals');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Maximilian', 'Rebernig', 'F', 'EC VSV');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Leon', 'Wallner', 'F', 'Vienna Capitals');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'David', 'Maier', 'D', 'EC KAC');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Henrik', 'Neubauer', 'F', 'Steinbach Black Wings Linz');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Dominic', 'Zwerger', 'F', 'HC Ambrì-Piotta');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Ian', 'Scherzer', 'F', 'RPI Engineers');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Paul', 'Stapelfeldt', 'D', 'Graz 99ers');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Vinzenz', 'Rohrer', 'F', 'Montreal Canadiens');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'David', 'Kickert', 'G', 'Red Bull Salzburg');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Bernd', 'Wolf', 'D', 'EHC Kloten');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Florian', 'Vorauer', 'G', 'EC KAC');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Atte', 'Tolvanen', 'G', 'Red Bull Salzburg');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Tim', 'Harnisch', 'F', 'Graz 99ers');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Gregor', 'Biber', 'D', 'Rögle BK');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Lucas', 'Thaler', 'F', 'Red Bull Salzburg');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Paul', 'Huber', 'F', 'Graz 99ers');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Simeon', 'Schiwnger', 'F', 'EC KAC');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Benjamin', 'Nissner', 'F', 'Red Bull Salzburg');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Thimo', 'Nickl', 'D', 'EC KAC');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Leon', 'Kolarik', 'F', 'Peterborough Petes');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Clemens', 'Unterweger', 'D', 'EC KAC');
  PERFORM pg_temp.add_roster_player(v_lt_aut, 'Mario', 'Huber', 'F', 'Red Bull Salzburg');

  -- Hungary
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Bence', 'Bálizs', 'G', 'Ferencvárosi TC');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Domán', 'Szongoth', 'F', 'KooKoo');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Gabor', 'Tornyai', 'D', 'Újpesti TE');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Krisztián', 'Nagy', 'F', 'Ferencvárosi TC');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'János', 'Hári', 'F', 'Fehérvár AV19');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Kristóf', 'Papp', 'F', 'Norfolk Admirals');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Vilmos', 'Galló', 'F', 'KooKoo');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Zétény', 'Hadobás', 'D', 'Ferencvárosi TC');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Ádám', 'Vay', 'G', 'Piráti Chomutov');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Milán', 'Horváth', 'D', 'Ferencvárosi TC');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'István', 'Terbócs', 'F', 'Fehérvár AV19');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Csanád', 'Erdély', 'F', 'Fehérvár AV19');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Tamás', 'Ortenszky', 'D', 'EHC Winterthur');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Péter', 'Vincze', 'F', 'Gyergyói HK');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Bence', 'Horváth', 'F', 'Jukurit');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Zsombor', 'Garát', 'D', 'Nottingham Panthers');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Levente', 'Hegedüs', 'G', 'Fehérvár Hockey Academy 19');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Márkó', 'Csollák', 'D', 'DVTK Jegesmedvék');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Roland', 'Kiss', 'D', 'Fehérvár AV19');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Bence', 'Stipsicz', 'D', 'Fehérvár AV19');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'István', 'Bartalis', 'F', 'Fehérvár AV19');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Márton', 'Nemes', 'F', 'Bentley Falcons');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Csanád', 'Ravasz', 'F', 'Gyergyói HK');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Tamás', 'Sárpátki', 'F', 'Gyergyói HK');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'Balázs', 'Sebők', 'F', 'HC Ässät Pori');
  PERFORM pg_temp.add_roster_player(v_lt_hun, 'István', 'Sofron', 'F', 'Ferencvárosi TC');

  -- Latvia
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Alberts', 'Šmits', 'D', 'EHC Red Bull München');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Renārs', 'Krastenbergs', 'F', 'HC Olomouc');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Gļebs', 'Prohorenkovs', 'F', 'Niagara Purple Eagles');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Mārtiņš', 'Dzierkals', 'F', 'HC Sparta Praha');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Rūdolfs', 'Balcers', 'F', 'ZSC Lions');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Oskars', 'Cibuļskis', 'D', 'Herning Blue Fox');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Ralfs', 'Freibergs', 'D', 'HC Vítkovice Ridera');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Mareks', 'Mitens', 'G', 'HC Banská Bystrica');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Miks', 'Tumānovs', 'D', 'Jokerit');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Kristers', 'Gudļevskis', 'G', 'Fischtown Pinguins');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Roberts', 'Mamčics', 'D', 'Energie Karlovy Vary');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Kristaps', 'Zīle', 'D', 'HC Bílí Tygři Liberec');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Gustavs', 'Grigals', 'G', 'SaiPa');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Filips', 'Buncis', 'F', 'Rungsted Ishockey Klub');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Oskars', 'Batņa', 'F', 'Lahti Pelicans');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Haralds', 'Egle', 'F', 'Energie Karlovy Vary');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Arvils', 'Bergmanis', 'D', 'IF Troja-Ljungby');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Artūrs', 'Andžāns', 'D', 'HPK');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Deniss', 'Smirnovs', 'F', 'EHC Kloten');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Kristaps', 'Skrastiņš', 'F', 'New Hampshire Wildcats');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Patriks', 'Zabusovs', 'F', 'HK Zemgale/LBTU');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Oskars', 'Lapinskis', 'F', 'SCL Tigers');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Toms', 'Andersons', 'F', 'HC La Chaux-de-Fonds');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Sandis', 'Vilmanis', 'F', 'Charlotte Checkers');
  PERFORM pg_temp.add_roster_player(v_lt_lat, 'Olivers', 'Mūrnieks', 'F', 'Saint John Sea Dogs');

  -- ----- Group B -----

  -- Canada
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Dylan', 'DeMelo', 'D', 'Winnipeg Jets');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Denton', 'Mateychuk', 'D', 'Columbus Blue Jackets');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Sam', 'Dickinson', 'D', 'San Jose Sharks');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Connor', 'Brown', 'F', 'New Jersey Devils');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Robert', 'Thomas', 'F', 'St. Louis Blues');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Evan', 'Bouchard', 'D', 'Edmonton Oilers');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Dylan', 'Cozens', 'F', 'Ottawa Senators');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Darnell', 'Nurse', 'D', 'Edmonton Oilers');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Zach', 'Whitecloud', 'D', 'Calgary Flames');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Parker', 'Wotherspoon', 'D', 'Pittsburgh Penguins');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Cam', 'Talbot', 'G', 'Detroit Red Wings');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Gabriel', 'Vilardi', 'F', 'Winnipeg Jets');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Morgan', 'Rielly', 'D', 'Toronto Maple Leafs');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Mark', 'Scheifele', 'F', 'Winnipeg Jets');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Emmitt', 'Finnie', 'F', 'Detroit Red Wings');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Macklin', 'Celebrini', 'F', 'San Jose Sharks');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Jack', 'Ivankovic', 'G', 'Michigan Wolverines');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Jet', 'Greaves', 'G', 'Columbus Blue Jackets');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Dylan', 'Holloway', 'F', 'St. Louis Blues');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Sidney', 'Crosby', 'F', 'Pittsburgh Penguins');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Ryan', 'O’Reilly', 'F', 'Nashville Predators');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'John', 'Tavares', 'F', 'Toronto Maple Leafs');
  PERFORM pg_temp.add_roster_player(v_lt_can, 'Fraser', 'Minten', 'F', 'Boston Bruins');

  -- Sweden
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Magnus', 'Hellberg', 'G', 'Djurgårdens IF');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Love', 'Härenstam', 'G', 'Södertälje SK');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Arvid', 'Söderblom', 'G', 'Chicago Blackhawks');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Erik', 'Brännström', 'D', 'Lausanne HC');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Mattias', 'Ekholm', 'D', 'Edmonton Oilers');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Oliver', 'Ekman-Larsson', 'D', 'Toronto Maple Leafs');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Tim', 'Heed', 'D', 'HC Ambrì-Piotta');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Robert', 'Hägg', 'D', 'Brynäs IF');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Albert', 'Johansson', 'D', 'Detroit Red Wings');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Jacob', 'Larsson', 'D', 'SC Rapperswil-Jona Lakers');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Joel', 'Persson', 'D', 'Växjö Lakers');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Rasmus', 'Asplund', 'F', 'HC Davos');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Jack', 'Berglund', 'F', 'Färjestad BK');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Viggo', 'Björck', 'F', 'Djurgårdens IF');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Jacob', 'de la Rose', 'F', 'HC Fribourg-Gottéron');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Anton', 'Frondell', 'F', 'Chicago Blackhawks');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Isac', 'Hedqvist', 'F', 'Luleå HF');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Emil', 'Heineman', 'F', 'New York Islanders');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Simon', 'Holmström', 'F', 'New York Islanders');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Linus', 'Karlsson', 'F', 'Vancouver Canucks');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'André', 'Petersson', 'F', 'SCL Tigers');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Lucas', 'Raymond', 'F', 'Detroit Red Wings');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Jakob', 'Silfverberg', 'F', 'Brynäs IF');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Ivar', 'Stenberg', 'F', 'Frölunda HC');
  PERFORM pg_temp.add_roster_player(v_lt_swe, 'Oskar', 'Sundqvist', 'F', 'St. Louis Blues');

  -- Czechia
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Michal', 'Kempný', 'D', 'Brynäs IF');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Ondřej', 'Beránek', 'F', 'HC Energie Karlovy Vary');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Roman', 'Červenka', 'F', 'HC Dynamo Pardubice');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Filip', 'Hronek', 'D', 'Vancouver Canucks');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Jakub', 'Flek', 'F', 'Kometa Brno');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Lukáš', 'Sedlák', 'F', 'HC Dynamo Pardubice');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Jiří', 'Ticháček', 'D', 'Oulun Kärpät');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Josef', 'Kořenář', 'G', 'HC Sparta Praha');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Libor', 'Hájek', 'D', 'HC Dynamo Pardubice');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Dominik', 'Kubalík', 'F', 'EV Zug');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Dominik', 'Pavlát', 'G', 'Ilves');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Petr', 'Kváča', 'G', 'HC Bílí Tygři Liberec');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Jan', 'Ščotka', 'D', 'HC Kometa Brno');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Tomáš', 'Cibulka', 'D', 'Motor České Budějovice');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Tomáš', 'Galvas', 'D', 'HC Bílí Tygři Liberec');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Marek', 'Alscher', 'D', 'Florida Panthers');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Jiří', 'Černoch', 'F', 'HC Energie Karlovy Vary');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Daniel', 'Voženílek', 'F', 'EV Zug');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'David', 'Tomášek', 'F', 'Färjestad BK');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Jaroslav', 'Chmelař', 'F', 'New York Rangers');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Jan', 'Mandát', 'F', 'HC Dynamo Pardubice');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Martin', 'Kaut', 'F', 'HC Dynamo Pardubice');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Matěj', 'Blümel', 'F', 'Boston Bruins');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Matyáš', 'Melovský', 'F', 'Utica Comets');
  PERFORM pg_temp.add_roster_player(v_lt_cze, 'Michal', 'Kovařčík', 'F', 'HC Oceláři Třinec');

  -- Denmark
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Malte', 'Setkov', 'D', 'Rødovre Mighty Bulls');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Frederik', 'Storm', 'F', 'Kölner Haie');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Alexander', 'True', 'F', 'JYP Jyväskylä');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Markus', 'Lauridsen', 'D', 'HC Pustertal Wölfe');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Mikkel', 'Aagaard', 'F', 'Skellefteå AIK');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Mads', 'Søgaard', 'G', 'Belleville Senators');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Morten', 'Poulsen', 'F', 'Herning Blue Fox');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Anders', 'Koch', 'D', 'Graz 99ers');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Jesper', 'Jensen Aabo', 'D', 'EC KAC');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Phillip', 'Bruggisser', 'D', 'Fischtown Pinguins');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Felix', 'Scheel', 'F', 'Schwenninger Wild Wings');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Patrick', 'Russell', 'F', 'Kölner Haie');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Christian', 'Wejse', 'F', 'Fischtown Pinguins');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Mathias', 'From', 'F', 'EC KAC');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Frederik', 'Dichow', 'G', 'Timrå IK');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Joachim', 'Blichfeld', 'F', 'Tappara');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Nick', 'Olesen', 'F', 'Motor České Budějovice');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Nicolaj', 'Henriksen', 'G', 'Esbjerg Energy');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Kasper', 'Larsen', 'D', 'Herning Blue Fox');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Morten', 'Jensen', 'D', 'Rungsted Ishockey Klub');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Daniel', 'Baastrup', 'D', 'Odense Bulldogs');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Oliver', 'Kjær', 'F', 'Esbjerg Energy');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Jacob', 'Schmidt-Svejstrup', 'F', 'SønderjyskE Ishockey');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'Phillip', 'Schultz', 'F', 'Esbjerg Energy');
  PERFORM pg_temp.add_roster_player(v_lt_den, 'David', 'Madsen', 'F', 'Västerås IK');

  -- Slovakia
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Oliver', 'Okuliar', 'F', 'Skellefteå AIK');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Adam', 'Sýkora', 'F', 'Hartford Wolf Pack');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Samuel', 'Kňažko', 'D', 'HC Vítkovice Ridera');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Adam', 'Liška', 'F', 'Severstal Cherepovets');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Sebastián', 'Čederle', 'F', 'HK Nitra');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Adam', 'Gajan', 'G', 'Rockford IceHogs');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Samuel', 'Hlavaj', 'G', 'Iowa Wild');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Mislav', 'Rosandić', 'D', 'HC Košice');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Patrik', 'Koch', 'D', 'Oceláři Třinec');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Martin', 'Pospíšil', 'F', 'Calgary Flames');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Martin', 'Chromiak', 'F', 'Ontario Reign');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Eugen', 'Rabčan', 'G', 'HC MONACObet Banská Bystrica');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'František', 'Gajdoš', 'D', 'HC Litvínov');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Viliam', 'Kmec', 'D', 'Henderson Silver Knights');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Jakub', 'Meliško', 'D', 'HK Dukla Michalovce');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Luka', 'Radivojevič', 'D', 'Boston College Eagles');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Maxim', 'Štrbák', 'D', 'Rochester Americans');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Martin', 'Faško-Rudáš', 'F', 'HC Bílí Tygři Liberec');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Marek', 'Hrivík', 'F', 'HC Vítkovice Ridera');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Andrej', 'Kollár', 'F', 'HC Kometa Brno');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Filip', 'Mešár', 'F', 'Laval Rocket');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Jakub', 'Minárik', 'F', 'HC Energie Karlovy Vary');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Aurel', 'Nauš', 'F', 'HK Poprad');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Servác', 'Petrovský', 'F', 'HC Bílí Tygři Liberec');
  PERFORM pg_temp.add_roster_player(v_lt_svk, 'Kristián', 'Pospíšil', 'F', 'HC Kometa Brno');

  -- Norway
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Johannes', 'Johannesen', 'D', 'Lahti Pelicans');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Noah', 'Steen', 'F', 'Syracuse Crunch');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Petter', 'Vesterheim', 'F', 'Malmö Redhawks');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Eirik', 'Østrem Salsten', 'F', 'Iserlohn Roosters');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Thomas', 'Olsen', 'F', 'Jukurit');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Håvard', 'Østrem Salsten', 'F', 'Djurgårdens IF');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Martin', 'Rønnild', 'F', 'Storhamar Hockey');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Jacob', 'Berglund', 'F', 'Storhamar Hockey');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Patrick', 'Elvsveen', 'F', 'Stavanger Oilers');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Andreas', 'Martinsen', 'F', 'Storhamar Hockey');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Tobias', 'Normann', 'G', 'Frölunda HC');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Mathias', 'Schjerpen Arnkværn', 'G', 'Vålerenga Ishockey');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Markus', 'Vikingstad', 'F', 'Eisbären Berlin');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Max', 'Krogdahl', 'D', 'Skellefteå AIK');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Adrian', 'Saxrud-Danielsen', 'D', 'Vålerenga Ishockey');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Sander', 'Hurrod', 'D', 'Storhamar Hockey');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Eskild', 'Bakke Olsen', 'F', 'Linköping HC');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Stian', 'Solberg', 'D', 'San Diego Gulls');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Henrik', 'Haukeland', 'G', 'Straubing Tigers');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Victor', 'Kopperstad', 'D', 'Mora IK');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Christian', 'Kåsastul', 'D', 'Frisk Asker Ishockey');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Kristian', 'Østby', 'D', 'Stavanger Oilers');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Mikkel', 'Eriksen', 'F', 'Färjestad BK');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Tinus Luc', 'Koblar', 'F', 'Leksands IF');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Mathias Emilio', 'Pettersen', 'F', 'Djurgårdens IF');
  PERFORM pg_temp.add_roster_player(v_lt_nor, 'Mikkel', 'Øby Olsen', 'F', 'Almtuna IS');

  -- Italy
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Alessandro', 'Segafredo', 'F', 'ZSC Lions');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Daniel', 'Mantenuto', 'F', 'HC Bolzano');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Marco', 'Zanetti', 'F', 'HC Lugano');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Matt', 'Bradley', 'F', 'HC Bolzano');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Nick', 'Saracino', 'F', 'HC Pustertal Wölfe');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Tommy', 'Purdeller', 'F', 'HC Pustertal Wölfe');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Davide', 'Fadani', 'G', 'EHC Kloten');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Cristiano', 'DiGiacinto', 'F', 'HC Bolzano');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Phil', 'Pietroniro', 'D', 'Rytíři Kladno');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Alex', 'Trivellato', 'D', 'Schwenninger Wild Wings');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Luca', 'Zanatta', 'D', 'HC Pustertal Wölfe');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Mats', 'Frycklund', 'F', 'HC Pustertal Wölfe');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Tommaso', 'de Luca', 'F', 'HC Ambrì-Piotta');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Dylan', 'di Perna', 'D', 'HC Bolzano');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Luca', 'Frigo', 'F', 'HC Bolzano');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Colin', 'Furlong', 'G', 'Ritten Sport');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Jacob', 'Smith', 'G', 'Ducs d''Angers');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Carmine', 'Buono', 'D', 'HC Gherdëina');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Gregorio', 'Gios', 'D', 'Asiago Hockey 1935');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Gabriel', 'Nitz', 'D', 'HC Falcons Brixen');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Peter', 'Spornberger', 'D', 'ERC Ingolstadt');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Ivan', 'Deluca', 'F', 'HC Pustertal Wölfe');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Niccolò', 'Mansueto', 'F', 'HC Sierre');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Matthias', 'Mantinger', 'F', 'HC Pustertal Wölfe');
  PERFORM pg_temp.add_roster_player(v_lt_ita, 'Bryce', 'Misley', 'F', 'HC Bolzano');

  -- Slovenia
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Aleksandar', 'Magovac', 'D', 'Gothiques d''Amiens');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Miha', 'Štebih', 'D', 'SK Horácká Slavia Třebíč');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Marcel', 'Mahkovec', 'F', 'HK Olimpija');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Miha', 'Beričič', 'F', 'HK Olimpija');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Nik', 'Simšič', 'F', 'HK Olimpija');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Nace', 'Langus', 'F', 'Augustana Vikings');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Blaž', 'Gregorc', 'D', 'HK Olimpija');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Jan', 'Goličič', 'D', 'Blainville-Boisbriand Armada');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Ken', 'Ograjenšek', 'F', 'Steinbach Black Wings Linz');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Jan', 'Drozg', 'F', 'HK Olimpija');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Jaka', 'Sodja', 'F', 'HK Olimpija');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Žan', 'Us', 'G', 'HDD Jesenice');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Jan', 'Ćosić', 'D', 'HK Olimpija');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Matic', 'Török', 'F', 'Ilves');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Filip', 'Sitar', 'F', 'RPI Engineers');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Robert', 'Sabolič', 'F', 'HK Olimpija');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Lukaš', 'Horak', 'G', 'HK Olimpija');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Žan', 'Jezovšek', 'F', 'EV Lindau Islanders');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Luka', 'Kolin', 'G', 'HK Olimpija');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Rožle', 'Bohinc', 'D', 'HK Olimpija');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Aljoša', 'Crnovič', 'D', 'HK Olimpija');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Maks', 'Perčič', 'D', 'HC Slavia Praha');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Anže', 'Kuralt', 'F', 'Fehérvár AV19');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Luka', 'Maver', 'F', 'Steinbach Black Wings Linz');
  PERFORM pg_temp.add_roster_player(v_lt_slo, 'Rok', 'Tičar', 'F', 'HC Pustertal Wölfe');

  -- ===== 9. Top scorer ranks (1-4 per team, sampled from Tipsport odds) =====
  -- Source: tipsport.cz/kurzy/zapas/ledni-hokej-ms-2026-nejlepsi-strelec-tymu/8027121
  -- Sampled 2026-05-14. Ordering = ascending odds (lowest = rank 1).
  -- Ties broken by the order in which Tipsport listed them on the page.
  -- Mapping to evaluator points: rank 1 → 2 b, 2 → 3 b, 3 → 4 b, 4 → 6 b;
  -- all other scorers get the unranked default (8 b).

  -- ----- Group A -----

  -- Finland (4.00 / 4.50 / 6.50 / 6.70)
  PERFORM pg_temp.set_top_scorer_rank(v_lt_fin, 'Sakari', 'Manninen',  1);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_fin, 'Aleksander', 'Barkov', 2);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_fin, 'Janne', 'Kuokkanen',  3);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_fin, 'Lenni', 'Hämeenaho',  4);

  -- Germany (3.00 / 4.50 / 6.00 / 6.00)
  PERFORM pg_temp.set_top_scorer_rank(v_lt_ger, 'Lukas', 'Reichel',   1);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_ger, 'Dominik', 'Kahun',   2);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_ger, 'Daniel', 'Fischbuch', 3);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_ger, 'Joshua', 'Samanski',  4);

  -- United States (2.30 / 4.00 / 4.50 / 9.00)
  PERFORM pg_temp.set_top_scorer_rank(v_lt_usa, 'Ryan', 'Leonard',     1);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_usa, 'Matthew', 'Tkachuk',  2);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_usa, 'Matt', 'Coronato',    3);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_usa, 'James', 'Hagens',     4);

  -- Switzerland (2.80 / 2.80 / 4.50 / 6.00)
  PERFORM pg_temp.set_top_scorer_rank(v_lt_sui, 'Nico', 'Hischier',    1);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_sui, 'Timo', 'Meier',       2);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_sui, 'Sven', 'Andrighetto', 3);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_sui, 'Roman', 'Josi',       4);

  -- Great Britain (1.75 / 5.50 / 7.00 / 8.00)
  PERFORM pg_temp.set_top_scorer_rank(v_lt_gbr, 'Liam', 'Kirk',     1);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_gbr, 'Robert', 'Dowd',   2);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_gbr, 'Johnny', 'Curran', 3);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_gbr, 'Brett', 'Perlini', 4);

  -- Austria (3.60 / 3.60 / 5.50 / 10.00 — Kolarik listed before Nissner at 10.00)
  PERFORM pg_temp.set_top_scorer_rank(v_lt_aut, 'Vinzenz', 'Rohrer',  1);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_aut, 'Peter', 'Schneider', 2);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_aut, 'Dominic', 'Zwerger', 3);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_aut, 'Leon', 'Kolarik',    4);

  -- Hungary (2.85 / 4.50 / 4.50 / 6.50)
  PERFORM pg_temp.set_top_scorer_rank(v_lt_hun, 'Vilmos', 'Galló',  1);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_hun, 'Balázs', 'Sebők',  2);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_hun, 'István', 'Terbócs', 3);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_hun, 'Bence', 'Horváth', 4);

  -- Latvia (2.80 / 4.00 / 7.50 / 7.50 — Batņa, Dzierkals, Smirnovs all 7.50,
  --  Batņa listed first on the page)
  PERFORM pg_temp.set_top_scorer_rank(v_lt_lat, 'Sandis', 'Vilmanis',    1);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_lat, 'Rūdolfs', 'Balcers',    2);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_lat, 'Oskars', 'Batņa',       3);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_lat, 'Mārtiņš', 'Dzierkals',  4);

  -- ----- Group B -----

  -- Canada (2.10 / 3.80 / 4.50 / 6.00)
  PERFORM pg_temp.set_top_scorer_rank(v_lt_can, 'Macklin', 'Celebrini', 1);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_can, 'Mark', 'Scheifele',    2);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_can, 'Gabriel', 'Vilardi',   3);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_can, 'Sidney', 'Crosby',     4);

  -- Sweden (2.30 / 4.00 / 5.00 / 6.50)
  PERFORM pg_temp.set_top_scorer_rank(v_lt_swe, 'Lucas', 'Raymond',    1);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_swe, 'Emil', 'Heineman',    2);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_swe, 'Anton', 'Frondell',   3);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_swe, 'Simon', 'Holmström',  4);

  -- Czechia (4.10 / 4.10 / 4.10 / 4.50 — Blümel, Červenka, Sedlák all 4.10)
  PERFORM pg_temp.set_top_scorer_rank(v_lt_cze, 'Matěj', 'Blümel',   1);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_cze, 'Roman', 'Červenka', 2);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_cze, 'Lukáš', 'Sedlák',   3);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_cze, 'David', 'Tomášek',  4);

  -- Denmark (4.00 / 4.00 / 5.00 / 6.00)
  PERFORM pg_temp.set_top_scorer_rank(v_lt_den, 'Mikkel', 'Aagaard',   1);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_den, 'Joachim', 'Blichfeld', 2);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_den, 'Nick', 'Olesen',      3);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_den, 'Patrick', 'Russell',  4);

  -- Slovakia (4.50 / 5.00 / 5.50 / 5.50 — Pospíšil listed before Sýkora at 5.50)
  PERFORM pg_temp.set_top_scorer_rank(v_lt_svk, 'Oliver', 'Okuliar',  1);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_svk, 'Martin', 'Chromiak', 2);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_svk, 'Martin', 'Pospíšil', 3);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_svk, 'Adam', 'Sýkora',     4);

  -- Norway (4.50 / 5.00 / 5.50 / 6.00)
  PERFORM pg_temp.set_top_scorer_rank(v_lt_nor, 'Jacob', 'Berglund',   1);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_nor, 'Stian', 'Solberg',    2);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_nor, 'Noah', 'Steen',       3);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_nor, 'Eskild', 'Bakke Olsen', 4);

  -- Italy (3.80 / 3.80 / 5.00 / 5.70)
  PERFORM pg_temp.set_top_scorer_rank(v_lt_ita, 'Matt', 'Bradley',    1);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_ita, 'Tommy', 'Purdeller', 2);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_ita, 'Tommaso', 'de Luca', 3);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_ita, 'Marco', 'Zanetti',   4);

  -- Slovenia (4.00 / 4.50 / 6.00 / 7.00)
  PERFORM pg_temp.set_top_scorer_rank(v_lt_slo, 'Matic', 'Török',   1);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_slo, 'Jan', 'Drozg',     2);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_slo, 'Robert', 'Sabolič', 3);
  PERFORM pg_temp.set_top_scorer_rank(v_lt_slo, 'Rok', 'Tičar',     4);

  RAISE NOTICE 'League "MS Hokej 2026" created with id=%', v_league_id;
END $$;

COMMIT;
