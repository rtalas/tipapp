-- ============================================================================
-- WORLD CUP 2026 FOOTBALL TIPPING LEAGUE — DATABASE SEED
-- ============================================================================
-- Vygeneruje kompletní tipovačku na MS ve fotbale 2026:
--   * 1 ligu "MS ve fotbale 2026" (sport: Football, sezóna 2026)
--   * 48 reprezentačních týmů ve 12 skupinách (A–L)
--   * Soupisky všech 48 týmů
--   * 72 skupinových zápasů s reálnými termíny
--   * 32 play-off zápasů s placeholdery (R32 → Finále)
--   * Bodovací evaluátory dle pravidel tipovačky
--   * 48 skupinových tipů (12 skupin × 4 pozice)
--   * 4 tipy na konečné pořadí (1.–4. místo)
--   * 5 hráčských cen (mladý hráč, hráč turnaje, brankář, střelec, asistence)
--   * Počet branek nejlepšího střelce (exact_value)
--   * Celkový počet branek turnaje (closest_value)
--   * Fair-play tým
--   * 39 placeholder denních ANO/NE otázek (otázky budou doplněny)
--
-- Spuštění:
--   psql "$DATABASE_URL" -f prisma/wc2026-seed.sql
-- nebo přes Supabase SQL Editor.
--
-- Skript je idempotentní pro Sport / EvaluatorType / Match-/LeaguePhase
-- (vytvoří, pokud neexistují). Liga + týmy + hráči vznikají vždy nově.
-- Pokud běh selže, transakce se vrátí zpět.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) PRACOVNÍ TABULKY PRO MAPOVÁNÍ ID
-- ============================================================================
-- Používáme obyčejné tabulky (ne TEMP), aby fungovaly přes Supabase SQL Editor
-- a pgBouncer v transaction módu — TEMP by se ztratily mezi statementy.
-- Na konci skriptu je zase mažeme.
DROP TABLE IF EXISTS _wc_var;
CREATE TABLE _wc_var (
    key TEXT PRIMARY KEY,
    val INT NOT NULL
);

DROP TABLE IF EXISTS _wc_team_map;
CREATE TABLE _wc_team_map (
    shortcut TEXT PRIMARY KEY,
    team_id INT NOT NULL,
    league_team_id INT
);

-- ============================================================================
-- 2) ZAJIŠTĚNÍ FOUNDATION DAT (Sport, EvaluatorType, LeaguePhase, MatchPhase)
-- ============================================================================
DO $foundation$
DECLARE
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Sport: Football (sportId=2 podle konvence, ale použijeme název)
    INSERT INTO "Sport"(name, "createdAt", "updatedAt")
    SELECT 'Football', v_now, v_now
    WHERE NOT EXISTS (SELECT 1 FROM "Sport" WHERE name = 'Football');

    -- EvaluatorType — všechny typy, které tipovačka používá
    INSERT INTO "EvaluatorType"(name, "createdAt", "updatedAt")
    SELECT name, v_now, v_now FROM unnest(ARRAY[
        'exact_score','score_difference','winner','draw','scorer',
        'soccer_playoff_advance','exact_team','exact_player','exact_value',
        'closest_value','question','group_stage_team'
    ]) AS name
    ON CONFLICT DO NOTHING;
    -- (EvaluatorType nemá unique index na name — kdyby existoval duplikát,
    --  následný SELECT v dalším bloku vezme nejnižší ID.)
END $foundation$;

-- Fáze ligy — vytvoříme jen pokud takový name ještě není
INSERT INTO "LeaguePhase"(name, rank, "createdAt", "updatedAt")
SELECT v.name, v.rank, NOW(), NOW()
FROM (VALUES
    ('Group Stage', 1),
    ('Round of 32', 2),
    ('Round of 16', 3),
    ('Quarter-finals', 4),
    ('Semi-finals', 5),
    ('Third place', 6),
    ('Final', 7)
) AS v(name, rank)
WHERE NOT EXISTS (SELECT 1 FROM "LeaguePhase" lp WHERE lp.name = v.name AND lp."deletedAt" IS NULL);

-- Fáze zápasů — pro každou skupinu vlastní fáze (Group A–L), aby se v match
-- cardu zobrazoval konkrétní text (Group A místo generického "Group Stage").
INSERT INTO "MatchPhase"(name, rank, "bestOf", "createdAt", "updatedAt")
SELECT v.name, v.rank, NULL, NOW(), NOW()
FROM (VALUES
    ('Group A',         1),
    ('Group B',         2),
    ('Group C',         3),
    ('Group D',         4),
    ('Group E',         5),
    ('Group F',         6),
    ('Group G',         7),
    ('Group H',         8),
    ('Group I',         9),
    ('Group J',        10),
    ('Group K',        11),
    ('Group L',        12),
    ('Round of 32',    13),
    ('Round of 16',    14),
    ('Quarter-finals', 15),
    ('Semi-finals',    16),
    ('Third place',    17),
    ('Final',          18)
) AS v(name, rank)
WHERE NOT EXISTS (SELECT 1 FROM "MatchPhase" mp WHERE mp.name = v.name AND mp."deletedAt" IS NULL);

-- ============================================================================
-- 3) VYTVOŘENÍ LIGY + EVALUÁTORŮ
-- ============================================================================
DO $setup$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_sport_id INT;
    v_league_id INT;

    -- Evaluator type ID lookup
    v_et_exact_score INT;
    v_et_score_diff INT;
    v_et_winner INT;
    v_et_draw INT;
    v_et_scorer INT;
    v_et_soccer_po INT;
    v_et_exact_team INT;
    v_et_exact_player INT;
    v_et_exact_value INT;
    v_et_closest_value INT;
    v_et_question INT;
    v_et_group_stage INT;

    -- Evaluator IDs (uložíme do _wc_var pro pozdější referenci)
    v_eval INT;
BEGIN
    SELECT id INTO v_sport_id FROM "Sport" WHERE name = 'Football' AND "deletedAt" IS NULL ORDER BY id LIMIT 1;

    SELECT id INTO v_et_exact_score FROM "EvaluatorType" WHERE name = 'exact_score' AND "deletedAt" IS NULL ORDER BY id LIMIT 1;
    SELECT id INTO v_et_score_diff  FROM "EvaluatorType" WHERE name = 'score_difference' AND "deletedAt" IS NULL ORDER BY id LIMIT 1;
    SELECT id INTO v_et_winner      FROM "EvaluatorType" WHERE name = 'winner' AND "deletedAt" IS NULL ORDER BY id LIMIT 1;
    SELECT id INTO v_et_draw        FROM "EvaluatorType" WHERE name = 'draw' AND "deletedAt" IS NULL ORDER BY id LIMIT 1;
    SELECT id INTO v_et_scorer      FROM "EvaluatorType" WHERE name = 'scorer' AND "deletedAt" IS NULL ORDER BY id LIMIT 1;
    SELECT id INTO v_et_soccer_po   FROM "EvaluatorType" WHERE name = 'soccer_playoff_advance' AND "deletedAt" IS NULL ORDER BY id LIMIT 1;
    SELECT id INTO v_et_exact_team  FROM "EvaluatorType" WHERE name = 'exact_team' AND "deletedAt" IS NULL ORDER BY id LIMIT 1;
    SELECT id INTO v_et_exact_player FROM "EvaluatorType" WHERE name = 'exact_player' AND "deletedAt" IS NULL ORDER BY id LIMIT 1;
    SELECT id INTO v_et_exact_value FROM "EvaluatorType" WHERE name = 'exact_value' AND "deletedAt" IS NULL ORDER BY id LIMIT 1;
    SELECT id INTO v_et_closest_value FROM "EvaluatorType" WHERE name = 'closest_value' AND "deletedAt" IS NULL ORDER BY id LIMIT 1;
    SELECT id INTO v_et_question    FROM "EvaluatorType" WHERE name = 'question' AND "deletedAt" IS NULL ORDER BY id LIMIT 1;
    SELECT id INTO v_et_group_stage FROM "EvaluatorType" WHERE name = 'group_stage_team' AND "deletedAt" IS NULL ORDER BY id LIMIT 1;

    -- Zrušíme isTheMostActive flag z předchozích lig
    UPDATE "League" SET "isTheMostActive" = FALSE, "updatedAt" = v_now WHERE "isTheMostActive" = TRUE;

    -- Vytvoříme samotnou ligu
    INSERT INTO "League"(
        name, "sportId", "isActive", "isTheMostActive",
        "seasonFrom", "seasonTo", "isFinished", "isPublic",
        "isChatEnabled", "jokerCount", "infoText",
        "createdAt", "updatedAt"
    ) VALUES (
        'MS Fotbal 2026',
        v_sport_id,
        TRUE,  -- isActive
        TRUE,  -- isTheMostActive
        2026,
        2026,
        FALSE,
        TRUE,  -- isPublic — uživatelé se mohou hlásit přes UserRequest
        TRUE,  -- isChatEnabled
        5,     -- jokerCount: 5 žolíků na hráče
        E'Pravidla:\n' ||
        E'- Vklad do tipovačky je 400 Kč. První 4 placení (5. se to nejspíš vrátí) a posledním třem se trochu zvýší startovné (+100, +200, +300).\n' ||
        E'- Tipují se všechny zápasy Mistrovství světa + několik celkových tipů (medailisté + nej.hráči).\n' ||
        E'- U zápasů se tipuje přesný výsledek po zákl.době + jeden střelec. Je možné tipnout, že žádný střelec nebude nebo že padne vlastní gól.\n' ||
        E'- V playoff se v případě remízy tipuje i postupující.\n' ||
        E'- 3 nejlepší střelci týmu podle sázkovek jsou za menší počet bodů.\n' ||
        E'- Střelec se bere vč. prodloužení či rozhodující penalty. Takový gól se započítává i do celkového počtu branek.\n' ||
        E'- Tipuje se i pořadí ve skupinách. U třetích míst je nutno určit, které týmy postoupí do 1/16.\n' ||
        E'- Od čtvrtfinále se zápasy počítají za dvojnásobné body.\n' ||
        E'- Při rovnosti bodů na konci tipovačky rozhoduje počet přesných výsledků a poté body za 1-0-2.\n' ||
        E'- Kdo trefí přesný počet celkových gólů, dostane 35 bodů. Pokud to nikdo netrefí, nejbližší tipér dostane 14 bodů.\n' ||
        E'- V zápasech skupin, 1/16 a 1/8 se občas náhodně objeví nějaký vyrovnaný zápas, který bude za dvojnásobné body.\n' ||
        E'- Každý hráč má 5 žolíků pro zdvojnásobení bodů, které může využít pro zápasy skupin. 2 pak budou na 1/16finále a 1 na osmifinále.\n' ||
        E'- Žolík nelze použít na zápasy, které už jsou za dvojnásobné body a na zápasy, kde je kurz na favorita do 1.5.\n' ||
        E'- Pokud je nejlepším střelcem MS více hráčů, body jsou za všechny hráče, nikoliv jen za toho, kdo na to potřeboval nejmíň zápasů.\n' ||
        E'- Každý den obsahuje jednu nepovinnou ANO/NE otázku týkající se všech zápasů toho dne dohromady (pokud není uvedeno jinak).\n' ||
        E'- Den pro otázku se bere jako hrací den podle našeho času - tzn. zápasy od soboty 18:00 do neděle 06:00 se berou jako jeden den.\n\n' ||
        E'Bodování:\n' ||
        E'- Vítěz zápasu: 3 b\n' ||
        E'- Vítěz zápasu + brank. rozdíl: 4 b\n' ||
        E'- Remíza: 4 b\n' ||
        E'- Přesný výsledek: 8 b\n' ||
        E'- Střelec zápasu: 8 b\n' ||
        E'- Nej.střelec jako střelec: 2 b\n' ||
        E'- 2.nej.střelec jako střelec: 3 b\n' ||
        E'- 3.nej.střelec jako střelec: 4 b\n' ||
        E'- Postupující v playoff: 3 b\n' ||
        E'- Vítěz skupiny: 10 b\n' ||
        E'- Další přesné umístění: 7 b\n' ||
        E'- Postupující ze skupiny: 4 b\n' ||
        E'- Vítěz MS: 40 b\n' ||
        E'- 2.místo: 30 b\n' ||
        E'- 3.místo: 20 b\n' ||
        E'- 4.místo: 15 b\n' ||
        E'- Nejlepší mladý hráč (<22 let): 25 b\n' ||
        E'- Nejlepší hráč turnaje: 25 b\n' ||
        E'- Nejlepší brankář turnaje: 25 b\n' ||
        E'- Nejlepší střelec turnaje: 25 b\n' ||
        E'- Nejvíc asistencí turnaje: 25 b\n' ||
        E'- Počet branek nejlepšího střelce: 15 b\n' ||
        E'- Fair-play team: 20 b\n' ||
        E'- Celkový počet branek: 35 (14) b\n' ||
        E'- Otázka ANO/NE/netipováno: 6/-3/0 b',
        v_now,
        v_now
    ) RETURNING id INTO v_league_id;

    INSERT INTO _wc_var(key, val) VALUES ('league_id', v_league_id), ('sport_id', v_sport_id);

    -- ------------------------------------------------------------------------
    -- Match-bet evaluatoři (entity = 'match')
    -- ------------------------------------------------------------------------
    -- Přesný výsledek: 4 b (vítěz 3 + rozdíl 1 + přesný 4 = 8 celkem)
    INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
    VALUES ('Přesný výsledek', v_et_exact_score, v_league_id, 'match', 4, v_now, v_now)
    RETURNING id INTO v_eval;
    INSERT INTO _wc_var VALUES ('ev_exact_score', v_eval);

    -- Brankový rozdíl: 1 b (vítěz 3 + rozdíl 1 = 4)
    INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
    VALUES ('Brankový rozdíl', v_et_score_diff, v_league_id, 'match', 1, v_now, v_now)
    RETURNING id INTO v_eval;
    INSERT INTO _wc_var VALUES ('ev_score_diff', v_eval);

    -- Vítěz: 3 b
    INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
    VALUES ('Vítěz zápasu', v_et_winner, v_league_id, 'match', 3, v_now, v_now)
    RETURNING id INTO v_eval;
    INSERT INTO _wc_var VALUES ('ev_winner', v_eval);

    -- Remíza: 4 b (samostatně, fotbalová pravidla — winner a draw jsou disjunktní)
    INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
    VALUES ('Remíza', v_et_draw, v_league_id, 'match', 4, v_now, v_now)
    RETURNING id INTO v_eval;
    INSERT INTO _wc_var VALUES ('ev_draw', v_eval);

    -- Střelec: 7 b za netop střelce, rank-based config pro top 3
    INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, config, "createdAt", "updatedAt")
    VALUES (
        'Střelec zápasu',
        v_et_scorer,
        v_league_id,
        'match',
        0, -- u rank-based scorer config se points ignoruje (CLAUDE.md), držíme 0
        '{"rankedPoints": {"1": 2, "2": 3, "3": 4}, "unrankedPoints": 8}'::jsonb,
        v_now, v_now
    ) RETURNING id INTO v_eval;
    INSERT INTO _wc_var VALUES ('ev_scorer', v_eval);

    -- Postupující v play-off: 3 b
    INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
    VALUES ('Postupující v play-off', v_et_soccer_po, v_league_id, 'match', 3, v_now, v_now)
    RETURNING id INTO v_eval;
    INSERT INTO _wc_var VALUES ('ev_soccer_po', v_eval);

    -- ------------------------------------------------------------------------
    -- Special-bet evaluatoři (entity = 'special_bet')
    -- ------------------------------------------------------------------------
    -- Vítěz skupiny (group_stage_team 10/4)
    INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, config, "createdAt", "updatedAt")
    VALUES (
        'Vítěz skupiny',
        v_et_group_stage,
        v_league_id, 'special_bet',
        10,
        '{"winnerPoints": 10, "advancePoints": 4}'::jsonb,
        v_now, v_now
    ) RETURNING id INTO v_eval;
    INSERT INTO _wc_var VALUES ('ev_group_winner', v_eval);

    -- 2. místo ve skupině — vždy postupuje; konzolačních 4 b za jakýkoli tým, který postoupil
    INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, config, "createdAt", "updatedAt")
    VALUES (
        '2. místo ve skupině',
        v_et_group_stage,
        v_league_id, 'special_bet',
        7,
        '{"winnerPoints": 7, "advancePoints": 4}'::jsonb,
        v_now, v_now
    ) RETURNING id INTO v_eval;
    INSERT INTO _wc_var VALUES ('ev_group_second', v_eval);

    -- 3. místo ve skupině — uživatel musí označit (top-8 z 12 třetích míst);
    -- konzolačních 4 b jen pokud označil a tým reálně postoupil
    INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, config, "createdAt", "updatedAt")
    VALUES (
        '3. místo ve skupině',
        v_et_group_stage,
        v_league_id, 'special_bet',
        7,
        '{"winnerPoints": 7, "advancePoints": 4, "requiresUserMark": true}'::jsonb,
        v_now, v_now
    ) RETURNING id INTO v_eval;
    INSERT INTO _wc_var VALUES ('ev_group_third', v_eval);

    -- 4. místo ve skupině — tip na nepostup; konzolačních 4 b se nikdy nedává
    INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, config, "createdAt", "updatedAt")
    VALUES (
        '4. místo ve skupině',
        v_et_group_stage,
        v_league_id, 'special_bet',
        7,
        '{"winnerPoints": 7, "advancePoints": 0}'::jsonb,
        v_now, v_now
    ) RETURNING id INTO v_eval;
    INSERT INTO _wc_var VALUES ('ev_group_fourth', v_eval);

    -- Vítěz MS (exact_team 40)
    INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
    VALUES ('Vítěz MS', v_et_exact_team, v_league_id, 'special_bet', 40, v_now, v_now)
    RETURNING id INTO v_eval;
    INSERT INTO _wc_var VALUES ('ev_winner_ms', v_eval);

    -- 2. místo (exact_team 30)
    INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
    VALUES ('2. místo MS', v_et_exact_team, v_league_id, 'special_bet', 30, v_now, v_now)
    RETURNING id INTO v_eval;
    INSERT INTO _wc_var VALUES ('ev_second_ms', v_eval);

    -- 3. místo (exact_team 20)
    INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
    VALUES ('3. místo MS', v_et_exact_team, v_league_id, 'special_bet', 20, v_now, v_now)
    RETURNING id INTO v_eval;
    INSERT INTO _wc_var VALUES ('ev_third_ms', v_eval);

    -- 4. místo (exact_team 15)
    INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
    VALUES ('4. místo MS', v_et_exact_team, v_league_id, 'special_bet', 15, v_now, v_now)
    RETURNING id INTO v_eval;
    INSERT INTO _wc_var VALUES ('ev_fourth_ms', v_eval);

    -- Fair-play tým (exact_team 20)
    INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
    VALUES ('Fair-play tým', v_et_exact_team, v_league_id, 'special_bet', 20, v_now, v_now)
    RETURNING id INTO v_eval;
    INSERT INTO _wc_var VALUES ('ev_fairplay', v_eval);

    -- Hráčské ceny — všechny 25 b, jeden společný evaluator
    INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
    VALUES ('Hráčská cena', v_et_exact_player, v_league_id, 'special_bet', 25, v_now, v_now)
    RETURNING id INTO v_eval;
    INSERT INTO _wc_var VALUES ('ev_player_award', v_eval);

    -- Počet branek nejlepšího střelce (exact_value 15)
    INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
    VALUES ('Počet branek nejlepšího střelce', v_et_exact_value, v_league_id, 'special_bet', 15, v_now, v_now)
    RETURNING id INTO v_eval;
    INSERT INTO _wc_var VALUES ('ev_top_scorer_goals', v_eval);

    -- Celkový počet branek (closest_value 35 → exact 35, closest 14 dle 0.4x)
    INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
    VALUES ('Celkový počet branek', v_et_closest_value, v_league_id, 'special_bet', 35, v_now, v_now)
    RETURNING id INTO v_eval;
    INSERT INTO _wc_var VALUES ('ev_total_goals', v_eval);

    -- ------------------------------------------------------------------------
    -- Question evaluator (entity = 'question')
    -- ------------------------------------------------------------------------
    INSERT INTO "Evaluator"(name, "evaluatorTypeId", "leagueId", entity, points, "createdAt", "updatedAt")
    VALUES ('Denní otázka', v_et_question, v_league_id, 'question', 6, v_now, v_now)
    RETURNING id INTO v_eval;
    INSERT INTO _wc_var VALUES ('ev_question', v_eval);
