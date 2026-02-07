# CLAUDE.md - Project Memory

## Project Overview
**TipApp** is a Next.js 16 mobile-first sports betting app for friends to compete in football and hockey predictions.
- **Target:** Friends/Family (dozens of users), mobile-first.
- **Features:** Match score predictions, goal scorers, series bets, special bets, questions.
- **Admin:** Manual league, team, match, and result management.

## Tech Stack
Next.js 16 (App Router) • Auth.js v5 (CredentialsProvider + JWT) • PostgreSQL (Supabase) • Prisma ORM • Zod • Vitest + Testing Library • Tailwind CSS v4 • Lucide Icons • next-intl v4 (i18n)

## Internationalization (i18n)
**Supported Languages:** English (en), Czech (cs)
**Library:** next-intl v4.x for Next.js 16 App Router
**Locale Storage:** Cookie-based (`NEXT_LOCALE`, 1-year expiry) - no URL routing changes
**Translation Files:** `/messages/en.json`, `/messages/cs.json`

### Key Features
- **Language Switcher:** Available in user menu dropdown (top-right header) and admin topbar
- **Locale Detection:** Cookie → Accept-Language header → Default 'en'
- **Cookie Management:** Integrated into `proxy.ts` (Next.js 16 requires proxy.ts, not middleware.ts)
- **Server Components:** Use `await getTranslations('namespace')`
- **Client Components:** Use `useTranslations('namespace')` hook
- **Date/Time Formatting:** Uses Intl API via next-intl (automatic locale-aware formatting)

### Translation Structure
Nested JSON organized by namespaces:
```json
{
  "common": { "save": "Save", "cancel": "Cancel" },
  "auth": {
    "login": { "title": "Sign in", "username": "Username" }
  },
  "user": {
    "matches": { "title": "Matches" },
    "leaderboard": { "title": "Leaderboard" }
  },
  "admin": {
    "common": { "profile": "Profile", "signOut": "Sign out" }
  }
}
```

### Implementation Status
✅ **Infrastructure:** next-intl installed, proxy.ts integration, locale resolution
✅ **Language Switcher:** User header + admin topbar with language selection dialog
✅ **Authentication Pages:** Login, register, password reset, profile (100% translated)
✅ **User Interface:** Matches, leaderboard, series, special bets, questions, chat (100% translated)
✅ **Admin Interface:** Topbar, common UI elements (core components translated)
⚠️ **Admin Pages:** Foundation established, individual admin pages can be translated as needed
⚠️ **Validation Messages:** Translation keys available, Zod schemas can be extended

### Adding New Translations
1. Add English key to `/messages/en.json` in appropriate namespace
2. Add Czech translation to `/messages/cs.json` (same path)
3. Use in component:
   - Server Component: `const t = await getTranslations('namespace')` then `{t('key')}`
   - Client Component: `const t = useTranslations('namespace')` then `{t('key')}`
4. For interpolation: `{t('message', { name: userName })}`

### Translation Guidelines
- **DO translate:** UI labels, messages, error text, placeholders
- **DON'T translate:** Database values (SPORT_IDS, evaluator keys), proper nouns (team/player names), user-generated content

## Commands
- `npm run dev` - Start dev server
- `npm run build` - Build production
- `npm test` - Run tests once and exit (fast feedback)
- `npm run test:watch` - Run tests in watch mode (for development)
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate coverage report
- `npx prisma db pull` - Sync schema from database
- `npx prisma generate` - Update Prisma Client after schema changes
- `npx prisma studio` - Open DB GUI
- `psql $DATABASE_URL -f <migration_file>.sql` - Run SQL migration (or use Supabase SQL Editor)

## Standards
- Clean, modular, self-documenting code. Strict TypeScript (no `any`).
- Default to Server Components. Client only for interactivity.
- Every feature must have tests (`.test.ts` / `.test.tsx`).
- **Testing policy:** Only run `npm test` for significant changes (new features, business logic, evaluators, schema changes, security fixes, core bugs). Skip for minor UI tweaks, documentation, config updates, or small refactoring.
- Before finishing significant changes: Run `npm run build` + `npm test`, verify in browser.

## Database Rules (CRITICAL)
- Tables use PascalCase (`User`, `Match`, `UserBet`), mapped to `prisma.user`, `prisma.match`.
- **DO NOT** rename fields to camelCase. Use introspected schema exactly as-is.
- **Evaluator.points:** Uses `Int` type (not String) - stored as integers for performance and type safety.
- **Evaluator.config:** Optional `Json` field storing `ScorerRankedConfig` for rank-based scorer evaluation. When config exists, points field is set to 0.
- **LeaguePrize.type:** Enum field ('prize' or 'fine') to distinguish between rewards for top performers and penalties for worst performers. Prizes rank from top (1 = 1st place), fines rank from bottom (1 = last place).
- **Unique constraints:** All bet tables have unique constraints on `[foreignKey, leagueUserId, deletedAt]` to prevent duplicates. LeaguePrize has unique constraint on `[leagueId, rank, type, deletedAt]`.
- **Performance indexes:** Critical query paths have composite indexes for fast lookups.

