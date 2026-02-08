# CLAUDE.md - Project Memory

## Project Overview
**TipApp** is a Next.js 16 mobile-first sports betting app for friends to compete in football and hockey predictions.
- **Target:** Friends/Family (dozens of users), mobile-first.
- **Features:** Match score predictions, goal scorers, series bets, special bets, questions, in-app chat.
- **Admin:** Manual league, team, match, and result management with audit logging.

## Tech Stack
Next.js 16 (App Router) • React 19 • Auth.js v5 (CredentialsProvider + JWT) • PostgreSQL (Supabase) • Prisma 6 • Zod 4 • Vitest 4 + Testing Library • Tailwind CSS v4 • Lucide Icons • next-intl v4 (i18n) • Resend (email) • web-push (notifications)

## Internationalization (i18n)
**Supported Languages:** English (en), Czech (cs)
**Library:** next-intl v4.x for Next.js 16 App Router
**Locale Storage:** Cookie-based (`NEXT_LOCALE`, 1-year expiry) - no URL routing changes
**Translation Files:** `/translations/en.json`, `/translations/cs.json`
**Request Config:** `src/i18n/request.ts`

### Key Features
- **Language Switcher:** Available in user menu dropdown (top-right header) and admin topbar
- **Locale Detection:** Cookie → Accept-Language header → Default 'en'
- **Cookie Management:** Integrated into `proxy.ts` (Next.js 16 requires proxy.ts, not middleware.ts)
- **Server Components:** Use `await getTranslations('namespace')`
- **Client Components:** Use `useTranslations('namespace')` hook
- **Date/Time Formatting:** Uses Intl API via next-intl (automatic locale-aware formatting)

### Translation Structure
Nested JSON organized by namespaces (~1350 lines each):
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

### Adding New Translations
1. Add English key to `/translations/en.json` in appropriate namespace
2. Add Czech translation to `/translations/cs.json` (same path)
3. Use in component:
   - Server Component: `const t = await getTranslations('namespace')` then `{t('key')}`
   - Client Component: `const t = useTranslations('namespace')` then `{t('key')}`
4. For interpolation: `{t('message', { name: userName })}`

### Translation Guidelines
- **DO translate:** UI labels, messages, error text, placeholders
- **DON'T translate:** Database values (SPORT_IDS, evaluator keys), proper nouns (team/player names), user-generated content

## Commands
- `npm run dev` - Start dev server
- `npm run build` - Build production (`prisma generate && next build`)
- `npm test` - Run tests once and exit (fast feedback)
- `npm run test:watch` - Run tests in watch mode (for development)
- `npm run test:ui` - Run tests with Vitest UI
- `npm run test:coverage` - Generate coverage report
- `npm run seed:demo` - Seed database with demo data
- `npm run knip` - Find unused code/dependencies
- `npx prisma db pull` - Sync schema from database
- `npx prisma generate` - Update Prisma Client after schema changes
- `npx prisma studio` - Open DB GUI
- `psql $DATABASE_URL -f <migration_file>.sql` - Run SQL migration (or use Supabase SQL Editor)

## Standards
- Clean, modular, self-documenting code. Strict TypeScript (no `any`).
- Default to Server Components. Client only for interactivity.
- React Compiler enabled (`reactCompiler: true`) — manual React.memo/useMemo/useCallback unnecessary.
- Every feature must have tests (`.test.ts` / `.test.tsx`).
- **Testing policy:** Only run `npm test` for significant changes (new features, business logic, evaluators, schema changes, security fixes, core bugs). Skip for minor UI tweaks, documentation, config updates, or small refactoring.
- Before finishing significant changes: Run `npm run build` + `npm test`, verify in browser.