END $setup$;

-- ============================================================================
-- 4) TÝMY (48 reprezentací)
-- ============================================================================
-- Vložíme týmy pouze pokud (sport, shortcut) ještě neexistuje pro fotbal.
WITH source AS (
    SELECT v.name, v.shortcut, v.flag, v.grp
    FROM (VALUES
        -- Skupina A
        ('Mexiko', 'MEX', '🇲🇽', 'A'),
        ('Jižní Korea', 'KOR', '🇰🇷', 'A'),
        ('Jihoafrická republika', 'RSA', '🇿🇦', 'A'),
        ('Česko', 'CZE', '🇨🇿', 'A'),
        -- Skupina B
        ('Kanada', 'CAN', '🇨🇦', 'B'),
        ('Katar', 'QAT', '🇶🇦', 'B'),
        ('Švýcarsko', 'SUI', '🇨🇭', 'B'),
        ('Bosna a Hercegovina', 'BIH', '🇧🇦', 'B'),
        -- Skupina C
        ('Brazílie', 'BRA', '🇧🇷', 'C'),
        ('Maroko', 'MAR', '🇲🇦', 'C'),
        ('Haiti', 'HAI', '🇭🇹', 'C'),
        ('Skotsko', 'SCO', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'C'),
        -- Skupina D
        ('USA', 'USA', '🇺🇸', 'D'),
        ('Paraguay', 'PAR', '🇵🇾', 'D'),
        ('Austrálie', 'AUS', '🇦🇺', 'D'),
        ('Turecko', 'TUR', '🇹🇷', 'D'),
        -- Skupina E
        ('Německo', 'GER', '🇩🇪', 'E'),
        ('Curaçao', 'CUW', '🇨🇼', 'E'),
        ('Pobřeží slonoviny', 'CIV', '🇨🇮', 'E'),
        ('Ekvádor', 'ECU', '🇪🇨', 'E'),
        -- Skupina F
        ('Nizozemsko', 'NED', '🇳🇱', 'F'),
        ('Japonsko', 'JPN', '🇯🇵', 'F'),
        ('Tunisko', 'TUN', '🇹🇳', 'F'),
        ('Švédsko', 'SWE', '🇸🇪', 'F'),
        -- Skupina G
        ('Belgie', 'BEL', '🇧🇪', 'G'),
        ('Egypt', 'EGY', '🇪🇬', 'G'),
        ('Írán', 'IRN', '🇮🇷', 'G'),
        ('Nový Zéland', 'NZL', '🇳🇿', 'G'),
        -- Skupina H
        ('Španělsko', 'ESP', '🇪🇸', 'H'),
        ('Kapverdy', 'CPV', '🇨🇻', 'H'),
        ('Saúdská Arábie', 'KSA', '🇸🇦', 'H'),
        ('Uruguay', 'URU', '🇺🇾', 'H'),
        -- Skupina I
        ('Francie', 'FRA', '🇫🇷', 'I'),
        ('Senegal', 'SEN', '🇸🇳', 'I'),
        ('Norsko', 'NOR', '🇳🇴', 'I'),
        ('Irák', 'IRQ', '🇮🇶', 'I'),
        -- Skupina J
        ('Argentina', 'ARG', '🇦🇷', 'J'),
        ('Alžírsko', 'ALG', '🇩🇿', 'J'),
        ('Rakousko', 'AUT', '🇦🇹', 'J'),
        ('Jordánsko', 'JOR', '🇯🇴', 'J'),
        -- Skupina K
        ('Portugalsko', 'POR', '🇵🇹', 'K'),
        ('Uzbekistán', 'UZB', '🇺🇿', 'K'),
        ('Kolumbie', 'COL', '🇨🇴', 'K'),
        ('DR Kongo', 'COD', '🇨🇩', 'K'),
        -- Skupina L
        ('Anglie', 'ENG', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'L'),
        ('Chorvatsko', 'CRO', '🇭🇷', 'L'),
        ('Ghana', 'GHA', '🇬🇭', 'L'),
        ('Panama', 'PAN', '🇵🇦', 'L')
    ) AS v(name, shortcut, flag, grp)
), inserted AS (
    INSERT INTO "Team"(name, shortcut, "flagIcon", "flagType", "sportId", "createdAt", "updatedAt")
    SELECT s.name, s.shortcut, s.flag, 'icon',
           (SELECT val FROM _wc_var WHERE key = 'sport_id'),
           NOW(), NOW()
    FROM source s
    RETURNING id, shortcut
)
INSERT INTO _wc_team_map(shortcut, team_id)
SELECT i.shortcut, i.id FROM inserted i;

-- Vytvoříme LeagueTeam pro každý tým s odpovídající skupinou
WITH groups AS (
    SELECT * FROM (VALUES
        ('MEX','A'),('KOR','A'),('RSA','A'),('CZE','A'),
        ('CAN','B'),('QAT','B'),('SUI','B'),('BIH','B'),
        ('BRA','C'),('MAR','C'),('HAI','C'),('SCO','C'),
        ('USA','D'),('PAR','D'),('AUS','D'),('TUR','D'),
        ('GER','E'),('CUW','E'),('CIV','E'),('ECU','E'),
        ('NED','F'),('JPN','F'),('TUN','F'),('SWE','F'),
        ('BEL','G'),('EGY','G'),('IRN','G'),('NZL','G'),
        ('ESP','H'),('CPV','H'),('KSA','H'),('URU','H'),
        ('FRA','I'),('SEN','I'),('NOR','I'),('IRQ','I'),
        ('ARG','J'),('ALG','J'),('AUT','J'),('JOR','J'),
        ('POR','K'),('UZB','K'),('COL','K'),('COD','K'),
        ('ENG','L'),('CRO','L'),('GHA','L'),('PAN','L')
    ) AS v(shortcut, grp)
), inserted_lt AS (
    INSERT INTO "LeagueTeam"("leagueId", "teamId", "group", "createdAt", "updatedAt")
    SELECT (SELECT val FROM _wc_var WHERE key = 'league_id'),
           m.team_id, g.grp, NOW(), NOW()
    FROM _wc_team_map m
    JOIN groups g ON g.shortcut = m.shortcut
    RETURNING id, "teamId"
)
UPDATE _wc_team_map m
SET league_team_id = ilt.id
FROM inserted_lt ilt
WHERE ilt."teamId" = m.team_id;

-- ============================================================================
-- 5) HRÁČI A LEAGUE PLAYER
-- ============================================================================
-- Pomocná pracovní tabulka pro hráče (s pořadovým ord pro pozdější JOIN).
DROP TABLE IF EXISTS _wc_player_data;
CREATE TABLE _wc_player_data (
    ord SERIAL PRIMARY KEY,
    team_shortcut TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    position TEXT NOT NULL,  -- 'G','D','M','F'
    club TEXT,
    ranking INT              -- 1 = nejlepší střelec týmu, 2 = druhý, 3 = třetí; NULL = ostatní
);

-- Vložíme všechny hráče soupisek.
-- Pozice: G=brankář, D=obránce, M=záložník, F=útočník.
-- Klub je zkrácený, bez národnostních dodatků v závorkách.
INSERT INTO _wc_player_data(team_shortcut, first_name, last_name, position, club, ranking) VALUES
-- ─── Skupina A ──────────────────────────────────────────────────────────────
-- Mexiko (MEX)
('MEX','Raúl','Rangel','G','Guadalajara', NULL),
('MEX','Guillermo','Ochoa','G','AEL Limassol', NULL),
('MEX','Carlos','Acevedo','G','Santos Laguna', NULL),
('MEX','Jesús','Gallardo','D','Toluca', NULL),
('MEX','Johan','Vásquez','D','FC Janov', NULL),
('MEX','Israel','Reyes','D','América', NULL),
('MEX','César','Montes','D','Lokomotiv Moskva', NULL),
('MEX','Jorge','Sánchez','D','PAOK Soluň', NULL),
('MEX','Mateo','Chávez','D','AZ Alkmaar', NULL),
('MEX','Edson','Álvarez','M','Fenerbahce', NULL),
('MEX','Érik','Lira','M','Cruz Azul', NULL),
('MEX','Álvaro','Fidalgo','M','Betis Sevilla', NULL),
('MEX','Gilberto','Mora','M','Tijuana', NULL),
('MEX','Brian','Gutiérrez','M','Guadalajara', NULL),
('MEX','Luis','Romo','M','Guadalajara', NULL),
('MEX','Orbelín','Pineda','M','AEK Atény', NULL),
('MEX','Alexis','Vega','M','Toluca', NULL),
('MEX','Obed','Vargas','M','Atlético Madrid', NULL),
('MEX','Luis','Chávez','M','Dynamo Moskva', NULL),
('MEX','Roberto','Alvarado','F','Guadalajara', NULL),
('MEX','Santiago','Giménez','F','AC Milán', 2),
('MEX','Raúl','Jiménez','F','Fulham', 1),
('MEX','Julián','Quiñones','F','Al Qadsiah', NULL),
('MEX','Armando','González','F','Guadalajara', NULL),
('MEX','Guillermo','Martínez','F','UNAM', 3),
('MEX','César','Huerta','F','Anderlecht', NULL),
-- Jižní Korea (KOR)
('KOR','Cho','Hyun-woo','G','Ulsan', NULL),
('KOR','Kim','Seung-gyu','G','FC Tokyo', NULL),
('KOR','Song','Bum-keun','G','Jeonbuk', NULL),
('KOR','Kim','Moon-hwan','D','Daejeon', NULL),
('KOR','Kim','Min-jae','D','Bayern Munich', NULL),
('KOR','Kim','Tae-hyeon','D','Kashima', NULL),
('KOR','Park','Jin-seop','D','Zhejiang', NULL),
('KOR','Seol','Young-woo','D','Crvena zvezda', NULL),
('KOR','Jens','Castrop','D','Borussia Mönchengladbach', NULL),
('KOR','Lee','Ki-hyeok','D','Gangwon', NULL),
('KOR','Lee','Tae-seok','D','Austria Vienna', NULL),
('KOR','Lee','Han-beom','D','Midtjylland', NULL),
('KOR','Cho','Wi-je','D','Jeonbuk', NULL),
('KOR','Kim','Jin-gyu','M','Jeonbuk', NULL),
('KOR','Bae','Jun-ho','M','Stoke', NULL),
('KOR','Park','Seung-ho','M','Birmingham', NULL),
('KOR','Yang','Hyun-jun','M','Celtic', NULL),
('KOR','Lee','Kang-in','M','Paris Saint-Germain', NULL),
('KOR','Lee','Dong-gyeong','M','Ulsan', NULL),
('KOR','Lee','Jae-sung','M','Mainz', NULL),
('KOR','Hwang','In-beom','M','Feyenoord', NULL),
('KOR','Son','Heung-min','F','Los Angeles FC', 1),
('KOR','Oh','Hyeon-gyu','F','Besiktas', 2),
('KOR','Cho','Gue-sung','F','Midtjylland', 3),
('KOR','Um','Ji-sung','F','Swansea', NULL),
('KOR','Hwang','Hee-chan','F','Wolverhampton', NULL),
-- JAR (RSA)
('RSA','Ronwen','Williams','G','Mamelodi Sundowns', NULL),
('RSA','Ricardo','Goss','G','Siwelele', NULL),
('RSA','Sipho','Chaine','G','Orlando Pirates', NULL),
('RSA','Khuliso','Mudau','D','Mamelodi Sundowns', NULL),
('RSA','Aubrey','Modiba','D','Mamelodi Sundowns', NULL),
('RSA','Khulumani','Ndamane','D','Mamelodi Sundowns', NULL),
('RSA','Olwethu','Makhanya','D','Philadelphia Union', NULL),
('RSA','Bradley','Cross','D','Kaizer Chiefs', NULL),
('RSA','Thabang','Matuludi','D','Polokwane City', NULL),
('RSA','Nkosinathi','Sibisi','D','Orlando Pirates', NULL),
('RSA','Kamogelo','Sebelebele','D','Orlando Pirates', NULL),
('RSA','Ime','Okon','D','Hannover', NULL),
('RSA','Samukele','Kabini','D','Molde', NULL),
('RSA','Mbekezeli','Mbokazi','D','Chicago Fire', NULL),
('RSA','Teboho','Mokoena','M','Mamelodi Sundowns', NULL),
('RSA','Jayden','Adams','M','Mamelodi Sundowns', NULL),
('RSA','Thalente','Mbatha','M','Orlando Pirates', NULL),
('RSA','Sphephelo','Sithole','M','Tondela', NULL),
('RSA','Oswin','Appollis','F','Orlando Pirates', NULL),
('RSA','Tshepang','Moremi','F','Orlando Pirates', NULL),
('RSA','Evidence','Makgopa','F','Orlando Pirates', 3),
('RSA','Relebohile','Mofokeng','F','Orlando Pirates', NULL),
('RSA','Lyle','Foster','F','Burnley', 1),
('RSA','Iqraam','Rayners','F','Mamelodi Sundowns', 2),
('RSA','Themba','Zwane','F','Mamelodi Sundowns', NULL),
('RSA','Thapelo','Maseko','F','AEL Limassol', NULL),
-- Česko (CZE)
('CZE','Lukáš','Horníček','G','Braga', NULL),
('CZE','Matěj','Kovář','G','PSV', NULL),
('CZE','Jindřich','Staněk','G','Slavia Praha', NULL),
('CZE','Vladimír','Coufal','D','Hoffenheim', NULL),
('CZE','David','Douděra','D','Slavia Praha', NULL),
('CZE','Tomáš','Holeš','D','Slavia Praha', NULL),
('CZE','Robin','Hranáč','D','Hoffenheim', NULL),
('CZE','Štěpán','Chaloupek','D','Slavia Praha', NULL),
('CZE','David','Jurásek','D','Slavia Praha', NULL),
('CZE','Ladislav','Krejčí','D','Wolves', NULL),
('CZE','Jaroslav','Zelený','D','Sparta Praha', NULL),
('CZE','David','Zima','D','Slavia Praha', NULL),
('CZE','Lukáš','Červ','M','Viktoria Plzeň', NULL),
('CZE','Vladimír','Darida','M','Hradec Králové', NULL),
('CZE','Lukáš','Provod','M','Slavia Praha', NULL),
('CZE','Michal','Sadílek','M','Slavia Praha', NULL),
('CZE','Hugo','Sochůrek','M','Sparta Praha', NULL),
('CZE','Alexandr','Sojka','M','Viktoria Plzeň', NULL),
('CZE','Tomáš','Souček','M','West Ham', NULL),
('CZE','Pavel','Šulc','M','Lyon', 3),
('CZE','Denis','Višinský','M','Viktoria Plzeň', NULL),
('CZE','Adam','Hložek','F','Hoffenheim', 2),
('CZE','Tomáš','Chorý','F','Slavia Praha', NULL),
('CZE','Mojmír','Chytil','F','Slavia Praha', NULL),
('CZE','Jan','Kuchta','F','Sparta Praha', NULL),
('CZE','Patrik','Schick','F','Leverkusen', 1);

-- Pokračování — Skupina B
INSERT INTO _wc_player_data(team_shortcut, first_name, last_name, position, club, ranking) VALUES
-- Kanada (CAN)
('CAN','Dayne','St. Clair','G','Inter Miami', NULL),
('CAN','Maxime','Crepeau','G','Orlando SC', NULL),
('CAN','Owen','Goodman','G','Barnsley', NULL),
('CAN','Alistair','Johnston','D','Celtic', NULL),
('CAN','Derek','Cornelius','D','Rangers', NULL),
('CAN','Richie','Laryea','D','Toronto FC', NULL),
('CAN','Niko','Sigur','D','Hajduk Split', NULL),
('CAN','Joel','Waterman','D','Chicago Fire', NULL),
('CAN','Luc','De Fougerolles','D','Dender', NULL),
('CAN','Moise','Bombito','D','OGC Nice', NULL),
('CAN','Alphonso','Davies','D','Bayern Munich', NULL),
('CAN','Alfie','Jones','D','Middlesbrough', NULL),
('CAN','Stephen','Eustaquio','M','Los Angeles FC', NULL),
('CAN','Ismael','Kone','M','Sassuolo', NULL),
('CAN','Tajon','Buchanan','M','Villarreal', NULL),
('CAN','Mathieu','Choiniere','M','Los Angeles FC', NULL),
('CAN','Ali','Ahmed','M','Norwich City', NULL),
('CAN','Nathan','Saliba','M','Anderlecht', NULL),
('CAN','Liam','Millar','M','Hull City', NULL),
('CAN','Jacob','Shaffelburg','M','Los Angeles FC', NULL),
('CAN','Jonathan','Osorio','M','Toronto FC', NULL),
('CAN','Jonathan','David','F','Juventus', 1),
('CAN','Cyle','Larin','F','Southampton', 2),
('CAN','Tani','Oluwaseyi','F','Villarreal', NULL),
('CAN','Promise','David','F','Union Saint-Gilloise', 3),
-- Katar (QAT)
('QAT','Mahmoud','Abunada','G','Al Rayyan', NULL),
('QAT','Meshaal','Barsham','G','Al Sadd', NULL),
('QAT','Salah','Zakaria','G','Al Duhail', NULL),
('QAT','Ayoub','Al Oui','D','Al Gharafa', NULL),
('QAT','Boualem','Khoukhi','D','Al Sadd', NULL),
('QAT','Homam','Al Amin','D','Cultural Leonesa', NULL),
('QAT','Lucas','Mendes','D','Al Wakrah', NULL),
('QAT','Laye','Gueye','D','Al Arabi', NULL),
('QAT','Pedro','Miguel','D','Al Sadd', NULL),
('QAT','Al Hasmi','Al Hussain','D','Al Arabi', NULL),
('QAT','Sultan','Al Brake','D','Al Duhail', NULL),
('QAT','Assim','Madibo','M','Al Wakrah', NULL),
('QAT','Abdulaziz','Hatim','M','Al Rayyan', NULL),
('QAT','Ahmed','Fathi','M','Al Arabi', NULL),
('QAT','Karim','Boudiaf','M','Al Duhail', NULL),
('QAT','Jassem','Gaber','M','Al Rayyan', NULL),
('QAT','Mohammed','Al Mannai','M','Al Shamal', NULL),
('QAT','Ahmed','Al Ganehi','F','Al Gharafa', NULL),
('QAT','Ahmed','Alaaeldin','F','Al Rayyan', 2),
('QAT','Akram','Afif','F','Al Sadd', NULL),
('QAT','Almoez','Ali','F','Al Duhail', 1),
('QAT','Edmílson','Junior','F','Al Duhail', NULL),
('QAT','Hassan','Al Haydos','F','Al Sadd', NULL),
('QAT','Mohammed','Muntari','F','Al Gharafa', 3),
('QAT','Tahsin','Mohammed','F','Al Duhail', NULL),
('QAT','Yusuf','Abdurisag','F','Al Wakrah', NULL),
-- Švýcarsko (SUI)
('SUI','Gregor','Kobel','G','Dortmund', NULL),
('SUI','Yvon','Mvogo','G','Lorient', NULL),
('SUI','Marvin','Keller','G','YB Bern', NULL),
('SUI','Manuel','Akanji','D','Inter', NULL),
('SUI','Auréle','Amenda','D','Frankfurt', NULL),
('SUI','Eray','Cömert','D','Valencia', NULL),
('SUI','Nico','Elvedi','D','Mönchengladbach', NULL),
('SUI','Miro','Muheim','D','Hamburk', NULL),
('SUI','Luca','Jaquez','D','Stuttgart', NULL),
('SUI','Ricardo','Rodriguez','D','Real Betis', NULL),
('SUI','Silvan','Widmer','D','Mohuč', NULL),
('SUI','Michel','Aebischer','M','Pisa', NULL),
('SUI','Christian','Fassnacht','M','YB Bern', NULL),
('SUI','Remo','Freuler','M','Boloňa', NULL),
('SUI','Ardon','Jashari','M','AC Milán', NULL),
('SUI','Johan','Manzambi','M','Freiburg', NULL),
('SUI','Fabian','Rieder','M','Augsburg', NULL),
('SUI','Djibril','Sow','M','Sevilla', NULL),
('SUI','Granit','Xhaka','M','Sunderland', NULL),
('SUI','Denis','Zakaria','M','Monako', NULL),
('SUI','Zeki','Amdouni','F','Burnley', 3),
('SUI','Breel','Embolo','F','Rennes', 1),
('SUI','Dan','Ndoye','F','Nottingham', NULL),
('SUI','Cedric','Itten','F','Düsseldorf', 2),
('SUI','Noah','Okafor','F','Leeds', NULL),
('SUI','Rubén','Vargas','F','Sevilla', NULL),
-- Bosna a Hercegovina (BIH)
('BIH','Nikola','Vasilj','G','St Pauli', NULL),
('BIH','Martin','Zlomislič','G','Rijeka', NULL),
('BIH','Mladen','Jurkas','G','Borac Banja Luka', NULL),
('BIH','Sead','Kolašinac','D','Atalanta', NULL),
('BIH','Amar','Dedič','D','Benfica', NULL),
('BIH','Nihad','Mujakič','D','Gaziantep', NULL),
('BIH','Nikola','Katič','D','Schalke 04', NULL),
('BIH','Tarik','Muharemovič','D','Sassuolo', NULL),
('BIH','Stjepan','Radeljič','D','Rijeka', NULL),
('BIH','Dennis','Hadžikadunič','D','Sampdoria', NULL),
('BIH','Nidal','Čelik','D','Lens', NULL),
('BIH','Amir','Hadžiahmetovič','M','Hull City', NULL),
('BIH','Ivan','Šunjič','M','Pafos', NULL),
('BIH','Ivan','Bašič','M','Astana', NULL),
('BIH','Dženis','Burnič','M','Karlsruher SC', NULL),
('BIH','Ermin','Mahmič','M','Slovan Liberec', NULL),
('BIH','Benjamin','Tahirovič','M','Brondby', NULL),
('BIH','Amar','Memič','M','Viktoria Plzeň', NULL),
('BIH','Armin','Gigovič','M','Young Boys', NULL),
('BIH','Kerim','Alajbegovič','M','RB Salcburk', NULL),
('BIH','Esmir','Bajraktarevič','M','PSV Eindhoven', NULL),
('BIH','Ermedin','Demirovič','F','VfB Stuttgart', 2),
('BIH','Jovo','Lukič','F','Universitatea Cluj', NULL),
('BIH','Samed','Baždar','F','Jagiellonia Bialystok', NULL),
('BIH','Haris','Tabakovič','F','Borussia Mönchengladbach', 3),
('BIH','Edin','Džeko','F','Schalke 04', 1);