## Business Logic
- `/admin/**` requires `isSuperadmin: true` in JWT.
- Users can bet only if `currentTime < match.dateTime`.
- League context: Admins select league via topbar dropdown (localStorage + URL sync).
- Routes: Global (`/admin/teams`) vs. League-scoped (`/admin/[leagueId]/teams`).
- `/admin` redirects to most active league's matches page.
- If `LeagueMatch.isDoubled = true`, points × 2.
- Points calculated via league's `Evaluator` table.

## Project Structure
```
app/
├── [leagueId]/         # User pages (matches, series, special-bets, leaderboard, chat)
└── admin/
    ├── [leagueId]/     # League-scoped (matches, series, special-bets, questions, teams, players, users, evaluators)
    └── */              # Global (leagues, teams, players, users, series-types, special-bet-types)
src/
├── actions/            # Server actions (admin + user)
│   ├── evaluators.ts   # updateEvaluator() supports config for scorer rank-based points
│   ├── league-prizes.ts # getLeaguePrizes(), updateLeaguePrizes() - handles prizes & fines
│   └── user/
│       └── leaderboard.ts # getLeaderboard() returns entries, prizes, fines
├── components/         # UI (user + admin)
│   ├── admin/
│   │   └── leagues/
│   │       ├── league-prizes-section.tsx  # Prize management UI
│   │       ├── league-fines-section.tsx   # Fine management UI (Jan 2026)
│   │       └── fine-tier-row.tsx          # Individual fine tier component (Jan 2026)
│   └── user/
│       └── leaderboard/
│           └── leaderboard-table.tsx      # Displays prizes & fines
├── contexts/           # League context (admin + user)
├── hooks/              # useRefresh, useInlineEdit, useDeleteDialog, useCreateDialog, useExpandableRow
├── lib/
│   ├── evaluators/     # 14 bet evaluators
│   ├── constants.ts    # SPORT_IDS.HOCKEY, SPORT_IDS.FOOTBALL
│   ├── auth-utils.ts   # requireAdmin()
│   ├── user-auth-utils.ts # requireLeagueMember()
│   ├── league-utils.ts # validateLeagueAccess()
│   ├── error-handler.ts # AppError, handleActionError()
│   ├── server-action-utils.ts # executeServerAction()
│   ├── prisma-utils.ts # nullableUniqueConstraint() for type-safe Prisma
│   └── validation/     # Zod schemas (admin.ts, user.ts)
│       └── admin.ts    # PrizeTier schema with type field, updateLeaguePrizesSchema
└── types/              # Session + user types
prisma/
└── schema.prisma       # LeaguePrize.type field distinguishes prizes from fines
migration_add_fines_v2.sql  # Migration to add type column (required before using fines)
FINES_FEATURE.md        # Comprehensive fines feature documentation
```

## Auth
- bcryptjs (salt: 12)
- Session: `user.id`, `user.username`, `user.isSuperadmin`
- Login: username OR email (case-insensitive for emails)
- Email normalization: All emails stored in lowercase for consistent authentication

## Evaluators (src/lib/evaluators/)
14 modular evaluators with full test coverage:
1. **exact-score** - Exact match (regulation time score + overtime prediction must match)
2. **score-difference** - Goal diff (excl. exact)
3. **one-team-score** - One team's score correct (excl. exact & score diff)
4. **winner** - Winner (final time, incl. OT/SO)
5. **scorer** - Predicted scorer in actual scorers
   - **Supports two modes:**
     - Simple mode: Boolean (correct/incorrect)
     - Rank-based mode: Variable points based on player ranking (stored in `Evaluator.config`)
   - **ScorerRankedConfig structure:**
     ```json
     {
       "rankedPoints": { "1": 2, "2": 4, "3": 5 },
       "unrankedPoints": 8
     }
     ```
   - Points awarded based on scorer's ranking at match time. Flexible rank count per league.
6. **draw** - Draw prediction (soccer, excl. exact)
7. **soccer-playoff-advance** - Advancing team
8. **series-exact** - Exact series result
9. **series-winner** - Series winner (excl. exact)
10. **exact-player** - Player match (e.g., top scorer)
11. **exact-team** - Team match (e.g., tournament winner)
12. **exact-value** - Numeric value exact
13. **closest-value** - Tiered scoring: exact = full points (1.0x), closest = 1/3 points (0.33x), not closest = 0 points
14. **question** - Yes/no question (correct = +pts, wrong = -pts/2)