## Database Rules (CRITICAL)
- **36 models** in Prisma schema. Tables use PascalCase (`User`, `Match`, `UserBet`), mapped to `prisma.user`, `prisma.match`.
- **DO NOT** rename fields to camelCase. Use introspected schema exactly as-is.
- **Evaluator.points:** Uses `Int` type (not String) - stored as integers for performance and type safety.
- **Evaluator.config:** Optional `Json` field storing `ScorerRankedConfig` for rank-based scorer evaluation. When config exists, points field is set to 0.
- **LeaguePrize.type:** Enum field ('prize' or 'fine') to distinguish between rewards for top performers and penalties for worst performers. Prizes rank from top (1 = 1st place), fines rank from bottom (1 = last place).
- **Unique constraints:** All bet tables have unique constraints on `[foreignKey, leagueUserId, deletedAt]` to prevent duplicates. LeaguePrize has unique constraint on `[leagueId, rank, type, deletedAt]`.
- **Performance indexes:** Critical query paths have composite indexes for fast lookups.
- **Soft delete:** All entities use `deletedAt` timestamp — never hard-delete.

## Business Logic
- `/admin/**` requires `isSuperadmin: true` in JWT.
- Users can bet only if `currentTime < match.dateTime`.
- League context: Admins select league via topbar dropdown (localStorage + URL sync).
- Routes: Global (`/admin/teams`) vs. League-scoped (`/admin/[leagueId]/teams`).
- `/admin` redirects to most active league's matches page.
- If `LeagueMatch.isDoubled = true`, points × 2.
- Points calculated via league's `Evaluator` table.
- Users can request to join a league (`UserRequest` model).
- Per-league user settings stored in `UserSetting` model.