-- Pokračování — Skupina C
INSERT INTO _wc_player_data(team_shortcut, first_name, last_name, position, club, ranking) VALUES
-- Brazílie (BRA) — některá brazilská jména jsou monomy, jdou do last_name
('BRA','','Alisson','G','Liverpool', NULL),
('BRA','','Ederson','G','Fenerbahce', NULL),
('BRA','','Weverton','G','Gremio', NULL),
('BRA','Alex','Sandro','D','Flamengo', NULL),
('BRA','','Danilo','D','Flamengo', NULL),
('BRA','Léo','Pereira','D','Flamengo', NULL),
('BRA','','Bremer','D','Juventus', NULL),
('BRA','Douglas','Santos','D','Zenit', NULL),
('BRA','Gabriel','Magalhaes','D','Arsenal', NULL),
('BRA','','Ibañez','D','Al Ahli', NULL),
('BRA','','Marquinhos','D','PSG', NULL),
('BRA','Éderson','Silva','M','Atalanta', NULL),
('BRA','Bruno','Guimaraes','M','Newcastle', NULL),
('BRA','','Casemiro','M','Manchester United', NULL),
('BRA','','Danilo','M','Botafogo', NULL),
('BRA','','Fabinho','M','Al-Ittihad', NULL),
('BRA','Lucas','Paquetá','M','Flamengo', NULL),
('BRA','','Endrick','F','Lyon', NULL),
('BRA','Gabriel','Martinelli','F','Arsenal', NULL),
('BRA','Igor','Thiago','F','Brentford', NULL),
('BRA','Luiz','Henrique','F','Zenit', NULL),
('BRA','Matheus','Cunha','F','Manchester United', NULL),
('BRA','','Neymar','F','Santos', 2),
('BRA','','Raphinha','F','Barcelona', 3),
('BRA','','Rayan','F','Bournemouth', NULL),
('BRA','Vinícius','Júnior','F','Real Madrid', 1),
-- Maroko (MAR)
('MAR','Yassine','Bounou','G','Al-Hilal', NULL),
('MAR','Munir','Mohamedi','G','RS Berkane', NULL),
('MAR','Ahmed Reda','Tagnaouti','G','AS FAR', NULL),
('MAR','Achraf','Hakimi','D','Paris Saint-Germain', NULL),
('MAR','Nayef','Aguerd','D','Marseille', NULL),
('MAR','Noussair','Mazraoui','D','Manchester United', NULL),
('MAR','Youssef','Belammari','D','Al Ahly', NULL),
('MAR','Anass','Salah-Eddine','D','PSV Eindhoven', NULL),
('MAR','Chadi','Riad','D','Crystal Palace', NULL),
('MAR','Issa','Diop','D','Fulham', NULL),
('MAR','Zakaria','El Ouahdi','D','Genk', NULL),
('MAR','Redouane','Halhal','D','Mechelen', NULL),
('MAR','Sofyan','Amrabat','M','Betis', NULL),
('MAR','Azzedine','Ounahi','M','Girona', NULL),
('MAR','Bilal','El Khannouss','M','Stuttgart', NULL),
('MAR','Ismael','Saibari','M','PSV Eindhoven', NULL),
('MAR','Neil','El Aynaoui','M','AS Řím', NULL),
('MAR','Samir','El Mourabet','M','Štrasburk', NULL),
('MAR','Ayyoub','Bouaddi','M','Lille', NULL),
('MAR','Ayoub','El Kaabi','F','Olympiakos', 1),
('MAR','Abde','Ezzalzouli','F','Real Betis', NULL),
('MAR','Soufiane','Rahimi','F','Al Ain', 2),
('MAR','Brahim','Díaz','F','Real Madrid', 3),
('MAR','Chemsdine','Talbi','F','Sunderland', NULL),
('MAR','Gessime','Yassine','F','Štrasburk', NULL),
('MAR','Ayoube','Amaimouni','F','Eintracht Frankfurt', NULL),
-- Haiti (HAI)
('HAI','Johnny','Placide','G','Bastia', NULL),
('HAI','Alexandre','Pierre','G','Sochaux', NULL),
('HAI','Josué','Duverger','G','Koblenz', NULL),
('HAI','Carlens','Arcus','D','Angers', NULL),
('HAI','Wilguens','Pauguain','D','Waregem', NULL),
('HAI','Duke','Lacroix','D','Colorado', NULL),
('HAI','Martin','Expérience','D','Nancy', NULL),
('HAI','Jean-Kévin','Duverne','D','La Gantoise', NULL),
('HAI','Ricardo','Adé','D','Quito', NULL),
('HAI','Hannes','Delcroix','D','Lugano', NULL),
('HAI','Keeto','Thermoncy','D','Bern', NULL),
('HAI','Leverton','Pierre','M','Vizela', NULL),
('HAI','Carl-Fred','Sainté','M','El Paso', NULL),
('HAI','Jean-Jacques','Danley','M','Philadelphia', NULL),
('HAI','Jean-Ricner','Bellegarde','M','Wolverhampton', NULL),
('HAI','Pierre','Woodensky','M','Violette', NULL),
('HAI','Dominique','Simon','M','Prešov', NULL),
('HAI','Louicius','Deedson','F','Dallas', NULL),
('HAI','Ruben','Providence','F','Almere', NULL),
('HAI','Josué','Casimir','F','Auxerre', NULL),
('HAI','Derrick','Etienne','F','Toronto', NULL),
('HAI','Wilson','Isidor','F','Sunderland', 1),
('HAI','Duckens','Nazon','F','Esteghlal', 2),
('HAI','Frantzdy','Pierrot','F','Rizespor', 3),
('HAI','Yassin','Fortune','F','Vizela', NULL),
('HAI','Lenny','Joseph','F','Ferencváros', NULL),
-- Skotsko (SCO)
('SCO','Craig','Gordon','G','Hearts', NULL),
('SCO','Angus','Gunn','G','Nottingham', NULL),
('SCO','Liam','Kelly','G','Rangers', NULL),
('SCO','Grant','Hanley','D','Hibernian', NULL),
('SCO','Jack','Hendry','D','Al Ettifaq', NULL),
('SCO','Aaron','Hickey','D','Brentford', NULL),
('SCO','Dominic','Hyam','D','Wrexham', NULL),
('SCO','Scott','McKenna','D','Dinamo Záhřeb', NULL),
('SCO','Nathan','Patterson','D','Everton', NULL),
('SCO','Anthony','Ralston','D','Celtic', NULL),
('SCO','Andy','Robertson','D','Liverpool', NULL),
('SCO','John','Souttar','D','Rangers', NULL),
('SCO','Kieran','Tierney','D','Celtic', NULL),
('SCO','Ryan','Christie','M','Bournemouth', NULL),
('SCO','Findlay','Curtis','M','Rangers', NULL),
('SCO','Lewis','Ferguson','M','Boloňa', NULL),
('SCO','Ben','Gannon-Doak','M','Bournemouth', NULL),
('SCO','Tyler','Fletcher','M','Manchester United', NULL),
('SCO','John','McGinn','M','Aston Villa', NULL),
('SCO','Kenny','McLean','M','Norwich', NULL),
('SCO','Scott','McTominay','M','Neapol', NULL),
('SCO','Che','Adams','F','Turín FC', 3),
('SCO','Lyndon','Dykes','F','Birmingham', NULL),
('SCO','George','Hirst','F','Ipswich', 1),
('SCO','Lawrence','Shankland','F','Hearts', 2),
('SCO','Ross','Stewart','F','Southampton', NULL);

-- Pokračování — Skupina D
INSERT INTO _wc_player_data(team_shortcut, first_name, last_name, position, club, ranking) VALUES
-- USA
('USA','Matt','Turner','G','New England Revolution', NULL),
('USA','Matt','Freese','G','New York City', NULL),
('USA','Chris','Brady','G','Chicago Fire', NULL),
('USA','Tim','Ream','D','Charlotte FC', NULL),
('USA','Antonee','Robinson','D','Fulham', NULL),
('USA','Miles','Robinson','D','FC Cincinnati', NULL),
('USA','Sergiño','Dest','D','PSV Eindhoven', NULL),
('USA','Chris','Richards','D','Crystal Palace', NULL),
('USA','Mark','McKenzie','D','Toulouse', NULL),
('USA','Joe','Scally','D','Borussia Mönchengladbach', NULL),
('USA','Maximilian','Arfsten','D','Columbus Crew', NULL),
('USA','Alex','Freeman','D','Villarreal', NULL),
('USA','Auston','Trusty','D','Celtic', NULL),
('USA','Weston','McKennie','M','Juventus', NULL),
('USA','Tyler','Adams','M','Bournemouth', NULL),
('USA','Cristian','Roldan','M','Seattle Sounders', NULL),
('USA','Giovanni','Reyna','M','Borussia Mönchengladbach', NULL),
('USA','Malik','Tillman','M','Bayer Leverkusen', NULL),
('USA','Sebastian','Berhalter','M','Vancouver Whitecaps', NULL),
('USA','Christian','Pulisic','F','AC Milán', 3),
('USA','Brenden','Aaronson','F','Leeds United', NULL),
('USA','Timothy','Weah','F','Marseille', NULL),
('USA','Ricardo','Pepi','F','PSV Eindhoven', 2),
('USA','Folarin','Balogun','F','Monaco', 1),
('USA','Haji','Wright','F','Coventry City', NULL),
('USA','Alejandro','Zendejas','F','Club América', NULL),
-- Paraguay (PAR)
('PAR','Gatito','Fernández','G','Cerro Porteño', NULL),
('PAR','Orlando','Gill','G','San Lorenzo', NULL),
('PAR','Gastón','Olveira','G','Olimpia', NULL),
('PAR','Juan','Cáceres','D','Dynamo Moskva', NULL),
('PAR','Gustavo','Gómez','D','Palmeiras', NULL),
('PAR','Gustavo','Velázquez','D','Cerro Porteño', NULL),
('PAR','Fabián','Balbuena','D','Gremio', NULL),
('PAR','Júnior','Alonso','D','Atlético Mineiro', NULL),
('PAR','Omar','Alderete','D','Sunderland', NULL),
('PAR','José','Canale','D','Lanús', NULL),
('PAR','Alexandro','Maidana','D','Talleres', NULL),
('PAR','Damián','Bobadilla','M','Sao Paulo', NULL),
('PAR','Andrés','Cubas','M','Vancouver Whitecaps', NULL),
('PAR','Diego','Gómez','M','Brighton & Hove Albion', NULL),
('PAR','Matías','Galarza','M','Atlanta United', NULL),
('PAR','Alejandro','Romero Gamarra','M','Al Ain', NULL),
('PAR','Braian','Ojeda','M','Orlando City', NULL),
('PAR','Maurício','Magalhaes','M','Palmeiras', NULL),
('PAR','Alex','Arce','F','Independiente Rivadavia', 1),
('PAR','Miguel','Almirón','F','Atlanta United', NULL),
('PAR','Isidro','Pitta','F','Red Bull Bragantino', NULL),
('PAR','Ramón','Sosa','F','Palmeiras', NULL),
('PAR','Gabriel','Ávalos','F','Independiente', 3),
('PAR','Antonio','Sanabria','F','Cremonese', 2),
('PAR','Julio','Enciso','F','Štrasburk', NULL),
('PAR','Gustavo','Caballero','F','Portsmouth', NULL),
-- Austrálie (AUS)
('AUS','Patrick','Beach','G','Melbourne City', NULL),
('AUS','Paul','Izzo','G','Randers', NULL),
('AUS','Mat','Ryan','G','Levante', NULL),
('AUS','Aziz','Behich','D','Melbourne City', NULL),
('AUS','Jordan','Bos','D','Feyenoord', NULL),
('AUS','Cameron','Burgess','D','Swansea City', NULL),
('AUS','Alessandro','Circati','D','Parma', NULL),
('AUS','Milos','Degenek','D','APOEL', NULL),
('AUS','Jason','Geria','D','Albirex Niigata', NULL),
('AUS','Lucas','Herrington','D','Colorado Rapids', NULL),
('AUS','Jacob','Italiano','D','Grazer AK', NULL),
('AUS','Harry','Souttar','D','Leicester City', NULL),
('AUS','Kai','Trewin','D','New York City', NULL),
('AUS','Cameron','Devlin','M','Hearts', NULL),
('AUS','Jackson','Irvine','M','St Pauli', NULL),
('AUS','Mathew','Leckie','M','Melbourne City', NULL),
('AUS','Connor','Metcalfe','M','St. Pauli', NULL),
('AUS','Aiden','O''Neill','M','New York City', NULL),
('AUS','Paul','Okon-Engstler','M','Sydney FC', NULL),
('AUS','Ajdin','Hrustic','F','Heracles Almelo', NULL),
('AUS','Nestory','Irankunda','F','Watford', 3),
('AUS','Awer','Mabil','F','Castellon', NULL),
('AUS','Mohamed','Touré','F','Norwich City', 1),
('AUS','Nishan','Velupillay','F','Melbourne Victory', NULL),
('AUS','Cristian','Volpato','F','Sassuolo', NULL),
('AUS','Tete','Yengi','F','Machida Zelvia', 2),
-- Turecko (TUR)
('TUR','Ugurcan','Cakir','G','Galatasaray', NULL),
('TUR','Altay','Bayindir','G','Manchester United', NULL),
('TUR','Mert','Gunok','G','Besiktas', NULL),
('TUR','Ferdi','Kadioglu','D','Brighton', NULL),
('TUR','Merih','Demiral','D','Al Ahli', NULL),
('TUR','Zeki','Celik','D','AS Řím', NULL),
('TUR','Ozan','Kabak','D','Hoffenheim', NULL),
('TUR','Mert','Muldur','D','Fenerbahce', NULL),
('TUR','Abdulkerim','Bardakci','D','Galatasaray', NULL),
('TUR','Eren','Elmali','D','Galatasaray', NULL),
('TUR','Caglar','Soyuncu','D','Fenerbahce', NULL),
('TUR','Samet','Akaydin','D','Rizespor', NULL),
('TUR','Arda','Guler','M','Real Madrid', NULL),
('TUR','Can','Uzun','M','Eintracht Frankfurt', NULL),
('TUR','Orkun','Kokcu','M','Besiktas', NULL),
('TUR','Hakan','Calhanoglu','M','Inter Milán', NULL),
('TUR','Ismail','Yuksek','M','Fenerbahce', NULL),
('TUR','Kaan','Ayhan','M','Galatasaray', NULL),
('TUR','Salih','Ozcan','M','Borussia Dortmund', NULL),
('TUR','Kenan','Yildiz','F','Juventus', 3),
('TUR','Baris Alper','Yilmaz','F','Galatasaray', NULL),
('TUR','Kerem','Akturkoglu','F','Fenerbahce', 1),
('TUR','Yunus','Akgun','F','Galatasaray', NULL),
('TUR','Oguz','Aydin','F','Fenerbahce', NULL),
('TUR','Deniz','Gul','F','Porto', 2),
('TUR','Irfan Can','Kahveci','F','Fenerbahce', NULL);

