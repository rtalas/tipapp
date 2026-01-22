# CLAUDE.md - Project Memory

## Project Overview
**TipApp** is a Next.js 16 mobile-first sports betting app for friends to compete in football and hockey predictions.
- **Target:** Friends/Family (dozens of users), mobile-first.
- **Features:** Match score predictions, goal scorers, series bets, special bets, questions.
- **Admin:** Manual league, team, match, and result management.

## Tech Stack
Next.js 16 (App Router) • Auth.js v5 (CredentialsProvider + JWT) • PostgreSQL (Supabase) • Prisma ORM • Zod • Vitest + Testing Library • Tailwind CSS v4 • Lucide Icons

## Commands
- `npm run dev` - Start dev server
- `npm run build` - Build production
- `npm test` - Run tests
- `npx prisma db pull` - Sync schema
- `npx prisma generate` - Update Prisma Client
- `npx prisma studio` - Open DB GUI

## Standards
- Clean, modular, self-documenting code. Strict TypeScript (no `any`).
- Default to Server Components. Client only for interactivity.
- Every feature must have tests (`.test.ts` / `.test.tsx`).
- Before finishing: Run `npm run build` + `npm test`, verify in browser.

## Database Rules (CRITICAL)
- Tables use PascalCase (`User`, `Match`, `UserBet`), mapped to `prisma.user`, `prisma.match`.
- **DO NOT** rename fields to camelCase. Use introspected schema exactly as-is.
- **Evaluator.points:** Uses `Int` type (not String) - stored as integers for performance and type safety.
- **Unique constraints:** All bet tables have unique constraints on `[foreignKey, leagueUserId, deletedAt]` to prevent duplicates.
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
├── components/         # UI (user + admin)
├── contexts/           # League context (admin + user)
├── hooks/              # useRefresh, useInlineEdit, useDeleteDialog, useCreateDialog, useExpandableRow
├── lib/
│   ├── evaluators/     # 13 bet evaluators
│   ├── constants.ts    # SPORT_IDS.HOCKEY, SPORT_IDS.FOOTBALL
│   ├── auth-utils.ts   # requireAdmin()
│   ├── user-auth-utils.ts # requireLeagueMember()
│   ├── user-action-utils.ts # executeUserAction() wrapper (for future use)
│   ├── league-utils.ts # validateLeagueAccess()
│   ├── error-handler.ts # AppError, handleActionError()
│   ├── server-action-utils.ts # executeServerAction()
│   └── validation/     # Zod schemas (admin.ts, user.ts)
└── types/              # Session + user types
```

## Auth
- bcryptjs (salt: 12)
- Session: `user.id`, `user.username`, `user.isSuperadmin`
- Login: username OR email (case-insensitive for emails)
- Email normalization: All emails stored in lowercase for consistent authentication

## Evaluators (src/lib/evaluators/)
13 modular evaluators with full test coverage:
1. **exact-score** - Exact match (regulation time)
2. **score-difference** - Goal diff (excl. exact)
3. **winner** - Winner (final time, incl. OT/SO)
4. **scorer** - Predicted scorer in actual scorers
5. **draw** - Draw prediction (soccer, excl. exact)
6. **soccer-playoff-advance** - Advancing team
7. **series-exact** - Exact series result
8. **series-winner** - Series winner (excl. exact)
9. **exact-player** - Player match (e.g., top scorer)
10. **exact-team** - Team match (e.g., tournament winner)
11. **exact-value** - Numeric value exact
12. **closest-value** - Closest among users (excl. exact)
13. **question** - Yes/no question (correct = +pts, wrong = -pts/2)

## Development Status
- ✅ **Phase 1:** Infrastructure (Next.js, Prisma, Auth.js v5)
- ✅ **Phase 2:** Admin Management (CRUD, inline editing, code quality, security audit)
- ✅ **Phase 3:** Admin User Betting (expandable rows, league-scoped architecture, questions)
- ✅ **Phase 4:** Evaluation Engine (13 evaluators, 68 tests)
- ✅ **Phase 5:** User-Side App (mobile-first, PWA, bottom nav, friend predictions, pull-to-refresh)
- ✅ **Phase 6:** Polish (configurable prizes, race condition fixes, performance optimization, security hardening)
- 🔄 **Phase 7:** Production (push notifications, monitoring, final deployment)

## Key Features

### Admin
- **Dual routing:** Global (`/admin/teams`) vs. League-scoped (`/admin/[leagueId]/teams`)
- **Expandable rows:** Matches/Series/Special Bets show user bets inline
- **League context:** Topbar dropdown, localStorage persistence, URL sync
- **Prizes:** 1-10 configurable tiers per league (stored in halers)
- **Questions:** Yes/no bets, scoring logic (correct = +pts, wrong = -pts/2)
- **Soft delete:** All entities use `deletedAt` timestamp
- **Action buttons:** Direct icon buttons (no dropdowns)

### User
- **Mobile-first:** Bottom nav (5 tabs), fixed headers, pull-to-refresh, PWA
- **Sport controls:** Soccer playoff = team advance selector, Others = OT/SO checkbox
- **SPORT_IDS:** Numeric constants (HOCKEY = 1, FOOTBALL = 2) for type-safe comparisons
- **Betting lock:** Server validates `currentTime < dateTime` before save
- **Friend predictions:** Visible only after deadline
- **Match card:** +/- score controls, searchable scorer dropdown with ranking badges
- **Components:** CountdownBadge, RefreshButton, PointsDisplay, PageLoading, PullToRefresh

---

## Code Quality & Security

### Refactoring (Phase 2)
- **Centralized:** auth (`requireAdmin()`), errors (`AppError`, `handleActionError()`), validation (`validation-client.ts`)
- **Hooks:** `useInlineEdit`, `useDeleteDialog`, `useCreateDialog`, `useExpandableRow`, `useRefresh`
- **Metrics:** State variables 11→3 (73% reduction), 100% accessibility, single validation source
- **Utils:** `executeServerAction()` wrapper eliminates duplicate try-catch (89 lines removed)

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
- **Type safety:** Evaluator.points String → Int migration
- **Database indexes:** Performance optimization for user-facing queries
- **Unique constraints:** LeagueUser and all bet tables prevent data integrity issues
- **Error handling:** Standardized with executeUserAction wrapper (available for future use)

**Backlog:**
- Login/registration rate limiting
- Hardcoded email config
- CORS, audit logging, token blacklist, email retry queue

### Build Status
✅ Production build clean (0 errors/warnings) • ✅ 366/366 tests pass • ✅ 37 routes • ✅ PWA ready

### Race Condition Prevention (Jan 2026)
User betting actions use **atomic upserts** to prevent duplicate bets during concurrent submissions:
- `saveMatchBet()` - Upsert on `[leagueMatchId, leagueUserId, deletedAt]`
- `saveSeriesBet()` - Upsert on `[leagueSpecialBetSerieId, leagueUserId, deletedAt]`
- `saveSpecialBet()` - Upsert on `[leagueSpecialBetSingleId, leagueUserId, deletedAt]`
- `saveQuestionBet()` - Upsert on `[leagueQuestionId, leagueUserId, deletedAt]`

All bet tables have unique constraints ensuring database-level prevention of duplicates.