## Project Structure
```
app/                              # 39 pages
├── [leagueId]/                   # User pages (matches, series, special-bets, questions, leaderboard, chat, profile)
├── admin/
│   ├── [leagueId]/               # League-scoped (matches, series, special-bets, questions, teams, players, evaluators)
│   └── */                        # Global (leagues, teams, players, users, matches, series, special-bets,
│                                 #         series-types, evaluators, match-phases, audit-logs, profile)
├── login/, register/             # Auth pages
├── forgot-password/              # Password reset request
└── reset-password/[token]/       # Password reset form
src/
├── actions/                      # Server actions (50 files with tests)
│   ├── evaluators.ts             # updateEvaluator() supports config for scorer rank-based points
│   ├── league-prizes.ts          # getLeaguePrizes(), updateLeaguePrizes() - handles prizes & fines
│   ├── evaluate-matches.ts       # Match evaluation engine
│   ├── evaluate-series.ts        # Series evaluation engine
│   ├── evaluate-special-bets.ts  # Special bet evaluation engine
│   ├── evaluate-questions.ts     # Question evaluation engine
│   ├── messages.ts               # Chat messages (with reply support)
│   ├── shared-queries.ts         # Shared DB query utilities
│   └── user/                     # User-facing actions
│       ├── matches.ts            # getCachedMatchData(), saveMatchBet()
│       ├── series.ts             # getCachedSeriesData(), saveSeriesBet()
│       ├── special-bets.ts       # getCachedSpecialBetData(), saveSpecialBet()
│       ├── questions.ts          # getCachedQuestionData(), saveQuestionBet()
│       ├── leaderboard.ts        # getCachedLeaderboard() returns entries, prizes, fines
│       ├── leagues.ts            # getCachedLeaguesForSelector()
│       ├── profile.ts            # User profile operations
│       └── locale.ts             # Language preference management
├── components/                   # React components
│   ├── admin/                    # 17 subdirectories (layout, common, leagues, matches, series, etc.)
│   │   └── leagues/
│   │       ├── league-prizes-section.tsx  # Prize management UI
│   │       ├── league-fines-section.tsx   # Fine management UI
│   │       └── fine-tier-row.tsx          # Individual fine tier component
│   └── user/                     # 10 subdirectories (layout, common, matches, leaderboard, etc.)
│       └── leaderboard/
│           └── leaderboard-table.tsx      # Displays prizes & fines
├── contexts/                     # league-context.tsx, user-league-context.tsx
├── hooks/                        # useRefresh, useInlineEdit, useDeleteDialog, useCreateDialog,
│                                 # useExpandableRow, useMessages, useDateLocale
├── i18n/                         # request.ts (next-intl config)
├── lib/
│   ├── auth/                     # auth-utils.ts (requireAdmin), user-auth-utils.ts (requireLeagueMember)
│   ├── email/                    # email.ts (sendPasswordResetEmail via Resend)
│   ├── logging/                  # audit-logger.ts (AuditLogger), client-logger.ts
│   ├── evaluators/               # 14 evaluators + types.ts, evaluator-mapper.ts, context-builders.ts
│   ├── evaluation/               # match-evaluator.ts, series-evaluator.ts, special-bet-evaluator.ts, question-evaluator.ts
│   ├── cache/                    # badge-counts.ts (getCachedBadgeCounts)
│   ├── chat/                     # emoji-data.ts
│   ├── validation/               # admin.ts, user.ts, message.ts (Zod schemas)
│   ├── constants.ts              # SPORT_IDS.HOCKEY=1, SPORT_IDS.FOOTBALL=2
│   ├── error-handler.ts          # AppError, handleActionError()
│   ├── server-action-utils.ts    # executeServerAction() wrapper
│   ├── prisma.ts                 # Prisma Client singleton
│   ├── prisma-utils.ts           # nullableUniqueConstraint() helper
│   ├── prisma-helpers.ts         # Prisma helpers
│   ├── bet-utils.ts              # Bet computation utilities
│   ├── match-utils.ts            # Match utilities
│   ├── event-status-utils.ts     # Event status helpers
│   ├── league-utils.ts           # League utilities
│   ├── cached-data-utils.ts      # Data merging for cache pattern
│   ├── scorer-ranking-utils.ts   # Scorer ranking logic
│   ├── query-builders.ts         # SQL query builders
│   ├── token-utils.ts            # Token generation/verification
│   ├── rate-limit.ts             # Rate limiting
│   ├── push-notifications.ts     # Push notification service
│   ├── delete-utils.ts           # Soft delete utilities
│   ├── date-grouping-utils.ts    # Date grouping for UI
│   └── user-display-utils.ts     # User display formatting
└── types/                        # next-auth.d.ts, user.ts
prisma/
├── schema.prisma                 # 36 models
└── seed-demo.ts                  # Demo data generator
translations/
├── en.json                       # English (~1350 lines)
└── cs.json                       # Czech (~1350 lines)
```

## Database Models (36 total)
**Core:** User, League, LeagueUser, Sport, Team, Player, Match, LeagueMatch
**Betting:** UserBet, UserSpecialBetSerie, UserSpecialBetSingle, UserSpecialBetQuestion
**League Config:** Evaluator, EvaluatorType, LeaguePrize, LeaguePhase, LeagueTeam, LeaguePlayer
**Special Bets:** SpecialBetSerie, SpecialBetSingle, SpecialBetSingleType, LeagueSpecialBetSerie, LeagueSpecialBetSingle, LeagueSpecialBetSingleTeamAdvanced, LeagueSpecialBetQuestion
**Match:** MatchPhase, MatchScorer, TopScorerRankingVersion
**Features:** Message (chat), UserRequest (join requests), UserSetting (preferences), PushSubscription, SentNotification
**System:** AuditLog, PasswordResetToken, SequelizeMeta

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
- ✅ **Phase 4:** Evaluation Engine (14 evaluators with full test coverage)
- ✅ **Phase 5:** User-Side App (mobile-first, PWA, bottom nav, friend predictions, pull-to-refresh)
- ✅ **Phase 6:** Polish (prizes & fines, race condition fixes, performance caching, security hardening, chat replies, audit logs)
- 🔄 **Phase 7:** Production (push notifications, monitoring, final deployment)

## Key Features