-- Pokračování — Skupina E
INSERT INTO _wc_player_data(team_shortcut, first_name, last_name, position, club, ranking) VALUES
-- Německo (GER)
('GER','Oliver','Baumann','G','Hoffenheim', NULL),
('GER','Manuel','Neuer','G','Bayern Mnichov', NULL),
('GER','Alexander','Nübel','G','Stuttgart', NULL),
('GER','Waldemar','Anton','D','Dortmund', NULL),
('GER','Nico','Schlotterbeck','D','Dortmund', NULL),
('GER','Nathaniel','Brown','D','Frankfurt', NULL),
('GER','Pascal','Gross','D','Brighton', NULL),
('GER','Joshua','Kimmich','D','Bayern Mnichov', NULL),
('GER','Jonathan','Tah','D','Bayern Mnichov', NULL),
('GER','David','Raum','D','Lipsko', NULL),
('GER','Antonio','Rüdiger','D','Real Madrid', NULL),
('GER','Malick','Thiaw','D','Newcastle United', NULL),
('GER','Aleksandar','Pavlovič','M','Bayern Mnichov', NULL),
('GER','Jamal','Musiala','M','Bayern Mnichov', NULL),
('GER','Leon','Goretzka','M','Bayern Mnichov', NULL),
('GER','Assan','Ouédraogo','M','RB Leipzig', NULL),
('GER','Nadiem','Amiri','M','Mohuč', NULL),
('GER','Jamie','Leweling','M','Stuttgart', NULL),
('GER','Angelo','Stiller','M','Stuttgart', NULL),
('GER','Felix','Nmecha','M','Dortmund', NULL),
('GER','Florian','Wirtz','M','Liverpool', NULL),
('GER','Deniz','Undav','F','Stuttgart', 2),
('GER','Kai','Havertz','F','Arsenal', 1),
('GER','Maximilian','Beier','F','Dortmund', NULL),
('GER','Leroy','Sané','F','Galatasaray', NULL),
('GER','Nick','Woltemade','F','Newcastle United', 3),
-- Curaçao (CUW)
('CUW','Tyrick','Bodak','G','Telstar', NULL),
('CUW','Trevor','Doornbusch','G','VVV-Venlo', NULL),
('CUW','Eloy','Room','G','Miami FC', NULL),
('CUW','Riechedly','Bazoer','D','Konyaspor', NULL),
('CUW','Joshua','Brenet','D','Kayserispor', NULL),
('CUW','Roshon','van Eijma','D','RKC Waalwijk', NULL),
('CUW','Sherel','Floranus','D','PEC Zwolle', NULL),
('CUW','Deveron','Fonville','D','NEC Nijmegen', NULL),
('CUW','Juriën','Gaari','D','Abha', NULL),
('CUW','Armando','Obispo','D','PSV Eindhoven', NULL),
('CUW','Shurandy','Sambo','D','Sparta Rotterdam', NULL),
('CUW','Juninho','Bacuna','M','FC Volendam', NULL),
('CUW','Leandro','Bacuna','M','Igdır FK', NULL),
('CUW','Livano','Comenencia','M','FC Zürich', NULL),
('CUW','Kevin','Felida','M','FC Den Bosch', NULL),
('CUW','Ar''jany','Martha','M','Rotherham United', NULL),
('CUW','Tyrese','Noslin','M','Telstar', NULL),
('CUW','Godfried','Roemeratoe','M','RKC Waalwijk', NULL),
('CUW','Jeremy','Antonisse','F','AE Kifisia', NULL),
('CUW','Tahith','Chong','F','Sheffield United', 3),
('CUW','Kenji','Gorré','F','Maccabi Haifa', NULL),
('CUW','Sontje','Hansen','F','Middlesbrough', NULL),
('CUW','Gervane','Kastaneer','F','Terengganu FC', 1),
('CUW','Brandley','Kuwas','F','FC Volendam', NULL),
('CUW','Jürgen','Locadia','F','Miami FC', 2),
('CUW','Jearl','Margaritha','F','SK Beveren', NULL),
-- Pobřeží slonoviny (CIV)
('CIV','Yahia','Fofana','G','Caykur Rizespor', NULL),
('CIV','Mohamed','Koné','G','Charleroi', NULL),
('CIV','Alban','Lafont','G','Panathinaikos', NULL),
('CIV','Emmanuel','Agbadou','D','Wolverhampton', NULL),
('CIV','Christopher','Opéri','D','Basaksehir', NULL),
('CIV','Ousmane','Diomande','D','Sporting', NULL),
('CIV','Guela','Doué','D','Štrasburk', NULL),
('CIV','Ghislain','Konan','D','Gil Vicente', NULL),
('CIV','Odilon','Kossounou','D','Atalanta', NULL),
('CIV','Evan','Ndicka','D','AS Řím', NULL),
('CIV','Wilfried','Singo','D','Galatasaray', NULL),
('CIV','Seko','Fofana','M','Rennes', NULL),
('CIV','Parfait','Guiagon','M','Charleroi', NULL),
('CIV','Christ Inao','Oulai','M','Trabzonspor', NULL),
('CIV','Franck','Kessié','M','Al Ahli', NULL),
('CIV','Ibrahim','Sangare','M','Nottingham', NULL),
('CIV','Jean-Mickael','Seri','M','Maribor', NULL),
('CIV','Simon','Adingra','F','Monako', NULL),
('CIV','Ange-Yoan','Bonny','F','Inter', 1),
('CIV','Amad','Diallo','F','Manchester United', NULL),
('CIV','Oumar','Diakite','F','Cercle Bruggy', NULL),
('CIV','Yan','Diomande','F','RB Lipsko', NULL),
('CIV','Evann','Guessand','F','Aston Villa', 2),
('CIV','Nicolás','Pépé','F','Villarreal', NULL),
('CIV','Bazoumana','Touré','F','Hoffenheim', NULL),
('CIV','Elye','Wahi','F','Niza', 3),
-- Ekvádor (ECU)
('ECU','Hernán','Galíndez','G','Huracán', NULL),
('ECU','Moisés','Ramírez','G','AE Kifisias', NULL),
('ECU','Gonzalo','Valle','G','LDU Quito', NULL),
('ECU','Willian','Pacho','D','PSG', NULL),
('ECU','Piero','Hincapié','D','Arsenal', NULL),
('ECU','Joel','Ordóñez','D','Club Brugge', NULL),
('ECU','Félix','Torres','D','Internacional', NULL),
('ECU','Pervis','Estupiñán','D','AC Milán', NULL),
('ECU','Yaimar','Medina','D','KRC Genk', NULL),
('ECU','Ángelo','Preciado','D','Atlético Mineiro', NULL),
('ECU','Jackson','Porozo','D','Club Tijuana', NULL),
('ECU','Alan','Minda','M','Atlético Mineiro', NULL),
('ECU','Moisés','Caicedo','M','Chelsea', NULL),
('ECU','Jordy','Alcívar','M','Independiente', NULL),
('ECU','Denil','Castillo','M','Midtjylland', NULL),
('ECU','John','Yeboah','M','Venezia', NULL),
('ECU','Alan','Franco','M','Atlético Mineiro', NULL),
('ECU','Pedro','Vite','M','Pumas UNAM', NULL),
('ECU','Kendry','Páez','M','River Plate', NULL),
('ECU','Nilson','Angulo','M','Sunderland', NULL),
('ECU','Gonzalo','Plata','M','Flamengo', NULL),
('ECU','Kevin','Rodríguez','F','Union Saint-Gilloise', 2),
('ECU','Anthony','Valencia','F','Royal Antwerp', NULL),
('ECU','Enner','Valencia','F','Pachuca', 1),
('ECU','Jordy','Caicedo','F','Huracán', NULL),
('ECU','Jeremy','Arévalo','F','Stuttgart', 3);

-- Pokračování — Skupina F
INSERT INTO _wc_player_data(team_shortcut, first_name, last_name, position, club, ranking) VALUES
-- Nizozemsko (NED)
('NED','Mark','Flekken','G','Leverkusen', NULL),
('NED','Robin','Roefs','G','Sunderland', NULL),
('NED','Bart','Verbruggen','G','Brighton', NULL),
('NED','Nathan','Aké','D','Manchester City', NULL),
('NED','Denzel','Dumfries','D','Inter', NULL),
('NED','Jorrel','Hato','D','Chelsea', NULL),
('NED','Lutsharel','Geertruida','D','Sunderland', NULL),
('NED','Micky','van de Ven','D','Tottenham', NULL),
('NED','Virgil','van Dijk','D','Liverpool', NULL),
('NED','Jan Paul','van Hecke','D','Brighton', NULL),
('NED','Mats','Wieffer','D','Brighton', NULL),
('NED','Frenkie','de Jong','M','FC Barcelona', NULL),
('NED','Marten','de Roon','M','Atalanta', NULL),
('NED','Ryan','Gravenberch','M','Liverpool', NULL),
('NED','Justin','Kluivert','M','Bournemouth', NULL),
('NED','Teun','Koopmeiners','M','Juventus', NULL),
('NED','Tijjani','Reijnders','M','Manchester City', NULL),
('NED','Guus','Til','M','PSV', NULL),
('NED','Quinten','Timber','M','Marseille', NULL),
('NED','Brian','Brobbey','F','Sunderland', 2),
('NED','Memphis','Depay','F','Corinthians', 1),
('NED','Cody','Gakpo','F','Liverpool', 3),
('NED','Noa','Lang','F','Galatasaray', NULL),
('NED','Donyell','Malen','F','AS Řím', NULL),
('NED','Crysencio','Summerville','F','West Ham', NULL),
('NED','Wout','Weghorst','F','Ajax', NULL),
-- Japonsko (JPN)
('JPN','Zion','Suzuki','G','Parma', NULL),
('JPN','Tomoki','Hayakawa','G','Kashima', NULL),
('JPN','Keisuke','Osako','G','Hirošima', NULL),
('JPN','Yuto','Nagatomo','D','Tokyo', NULL),
('JPN','Shogo','Taniguchi','D','St. Truiden', NULL),
('JPN','Ko','Itakura','D','Ajax', NULL),
('JPN','Tsuyoshi','Watanabe','D','Feyenoord', NULL),
('JPN','Takehiro','Tomiyasu','D','Ajax', NULL),
('JPN','Hiroki','Ito','D','Bayern', NULL),
('JPN','Ayumu','Seko','D','Le Havre', NULL),
('JPN','Yukinari','Sugawara','D','Brémy', NULL),
('JPN','Junnosuke','Suzuki','D','FC Kodaň', NULL),
('JPN','Wataru','Endo','M','Liverpool', NULL),
('JPN','Junya','Ito','M','Genk', NULL),
('JPN','Daichi','Kamada','M','Crystal Palace', NULL),
('JPN','Ritsu','Doan','M','Frankfurt', NULL),
('JPN','Ao','Tanaka','M','Leeds', NULL),
('JPN','Kaishu','Sano','M','Mohuč', NULL),
('JPN','Koki','Ogawa','F','Nijmegen', 2),
('JPN','Daizen','Maeda','F','Celtic', NULL),
('JPN','Ayase','Ueda','F','Feyenoord', 1),
('JPN','Keito','Nakamura','F','Remeš', NULL),
('JPN','Takefusa','Kubo','F','Real Sociedad', NULL),
('JPN','Yuito','Suzuki','F','Freiburg', NULL),
('JPN','Kento','Shiogai','F','Wolfsburg', 3),
('JPN','Keisuke','Goto','F','St. Truiden', NULL),
-- Tunisko (TUN)
('TUN','Aymen','Dahmen','G','CS Sfaxien', NULL),
('TUN','Sabri','Ben Hessen','G','Étoile du Sahel', NULL),
('TUN','Mouhib','Chamakh','G','Club Africain', NULL),
('TUN','Montassar','Talbi','D','Lorient', NULL),
('TUN','Dylan','Bronn','D','Servette', NULL),
('TUN','Ali','Abdi','D','Nice', NULL),
('TUN','Yan','Valery','D','Young Boys', NULL),
('TUN','Mohamed Amine','Ben Hamida','D','ES Tunis', NULL),
('TUN','Moutaz','Neffati','D','IFK Norrköping', NULL),
('TUN','Omar','Rekik','D','Maribor', NULL),
('TUN','Adem','Arous','D','Kasımpasa', NULL),
('TUN','Raed','Chikhaoui','D','US Monastir', NULL),
('TUN','Ellyes','Skhiri','M','Eintracht Frankfurt', NULL),
('TUN','Hannibal','Mejbri','M','Burnley', NULL),
('TUN','Anis','Ben Slimane','M','Norwich City', NULL),
('TUN','Mortadha','Ben Ouanes','M','Kasımpasa', NULL),
('TUN','Ismaël','Gharbi','M','Augsburg', NULL),
('TUN','Hadj','Mahmoud','M','Lugano', NULL),
('TUN','Rani','Khedira','M','Union Berlin', NULL),
('TUN','Elias','Achouri','F','Kodaň FC', NULL),
('TUN','Firas','Chaouat','F','Club Africain', 1),
('TUN','Hazem','Mastouri','F','Dynamo Machačkala', 2),
('TUN','Elias','Saad','F','Hannover 96', NULL),
('TUN','Sebastian','Tounekti','F','Celtic', NULL),
('TUN','Khalil','Ayari','F','PSG', NULL),
('TUN','Rayan','Elloumi','F','Vancouver Whitecaps', 3),
-- Švédsko (SWE)
('SWE','Viktor','Johansson','G','Stoke City', NULL),
('SWE','Kristoffer','Nordfeldt','G','AIK', NULL),
('SWE','Jacob','Widell Zetterström','G','Derby County', NULL),
('SWE','Hjalmar','Ekdal','D','Burnley', NULL),
('SWE','Gabriel','Gudmundsson','D','Leeds United', NULL),
('SWE','Isak','Hien','D','Atalanta', NULL),
('SWE','Herman','Johansson','D','FC Dallas', NULL),
('SWE','Gustaf','Lagerbielke','D','Braga', NULL),
('SWE','Victor','Lindelöf','D','Aston Villa', NULL),
('SWE','Eric','Smith','D','St. Pauli', NULL),
('SWE','Carl','Starfelt','D','Celta Vigo', NULL),
('SWE','Elliot','Stroud','D','Mjallby', NULL),
('SWE','Daniel','Svensson','D','Borussia Dortmund', NULL),
('SWE','Taha','Ali','M','Malmö', NULL),
('SWE','Yasin','Ayari','M','Brighton', NULL),
('SWE','Lucas','Bergvall','M','Tottenham', NULL),
('SWE','Jesper','Karlström','M','Udinese', NULL),
('SWE','Ken','Sema','M','Pafos', NULL),
('SWE','Mattias','Svanberg','M','Wolfsburg', NULL),
('SWE','Besfort','Zeneli','M','Union Saint-Gilloise', NULL),
('SWE','Alexander','Bernhardsson','F','Holstein Kiel', NULL),
('SWE','Anthony','Elanga','F','Newcastle United', NULL),
('SWE','Viktor','Gyökeres','F','Arsenal', 1),
('SWE','Alexander','Isak','F','Liverpool', 2),
('SWE','Gustaf','Nilsson','F','Club Brugge', 3),
('SWE','Benjamin','Nygren','F','Celtic', NULL);

-- Pokračování — Skupina G
INSERT INTO _wc_player_data(team_shortcut, first_name, last_name, position, club, ranking) VALUES
-- Belgie (BEL)
('BEL','Thibaut','Courtois','G','Real Madrid', NULL),
('BEL','Senne','Lammens','G','Manchester United', NULL),
('BEL','Mike','Penders','G','Štrasburk', NULL),
('BEL','Timothy','Castagne','D','Fulham', NULL),
('BEL','Zeno','Debast','D','Sporting Lisabon', NULL),
('BEL','Maxim','De Cuyper','D','Brighton', NULL),
('BEL','Koni','De Winter','D','AC Milán', NULL),
('BEL','Brandon','Mechele','D','Club Bruggy', NULL),
('BEL','Thomas','Meunier','D','Lille', NULL),
('BEL','Nathan','Ngoy','D','Lille', NULL),
('BEL','Joaquin','Seys','D','Club Bruggy', NULL),
('BEL','Arthur','Theate','D','Frankfurt', NULL),
('BEL','Kevin','De Bruyne','M','Neapol', 3),
('BEL','Amadou','Onana','M','Aston Villa', NULL),
('BEL','Nicolas','Raskin','M','Rangers', NULL),
('BEL','Youri','Tielemans','M','Aston Villa', NULL),
('BEL','Hans','Vanaken','M','Club Bruggy', NULL),
('BEL','Axel','Witsel','M','Girona', NULL),
('BEL','Charles','De Ketelaere','F','Atalanta', 2),
('BEL','Jeremy','Doku','F','Manchester City', NULL),
('BEL','Matias','Fernandez-Pardo','F','Lille', NULL),
('BEL','Romelu','Lukaku','F','Neapol', 1),
('BEL','Dodi','Lukebakio','F','Benfica', NULL),
('BEL','Diego','Moreira','F','Štrasburk', NULL),
('BEL','Alexis','Saelemaekers','F','AC Milán', NULL),
('BEL','Leandro','Trossard','F','Arsenal', NULL),
-- Egypt (EGY)
('EGY','Mohamed','El Shenawy','G','Al Ahly', NULL),
('EGY','Mostafa','Shobeir','G','Al Ahly', NULL),
('EGY','Mohamed','Alaa','G','El Gouna', NULL),
('EGY','El Mahdy','Soliman','G','Zamalek', NULL),
('EGY','Rami','Rabia','D','Al Ain', NULL),
('EGY','Mohamed','Hany','D','Al Ahly', NULL),
('EGY','Ahmed','Abou El Fotouh','D','Zamalek', NULL),
('EGY','Mohamed','Abdelmonem','D','Nice', NULL),
('EGY','Yasser','Ibrahim','D','Al Ahly', NULL),
('EGY','Hossam','Abdelmaguid','D','Zamalek', NULL),
('EGY','Karim','Hafez','D','Pyramids', NULL),
('EGY','Tarek','Alaa','D','ZED', NULL),
('EGY','Hamdy','Fathy','M','Al-Wakra', NULL),
('EGY','Marwan','Attia','M','Al Ahly', NULL),
('EGY','Emam','Ashour','M','Al Ahly', NULL),
('EGY','Mohanad','Lasheen','M','Pyramids', NULL),
('EGY','Mostafa','Ziko','M','Pyramids', NULL),
('EGY','Mahmoud','Saber','M','ZED', NULL),
('EGY','Nabil','Emad','M','Al-Najma', NULL),
('EGY','Mohamed','Salah','F','Liverpool', 1),
('EGY','','Trézéguet','F','Al Ahly', 3),
('EGY','','Zizo','F','Al Ahly', NULL),
('EGY','Omar','Marmoush','F','Manchester City', 2),
('EGY','Ibrahim','Adel','F','Nordsjælland', NULL),
('EGY','Haissem','Hassan','F','Real Oviedo', NULL),
('EGY','Hamza','Abdelkarim','F','Barcelona B', NULL),
-- Írán (IRN)
('IRN','Alireza','Beiranvand','G','Tractor', NULL),
('IRN','Hossein','Hosseini','G','Sepahan', NULL),
('IRN','Payam','Niazmand','G','Persepolis', NULL),
('IRN','Danial','Eiri','D','Malavan', NULL),
('IRN','Ehsan','Hajsafi','D','Sepahan', NULL),
('IRN','Saleh','Hardani','D','Esteghlal', NULL),
('IRN','Hossein','Kanaani','D','Persepolis', NULL),
('IRN','Shoja','Khalilzadeh','D','Tractor', NULL),
('IRN','Milad','Mohammadi','D','Persepolis', NULL),
('IRN','Ali','Nemati','D','Foolad', NULL),
('IRN','Ramin','Rezaeian','D','Foolad', NULL),
('IRN','Rouzbeh','Cheshmi','M','Esteghlal', NULL),
('IRN','Saeid','Ezatolahi','M','Shabab Al Ahli', NULL),
('IRN','Mehdi','Ghaedi','M','Al Nasr', NULL),
('IRN','Saman','Ghoddos','M','Kalba', NULL),
('IRN','Mohammad','Ghorbani','M','Al Wahda', NULL),
('IRN','Alireza','Jahanbakhsh','M','Dender', NULL),
('IRN','Mohammad','Mohebi','M','Rostov', 2),
('IRN','Amir Mohammad','Razzaghinia','M','Esteghlal', NULL),
('IRN','Mehdi','Torabi','M','Tractor', NULL),
('IRN','Aria','Yousefi','M','Sepahan', NULL),
('IRN','Ali','Alipour','F','Persepolis', 3),
('IRN','Dennis','Eckert Dargahi','F','Standard Liege', NULL),
('IRN','Amirhossein','Hosseinzadeh','F','Tractor', NULL),
('IRN','Shahriar','Moghanlou','F','Kalba', NULL),
('IRN','Mehdi','Taremi','F','Olympiakos', 1),
-- Nový Zéland (NZL)
('NZL','Max','Crocombe','G','Millwall', NULL),
('NZL','Alex','Paulsen','G','Lechia Gdaňsk', NULL),
('NZL','Michael','Woud','G','Auckland', NULL),
('NZL','Tyler','Bindon','D','Nottingham Forest', NULL),
('NZL','Michael','Boxall','D','Minnesota United', NULL),
('NZL','Liberato','Cacace','D','Wrexham', NULL),
('NZL','Francis','De Vries','D','Auckland', NULL),
('NZL','Callan','Elliot','D','Auckland', NULL),
('NZL','Tim','Payne','D','Wellington Phoenix', NULL),
('NZL','Nando','Pijanker','D','Auckland', NULL),
('NZL','Tommy','Smith','D','Braintree Town', NULL),
('NZL','Finn','Surman','D','Portland Timbers', NULL),
('NZL','Lachlan','Bayliss','M','Newcastle Jets', NULL),
('NZL','Joe','Bell','M','Viking FK', NULL),
('NZL','Alex','Rufer','M','Wellington Phoenix', NULL),
('NZL','Marko','Stamenic','M','Swansea City', NULL),
('NZL','Ryan','Thomas','M','PEC Zwolle', NULL),
('NZL','Kosta','Barbarouses','F','Western Sydney Wanderers', NULL),
('NZL','Matt','Garbett','F','Peterborough United', NULL),
('NZL','Eli','Just','F','Motherwell', NULL),
('NZL','Callum','McCowatt','F','Silkeborg', 3),
('NZL','Ben','Old','F','Saint-Etienne', NULL),
('NZL','Jesse','Randall','F','Auckland', NULL),
('NZL','Sapreet','Singh','F','Wellington Phoenix', NULL),
('NZL','Ben','Waine','F','Port Vale', 2),
('NZL','Chris','Wood','F','Nottingham Forest', 1);

