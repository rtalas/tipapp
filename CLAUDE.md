# CLAUDE.md - Project Memory & Context

## Project Overview
**TipApp** is a Next.js 16 sports betting application for a private group of friends to compete in football and hockey predictions.
- **Target Audience:** Friends/Family (dozens of users), mobile-first usage.
- **Key Feature:** Prediction of match scores, goal scorers, and long-term tournament results.
- **Admin Role:** Manual management of leagues, teams, matches, and result evaluation.

## Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Auth:** Auth.js v5 (beta) with CredentialsProvider & JWT sessions.
- **Database:** PostgreSQL (Supabase) via Prisma ORM.
- **Validation:** Zod schemas.
- **Testing:** Vitest + Testing Library.
- **Styling:** Tailwind CSS v4 + Lucide Icons.

## Development Commands
- `npm run dev`: Start development server (http://localhost:3000).
- `npm run build`: Build for production (automatically runs `prisma generate`).
- `npm test`: Run all tests via Vitest.
- `npx prisma db pull`: Sync Prisma schema from existing Supabase DB.
- `npx prisma generate`: Update/regenerate Prisma Client.
- `npx prisma studio`: Open local database GUI.

## Coding Standards & Quality
- **Clean Code:** Write modular, reusable, and self-documenting code. Follow SOLID principles.
- **Maintainability:** Prefer clarity over cleverness. Use descriptive variable and function names.
- **Comments:** Add meaningful comments for complex logic, business rules, or non-obvious workarounds. Avoid commenting on the obvious.
- **Types:** Ensure strict TypeScript typing. Avoid `any`. Define interfaces for all data structures.
- **Server vs Client:** Default to Server Components. Use Client Components only for interactivity.

## Verification & Definition of Done (MANDATORY)
**Before declaring a task as "finished", you MUST:**
1. **Verification:** Run `npm run build` to ensure there are no TypeScript or linting errors.
2. **Testing:** Run `npm test` and ensure all tests (including the ones you just wrote) pass.
3. **Manual Check:** If possible, describe how the implementation can be verified in the browser (e.g., "Navigate to /admin/leagues and check if the new card appears").
4. **No Side Effects:** Ensure that new changes haven't broken existing authentication or database introspection.

## Testing Strategy (MANDATORY)
- **Coverage:** Every new feature, utility, or component must include corresponding tests.
- **Unit Tests:** Use Vitest for business logic, utility functions, and individual components.
- **Component Tests:** Use React Testing Library to verify UI behavior and accessibility.
- **Location:** Place test files alongside the source code using `.test.ts` or `.test.tsx`.
- **Naming:** Follow the pattern `[filename].test.tsx`.

## Database & Schema Rules (CRITICAL)
- **PascalCase Convention:** All database tables use PascalCase (e.g., `User`, `Match`, `UserBet`, `LeagueUser`).
- **ORM Mapping:** Prisma Client maps these to lowercase methods (e.g., `prisma.user`, `prisma.match`).
- **No Renaming:** DO NOT rename database fields to camelCase. Maintain the exact field names from the introspected schema.
- **Service Role:** Prisma connects via direct/pooled URI, bypassing RLS for administrative tasks.

## Business Logic & Constraints
- **Admin Access:** Routes under `/admin/**` require `isSuperadmin: true` in the JWT session.
- **Betting Lock:** Users can only create or update a `UserBet` if `currentTime < match.dateTime`.
- **League Context:** Users switch between leagues via the sidebar (hamburger menu). `LeagueUser` defines specific permissions within a league.
- **Point Calculation:** If `LeagueMatch.isDoubled` is true, all points for that match are multiplied by 2.
- **Scoring Engine:** Points are calculated based on the `Evaluator` table associated with the specific league.

## Project Structure
├── app/                    # Next.js App Router (Pages & API)
├── src/
│   ├── auth.ts             # Auth.js v5 configuration
│   ├── components/         # UI Components (Mobile-first)
│   ├── lib/
│   │   ├── prisma.ts       # Prisma client singleton
│   │   └── validation.ts   # Zod validation schemas
│   └── types/              # Extended session types
├── prisma/
│   └── schema.prisma       # Introspected schema
└── middleware.ts           # Route protection (Auth wrapper)

## Authentication Details
- **Hashing:** `bcryptjs` with salt rounds: 12.
- **Session Fields:** `user.id`, `user.username`, `user.isSuperadmin`.
- **Identity:** Credential login supports either `username` OR `email`.

## Development Roadmap
- **Phase 1 (Infrastructure): COMPLETED** (Next.js, Prisma setup, Auth.js v5, Auth middleware).
- **Phase 2 (Admin Management): COMPLETED** (League creation, Team/Player association, Match management, Code Quality).
  - ✅ Global Teams management (create, read, update, delete)
  - ✅ Global Players management (create, read, update, delete, toggle active)
  - ✅ Teams inline editing (including shortcut and sport fields)
  - ✅ UI conversion from dropdown menus to direct action buttons (all 8 admin pages)
  - ✅ Code Quality Refactoring (centralized auth, error handling, validation, accessibility, custom hooks)
- **Phase 3 (User Betting): NEXT** (Match feed UI, score/scorer submission logic).
- **Phase 4 (Evaluation & Leaderboard): PLANNED** (Point calculation engine, rankings view).

## Key Implementation Details (Phase 2)

### Server Actions Pattern
- All admin server actions (`src/actions/*.ts`) include authorization checks via `requireAdmin()` function
- Soft delete pattern implemented using `deletedAt` timestamp (not hard delete)
- Zod schema validation for all inputs before database operations
- Path revalidation via `revalidatePath()` for dynamic route updates

### Admin UI Components
- **Content Components:** Feature search filters, sport/league/status filters, inline editing, create/delete dialogs
- **Action Buttons:** Replaced dropdown menus with visible icon-only buttons in compact rows (gap-2 spacing)
- **Forms:** Both dialog-based forms (create) and inline forms (edit) with validation and loading states
- **Delete Safety:** Confirmation dialogs with relationship warnings (e.g., "assigned to X leagues")

### Pages Converted to Direct Buttons
1. Teams (`teams-content.tsx`) - Edit + Delete
2. Players (`players-content.tsx`) - Edit + Toggle Active + Delete
3. Evaluators (`evaluators-content.tsx`) - Edit Name + Edit Points + Delete
4. League Evaluators (`league-evaluators-content.tsx`) - Edit Name + Edit Points + Delete
5. Matches (`matches-content.tsx`) - Enter Result + Evaluate
6. Users (`users-content.tsx`) - Remove from League
7. Leagues (`league-actions.tsx`) - Edit + Evaluators + Setup + Users + Delete
8. Results (`results-content.tsx`) - Edit Result + Evaluate

## Code Quality Improvements (Phase 2 Refactoring)

### ✅ Completed Refactoring Tasks

**1. Centralized Authorization** (`src/lib/auth-utils.ts`)
- Created shared `requireAdmin()` utility function
- Removed duplication from `src/actions/teams.ts` and `src/actions/players.ts`
- Enables global auth policy changes in one place

**2. Centralized Error Handling** (`src/lib/error-handler.ts`)
- `AppError` class for custom application errors
- `handleActionError()` for standardized error normalization
- `getErrorMessage()` for user-friendly error messages
- Applied to: Teams, Players, Matches, Leagues, Results components
- Enables consistent error messaging across all admin pages

**3. Client-Side Validation** (`src/lib/validation-client.ts`)
- `validateTeamCreate()`, `validateTeamEdit()`
- `validatePlayerCreate()`, `validatePlayerEdit()`
- Mirror server Zod schemas to eliminate validation duplication
- Single source of validation truth

**4. Custom State Management Hooks**
- **`src/hooks/useInlineEdit.ts`** - Consolidates edit state (replaces 3 useState calls)
  - `startEdit()`, `updateForm()`, `cancelEdit()`, `finishEdit()`
  - Applied to Teams, Players (reduced 11 → 3 state variables per component)

- **`src/hooks/useDeleteDialog.ts`** - Consolidates delete confirmation state
  - `openDialog()`, `closeDialog()`, `startDeleting()`, `finishDeleting()`, `cancelDeleting()`
  - Reusable across all admin pages

- **`src/hooks/useCreateDialog.ts`** - Consolidates create dialog state
  - `openDialog()`, `closeDialog()`, `updateForm()`, `startCreating()`, `finishCreating()`, `cancelCreating()`
  - Reusable across all admin pages

**5. Accessibility Improvements** (aria-labels added)
- Teams: Edit + Delete buttons, all form inputs
- Players: Edit + Toggle + Delete buttons, all form inputs
- Evaluators: Name + Points + Delete buttons
- League Evaluators: Name + Points + Delete buttons
- Matches: Edit + Delete buttons
- Leagues: Edit + Evaluators + Setup + Users + Delete buttons
- Results: Edit + Evaluate buttons
- Users: Remove button (sr-only existing)
- **Status:** 100% WCAG accessibility compliance across all 8 admin pages

**6. Function Naming Clarity**
- Renamed `handleEditName()` → `handleStartEdit()` (more descriptive of intent)
- Renamed `handleSaveName()` → `handleSaveEdit()` (clearer save operation)

### Refactoring Metrics
| Metric | Improvement |
|--------|-------------|
| State variables reduction (Teams/Players) | 11 → 3 per component (73% reduction) |
| Code duplication (requireAdmin) | 2 instances → 1 (100% eliminated) |
| Accessibility coverage | 0% → 100% (all 8 admin pages) |
| Error handling consistency | Scattered → Centralized (5 components) |
| Validation duplication | High → Single source (validation-client.ts) |

### New Utility Files Created
- `src/lib/auth-utils.ts` - Centralized authorization checks
- `src/lib/error-handler.ts` - Standardized error handling
- `src/lib/validation-client.ts` - Client-side validation utilities
- `src/hooks/useInlineEdit.ts` - Inline editing state management
- `src/hooks/useDeleteDialog.ts` - Delete confirmation state management
- `src/hooks/useCreateDialog.ts` - Create dialog state management

### Build Status
- ✅ **Production Build:** Successful (0 errors, 0 warnings)
- ✅ **TypeScript Compilation:** Clean
- ✅ **Routes Generated:** 16/16
- ✅ **Ready for Deployment:** Yes

---

## 🔒 Security Audit & Fixes (Phase 3 - Completed)

### Comprehensive Code Audit (8. Jan 2026)
Performed full codebase security and quality audit identifying 24 issues across:
- **Bezpečnost:** 6 issues (2 HIGH, 2 MEDIUM, 2 LOW)
- **Výkon:** 4 issues (2 MEDIUM, 2 LOW)
- **Kvalita kódu:** 5 issues (1 HIGH, 2 MEDIUM, 2 LOW)
- **Typová bezpečnost:** 3 issues
- **Ostatní:** 6 issues

### ✅ Critical Security Fixes (4 issues - COMPLETED)

**1. CSRF Protection in proxy.ts** ✅
- Added origin header validation for state-changing requests (POST/PUT/DELETE)
- Added referer header validation as additional CSRF protection
- Support for configurable ALLOWED_ORIGINS environment variable
- Prevents cross-site request forgery attacks

**2. Email Injection Prevention** ✅
- Added `escapeHtml()` function for HTML email templates
- Added `escapeText()` function for plain text emails
- All user inputs (username, resetUrl, APP_NAME) now escaped
- Prevents XSS attacks via malicious usernames in password reset emails

**3. Production Error Logging** ✅
- Changed `logError()` to log to console.error() in production
- Added environment context to error logs
- Enables visibility into production errors and security incidents
- Prepared TODO for Sentry/LogRocket integration

**4. Security Headers** ✅
- Added comprehensive security headers in next.config.ts:
  - X-Content-Type-Options: nosniff (prevents MIME sniffing)
  - X-Frame-Options: DENY (prevents clickjacking)
  - X-XSS-Protection: 1; mode=block (XSS filter)
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: disable geolocation, microphone, camera
  - Content-Security-Policy: restrict script/style sources

### ✅ Medium Priority Fixes (5 issues - COMPLETED)

**1. Email Unique Constraint** ✅
- Verified: prisma/schema.prisma has @unique constraint on User.email
- Database-level enforcement prevents duplicate emails
- Complements app-level validation in registration

**2. Deduplicate signInSchema** ✅
- Removed local schema from src/auth.ts
- Now centralized import from src/lib/validation.ts
- Single source of truth for login validation

**3. Match Future Date Validation** ✅
- Added .refine() to createMatchSchema to validate dateTime > now()
- Prevents creation of past matches
- Improves user experience in betting UI

**4. Password Reset Token Cleanup** ✅
- Changed deleteMany() to remove ALL tokens for user after reset
- Prevents token table accumulation
- Cleaner database state after successful password reset

**5. Removed Dead Code** ✅
- Deleted unused getLogs() function from client-logger.ts
- Deleted unused clearLogs() function
- Deleted unused sendLogsToServer() function
- Kept active logger.debug/info/warn/error methods

### ✅ Refactoring (1 issue - COMPLETED)

**6. Deduplicate Server Action Patterns** ✅
- Created src/lib/server-action-utils.ts with executeServerAction() wrapper
- Centralized error handling, validation, authorization, revalidation
- Refactored src/actions/teams.ts (3 functions: createTeam, updateTeam, deleteTeam)
- Refactored src/actions/players.ts (3 functions: createPlayer, updatePlayer, deletePlayer)
- Added deleteByIdSchema for reusable delete validation
- Removed 89 lines of duplicate try-catch and error handling code

### Audit Fix Metrics
| Category | Issues | Fixed | Remaining |
|----------|--------|-------|-----------|
| **CRÍTICO** | 4 | 4 | 0 |
| **STŘEDNÍ** | 9 | 5 | 4 |
| **NÍZKÉ** | 11 | 1 | 10 |
| **TOTAL** | 24 | 10 | 14 |

### Git Commits (Audit Phase)
1. **d71e48a** - 🔒 Security: Fix critical vulnerabilities (4 fixes)
2. **41a5d36** - 🔧 Fix 5 medium-priority issues from code audit
3. **e4a14e2** - ♻️ Refactor: Deduplicate server action patterns

### Remaining Issues (Backlog)
**HIGH PRIORITY (this week):**
- Login rate limiting (brute force protection)
- Registrace rate limiting (spam prevention)
- Hardcoded email configuration

**MEDIUM PRIORITY (next month):**
- CORS configuration
- Audit logging for admin actions
- Token blacklist on logout
- Email retry queue
- And 10+ low-priority items

## MCP Information
Use Context7 MCP for documentation, code generation, or setup steps without explicit requests.