### Admin
- **Dual routing:** Global (`/admin/teams`) vs. League-scoped (`/admin/[leagueId]/teams`)
- **Expandable rows:** Matches/Series/Special Bets show user bets inline
- **League context:** Topbar dropdown, localStorage persistence, URL sync
- **Audit logs:** Track admin actions with filterable log viewer
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
- **Admin bet creation:** Admins can create/edit bets on behalf of users after deadlines (no `isBettingOpen` check). This is intentional — admins manage late entries and corrections.
- **Soft delete:** All entities use `deletedAt` timestamp
- **Action buttons:** Direct icon buttons (no dropdowns)

### User
- **Mobile-first:** Bottom nav (5 tabs), fixed headers, pull-to-refresh, PWA
- **Sport controls:** Soccer playoff = team advance selector, Others = OT/SO checkbox
- **SPORT_IDS:** Numeric constants (HOCKEY = 1, FOOTBALL = 2) for type-safe comparisons
- **Betting lock:** Server validates `currentTime < dateTime` before save
- **Friend predictions:** Visible only after deadline
- **Match card:** +/- score controls, searchable scorer dropdown with ranking badges
- **Chat:** In-app league chat with reply support and emoji picker
- **Leaderboard:**
  - Top performers see prize badges (yellow/silver/bronze styling for top 3)
  - Worst performers see fine badges (red badges with negative amounts)
  - Smart calculation: In 14-person league, rank 14 displays fine for "rank 1 from bottom"
- **Components:** CountdownBadge, RefreshButton, PointsDisplay, PageLoading, PullToRefresh

---

## Code Quality & Security

### Testing
- **1072 tests** across **81 test files**, runs in ~6 seconds
- Global mocks in `vitest.setup.ts`: Prisma (36 models + groupBy/aggregate), audit-logger, next/cache, next/navigation, next-auth/react, @/auth
- Test pattern: Don't add per-file `vi.mock('@/lib/prisma')` — use the global mock, just `vi.mocked(prisma)` for typed refs
- `executeServerAction` returns `{ success: true, ...result }` (spread), not nested `data`
- Hook tests use `renderHook`/`act` from `@testing-library/react`

### Refactoring
- **Centralized:** auth (`requireAdmin()`), errors (`AppError`, `handleActionError()`), validation (`validation-client.ts`)
- **Hooks:** `useInlineEdit`, `useDeleteDialog`, `useCreateDialog`, `useExpandableRow`, `useRefresh`, `useMessages`, `useDateLocale`
- **Utils:** `executeServerAction()` wrapper eliminates duplicate try-catch
- **Type consolidation:** `ScorerRankedConfig` interface consolidated to single source in `lib/evaluators/types.ts`

### Security Audit (Jan 2026)
**Fixed (Critical):**
- CSRF protection (origin + referer validation)
- Email injection prevention (`escapeHtml()`, `escapeText()`)
- Production error logging (console.error + env context)
- Security headers (HSTS, nosniff, DENY, XSS-Protection, CSP, Permissions-Policy)

**Fixed (Medium):**
- Race conditions: Atomic upserts prevent concurrent bet duplicates
- Email normalization: Case-insensitive email authentication
- Type safety: Evaluator.points String → Int migration
- Database indexes: Performance optimization for user-facing queries
- Unique constraints: LeagueUser and all bet tables prevent data integrity issues
- Serializable transactions for all user betting actions
- Error boundaries at app/, app/[leagueId]/, app/admin/
- DB indexes on isEvaluated+deletedAt for Match and LeagueSpecialBetQuestion

**Backlog:**
- Login/registration rate limiting (infrastructure exists in `rate-limit.ts`)
- CORS, token blacklist, email retry queue

### Build Status
✅ Production build clean (0 errors/warnings) • ✅ 1072 tests pass • ✅ 39 routes • ✅ PWA ready

### Race Condition Prevention
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
| Badge Counts | 15 min | `bet-badges` | User bet saves |

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