## Development Status
- ✅ **Phase 1:** Infrastructure (Next.js, Prisma, Auth.js v5)
- ✅ **Phase 2:** Admin Management (CRUD, inline editing, code quality, security audit)
- ✅ **Phase 3:** Admin User Betting (expandable rows, league-scoped architecture, questions)
- ✅ **Phase 4:** Evaluation Engine (14 evaluators, 79 tests)
- ✅ **Phase 5:** User-Side App (mobile-first, PWA, bottom nav, friend predictions, pull-to-refresh)
- ✅ **Phase 6:** Polish (configurable prizes & fines, race condition fixes, performance optimization, security hardening)
- 🔄 **Phase 7:** Production (push notifications, monitoring, final deployment)

### Recent Updates (Jan-Feb 2026)
- **Performance Caching (Feb 7, 2026):** Comprehensive server-side caching with `unstable_cache`
  - Bet lists (matches, series, special bets, questions): 20 min TTL
  - League selector: 10 hour TTL (keyed by userId)
  - Teams/Players: 12 hour TTL
  - Leaderboard: 30 min TTL
  - Badge counts: 15 min TTL
  - Tag-based invalidation on admin CRUD and bet evaluation
- **Fines System (Jan 29, 2026):** Added penalty system for worst-performing bettors
  - Extended `LeaguePrize` table with `type` field (prize/fine)
  - Admin can configure up to 10 fine tiers per league
  - Fines display automatically on user leaderboard (red badges with negative amounts)
  - **Migration Required:** `migration_add_fines_v2.sql` must be run before using feature
    - Adds `type` VARCHAR(10) column with default 'prize'
    - Adds check constraint: type IN ('prize', 'fine')
    - Updates unique constraint to include type: `[leagueId, rank, type, deletedAt]`
    - Idempotent: Safe to run multiple times
    - Run via Supabase SQL Editor or: `psql $DATABASE_URL -f migration_add_fines_v2.sql`
  - Components: `LeagueFinesSection`, `FineTierRow` for admin management
  - Calculation: Position from bottom (14 participants → rank 14 gets fine rank 1)
  - See `FINES_FEATURE.md` for complete documentation

## Key Features

### Admin
- **Dual routing:** Global (`/admin/teams`) vs. League-scoped (`/admin/[leagueId]/teams`)
- **Expandable rows:** Matches/Series/Special Bets show user bets inline
- **League context:** Topbar dropdown, localStorage persistence, URL sync
- **Prizes & Fines:**
  - Prizes: 1-10 configurable tiers for top performers (rank 1 = 1st place, rank 2 = 2nd place, etc.)
  - Fines: 1-10 configurable tiers for worst performers (rank 1 = last place, rank 2 = second-to-last, etc.)
  - All amounts stored in halers (100 Kč = 10000 halers)
  - Displayed on user leaderboard automatically
  - Managed in league settings modal (scrollable dialog with fixed header/footer)
- **Questions:** Yes/no bets, scoring logic (correct = +pts, wrong = -pts/2)
- **Evaluator management:**
  - Scorer evaluators support rank-based configuration (UI auto-expands row when editing)
  - Ranking points UI: Add/remove ranks, set points per rank, set unranked points
  - Config stored in `Evaluator.config` JSON field, validated via Zod schema
- **Soft delete:** All entities use `deletedAt` timestamp
- **Action buttons:** Direct icon buttons (no dropdowns)

### User
- **Mobile-first:** Bottom nav (5 tabs), fixed headers, pull-to-refresh, PWA
- **Sport controls:** Soccer playoff = team advance selector, Others = OT/SO checkbox
- **SPORT_IDS:** Numeric constants (HOCKEY = 1, FOOTBALL = 2) for type-safe comparisons
- **Betting lock:** Server validates `currentTime < dateTime` before save
- **Friend predictions:** Visible only after deadline
- **Match card:** +/- score controls, searchable scorer dropdown with ranking badges
- **Leaderboard:**
  - Top performers see prize badges (yellow/silver/bronze styling for top 3)
  - Worst performers see fine badges (red badges with negative amounts)
  - Smart calculation: In 14-person league, rank 14 displays fine for "rank 1 from bottom"
- **Components:** CountdownBadge, RefreshButton, PointsDisplay, PageLoading, PullToRefresh

---

## Code Quality & Security