-- Pokračování — Skupina H
INSERT INTO _wc_player_data(team_shortcut, first_name, last_name, position, club, ranking) VALUES
-- Španělsko (ESP)
('ESP','Unai','Simón','G','Athletic Bilbao', NULL),
('ESP','David','Raya','G','Arsenal', NULL),
('ESP','Joan','García','G','Barcelona', NULL),
('ESP','Marc','Cucurella','D','Chelsea', NULL),
('ESP','Alejandro','Grimaldo','D','Bayer Leverkusen', NULL),
('ESP','Pau','Cubarsí','D','Barcelona', NULL),
('ESP','Aymeric','Laporte','D','Athletic Bilbao', NULL),
('ESP','Marc','Pubill','D','Atlético Madrid', NULL),
('ESP','Eric','García','D','Barcelona', NULL),
('ESP','Marcos','Llorente','D','Atlético Madrid', NULL),
('ESP','Pedro','Porro','D','Tottenham', NULL),
('ESP','','Pedri','M','Barcelona', NULL),
('ESP','Fabián','Ruiz','M','PSG', NULL),
('ESP','Martin','Zubimendi','M','Arsenal', NULL),
('ESP','','Gavi','M','Barcelona', NULL),
('ESP','','Rodri','M','Manchester City', NULL),
('ESP','Álex','Baena','M','Atlético Madrid', NULL),
('ESP','Mikel','Merino','M','Arsenal', NULL),
('ESP','Mikel','Oyarzabal','F','Real Sociedad', 1),
('ESP','Dani','Olmo','F','Barcelona', NULL),
('ESP','Nico','Williams','F','Athletic Bilbao', NULL),
('ESP','Yeremy','Pino','F','Crystal Palace', NULL),
('ESP','Ferran','Torres','F','Barcelona', 3),
('ESP','Borja','Iglesias','F','Celta Vigo', NULL),
('ESP','Víctor','Muñoz','F','Osasuna', NULL),
('ESP','Lamine','Yamal','F','Barcelona', 2),
-- Kapverdy (CPV)
('CPV','','Vozinha','G','Chaves', NULL),
('CPV','Márcio','Rosa','G','Montana', NULL),
('CPV','CJ','dos Santos','G','San Diego', NULL),
('CPV','','Stopira','D','Torreense', NULL),
('CPV','Roberto','Lopez','D','Shamrock Rovers', NULL),
('CPV','Joao','Paulo','D','FCSB', NULL),
('CPV','Diney','Borges','D','al-Batájh', NULL),
('CPV','Logan','Costa','D','Villarreal', NULL),
('CPV','Steven','Moreira','D','Columbus Crew', NULL),
('CPV','Wagner','Pina','D','Trabzonspor', NULL),
('CPV','Sidny','Lopes Cabral','D','Benfica', NULL),
('CPV','Kelvin','Pires','D','Seinäjoki', NULL),
('CPV','Jamiro','Monteiro','M','Zwolle', NULL),
('CPV','Kevin','Pina','M','Krasnodar', NULL),
('CPV','Deroy','Duarte','M','Ludogorec Razgrad', NULL),
('CPV','Telmo','Arcanjo','M','Vitória Guimaraes', NULL),
('CPV','Laros','Duarte','M','Puskás Akadémia', NULL),
('CPV','Yannick','Semedo','M','Farense', NULL),
('CPV','Ryan','Mendes','F','Igdir', 3),
('CPV','Garry','Rodrigues','F','Apollon Limassol', NULL),
('CPV','Willy','Semedo','F','Omonia', NULL),
('CPV','Jovane','Cabral','F','Estrela Amadora', NULL),
('CPV','','Benchimol','F','Akron Toljatti', 1),
('CPV','Dailon','Livramento','F','Casa Pia', 2),
('CPV','Hélio','Varela','F','Maccabi Tel Aviv', NULL),
('CPV','Nuno','da Costa','F','Basaksehir', NULL),
-- Saúdská Arábie (KSA)
('KSA','Mohammed','Al Owais','G','Al Ula', NULL),
('KSA','Nawaf','Al Aqidi','G','Al Nassr', NULL),
('KSA','Ahmed','Al Kassar','G','Al Qadsiah', NULL),
('KSA','Abdulelah','Al Amri','D','Al Nassr', NULL),
('KSA','Hassan','Tambakti','D','Al Hilal', NULL),
('KSA','Jehad','Thikri','D','Al Qadsiah', NULL),
('KSA','Ali','Lajami','D','Al Hilal', NULL),
('KSA','Hassan','Kadesh','D','Al Ittihad', NULL),
('KSA','Saud','Abdulhamid','D','Lens', NULL),
('KSA','Mohammed','Abu Al Shamat','D','Al Qadsiah', NULL),
('KSA','Ali','Majrashi','D','Al Ahli', NULL),
('KSA','Moteb','Al Harbi','D','Al Hilal', NULL),
('KSA','Nawaf','Boushal','D','Al Nassr', NULL),
('KSA','Sultan','Mandash','F','Al Hilal', NULL),
('KSA','Mohammed','Kanno','M','Al Hilal', NULL),
('KSA','Abdullah','Al Khaibari','M','Al Nassr', NULL),
('KSA','Ziyad','Al Johani','M','Al Ahli', NULL),
('KSA','Nasser','Al Dawsari','M','Al Hilal', NULL),
('KSA','Musab','Al Juwayr','M','Al Qadsiah', NULL),
('KSA','Alaa','Al Hejji','M','Neom', NULL),
('KSA','Salem','Al Dawsari','M','Al Hilal', NULL),
('KSA','Khalid','Al Ghannam','M','Al Ettifaq', 1),
('KSA','Ayman','Yahya','M','Al Nassr', NULL),
('KSA','Firas','Al Buraikan','F','Al Ahli', 2),
('KSA','Saleh','Al Shehri','F','Al Ittihad', 3),
('KSA','Abdullah','Al Hamdan','F','Al Nassr', NULL),
-- Uruguay (URU)
('URU','Sergio','Rochet','G','Internacional', NULL),
('URU','Fernando','Muslera','G','Estudiantes', NULL),
('URU','Santiago','Mele','G','Monterrey', NULL),
('URU','Guillermo','Varela','D','Flamengo', NULL),
('URU','Ronald','Araujo','D','Barcelona', NULL),
('URU','José María','Giménez','D','Atlético Madrid', NULL),
('URU','Santiago','Bueno','D','Wolves', NULL),
('URU','Sebastián','Cáceres','D','CF América', NULL),
('URU','Mathías','Olivera','D','Napoli', NULL),
('URU','Joaquín','Piquerez','D','Palmeiras', NULL),
('URU','Matías','Viña','D','River Plate', NULL),
('URU','Manuel','Ugarte','M','Manchester United', NULL),
('URU','Emiliano','Martínez','M','Palmeiras', NULL),
('URU','Rodrigo','Bentancur','M','Tottenham', NULL),
('URU','Federico','Valverde','M','Real Madrid', NULL),
('URU','Agustín','Canobbio','M','Fluminense', NULL),
('URU','Juan Manuel','Sanabria','M','Real Salt Lake City', NULL),
('URU','Giorgian','de Arrascaeta','M','Flamengo', NULL),
('URU','Nicolás','de la Cruz','M','Flamengo', NULL),
('URU','Rodrigo','Zalazar','M','Braga', NULL),
('URU','Facundo','Pellistri','M','Panathinaikos', NULL),
('URU','Maximiliano','Araújo','M','Sporting', NULL),
('URU','Brian','Rodríguez','M','CF América', NULL),
('URU','Rodrigo','Aguirre','F','Tigres', 3),
('URU','Federico','Viñas','F','Real Oviedo', 2),
('URU','Darwin','Núñez','F','Al Hilal', 1);

-- Pokračování — Skupina I
INSERT INTO _wc_player_data(team_shortcut, first_name, last_name, position, club, ranking) VALUES
-- Francie (FRA)
('FRA','Mike','Maignan','G','AC Milán', NULL),
('FRA','Brice','Samba','G','Rennes', NULL),
('FRA','Robin','Risser','G','Lens', NULL),
('FRA','Lucas','Digne','D','Aston Villa', NULL),
('FRA','Jules','Koundé','D','Barcelona', NULL),
('FRA','Théo','Hernandez','D','Al Hilal', NULL),
('FRA','Lucas','Hernandez','D','PSG', NULL),
('FRA','Dayot','Upamecano','D','Bayern Mnichov', NULL),
('FRA','William','Saliba','D','Arsenal', NULL),
('FRA','Ibrahima','Konaté','D','Liverpool', NULL),
('FRA','Malo','Gusto','D','Chelsea', NULL),
('FRA','Maxence','Lacroix','D','Crystal Palace', NULL),
('FRA','N''Golo','Kanté','M','Fenerbahce', NULL),
('FRA','Adrien','Rabiot','M','AC Milán', NULL),
('FRA','Aurélien','Tchouaméni','M','Real Madrid', NULL),
('FRA','Manu','Koné','M','AS Řím', NULL),
('FRA','Warren','Zaire-Emery','M','PSG', NULL),
('FRA','Kylian','Mbappé','F','Real Madrid', 1),
('FRA','Ousmane','Dembélé','F','PSG', 2),
('FRA','Marcus','Thuram','F','Inter Milán', NULL),
('FRA','Bradley','Barcola','F','PSG', NULL),
('FRA','Michael','Olise','F','Bayern Mnichov', 3),
('FRA','Maghnes','Akliouche','F','Monako', NULL),
('FRA','Désiré','Doué','F','PSG', NULL),
('FRA','Rayan','Cherki','F','Manchester City', NULL),
('FRA','Jean-Philippe','Mateta','F','Crystal Palace', NULL),
-- Senegal (SEN)
('SEN','Édouard','Mendy','G','Al Ahli', NULL),
('SEN','Mory','Diaw','G','Le Havre', NULL),
('SEN','Yevhann','Diouf','G','Nice', NULL),
('SEN','Kalidou','Koulibaly','D','Al Hilal', NULL),
('SEN','Moussa','Niakhaté','D','Olympique Lyon', NULL),
('SEN','Krépin','Diatta','D','Monako', NULL),
('SEN','Antoine','Mendy','D','Nice', NULL),
('SEN','Abdoulaye','Seck','D','Maccabi Haifa', NULL),
('SEN','Mamadou','Sarr','D','Chelsea', NULL),
('SEN','Ismail','Jakobs','D','Galatasaray', NULL),
('SEN','El Hadji Malick','Diouf','D','West Ham', NULL),
('SEN','Idrissa Gana','Gueye','M','Everton', NULL),
('SEN','Pape','Gueye','M','Villarreal', NULL),
('SEN','Lamine','Camara','M','Monako', NULL),
('SEN','Habib','Diarra','M','Sunderland', NULL),
('SEN','Pathé','Ciss','M','Rayo Vallecano', NULL),
('SEN','Pape Matar','Sarr','M','Tottenham', NULL),
('SEN','Bara Sapoko','Ndiaye','M','Bayern Mnichov', NULL),
('SEN','Iliman','Ndiaye','F','Everton', NULL),
('SEN','Ismaila','Sarr','F','Crystal Palace', NULL),
('SEN','Sadio','Mané','F','Al Nassr', NULL),
('SEN','Nicolas','Jackson','F','Bayern Mnichov', NULL),
('SEN','Ibrahim','Mbaye','F','PSG', NULL),
('SEN','Bamba','Dieng','F','Lorient', 1),
('SEN','Assane','Diao','F','Como', 2),
('SEN','Chérif','Ndiaye','F','Samsunspor', 3),
-- Norsko (NOR)
('NOR','Örjan','Nyland','G','Sevilla', NULL),
('NOR','Sander','Tangvik','G','Hamburk', NULL),
('NOR','Egil','Selvik','G','Watford', NULL),
('NOR','Kristoffer','Vassbakk Ajer','D','Brentford', NULL),
('NOR','Leo','Östigard','D','Janov', NULL),
('NOR','David','Möller Wolfe','D','Wolves', NULL),
('NOR','Fredrik','Björkan','D','Bodö/Glimt', NULL),
('NOR','Marcus','Holmgren Pedersen','D','Turín FC', NULL),
('NOR','Torbjörn','Heggem','D','Boloňa', NULL),
('NOR','Sondre','Langas','D','Derby', NULL),
('NOR','Henrik','Falchener','D','Viking', NULL),
('NOR','Julian','Ryerson','D','Dortmund', NULL),
('NOR','Morten','Thorsby','M','Cremonese', NULL),
('NOR','Kristian','Thorstvedt','M','Sassuolo', NULL),
('NOR','Thelonious','Aasgaard','M','Rangers', NULL),
('NOR','Antonio','Nusa','M','RB Lipsko', NULL),
('NOR','Andreas','Schjelderup','M','Benfica', NULL),
('NOR','Fredrik','Aursnes','M','Benfica', NULL),
('NOR','Oscar','Bobb','M','Manchester City', NULL),
('NOR','Sander','Berge','M','Fulham', NULL),
('NOR','Jens Petter','Hauge','M','Bodö/Glimt', NULL),
('NOR','Patrick','Berg','M','Bodö/Glimt', NULL),
('NOR','Martin','Ödegaard','M','Arsenal', NULL),
('NOR','Alexander','Sörloth','F','Atlético Madrid', 3),
('NOR','Erling','Haaland','F','Manchester City', 1),
('NOR','Jörgen','Strand Larsen','F','Crystal Palace', 2),
-- Irák (IRQ)
('IRQ','Jalal','Hassan','G','Al-Zawraa', NULL),
('IRQ','Fahad','Talib','G','Al-Talaba', NULL),
('IRQ','Ahmed','Basil','G','Al-Shorta', NULL),
('IRQ','Rebin','Sulaka','D','Port FC', NULL),
('IRQ','Manaf','Younis','D','Al-Shorta', NULL),
('IRQ','Merchas','Doski','D','Viktoria Plzeň', NULL),
('IRQ','Zaid','Tahseen','D','Pakhtakor', NULL),
('IRQ','Frans','Putros','D','Persib Bandung', NULL),
('IRQ','Hussein','Ali','D','Pogoň Štětín', NULL),
('IRQ','Ahmed','Maknzi','D','Al-Karma', NULL),
('IRQ','Mustafa','Saadoon','D','Al-Shorta', NULL),
('IRQ','Akam','Hashim','D','Al-Zawraa', NULL),
('IRQ','Ibrahim','Bayesh','M','Al-Dhafra', NULL),
('IRQ','Amir','Al-Ammari','M','Cracovia', NULL),
('IRQ','Ali','Jasim','M','Al-Najma', NULL),
('IRQ','Youssef','Amyn','M','AEK Larnaka', NULL),
('IRQ','Zidane','Iqbal','M','Utrecht', NULL),
('IRQ','Marko','Farji','M','Venezia', NULL),
('IRQ','Kevin','Yakob','M','AGF Aarhus', NULL),
('IRQ','Aimar','Sher','M','Sarpsborg 08', NULL),
('IRQ','Zaid','Ismail','M','Al-Talaba', NULL),
('IRQ','Ahmed','Qasem','M','Nashville SC', NULL),
('IRQ','Aymen','Hussein','F','Al-Karma', 1),
('IRQ','Mohanad','Ali','F','Dibba', NULL),
('IRQ','Ali','Al-Hamadi','F','Luton Town', 2),
('IRQ','Ali','Yousif','F','Al-Talaba', 3);

-- Pokračování — Skupina J
INSERT INTO _wc_player_data(team_shortcut, first_name, last_name, position, club, ranking) VALUES
-- Argentina (ARG)
('ARG','Emiliano','Martínez','G','Aston Villa', NULL),
('ARG','Geronimo','Rulli','G','Marseille', NULL),
('ARG','Juan','Musso','G','Atlético Madrid', NULL),
('ARG','Gonzalo','Montiel','D','River Plate', NULL),
('ARG','Nahuel','Molina','D','Atlético Madrid', NULL),
('ARG','Nicolas','Otamendi','D','Benfica', NULL),
('ARG','Cristian','Romero','D','Tottenham', NULL),
('ARG','Lisandro','Martínez','D','Manchester United', NULL),
('ARG','Nicolas','Tagliafico','D','Lyon', NULL),
('ARG','Facundo','Medina','D','Marseille', NULL),
('ARG','Valentin','Barco','M','Štrasburk', NULL),
('ARG','Giovani','Lo Celso','M','Real Betis', NULL),
('ARG','Nico','Paz','M','Como', NULL),
('ARG','Enzo','Fernández','M','Chelsea', NULL),
('ARG','Leandro','Paredes','M','Boca Juniors', NULL),
('ARG','Alexis','Mac Allister','M','Liverpool', NULL),
('ARG','Rodrigo','De Paul','M','Inter Miami', NULL),
('ARG','Exequiel','Palacios','M','Leverkusen', NULL),
('ARG','Nicolas','Gonzalez','M','Atlético Madrid', NULL),
('ARG','Giuliano','Simeone','M','Atlético Madrid', NULL),
('ARG','Thiago','Almada','M','Atlético Madrid', NULL),
('ARG','Lionel','Messi','F','Inter Miami', 1),
('ARG','Julian','Álvarez','F','Atlético Madrid', 2),
('ARG','Lautaro','Martinez','F','Inter Milán', 3),
('ARG','Flaco','Lopez','F','Palmeiras', NULL),
-- Alžírsko (ALG)
('ALG','Oussama','Benbot','G','USM Alger', NULL),
('ALG','Melvin','Mastil','G','Stade Nyonnaise', NULL),
('ALG','Luca','Zidane','G','Granada', NULL),
('ALG','Achraf','Abada','D','USM Alger', NULL),
('ALG','Rayan','Ait-Nouri','D','Manchester City', NULL),
('ALG','Zinedine','Belaid','D','JS Kabylie', NULL),
('ALG','Rafik','Belghali','D','Verona', NULL),
('ALG','Ramy','Bensebaini','D','Dortmund', NULL),
('ALG','Samir','Chergui','D','Paris FC', NULL),
('ALG','Jaouen','Hadjam','D','Young Boys Bern', NULL),
('ALG','Aissa','Mandi','D','Lille', NULL),
('ALG','Mohamed Amine','Tougai','D','Esperance', NULL),
('ALG','Houssem','Aouar','M','Al Ittihad', NULL),
('ALG','Nabil','Bentaleb','M','Lille', NULL),
('ALG','Hicham','Boudaoui','M','Nice', NULL),
('ALG','Fares','Chaibi','M','Eintracht Frankfurt', NULL),
('ALG','Ibrahim','Maza','M','Leverkusen', NULL),
('ALG','Yassine','Titraoui','M','Charleroi', NULL),
('ALG','Ramiz','Zerrouki','M','Twente', NULL),
('ALG','Mohamed Amine','Amoura','F','Wolfsburg', 1),
('ALG','Nadir','Benbouali','F','Győri ETO', 2),
('ALG','Adil','Boulbina','F','Al Duhail', 3),
('ALG','Fares','Ghedjemis','F','Frosinone', NULL),
('ALG','Amine','Gouiri','F','Marseille', NULL),
('ALG','Riyad','Mahrez','F','Al Ahli', NULL),
('ALG','Anis Hadj','Moussa','F','Feyenoord', NULL),
-- Rakousko (AUT)
('AUT','Patrick','Pentz','G','Bröndby', NULL),
('AUT','Alexander','Schlager','G','RB Salcburk', NULL),
('AUT','Florian','Wiegele','G','Viktoria Plzeň', NULL),
('AUT','David','Affengruber','D','Elche', NULL),
('AUT','David','Alaba','D','Real Madrid', NULL),
('AUT','Kevin','Danso','D','Tottenham', NULL),
('AUT','Marco','Friedl','D','Werder Brémy', NULL),
('AUT','Philipp','Lienhart','D','Freiburg', NULL),
('AUT','Phillipp','Mwene','D','Mohuč', NULL),
('AUT','Stefan','Posch','D','Mohuč', NULL),
('AUT','Alexander','Prass','D','Hoffenheim', NULL),
('AUT','Michael','Svoboda','D','Benátky', NULL),
('AUT','Carney','Chukwuemeka','M','Dortmund', NULL),
('AUT','Florian','Grillitsch','M','Braga', NULL),
('AUT','Konrad','Laimer','M','Bayern Mnichov', NULL),
('AUT','Marcel','Sabitzer','M','Dortmund', NULL),
('AUT','Xaver','Schlager','M','RB Lipsko', NULL),
('AUT','Romano','Schmid','M','Werder Brémy', NULL),
('AUT','Alessandro','Schöpf','M','RZ Pellets WAC', NULL),
('AUT','Nicolas','Seiwald','M','RB Lipsko', NULL),
('AUT','Paul','Wanner','M','PSV Eindhoven', NULL),
('AUT','Patrick','Wimmer','M','Wolfsburg', NULL),
('AUT','Marko','Arnautovic','F','FK Crvena Zvezda', 1),
('AUT','Michael','Gregoritsch','F','Augsburg', 2),
('AUT','Sasa','Kalajdzic','F','LASK', 3),
-- Jordánsko (JOR)
('JOR','Yazeed','Abulaila','G','Al-Hussein', NULL),
('JOR','Abdallah','Al-Fakhouri','G','Al-Wehdat', NULL),
('JOR','Noureddin','Bani Attiah','G','Al-Faisaly', NULL),
('JOR','Abdallah','Nasib','D','Al-Zawraa', NULL),
('JOR','Ehsan','Haddad','D','Al-Hussein', NULL),
('JOR','Saed','Al-Rosan','D','Al-Hussein', NULL),
('JOR','Saleem','Obaid','D','Al-Hussein', NULL),
('JOR','Yazan','Al-Arab','D','FC Seoul', NULL),
('JOR','Mohammad','Abualnadi','D','Selangor', NULL),
('JOR','Husam','Abu Dahab','D','Al-Faisaly', NULL),
('JOR','Anas','Banawi','D','Al-Faisaly', NULL),
('JOR','Mohannad','Abu Taha','D','Al-Quwa Al-Jawiya', NULL),
('JOR','Mohammad','Abu Hasheesh','D','Al-Karma', NULL),
('JOR','Noor','Al-Rawabdeh','M','Selangor', NULL),
('JOR','Nizar','Al-Rashdan','M','Qatar', NULL),
('JOR','Ibrahim','Saadeh','M','Al-Karma', NULL),
('JOR','Rajaei','Ayed','M','Al-Hussein', NULL),
('JOR','Mahmoud','Al-Mardi','M','Al-Hussein', 3),
('JOR','Amer','Jamous','M','Al-Zawraa', NULL),
('JOR','Mohammad','Al-Dawoud','M','Al-Wehdat', NULL),
('JOR','Mousa','Tamari','F','Rennes', 2),
('JOR','Odeh','Al-Fakhouri','F','Pyramids', NULL),
('JOR','Mohammad','Abu Zrayq','F','Raja Casablanca', NULL),
('JOR','Ali','Azaizeh','F','Al-Shabab', NULL),
('JOR','Ali','Olwan','F','Al-Sailiya', 1);