### Refactoring (Phase 2)
- **Centralized:** auth (`requireAdmin()`), errors (`AppError`, `handleActionError()`), validation (`validation-client.ts`)
- **Hooks:** `useInlineEdit`, `useDeleteDialog`, `useCreateDialog`, `useExpandableRow`, `useRefresh`
- **Metrics:** State variables 11→3 (73% reduction), 100% accessibility, single validation source
- **Utils:** `executeServerAction()` wrapper eliminates duplicate try-catch (89 lines removed)
- **Type consolidation (Jan 2026):** `ScorerRankedConfig` interface consolidated from 5 duplicates to single source in `lib/evaluators/types.ts`
- **Test optimization (Jan 2026):** `npm test` runs once and exits (4.73s for 403 tests), `test:watch` available for development

### Security Audit (Jan 2026) - 20/24 issues fixed
**Fixed (Critical - First Audit):**
- CSRF protection (origin + referer validation)
- Email injection prevention (`escapeHtml()`, `escapeText()`)
- Production error logging (console.error + env context)
- Security headers (nosniff, DENY, XSS-Protection, CSP, Permissions-Policy)

**Fixed (Medium - First Audit):**
- Email unique constraint verified
- Deduplicated signInSchema
- Match future date validation
- Password reset token cleanup
- Dead code removed (getLogs, clearLogs, sendLogsToServer)

**Fixed (Code Review - Jan 22, 2026):**
- **Race conditions:** Atomic upserts prevent concurrent bet duplicates (matches, series, special bets, questions)
- **Console.log leak:** Removed session data logging in login page
- **Email normalization:** Case-insensitive email authentication
- **Type safety:** Evaluator.points String → Int migration, nullableUniqueConstraint helper
- **Database indexes:** Performance optimization for user-facing queries
- **Unique constraints:** LeagueUser and all bet tables prevent data integrity issues
- **Error handling:** AppError standardization in auth utilities
- **Transactions:** Serializable isolation for all user betting actions

**Backlog:**
- Login/registration rate limiting
- Hardcoded email config
- CORS, audit logging, token blacklist, email retry queue

### Build Status
✅ Production build clean (0 errors/warnings) • ✅ 403/403 tests pass • ✅ 37 routes • ✅ PWA ready

### Race Condition Prevention (Jan 2026)
User betting actions use **atomic upserts** to prevent duplicate bets during concurrent submissions:
- `saveMatchBet()` - Upsert on `[leagueMatchId, leagueUserId, deletedAt]`
- `saveSeriesBet()` - Upsert on `[leagueSpecialBetSerieId, leagueUserId, deletedAt]`
- `saveSpecialBet()` - Upsert on `[leagueSpecialBetSingleId, leagueUserId, deletedAt]`
- `saveQuestionBet()` - Upsert on `[leagueQuestionId, leagueUserId, deletedAt]`

All bet tables have unique constraints ensuring database-level prevention of duplicates.

### Caching Strategy (Feb 2026)
Uses Next.js `unstable_cache` for server-side data caching with tag-based invalidation.

**Cached Data with TTL:**
| Data | TTL | Cache Tag | Invalidated By |
|------|-----|-----------|----------------|
| Matches | 20 min | `match-data` | Admin CRUD, evaluation |
| Series | 20 min | `series-data` | Admin CRUD, evaluation |
| Special Bets | 20 min | `special-bet-data` | Admin CRUD, evaluation |
| Questions | 20 min | `question-data` | Admin CRUD, evaluation |
| League Selector | 10 hours | `league-selector` | League CRUD, user membership changes |
| Teams | 12 hours | `special-bet-teams` | Team assignment |
| Players | 12 hours | `special-bet-players` | Player assignment |
| Leaderboard | 30 min | `leaderboard` | Bet evaluation |
| Badge Counts | 60s | `bet-badges` | User bet saves (short TTL because `now` is computed inside) |

**Caching Pattern:**
- Base bet data is cached (shared across all users)
- User's own bets are fetched fresh (fast query by userId)
- Data merged using `Map` for O(1) lookup
- `isBettingOpen` computed at runtime from cached `dateTime`

**Key Files:**
- `src/actions/user/matches.ts` - `getCachedMatchData()`
- `src/actions/user/series.ts` - `getCachedSeriesData()`
- `src/actions/user/special-bets.ts` - `getCachedSpecialBetData()`
- `src/actions/user/questions.ts` - `getCachedQuestionData()`
- `src/actions/user/leagues.ts` - `getCachedLeaguesForSelector()`
- `src/actions/user/leaderboard.ts` - `getCachedLeaderboard()`
- `src/lib/cache/badge-counts.ts` - `getCachedBadgeCounts()`

**Invalidation:**
- Use `revalidateTag('tag-name', 'max')` in admin actions and evaluation functions
- All admin CRUD operations invalidate relevant caches
- Bet evaluation invalidates both data cache and leaderboard