-- Pokračování — Skupina K
INSERT INTO _wc_player_data(team_shortcut, first_name, last_name, position, club, ranking) VALUES
-- Portugalsko (POR)
('POR','Diogo','Costa','G','Porto', NULL),
('POR','Rui','Silva','G','Sporting', NULL),
('POR','José','Sá','G','Wolves', NULL),
('POR','Diogo','Dalot','D','Manchester United', NULL),
('POR','Matheus','Nunes','D','Manchester City', NULL),
('POR','Nélson','Semedo','D','Fenerbahce', NULL),
('POR','','Cancelo','D','Barcelona', NULL),
('POR','Nuno','Mendes','D','PSG', NULL),
('POR','Goncalo','Inácio','D','Sporting', NULL),
('POR','Renato','Veiga','D','Villarreal', NULL),
('POR','Rúben','Dias','D','Manchester City', NULL),
('POR','Tomás','Araújo','D','Benfica', NULL),
('POR','Rúben','Neves','M','Al Hilal', NULL),
('POR','Samú','Costa','M','Mallorca', NULL),
('POR','Joao','Neves','M','PSG', NULL),
('POR','','Vitinha','M','PSG', NULL),
('POR','Bruno','Fernandes','M','Manchester United', NULL),
('POR','Bernardo','Silva','M','Manchester City', NULL),
('POR','Joao','Félix','F','Al Nassr', 3),
('POR','','Trincao','F','Sporting', NULL),
('POR','Francisco','Conceicao','F','Juventus', NULL),
('POR','Pedro','Neto','F','Chelsea', NULL),
('POR','Rafael','Leao','F','AC Milán', NULL),
('POR','Goncalo','Guedes','F','Wolves', NULL),
('POR','Goncalo','Ramos','F','PSG', 2),
('POR','Cristiano','Ronaldo','F','Al Nassr', 1),
-- Uzbekistán (UZB)
('UZB','Utkir','Yusupov','G','Navbahor', NULL),
('UZB','Botirali','Ergashev','G','Neftči', NULL),
('UZB','Abduvohid','Nematov','G','Nasaf', NULL),
('UZB','Abdukodir','Chusanov','D','Manchester City', NULL),
('UZB','Rustam','Ashurmatov','D','Esteghlal', NULL),
('UZB','Umar','Eshmurodov','D','Nasaf', NULL),
('UZB','Avazbek','Ulmasaliev','D','AGMK', NULL),
('UZB','Abdulla','Abdullaev','D','Dibba Al Fujairah', NULL),
('UZB','Khojiakbar','Alijonov','D','Pachtakor', NULL),
('UZB','Bekhruz','Karimov','D','Surkhon', NULL),
('UZB','Farrukh','Sayfiev','D','Neftči', NULL),
('UZB','Sherzod','Nasrullaev','D','Pachtakor', NULL),
('UZB','Jakhongir','Urozov','D','Dinamo Samarkand', NULL),
('UZB','Otabek','Shukurov','M','Baniyas', NULL),
('UZB','Akmal','Mozgovoy','M','Pachtakor', NULL),
('UZB','Jamshid','Iskanderov','M','Neftči', NULL),
('UZB','Odil','Hamrobekov','M','Tractor', NULL),
('UZB','Jaloliddin','Masharipov','M','Esteghlal', NULL),
('UZB','Aziz','Ganiev','M','Al Bataeh', NULL),
('UZB','Sherzod','Esanov','M','Buchara', NULL),
('UZB','Abbosbek','Fayzullaev','M','Basaksehir', NULL),
('UZB','Eldor','Šomurodov','F','Basaksehir', 1),
('UZB','Igor','Sergeev','F','Persepolis', 2),
('UZB','Azizbek','Amonov','F','Dinamo Samarkand', NULL),
('UZB','Oston','Urunov','F','Persepolis', 3),
('UZB','Dostonbek','Khamdamov','F','Pachtakor', NULL),
-- Kolumbie (COL)
('COL','Camilo','Vargas','G','Atlas', NULL),
('COL','Álvaro','Montero','G','Velez Sarsfield', NULL),
('COL','David','Ospina','G','Atlético Nacional', NULL),
('COL','Dávinson','Sánchez','D','Galatasaray', NULL),
('COL','Jhon','Lucumí','D','Boloňa', NULL),
('COL','Yerry','Mina','D','Cagliari', NULL),
('COL','Willer','Ditta','D','Cruz Azul', NULL),
('COL','Daniel','Muñoz','D','Crystal Palace', NULL),
('COL','Santiago','Arias','D','Independiente', NULL),
('COL','Johan','Mojica','D','Mallorca', NULL),
('COL','Deiver','Machado','D','Nantes', NULL),
('COL','Richard','Rios','M','Benfica', NULL),
('COL','Jefferson','Lerma','M','Crystal Palace', NULL),
('COL','Kevin','Castaño','M','River Plate', NULL),
('COL','Juan Camilo','Portilla','M','Racing Santander', NULL),
('COL','Gustavo','Puerta','M','Racing Santander', NULL),
('COL','Jhon','Arias','M','Palmeiras', NULL),
('COL','Jorge','Carrascal','M','Flamengo', NULL),
('COL','Juan Fernando','Quintero','M','River Plate', NULL),
('COL','James','Rodríguez','M','Minnesota United', NULL),
('COL','Jaminton','Campaz','M','Rosario Central', NULL),
('COL','Juan Camilo','Hernández','F','Real Betis', 3),
('COL','Luis','Díaz','F','Bayern Mnichov', 1),
('COL','Luis','Suárez','F','Sporting', 2),
('COL','Carlos Andrés','Gómez','F','Vasco', NULL),
('COL','Jhon','Córdoba','F','Instituto', NULL),
-- DR Kongo (COD)
('COD','Matthieu','Epolo','G','Standard Liege', NULL),
('COD','Timothy','Fayulu','G','Noah', NULL),
('COD','Lionel','Mpasi','G','Le Havre', NULL),
('COD','Dylan','Batubinsika','D','Larisa', NULL),
('COD','Aaron','Tshibola','M','Kilmarnock', NULL),
('COD','Gedeon','Kalulu','D','Aris Limassol', NULL),
('COD','Steve','Kapuadi','D','Widzew Lodz', NULL),
('COD','Joris','Kayembe','D','Racing Genk', NULL),
('COD','Arthur','Masuaku','D','Racing Lens', NULL),
('COD','Chancel','Mbemba','D','Lille', NULL),
('COD','Axel','Tuanzebe','D','Burnley', NULL),
('COD','Aaron','Wan-Bissaka','D','West Ham United', NULL),
('COD','Theo','Bongonda','M','Spartak Moskva', NULL),
('COD','Brian','Cipenga','M','Castellon', NULL),
('COD','Elia','Meshack','M','Alanyaspor', NULL),
('COD','Gael','Kakuta','M','Larissa', NULL),
('COD','Edo','Kayembe','M','Watford', NULL),
('COD','Nathanael','Mbuku','M','Montpellier', NULL),
('COD','Samuel','Moutoussamy','M','Atromitos', NULL),
('COD','Ngalayel','Mukau','M','Lille', NULL),
('COD','Charles','Pickel','M','Espanyol', NULL),
('COD','Noah','Sadiki','M','Sunderland', NULL),
('COD','Cedric','Bakambu','F','Real Betis', 1),
('COD','Simon','Banza','F','Al Jazira', NULL),
('COD','Fiston','Mayele','F','Pyramids', 3),
('COD','Yoane','Wissa','F','Newcastle United', 2);

-- Pokračování — Skupina L
INSERT INTO _wc_player_data(team_shortcut, first_name, last_name, position, club, ranking) VALUES
-- Anglie (ENG)
('ENG','Jordan','Pickford','G','Everton', NULL),
('ENG','Dean','Henderson','G','Crystal Palace', NULL),
('ENG','James','Trafford','G','Manchester City', NULL),
('ENG','Reece','James','D','Chelsea', NULL),
('ENG','Tino','Livramento','D','Newcastle', NULL),
('ENG','Dan','Burn','D','Newcastle', NULL),
('ENG','Nico','O''Reilly','D','Manchester City', NULL),
('ENG','Marc','Guéhi','D','Manchester City', NULL),
('ENG','John','Stones','D','Manchester City', NULL),
('ENG','Djed','Spence','D','Tottenham', NULL),
('ENG','Ezri','Konsa','D','Aston Villa', NULL),
('ENG','Jarell','Quansah','D','Leverkusen', NULL),
('ENG','Kobbie','Mainoo','M','Manchester United', NULL),
('ENG','Elliot','Anderson','M','Nottingham', NULL),
('ENG','Declan','Rice','M','Arsenal', NULL),
('ENG','Eberechi','Eze','M','Arsenal', NULL),
('ENG','Jordan','Henderson','M','Brentford', NULL),
('ENG','Morgan','Rogers','M','Aston Villa', NULL),
('ENG','Jude','Bellingham','M','Real Madrid', NULL),
('ENG','Harry','Kane','F','Bayern Mnichov', 1),
('ENG','Ivan','Toney','F','Al Ahli', NULL),
('ENG','Marcus','Rashford','F','Barcelona', NULL),
('ENG','Anthony','Gordon','F','Newcastle', NULL),
('ENG','Bukayo','Saka','F','Arsenal', 2),
('ENG','Noni','Madueke','F','Arsenal', NULL),
('ENG','Ollie','Watkins','F','Aston Villa', 3),
-- Chorvatsko (CRO)
('CRO','Dominik','Livakovič','G','Dinamo Záhřeb', NULL),
('CRO','Dominik','Kotarski','G','Kodaň FC', NULL),
('CRO','Ivor','Pandur','G','Hull City', NULL),
('CRO','Joško','Gvardiol','D','Manchester City', NULL),
('CRO','Duje','Čaleta-Car','D','Real Sociedad', NULL),
('CRO','Josip','Šutalo','D','Ajax', NULL),
('CRO','Josip','Stanišič','D','Bayern Mnichov', NULL),
('CRO','Marin','Pongračič','D','Fiorentina', NULL),
('CRO','Martin','Erlič','D','Midtjylland', NULL),
('CRO','Luka','Vuškovič','D','HSV', NULL),
('CRO','Luka','Modrič','M','AC Milán', NULL),
('CRO','Mateo','Kovačič','M','Manchester City', NULL),
('CRO','Mario','Pašalič','M','Atalanta', NULL),
('CRO','Nikola','Vlašič','M','Turín FC', NULL),
('CRO','Luka','Sučič','M','Real Sociedad', NULL),
('CRO','Martin','Baturina','M','Como', NULL),
('CRO','Kristijan','Jakič','M','Augsburg', NULL),
('CRO','Petar','Sučič','M','Inter', NULL),
('CRO','Nikola','Moro','M','Bologna', NULL),
('CRO','Toni','Fruk','M','Rijeka', NULL),
('CRO','Ivan','Perišič','F','PSV', NULL),
('CRO','Andrej','Kramarič','F','Hoffenheim', 3),
('CRO','Ante','Budimir','F','Osasuna', 1),
('CRO','Marco','Pašalič','F','Orlando City', NULL),
('CRO','Petar','Musa','F','Dallas', 2),
('CRO','Igor','Matanovič','F','Freiburg', NULL),
-- Ghana (GHA)
('GHA','Benjamin','Asare','G','Hearts of Oak', NULL),
('GHA','Lawrence','Ati Zigi','G','St. Gallen', NULL),
('GHA','Joseph','Anang','G','St. Patricks', NULL),
('GHA','Derrick','Luckassen','D','Pafos', NULL),
('GHA','Abdul Rahman','Baba','D','PAOK', NULL),
('GHA','Gideon','Mensah','D','Auxerre', NULL),
('GHA','Marvin','Senaya','D','Auxerre', NULL),
('GHA','Alidu','Seidu','D','Rennes', NULL),
('GHA','Abdul','Mumin','D','Rayo Vallecano', NULL),
('GHA','Jerome','Opoku','D','Basaksehir', NULL),
('GHA','Jonas','Adjetey','D','Wolfsburg', NULL),
('GHA','Kojo','Peprah','D','Nice', NULL),
('GHA','Elisha','Owusu','M','Auxerre', NULL),
('GHA','Thomas','Partey','M','Villarreal', NULL),
('GHA','Kwasi','Sibo','M','Oviedo', NULL),
('GHA','Augustine','Boakye','M','St Etienne', NULL),
('GHA','Caleb','Yirenkyi','M','Nordsjaelland', NULL),
('GHA','Issahaku','Fatawu','M','Leicester', NULL),
('GHA','Kamaldeen','Sulemana','M','Atalanta', NULL),
('GHA','Christopher','Bonsu Baah','F','Al Qadsiah', NULL),
('GHA','Ernest','Nuamah','F','Lyon', NULL),
('GHA','Antoine','Semenyo','F','Manchester City', 1),
('GHA','Brandon','Thomas-Asante','F','Coventry', 2),
('GHA','Prince','Adu','F','Viktoria Plzeň', NULL),
('GHA','Inaki','Williams','F','Athletic Bilbao', NULL),
('GHA','Jordan','Ayew','F','Leicester', 3),
-- Panama (PAN)
('PAN','Orlando','Mosquera','G','Al Fayha', NULL),
('PAN','Luis','Mejía','G','Club Nacional', NULL),
('PAN','César','Samudio','G','Marathon', NULL),
('PAN','César','Blackman','D','Slovan Bratislava', NULL),
('PAN','Jorge','Gutiérrez','D','Deportivo La Guaira', NULL),
('PAN','Amir','Murillo','D','Besiktas', NULL),
('PAN','Fidel','Escobar','D','Deportivo Saprissa', NULL),
('PAN','Andrés','Andrade','D','LASK', NULL),
('PAN','Edgardo','Fariña','D','Nižnij Novgorod', NULL),
('PAN','José','Córdoba','D','Norwich', NULL),
('PAN','Eric','Davis','D','Plaza Amador', NULL),
('PAN','Jiovani','Ramos','D','Academia Puerto Cabello', NULL),
('PAN','Roderick','Miller','D','Turan Tovuz', NULL),
('PAN','Aníbal','Godoy','M','San Diego', NULL),
('PAN','Adalberto','Carrasquilla','M','UNAM Pumas', NULL),
('PAN','Carlos','Harvey','M','Minnesota United', NULL),
('PAN','Christian','Martínez','M','Hapoel Kirjat Šmona', NULL),
('PAN','José Luis','Rodríguez','M','FC Juarez', NULL),
('PAN','Cesar','Yanis','M','Cobresal', NULL),
('PAN','Yoel','Bárcenas','M','Mazatlan', NULL),
('PAN','Alberto','Quintero','M','Plaza Amador', NULL),
('PAN','Azarías','Londoño','M','Universidad Catolica', NULL),
('PAN','Ismael','Díaz','F','Club Leon', 1),
('PAN','Cecilio','Waterman','F','Universidad de Concepcion', 2),
('PAN','José','Fajardo','F','Universidad Catolica', 3),
('PAN','Tomás','Rodríguez','F','Deportivo Saprissa', NULL);

-- ============================================================================
-- 5b) PŘENOS HRÁČŮ z temp tabulky do Player + LeaguePlayer
-- ============================================================================
-- Použijeme externalId jako dočasný klíč pro spárování po RETURNING.
-- Po vložení LeaguePlayer ho zase nullujeme, aby Player nezůstal s falešným ID.
WITH inserted_players AS (
    INSERT INTO "Player"("firstName", "lastName", "position", "isActive", "externalId", "createdAt", "updatedAt")
    SELECT
        NULLIF(first_name, ''),
        NULLIF(last_name, ''),
        position,
        TRUE,
        8000000 + ord,
        NOW(), NOW()
    FROM _wc_player_data
    RETURNING id, "externalId"
)
-- topScorerRanking se ukládá přímo na LeaguePlayer (sloupec čte UI i admin pro
-- zobrazení badge). TopScorerRankingVersion níže navíc drží časově-vázanou verzi
-- pro vyhodnocování střelců.
INSERT INTO "LeaguePlayer"("leagueTeamId", "playerId", "clubName", "topScorerRanking", "createdAt", "updatedAt")
SELECT
    tm.league_team_id,
    ip.id,
    pd.club,
    pd.ranking,
    NOW(), NOW()
FROM _wc_player_data pd
JOIN inserted_players ip ON ip."externalId" = 8000000 + pd.ord
JOIN _wc_team_map tm ON tm.shortcut = pd.team_shortcut;

-- Vyčistíme dočasné externalId (8M+ není reálné Sofascore/odjinud)
UPDATE "Player" SET "externalId" = NULL, "updatedAt" = NOW()
WHERE "externalId" BETWEEN 8000000 AND 9000000;

-- ----------------------------------------------------------------------------
-- TopScorerRankingVersion — pro hráče s ranking IS NOT NULL ve _wc_player_data
-- ----------------------------------------------------------------------------
-- Ranking 1/2/3 ovlivňuje body za střelce zápasu:
--   1 = nejlepší střelec týmu → 2 b (nejméně bodů, "očekávaný" tip)
--   2 = druhý nejlepší        → 3 b
--   3 = třetí nejlepší        → 4 b
--   NULL/nevyplněno           → 7 b (unranked, "překvapivý" tip)
-- Effective od startu turnaje (11. 6. 2026 21:00 SELČ).
INSERT INTO "TopScorerRankingVersion"(
    "leagueId", "leaguePlayerId", "ranking",
    "effectiveFrom", "effectiveTo",
    "createdAt", "createdByUserId"
)
SELECT
    (SELECT val FROM _wc_var WHERE key = 'league_id'),
    lp.id,
    pd.ranking,
    '2026-06-11 21:00+02'::timestamptz,
    NULL,
    NOW(),
    NULL
FROM _wc_player_data pd
JOIN _wc_team_map tm ON tm.shortcut = pd.team_shortcut
JOIN "LeaguePlayer" lp ON lp."leagueTeamId" = tm.league_team_id
JOIN "Player" p ON p.id = lp."playerId"
    AND COALESCE(p."firstName", '') = pd.first_name
    AND COALESCE(p."lastName", '') = pd.last_name
WHERE pd.ranking IS NOT NULL
  AND lp."deletedAt" IS NULL;

-- ============================================================================
-- 6) SKUPINOVÉ ZÁPASY (72)
-- ============================================================================
-- Časy v zóně Europe/Prague (SELČ = UTC+2). Match.dateTime je timestamptz,
-- PostgreSQL si offset převede.
-- gameNumber 1..72 dle FIFA pořadí turnaje.
WITH source AS (
    SELECT * FROM (VALUES
        -- gameNumber, dateTime, home_shortcut, away_shortcut
        -- Skupina A
        (1,  '2026-06-11 21:00+02'::timestamptz, 'MEX','RSA'),  -- 1.44
        (2,  '2026-06-12 04:00+02'::timestamptz, 'KOR','CZE'),
        (17, '2026-06-18 18:00+02'::timestamptz, 'CZE','RSA'),
        (18, '2026-06-19 03:00+02'::timestamptz, 'MEX','KOR'),
        (37, '2026-06-25 03:00+02'::timestamptz, 'RSA','KOR'),
        (38, '2026-06-25 03:00+02'::timestamptz, 'CZE','MEX'),
        -- Skupina B
        (3,  '2026-06-12 21:00+02'::timestamptz, 'CAN','BIH'),
        (5,  '2026-06-13 21:00+02'::timestamptz, 'QAT','SUI'),  -- 1.23
        (19, '2026-06-18 21:00+02'::timestamptz, 'SUI','BIH'),
        (20, '2026-06-19 00:00+02'::timestamptz, 'CAN','QAT'),  -- 1.31
        (35, '2026-06-24 21:00+02'::timestamptz, 'SUI','CAN'),
        (36, '2026-06-24 21:00+02'::timestamptz, 'BIH','QAT'),
        -- Skupina C
        (6,  '2026-06-14 00:00+02'::timestamptz, 'BRA','MAR'),
        (7,  '2026-06-14 03:00+02'::timestamptz, 'HAI','SCO'),  -- 1.48
        (23, '2026-06-20 00:00+02'::timestamptz, 'SCO','MAR'),
        (24, '2026-06-20 03:00+02'::timestamptz, 'BRA','HAI'),  -- 1.07
        (39, '2026-06-25 00:00+02'::timestamptz, 'MAR','HAI'),  -- 1.31
        (40, '2026-06-25 00:00+02'::timestamptz, 'SCO','BRA'),  -- 1.45
        -- Skupina D
        (4,  '2026-06-13 03:00+02'::timestamptz, 'USA','PAR'),
        (8,  '2026-06-14 06:00+02'::timestamptz, 'AUS','TUR'),
        (21, '2026-06-19 21:00+02'::timestamptz, 'USA','AUS'),
        (22, '2026-06-20 06:00+02'::timestamptz, 'TUR','PAR'),
        (41, '2026-06-26 04:00+02'::timestamptz, 'TUR','USA'),
        (42, '2026-06-26 04:00+02'::timestamptz, 'PAR','AUS'),
        -- Skupina E
        (9,  '2026-06-14 19:00+02'::timestamptz, 'GER','CUW'),  -- 1.02
        (10, '2026-06-15 01:00+02'::timestamptz, 'CIV','ECU'),
        (25, '2026-06-20 22:00+02'::timestamptz, 'GER','CIV'),
        (26, '2026-06-21 02:00+02'::timestamptz, 'ECU','CUW'),  -- 1.20
        (43, '2026-06-25 22:00+02'::timestamptz, 'CUW','CIV'),  -- 1.22
        (44, '2026-06-25 22:00+02'::timestamptz, 'ECU','GER'),
        -- Skupina F
        (11, '2026-06-14 22:00+02'::timestamptz, 'NED','JPN'),
        (12, '2026-06-15 04:00+02'::timestamptz, 'SWE','TUN'),
        (27, '2026-06-20 19:00+02'::timestamptz, 'NED','SWE'),
        (28, '2026-06-21 06:00+02'::timestamptz, 'TUN','JPN'),
        (45, '2026-06-26 01:00+02'::timestamptz, 'TUN','NED'),
        (46, '2026-06-26 01:00+02'::timestamptz, 'JPN','SWE'),
        -- Skupina G
        (13, '2026-06-15 21:00+02'::timestamptz, 'BEL','EGY'),
        (14, '2026-06-16 03:00+02'::timestamptz, 'IRN','NZL'),
        (29, '2026-06-21 21:00+02'::timestamptz, 'BEL','IRN'),  -- 1.40
        (30, '2026-06-22 03:00+02'::timestamptz, 'NZL','EGY'),
        (47, '2026-06-27 05:00+02'::timestamptz, 'NZL','BEL'),  -- 1.30
        (48, '2026-06-27 05:00+02'::timestamptz, 'EGY','IRN'),
        -- Skupina H
        (15, '2026-06-15 18:00+02'::timestamptz, 'ESP','CPV'),  -- 1.09
        (16, '2026-06-16 00:00+02'::timestamptz, 'KSA','URU'),  -- 1.45
        (31, '2026-06-21 18:00+02'::timestamptz, 'ESP','KSA'),  -- 1.12
        (32, '2026-06-22 00:00+02'::timestamptz, 'URU','CPV'),  -- 1.43
        (49, '2026-06-27 02:00+02'::timestamptz, 'CPV','KSA'),
        (50, '2026-06-27 02:00+02'::timestamptz, 'URU','ESP'),
        -- Skupina I
        (33, '2026-06-16 21:00+02'::timestamptz, 'FRA','SEN'),  -- 1.47
        (34, '2026-06-17 00:00+02'::timestamptz, 'IRQ','NOR'),  -- 1.19
        (51, '2026-06-22 23:00+02'::timestamptz, 'FRA','IRQ'),  -- 1.11
        (52, '2026-06-23 02:00+02'::timestamptz, 'NOR','SEN'),
        (53, '2026-06-26 21:00+02'::timestamptz, 'NOR','FRA'),
        (54, '2026-06-26 21:00+02'::timestamptz, 'SEN','IRQ'),  -- 1.44
        -- Skupina J
        (55, '2026-06-17 03:00+02'::timestamptz, 'ARG','ALG'),  -- 1.40
        (56, '2026-06-17 06:00+02'::timestamptz, 'AUT','JOR'),  -- 1.31
        (57, '2026-06-22 19:00+02'::timestamptz, 'ARG','AUT'),
        (58, '2026-06-23 05:00+02'::timestamptz, 'JOR','ALG'),
        (59, '2026-06-28 04:00+02'::timestamptz, 'ALG','AUT'),
        (60, '2026-06-28 04:00+02'::timestamptz, 'JOR','ARG'),  -- 1.21
        -- Skupina K
        (61, '2026-06-17 19:00+02'::timestamptz, 'POR','COD'),  -- 1.25
        (62, '2026-06-18 04:00+02'::timestamptz, 'UZB','COL'),  -- 1.40
        (63, '2026-06-23 19:00+02'::timestamptz, 'POR','UZB'),  -- 1.25
        (64, '2026-06-24 04:00+02'::timestamptz, 'COL','COD'),  -- 1.47
        (65, '2026-06-28 01:30+02'::timestamptz, 'COL','POR'),
        (66, '2026-06-28 01:30+02'::timestamptz, 'COD','UZB'),
        -- Skupina L
        (67, '2026-06-17 22:00+02'::timestamptz, 'ENG','CRO'),
        (68, '2026-06-18 01:00+02'::timestamptz, 'GHA','PAN'),
        (69, '2026-06-23 22:00+02'::timestamptz, 'ENG','GHA'),  -- 1.3
        (70, '2026-06-24 01:00+02'::timestamptz, 'PAN','CRO'),  -- 1.47
        (71, '2026-06-27 23:00+02'::timestamptz, 'PAN','ENG'),  -- 1.3
        (72, '2026-06-27 23:00+02'::timestamptz, 'CRO','GHA')
    ) AS v(gn, dt, home, away)
)
-- MatchPhase se dohledá podle skupiny domácího týmu (LeagueTeam.group).
-- Díky tomu se v UI zobrazí konkrétní "Group A" .. "Group L" místo
-- generického "Group Stage".
INSERT INTO "Match"(
    "gameNumber", "dateTime", "homeTeamId", "awayTeamId",
    "isPlayoffGame", "isEvaluated", "matchPhaseId",
    "externalId", "createdAt", "updatedAt"
)
SELECT
    NULL,                                   -- gameNumber: jen pro best-of série; pořadí drží externalId (9000000 + gn)
    s.dt,
    ht.league_team_id,
    at.league_team_id,
    FALSE, FALSE,
    (SELECT id FROM "MatchPhase" WHERE name = 'Group ' || lt_home."group" AND "deletedAt" IS NULL ORDER BY id DESC LIMIT 1),
    9000000 + s.gn,
    NOW(), NOW()
FROM source s
JOIN _wc_team_map ht ON ht.shortcut = s.home
JOIN _wc_team_map at ON at.shortcut = s.away
JOIN "LeagueTeam" lt_home ON lt_home.id = ht.league_team_id;

-- ----------------------------------------------------------------------------
-- LeagueMatch — jeden INSERT na zápas, abys mohl ručně přepsat dva flagy:
--   * isDoubled    (4. argument): zápas se počítá za dvojnásobné body.
--   * jokerBlocked (5. argument): nelze na něj použít žolíka.
--
-- Pravidla tipovačky:
--   * "V zápasech skupin, R32 a osmifinále se občas náhodně objeví nějaký
--     vyrovnaný zápas, který bude za dvojnásobné body." Defaultně FALSE,
--     ručně přepiš isDoubled=TRUE u vybraných zápasů (a zároveň zvaž
--     jokerBlocked=TRUE, ať se to nesčítá s žolíkem).
--   * "Žolíky lze použít na zápasy skupin, R32 a osmifinále — kromě zápasů,
--     které už mají dvojnásobné body." Skupiny mají defaultně jokerBlocked=FALSE.
--
-- Match se vyhledává podle externalId = 9 000 000 + gameNumber.
-- ----------------------------------------------------------------------------


-- ─── Skupina A ────────────────────────────────────────────────────────────
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000001 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z1:  Mexiko – JAR (11.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000002 ORDER BY id DESC LIMIT 1), TRUE, TRUE, NOW(), NOW()); -- Z2:  Jižní Korea – Česko (12.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000017 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z17: Česko – JAR (18.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000018 ORDER BY id DESC LIMIT 1), TRUE, TRUE, NOW(), NOW()); -- Z18: Mexiko – Jižní Korea (19.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000037 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z37: JAR – Jižní Korea (25.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000038 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z38: Česko – Mexiko (25.06.)

-- ─── Skupina B ────────────────────────────────────────────────────────────
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000003 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z3:  Kanada – Bosna (12.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000005 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z5:  Katar – Švýcarsko (13.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000019 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z19: Švýcarsko – Bosna (18.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000020 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z20: Kanada – Katar (19.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000035 ORDER BY id DESC LIMIT 1), TRUE, TRUE, NOW(), NOW()); -- Z35: Švýcarsko – Kanada (24.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000036 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z36: Bosna – Katar (24.06.)

-- ─── Skupina C ────────────────────────────────────────────────────────────
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000006 ORDER BY id DESC LIMIT 1), TRUE, TRUE, NOW(), NOW()); -- Z6:  Brazílie – Maroko (14.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000007 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z7:  Haiti – Skotsko (14.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000023 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z23: Skotsko – Maroko (20.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000024 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z24: Brazílie – Haiti (20.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000039 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z39: Maroko – Haiti (25.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000040 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z40: Skotsko – Brazílie (25.06.)

-- ─── Skupina D ────────────────────────────────────────────────────────────
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000004 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z4:  USA – Paraguay (13.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000008 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z8:  Austrálie – Turecko (14.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000021 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z21: USA – Austrálie (19.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000022 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z22: Turecko – Paraguay (20.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000041 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z41: Turecko – USA (26.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000042 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z42: Paraguay – Austrálie (26.06.)

-- ─── Skupina E ────────────────────────────────────────────────────────────
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000009 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z9:  Německo – Curaçao (14.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000010 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z10: Pobřeží slonoviny – Ekvádor (15.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000025 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z25: Německo – Pobřeží slonoviny (20.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000026 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z26: Ekvádor – Curaçao (21.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000043 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z43: Curaçao – Pobřeží slonoviny (25.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000044 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z44: Ekvádor – Německo (25.06.)

-- ─── Skupina F ────────────────────────────────────────────────────────────
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000011 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z11: Nizozemsko – Japonsko (14.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000012 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z12: Švédsko – Tunisko (15.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000027 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z27: Nizozemsko – Švédsko (20.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000028 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z28: Tunisko – Japonsko (21.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000045 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z45: Tunisko – Nizozemsko (26.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000046 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z46: Japonsko – Švédsko (26.06.)

-- ─── Skupina G ────────────────────────────────────────────────────────────
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000013 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z13: Belgie – Egypt (15.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000014 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z14: Írán – Nový Zéland (16.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000029 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z29: Belgie – Írán (21.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000030 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z30: Nový Zéland – Egypt (22.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000047 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z47: Nový Zéland – Belgie (27.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000048 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z48: Egypt – Írán (27.06.)

-- ─── Skupina H ────────────────────────────────────────────────────────────
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000015 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z15: Španělsko – Kapverdy (15.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000016 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z16: Saúdská Arábie – Uruguay (16.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000031 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z31: Španělsko – Saúdská Arábie (21.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000032 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z32: Uruguay – Kapverdy (22.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000049 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z49: Kapverdy – Saúdská Arábie (27.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000050 ORDER BY id DESC LIMIT 1), TRUE, TRUE, NOW(), NOW()); -- Z50: Uruguay – Španělsko (27.06.)

-- ─── Skupina I ────────────────────────────────────────────────────────────
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000033 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z33: Francie – Senegal (16.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000034 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z34: Irák – Norsko (17.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000051 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z51: Francie – Irák (22.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000052 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z52: Norsko – Senegal (23.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000053 ORDER BY id DESC LIMIT 1), TRUE, TRUE, NOW(), NOW()); -- Z53: Norsko – Francie (26.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000054 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z54: Senegal – Irák (26.06.)

-- ─── Skupina J ────────────────────────────────────────────────────────────
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000055 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z55: Argentina – Alžírsko (17.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000056 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z56: Rakousko – Jordánsko (17.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000057 ORDER BY id DESC LIMIT 1), TRUE, TRUE, NOW(), NOW()); -- Z57: Argentina – Rakousko (22.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000058 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z58: Jordánsko – Alžírsko (23.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000059 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z59: Alžírsko – Rakousko (28.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000060 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z60: Jordánsko – Argentina (28.06.)

-- ─── Skupina K ────────────────────────────────────────────────────────────
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000061 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z61: Portugalsko – DR Kongo (17.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000062 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z62: Uzbekistán – Kolumbie (18.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000063 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z63: Portugalsko – Uzbekistán (23.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000064 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z64: Kolumbie – DR Kongo (24.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000065 ORDER BY id DESC LIMIT 1), TRUE, TRUE, NOW(), NOW()); -- Z65: Kolumbie – Portugalsko (28.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000066 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z66: DR Kongo – Uzbekistán (28.06.)

-- ─── Skupina L ────────────────────────────────────────────────────────────
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000067 ORDER BY id DESC LIMIT 1), TRUE, TRUE, NOW(), NOW()); -- Z67: Anglie – Chorvatsko (17.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000068 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z68: Ghana – Panama (18.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000069 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z69: Anglie – Ghana (23.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000070 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z70: Panama – Chorvatsko (24.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000071 ORDER BY id DESC LIMIT 1), FALSE, TRUE, NOW(), NOW()); -- Z71: Panama – Anglie (27.06.)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000072 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z72: Chorvatsko – Ghana (27.06.)

-- ============================================================================
-- 7) PLAY-OFF ZÁPASY (32 — s placeholdery)
-- ============================================================================
-- Týmy ještě nejsou určené, používáme homePlaceholder/awayPlaceholder.
-- isPlayoffGame=TRUE → uživatel může tipovat i postupujícího (homeAdvanced).
WITH source AS (
    SELECT * FROM (VALUES
        -- gameNumber, dateTime, home_placeholder, away_placeholder, phase_name
        -- 1. kolo play-off (Round of 32) — Z73–Z88
        (73, '2026-06-28 21:00+02'::timestamptz, '2. tým sk. A',           '2. tým sk. B',              'Round of 32'),
        (76, '2026-06-29 19:00+02'::timestamptz, 'Vítěz sk. C',            '2. tým sk. F',              'Round of 32'),
        (74, '2026-06-29 22:30+02'::timestamptz, 'Vítěz sk. E',            '3. tým (A/B/C/D/F)',        'Round of 32'),
        (75, '2026-06-30 03:00+02'::timestamptz, 'Vítěz sk. F',            '2. tým sk. C',              'Round of 32'),
        (78, '2026-06-30 19:00+02'::timestamptz, '2. tým sk. E',           '2. tým sk. I',              'Round of 32'),
        (77, '2026-06-30 23:00+02'::timestamptz, 'Vítěz sk. I',            '3. tým (C/D/F/G/H)',        'Round of 32'),
        (81, '2026-07-01 02:00+02'::timestamptz, 'Vítěz sk. D',            '3. tým (B/E/F/I/J)',        'Round of 32'),
        (79, '2026-07-01 03:00+02'::timestamptz, 'Vítěz sk. A',            '3. tým (C/E/F/H/I)',        'Round of 32'),
        (80, '2026-07-01 18:00+02'::timestamptz, 'Vítěz sk. L',            '3. tým (E/H/I/J/K)',        'Round of 32'),
        (82, '2026-07-01 22:00+02'::timestamptz, 'Vítěz sk. G',            '3. tým (A/E/H/I/J)',        'Round of 32'),
        (84, '2026-07-02 21:00+02'::timestamptz, 'Vítěz sk. H',            '2. tým sk. J',              'Round of 32'),
        (83, '2026-07-03 01:00+02'::timestamptz, '2. tým sk. K',           '2. tým sk. L',              'Round of 32'),
        (85, '2026-07-03 05:00+02'::timestamptz, 'Vítěz sk. B',            '3. tým (E/F/G/I/J)',        'Round of 32'),
        (88, '2026-07-03 20:00+02'::timestamptz, '2. tým sk. D',           '2. tým sk. G',              'Round of 32'),
        (86, '2026-07-03 23:00+02'::timestamptz, 'Vítěz sk. J',            '2. tým sk. H',              'Round of 32'),
        (87, '2026-07-04 02:30+02'::timestamptz, 'Vítěz sk. K',            '3. tým (D/E/I/J/L)',        'Round of 32'),
        -- Osmifinále (Round of 16) — Z89–Z96
        (89, '2026-07-04 18:00+02'::timestamptz, 'Vítěz Z73',              'Vítěz Z75',                 'Round of 16'),
        (90, '2026-07-04 22:00+02'::timestamptz, 'Vítěz Z74',              'Vítěz Z77',                 'Round of 16'),
        (91, '2026-07-05 18:00+02'::timestamptz, 'Vítěz Z76',              'Vítěz Z78',                 'Round of 16'),
        (92, '2026-07-05 22:00+02'::timestamptz, 'Vítěz Z79',              'Vítěz Z80',                 'Round of 16'),
        (93, '2026-07-06 18:00+02'::timestamptz, 'Vítěz Z83',              'Vítěz Z84',                 'Round of 16'),
        (94, '2026-07-06 22:00+02'::timestamptz, 'Vítěz Z81',              'Vítěz Z82',                 'Round of 16'),
        (95, '2026-07-07 18:00+02'::timestamptz, 'Vítěz Z85',              'Vítěz Z87',                 'Round of 16'),
        (96, '2026-07-07 22:00+02'::timestamptz, 'Vítěz Z86',              'Vítěz Z88',                 'Round of 16'),
        -- Čtvrtfinále — Z97–Z100 (od QF jsou body 2×)
        (97,  '2026-07-09 21:00+02'::timestamptz, 'Vítěz Z89',             'Vítěz Z90',                 'Quarter-finals'),
        (98,  '2026-07-10 21:00+02'::timestamptz, 'Vítěz Z93',             'Vítěz Z94',                 'Quarter-finals'),
        (99,  '2026-07-11 18:00+02'::timestamptz, 'Vítěz Z91',             'Vítěz Z92',                 'Quarter-finals'),
        (100, '2026-07-11 22:00+02'::timestamptz, 'Vítěz Z95',             'Vítěz Z96',                 'Quarter-finals'),
        -- Semifinále — Z101–Z102
        (101, '2026-07-14 21:00+02'::timestamptz, 'Vítěz Z97',             'Vítěz Z98',                 'Semi-finals'),
        (102, '2026-07-15 21:00+02'::timestamptz, 'Vítěz Z99',             'Vítěz Z100',                'Semi-finals'),
        -- Zápas o 3. místo — Z103
        (103, '2026-07-18 23:00+02'::timestamptz, 'Poražený Z101',         'Poražený Z102',             'Third place'),
        -- Finále — Z104
        (104, '2026-07-19 21:00+02'::timestamptz, 'Vítěz Z101',            'Vítěz Z102',                'Final')
    ) AS v(gn, dt, home_ph, away_ph, phase)
)
INSERT INTO "Match"(
    "gameNumber", "dateTime",
    "homeTeamId", "awayTeamId",
    "homePlaceholder", "awayPlaceholder",
    "isPlayoffGame", "isEvaluated",
    "matchPhaseId", "externalId",
    "createdAt", "updatedAt"
)
SELECT
    NULL,                                    -- gameNumber: jen pro best-of série; pořadí drží externalId (9000000 + gn)
    s.dt,
    NULL, NULL,                              -- týmy se přiřadí po odehrání předchozí fáze
    s.home_ph, s.away_ph,
    TRUE,                                    -- isPlayoffGame
    FALSE,
    (SELECT id FROM "MatchPhase" WHERE name = s.phase AND "deletedAt" IS NULL ORDER BY id LIMIT 1),
    9000000 + s.gn,
    NOW(), NOW()
FROM source s;

-- ----------------------------------------------------------------------------
-- LeagueMatch — jeden INSERT na zápas, abys mohl ručně přepsat dva flagy:
--   * isDoubled    (4. argument): zápas se počítá za dvojnásobné body.
--   * jokerBlocked (5. argument): nelze na něj použít žolíka.
--
-- Defaultní hodnoty dle pravidel tipovačky:
--   * R32 + Osmifinále (Z73–Z96): isDoubled=FALSE, jokerBlocked=FALSE.
--     Občas náhodně přepiš isDoubled=TRUE pro "vyrovnaný zápas za 2× body".
--   * Čtvrtfinále + Semifinále + 3. místo + Finále (Z97+):
--     isDoubled=TRUE, jokerBlocked=TRUE (žolíky nelze na 2× zápasy).
--
-- Match se vyhledává podle externalId = 9 000 000 + gameNumber, který jsme
-- nastavili v předchozím INSERTu.
-- ----------------------------------------------------------------------------

-- ─── 1. kolo play-off (Round of 32) — Z73–Z88 ─────────────────────────────
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000073 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z73: 2. tým sk. A vs 2. tým sk. B
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000074 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z74: Vítěz sk. E vs 3. tým (A/B/C/D/F)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000075 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z75: Vítěz sk. F vs 2. tým sk. C
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000076 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z76: Vítěz sk. C vs 2. tým sk. F
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000077 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z77: Vítěz sk. I vs 3. tým (C/D/F/G/H)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000078 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z78: 2. tým sk. E vs 2. tým sk. I
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000079 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z79: Vítěz sk. A vs 3. tým (C/E/F/H/I)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000080 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z80: Vítěz sk. L vs 3. tým (E/H/I/J/K)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000081 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z81: Vítěz sk. D vs 3. tým (B/E/F/I/J)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000082 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z82: Vítěz sk. G vs 3. tým (A/E/H/I/J)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000083 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z83: 2. tým sk. K vs 2. tým sk. L
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000084 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z84: Vítěz sk. H vs 2. tým sk. J
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000085 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z85: Vítěz sk. B vs 3. tým (E/F/G/I/J)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000086 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z86: Vítěz sk. J vs 2. tým sk. H
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000087 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z87: Vítěz sk. K vs 3. tým (D/E/I/J/L)
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000088 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z88: 2. tým sk. D vs 2. tým sk. G

-- ─── Osmifinále (Round of 16) — Z89–Z96 ──────────────────────────────────
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000089 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z89: Vítěz Z73 vs Vítěz Z75
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000090 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z90: Vítěz Z74 vs Vítěz Z77
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000091 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z91: Vítěz Z76 vs Vítěz Z78
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000092 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z92: Vítěz Z79 vs Vítěz Z80
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000093 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z93: Vítěz Z83 vs Vítěz Z84
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000094 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z94: Vítěz Z81 vs Vítěz Z82
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000095 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z95: Vítěz Z85 vs Vítěz Z87
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000096 ORDER BY id DESC LIMIT 1), FALSE, FALSE, NOW(), NOW()); -- Z96: Vítěz Z86 vs Vítěz Z88

-- ─── Čtvrtfinále — Z97–Z100 (od QF dvojnásobné body) ─────────────────────
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000097 ORDER BY id DESC LIMIT 1), TRUE,  TRUE,  NOW(), NOW()); -- Z97: Vítěz Z89 vs Vítěz Z90
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000098 ORDER BY id DESC LIMIT 1), TRUE,  TRUE,  NOW(), NOW()); -- Z98: Vítěz Z93 vs Vítěz Z94
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000099 ORDER BY id DESC LIMIT 1), TRUE,  TRUE,  NOW(), NOW()); -- Z99: Vítěz Z91 vs Vítěz Z92
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000100 ORDER BY id DESC LIMIT 1), TRUE,  TRUE,  NOW(), NOW()); -- Z100: Vítěz Z95 vs Vítěz Z96

-- ─── Semifinále — Z101, Z102 ──────────────────────────────────────────────
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000101 ORDER BY id DESC LIMIT 1), TRUE,  TRUE,  NOW(), NOW()); -- Z101: Vítěz Z97 vs Vítěz Z98
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000102 ORDER BY id DESC LIMIT 1), TRUE,  TRUE,  NOW(), NOW()); -- Z102: Vítěz Z99 vs Vítěz Z100

-- ─── Zápas o 3. místo — Z103 ─────────────────────────────────────────────
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000103 ORDER BY id DESC LIMIT 1), TRUE,  TRUE,  NOW(), NOW()); -- Z103: Poražený Z101 vs Poražený Z102

-- ─── Finále — Z104 ───────────────────────────────────────────────────────
INSERT INTO "LeagueMatch"("leagueId", "matchId", "isDoubled", "jokerBlocked", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key='league_id'), (SELECT id FROM "Match" WHERE "externalId"=9000104 ORDER BY id DESC LIMIT 1), TRUE,  TRUE,  NOW(), NOW()); -- Z104: Vítěz Z101 vs Vítěz Z102

-- ============================================================================
-- 8) SPECIAL BETS — SKUPINOVÁ UMÍSTĚNÍ (48 = 12 × 4 pozice)
-- ============================================================================
-- Pro každou skupinu vytvoříme 4 tipy (1.–4. místo). Evaluator group_stage_team
-- vrací winnerPoints, pokud uživatel trefí přesné umístění; advancePoints,
-- pokud trefený tým postoupí (ze skupiny do osmifinále), jen jiné místo.
--
-- "specialBetTeamResultId" zatím prázdné — admin doplní po skupinové fázi
-- (tým, který skutečně skončil na dané pozici).
--
-- "LeagueSpecialBetSingleTeamAdvanced" se naplní po skupinové fázi seznamem
-- týmů, které ze skupiny postoupí (1. + 2. + případně 3. místo).
--
-- Deadline pro všechny skupinové tipy: 11. 6. 2026 21:00 SELČ (před prvním
-- zápasem MS).
INSERT INTO "LeagueSpecialBetSingle"(
    "leagueId", "name", "points",
    "evaluatorId", "dateTime", "group",
    "isEvaluated", "createdAt", "updatedAt"
)
SELECT
    (SELECT val FROM _wc_var WHERE key = 'league_id'),
    pos.label || ' — skupina ' || g.letter,
    pos.pts,
    (SELECT val FROM _wc_var WHERE key = pos.eval_key),
    -- Deadline = první zápas dané skupiny (ne start turnaje). Match.homeTeamId
    -- ukazuje na LeagueTeam, takže skupinu zápasu zjistíme z domácího týmu.
    (SELECT MIN(m."dateTime")
       FROM "Match" m
       JOIN "LeagueTeam" lt ON lt.id = m."homeTeamId"
      WHERE lt."leagueId" = (SELECT val FROM _wc_var WHERE key = 'league_id')
        AND lt."group" = g.letter
        AND m."isPlayoffGame" = FALSE
        AND m."deletedAt" IS NULL),
    -- "group" musí být jen písmeno, jinak filtr v UI nematchne LeagueTeam.group
    g.letter,
    FALSE,
    NOW(), NOW()
FROM (VALUES
    ('1. místo',  'ev_group_winner', 10),
    ('2. místo',  'ev_group_second',  7),
    ('3. místo',  'ev_group_third',   7),
    ('4. místo',  'ev_group_fourth',  7)
) AS pos(label, eval_key, pts)
CROSS JOIN (VALUES
    ('A'),('B'),('C'),('D'),('E'),('F'),
    ('G'),('H'),('I'),('J'),('K'),('L')
) AS g(letter)
ORDER BY g.letter, pos.label;

-- ============================================================================
-- 9) SPECIAL BETS — KONEČNÉ POŘADÍ MS (4)
-- ============================================================================
INSERT INTO "LeagueSpecialBetSingle"(
    "leagueId", "name", "points",
    "evaluatorId", "dateTime", "group",
    "isEvaluated", "createdAt", "updatedAt"
)
SELECT
    (SELECT val FROM _wc_var WHERE key = 'league_id'),
    sb.name, sb.pts,
    (SELECT val FROM _wc_var WHERE key = sb.eval_key),
    '2026-06-11 21:00+02'::timestamptz,
    -- group = NULL → v UI se ukáží všechny týmy (žádný team-group filter)
    NULL,
    FALSE, NOW(), NOW()
FROM (VALUES
    ('Vítěz MS',   'ev_winner_ms', 40),
    ('2. místo MS','ev_second_ms', 30),
    ('3. místo MS','ev_third_ms',  20),
    ('4. místo MS','ev_fourth_ms', 15)
) AS sb(name, eval_key, pts);

-- ============================================================================
-- 10) SPECIAL BETS — HRÁČSKÉ CENY (5 × 25 b) + FAIR-PLAY TÝM (20 b)
-- ============================================================================
INSERT INTO "LeagueSpecialBetSingle"(
    "leagueId", "name", "points",
    "evaluatorId", "dateTime", "group",
    "isEvaluated", "createdAt", "updatedAt"
)
SELECT
    (SELECT val FROM _wc_var WHERE key = 'league_id'),
    sb.name, sb.pts,
    (SELECT val FROM _wc_var WHERE key = sb.eval_key),
    '2026-06-11 21:00+02'::timestamptz,
    -- group = NULL → fair-play vybírá ze všech 48 týmů, hráčské ceny
    -- ze všech hráčů (player filter nepoužívá "group")
    NULL,
    FALSE, NOW(), NOW()
FROM (VALUES
    ('Nejlepší hráč turnaje',           'ev_player_award', 25),
    ('Nejlepší mladý hráč (do 22 let)', 'ev_player_award', 25),
    ('Nejlepší brankář turnaje',        'ev_player_award', 25),
    ('Nejlepší střelec turnaje',        'ev_player_award', 25),
    ('Nejvíc asistencí turnaje',        'ev_player_award', 25),
    ('Fair-play tým',                   'ev_fairplay',     20)
) AS sb(name, eval_key, pts);

-- ============================================================================
-- 11) SPECIAL BETS — HODNOTOVÉ TIPY (2)
-- ============================================================================
INSERT INTO "LeagueSpecialBetSingle"(
    "leagueId", "name", "points",
    "evaluatorId", "dateTime", "group",
    "isEvaluated", "createdAt", "updatedAt"
)
SELECT
    (SELECT val FROM _wc_var WHERE key = 'league_id'),
    sb.name, sb.pts,
    (SELECT val FROM _wc_var WHERE key = sb.eval_key),
    '2026-06-11 21:00+02'::timestamptz,
    NULL,
    FALSE, NOW(), NOW()
FROM (VALUES
    ('Počet branek nejlepšího střelce',  'ev_top_scorer_goals', 15),
    ('Celkový počet branek turnaje',     'ev_total_goals',      35)
) AS sb(name, eval_key, pts);

-- Show the live tournament goal tally next to the total-goals bet.
UPDATE "LeagueSpecialBetSingle"
SET "showGoalProgress" = TRUE,
    "updatedAt" = NOW()
WHERE "leagueId" = (SELECT val FROM _wc_var WHERE key = 'league_id')
  AND name = 'Celkový počet branek turnaje';

-- ============================================================================
-- 12) DENNÍ ANO/NE OTÁZKY (placeholdery)
-- ============================================================================
-- Jedna otázka na každý kalendářní den se zápasem (SELČ). Každá je vlastní
-- INSERT, aby šly snadno najít a upravit ručně — stačí přepsat text mezi
-- apostrofy. Deadline = čas prvního zápasu dne. Skóre: ANO = +6 b,
-- NE = -3 b (= -pts/2), netipováno = 0 b.

-- 11. 6. 2026 — Z1 (Mexiko–JAR)
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Minimálně 3 týmy vstřelí gól?', '2026-06-11 21:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 12. 6. 2026 — Z2 (KOR–CZE), Z3 (CAN–BIH)
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Počet střel na branku USA-Par > Can-Bos?', '2026-06-12 21:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 13. 6. 2026 — Z4 (USA–PAR), Z5 (QAT–SUI)
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Výhra Swi, Bra, Sco + Neprohra Tur?', '2026-06-13 21:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 14. 6. 2026 — Z6–Z11
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Počet žlutých karet sk.F > sk.E?', '2026-06-14 19:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 15. 6. 2026 — Z10, Z12, Z13, Z15
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Bude červená karta nebo vlastní gól?', '2026-06-15 18:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 16. 6. 2026 — Z14, Z16, Z33
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 16.06.2026 — bude doplněna', '2026-06-16 21:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 17. 6. 2026 — Z34, Z55, Z56, Z61, Z67
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 17.06.2026 — bude doplněna', '2026-06-17 19:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 18. 6. 2026 — Z62, Z68, Z17, Z19
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 18.06.2026 — bude doplněna', '2026-06-18 18:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 19. 6. 2026 — Z18, Z20, Z21
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 19.06.2026 — bude doplněna', '2026-06-19 21:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 20. 6. 2026 — Z22, Z23, Z24, Z25, Z27
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 20.06.2026 — bude doplněna', '2026-06-20 19:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 21. 6. 2026 — Z26, Z28, Z29, Z31
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 21.06.2026 — bude doplněna', '2026-06-21 18:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 22. 6. 2026 — Z30, Z32, Z51, Z57
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 22.06.2026 — bude doplněna', '2026-06-22 19:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 23. 6. 2026 — Z52, Z58, Z63, Z69
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 23.06.2026 — bude doplněna', '2026-06-23 19:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 24. 6. 2026 — Z64, Z70, Z35, Z36
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 24.06.2026 — bude doplněna', '2026-06-24 21:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 25. 6. 2026 — Z37, Z38, Z39, Z40, Z43, Z44
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 25.06.2026 — bude doplněna', '2026-06-25 22:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 26. 6. 2026 — Z41, Z42, Z45, Z46, Z53, Z54
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 26.06.2026 — bude doplněna', '2026-06-26 21:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 27. 6. 2026 — Z47, Z48, Z49, Z50, Z71, Z72
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 27.06.2026 — bude doplněna', '2026-06-27 23:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 28. 6. 2026 — Z59, Z60, Z65, Z66, Z73 (start play-off)
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 28.06.2026 — bude doplněna', '2026-06-28 21:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 29. 6. 2026 — Z76, Z74 (R32)
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 29.06.2026 — bude doplněna', '2026-06-29 19:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 30. 6. 2026 — Z75, Z78, Z77 (R32)
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 30.06.2026 — bude doplněna', '2026-06-30 19:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 1. 7. 2026 — Z81, Z79, Z80, Z82 (R32)
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 01.07.2026 — bude doplněna', '2026-07-01 18:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 2. 7. 2026 — Z84 (R32)
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 02.07.2026 — bude doplněna', '2026-07-02 21:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 3. 7. 2026 — Z83, Z85, Z88, Z86 (R32)
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 03.07.2026 — bude doplněna', '2026-07-03 20:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 4. 7. 2026 — Z87 (R32), Z89, Z90 (R16)
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 04.07.2026 — bude doplněna', '2026-07-04 18:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 5. 7. 2026 — Z91, Z92 (R16)
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 05.07.2026 — bude doplněna', '2026-07-05 18:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 6. 7. 2026 — Z93, Z94 (R16)
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 06.07.2026 — bude doplněna', '2026-07-06 18:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 7. 7. 2026 — Z95, Z96 (R16)
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 07.07.2026 — bude doplněna', '2026-07-07 18:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 9. 7. 2026 — Z97 (čtvrtfinále)
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 09.07.2026 — bude doplněna', '2026-07-09 21:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 10. 7. 2026 — Z98 (čtvrtfinále)
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 10.07.2026 — bude doplněna', '2026-07-10 21:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 11. 7. 2026 — Z99, Z100 (čtvrtfinále)
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 11.07.2026 — bude doplněna', '2026-07-11 18:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 14. 7. 2026 — Z101 (semifinále)
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 14.07.2026 — bude doplněna', '2026-07-14 21:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 15. 7. 2026 — Z102 (semifinále)
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 15.07.2026 — bude doplněna', '2026-07-15 21:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 18. 7. 2026 — Z103 (zápas o 3. místo)
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 18.07.2026 — bude doplněna', '2026-07-18 23:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- 19. 7. 2026 — Z104 (finále)
INSERT INTO "LeagueSpecialBetQuestion"("leagueId", "text", "dateTime", "isEvaluated", "isDoubled", "createdAt", "updatedAt")
VALUES ((SELECT val FROM _wc_var WHERE key = 'league_id'), 'Denní otázka pro 19.07.2026 — bude doplněna', '2026-07-19 21:00+02'::timestamptz, FALSE, FALSE, NOW(), NOW());

-- ============================================================================
-- 13) ZÁVĚREČNÝ SOUHRN
-- ============================================================================
DO $summary$
DECLARE
    v_league_id INT;
    v_team_count INT;
    v_player_count INT;
    v_match_count INT;
    v_eval_count INT;
    v_sb_count INT;
    v_q_count INT;
BEGIN
    SELECT val INTO v_league_id FROM _wc_var WHERE key = 'league_id';

    SELECT COUNT(*) INTO v_team_count   FROM "LeagueTeam"             WHERE "leagueId" = v_league_id AND "deletedAt" IS NULL;
    SELECT COUNT(*) INTO v_player_count FROM "LeaguePlayer" lp
        JOIN "LeagueTeam" lt ON lt.id = lp."leagueTeamId"
        WHERE lt."leagueId" = v_league_id AND lp."deletedAt" IS NULL;
    SELECT COUNT(*) INTO v_match_count  FROM "LeagueMatch"            WHERE "leagueId" = v_league_id AND "deletedAt" IS NULL;
    SELECT COUNT(*) INTO v_eval_count   FROM "Evaluator"              WHERE "leagueId" = v_league_id AND "deletedAt" IS NULL;
    SELECT COUNT(*) INTO v_sb_count     FROM "LeagueSpecialBetSingle" WHERE "leagueId" = v_league_id AND "deletedAt" IS NULL;
    SELECT COUNT(*) INTO v_q_count      FROM "LeagueSpecialBetQuestion" WHERE "leagueId" = v_league_id AND "deletedAt" IS NULL;

    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE 'MS ve fotbale 2026 — SEED dokončen';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE 'League ID:        %', v_league_id;
    RAISE NOTICE 'Týmů:             %', v_team_count;
    RAISE NOTICE 'Hráčů:            %', v_player_count;
    RAISE NOTICE 'Zápasů:           %', v_match_count;
    RAISE NOTICE 'Evaluátorů:       %', v_eval_count;
    RAISE NOTICE 'Speciálních tipů: %', v_sb_count;
    RAISE NOTICE 'Denních otázek:   %', v_q_count;
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE 'Liga přístupná na /admin/%/matches', v_league_id;
END $summary$;

-- ============================================================================
-- 14) ÚKLID PRACOVNÍCH TABULEK
-- ============================================================================
DROP TABLE IF EXISTS _wc_var;
DROP TABLE IF EXISTS _wc_team_map;
DROP TABLE IF EXISTS _wc_player_data;

COMMIT;
