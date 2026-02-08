# TipApp - Sports Betting Platform for Friends

A modern, mobile-first sports betting application built with Next.js 16 for friends and families to compete in predicting football and hockey match outcomes. Track predictions, compete on leaderboards, and have fun with customizable prizes and fines.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-green)](https://supabase.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Vitest-1072_tests-6E9F18)](https://vitest.dev/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8)](https://web.dev/progressive-web-apps/)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Evaluation Engine](#evaluation-engine)
- [Quick Start](#quick-start)
- [Development](#development)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Internationalization](#internationalization)
- [Security](#security)
- [License](#license)

---

## Overview

TipApp was designed for small groups of friends and family (dozens of users) who want to compete in predicting sports match outcomes. Unlike commercial betting platforms, TipApp focuses on the social aspect of predictions within trusted circles.

### Key Highlights

- **Mobile-First PWA** - Installable on any device, works offline, supports push notifications
- **Dual Sport Support** - Football (soccer) and hockey with sport-specific betting options
- **Flexible Scoring** - 14 configurable evaluators for custom point systems per league
- **Social Features** - See friends' predictions after match starts, compete on leaderboards, in-app chat with replies
- **Gamification** - Prize tiers for top performers, fine tiers for worst performers
- **Multi-League** - Run multiple leagues simultaneously (Euro 2024, NHL Playoffs, etc.)
- **Bilingual** - Full English and Czech translations with auto-detection (~1350 translation keys per language)
- **Comprehensive Testing** - 1072 tests across 81 files, running in ~6 seconds

### Who Is This For?

- Friend groups wanting to add excitement to watching sports together
- Office pools for major tournaments (World Cup, Euro, NHL Playoffs)
- Family competitions during sports seasons
- Anyone who wants a private, customizable betting platform

---

## Features

### For Users

#### Match Predictions
- **Score Betting** - Predict exact scores for each match
- **Overtime/Shootout** - For hockey: predict if game goes to OT/SO
- **Goal Scorers** - Select predicted scorers from searchable player dropdown
- **Scorer Rankings** - Players display ranking badges (1st, 2nd, 3rd) for rank-based scoring

#### Series & Tournament Bets
- **Playoff Series** - Predict series winners and exact results (e.g., 4-2)
- **Special Bets** - Tournament winners, top scorers, golden glove, etc.
- **Yes/No Questions** - Custom questions with positive/negative point scoring

#### Social & Competition
- **Live Leaderboard** - Real-time rankings with total points
- **Prize Indicators** - Gold/Silver/Bronze badges for top 3
- **Fine Indicators** - Red badges for bottom performers
- **Friend Predictions** - See what others bet (only after match deadline)
- **In-App Chat** - Discuss matches and banter with league members (with reply support)

#### Mobile Experience
- **Progressive Web App** - Install on home screen like a native app
- **Pull-to-Refresh** - Swipe down to refresh data
- **Bottom Navigation** - Easy thumb access to all sections (matches, series, special bets, questions, leaderboard)
- **Countdown Badges** - Visual indicators for upcoming match deadlines
- **Push Notifications** - Get reminded before match deadlines via Web Push (configurable timing per user)

### For Admins

#### League Management
- **Multi-League Support** - Create and manage multiple leagues
- **League Settings** - Configure prizes, fines, and scoring rules
- **User Management** - Add/remove users from leagues, handle join requests
- **League Context** - Quick-switch between leagues via topbar dropdown

#### Match & Event Management
- **Match Creation** - Add matches with teams, dates, and times
- **Result Entry** - Record final scores, overtime status, goal scorers
- **Bulk Operations** - Manage multiple matches efficiently
- **Sport-Specific Options** - Different options for football vs hockey

#### Scoring Configuration
- **14 Evaluators** - Choose which scoring rules apply to each league
- **Custom Points** - Set point values for each evaluator type
- **Doubled Matches** - Mark important matches for 2x points
- **Rank-Based Scoring** - Variable points based on scorer rankings

#### Prizes & Fines System
- **Prize Tiers** - Configure up to 10 prize tiers for top performers
- **Fine Tiers** - Configure up to 10 fine tiers for worst performers
- **Flexible Amounts** - Set any amount per tier (stored in halers for precision)
- **Auto-Display** - Prizes and fines automatically show on user leaderboard

#### Admin Interface
- **Expandable Rows** - View all user bets inline without page navigation
- **Inline Editing** - Quick edits without opening modals
- **Dual Routing** - Global routes vs league-scoped routes
- **Action Buttons** - Direct icon buttons (no dropdown menus)
- **Soft Delete** - All entities use deletedAt for data recovery
- **Audit Logs** - Track all admin actions with filterable log viewer

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16 | React framework with App Router |
| React | 19 | UI library with React Compiler |
| Tailwind CSS | 4 | Utility-first styling |
| next-intl | 4 | Internationalization (EN/CS) |
| Radix UI | latest | Accessible UI primitives (dialogs, dropdowns, tooltips, etc.) |
| Lucide Icons | latest | Icon library |
| next-themes | latest | Dark/light theme support |
| sonner | latest | Toast notifications |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Auth.js | 5 (beta) | Authentication (credentials + JWT) |
| PostgreSQL | - | Database (via Supabase) |
| Prisma | 6 | Type-safe ORM (36 models) |
| Zod | 4 | Runtime validation |
| Server Actions | - | API layer (CSRF-protected) |
| web-push | latest | Push notification delivery |
| Resend | latest | Transactional emails |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Vercel | Hosting & deployment |
| Supabase | Managed PostgreSQL |
| Resend | Transactional emails |

### Quality & Testing
| Technology | Purpose |
|------------|---------|
| TypeScript 5 | Type safety (strict mode) |
| Vitest 4 | Unit & integration testing (1072 tests) |
| Testing Library | Component testing |
| happy-dom | Test environment |
| ESLint | Code linting |
| knip | Dead code detection |
| React Compiler | Automatic memoization |

---

## Architecture

### Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ User Pages  │  │Admin Pages  │  │  PWA Service Worker │  │
│  │ (Mobile UI) │  │(Desktop UI) │  │  (Offline + Push)   │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────┘  │
└─────────┼────────────────┼──────────────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 16 Server                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Server Components (RSC)                 │    │
│  │  • Data fetching  • Auth checks  • SSR rendering    │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Server Actions (50 files)                  │    │
│  │  • CSRF protection  • Zod validation  • Audit log   │    │
│  └──────────────────────────┬──────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │        Evaluation Engine (14 evaluators)             │    │
│  │  • Point calculation  • Rankings  • Caching          │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          unstable_cache (tag-based)                  │    │
│  │  • 20min bet data  • 30min leaderboard  • 12h teams │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────┼───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Prisma 6   │  │  PostgreSQL │  │      Supabase       │  │
│  │  (36 models)│◄─┤  (Database) │◄─┤  (Managed Hosting)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Dual Routing System

TipApp uses a routing system that separates global and league-scoped operations:

**Global Routes** (`/admin/*`)
- Cross-league management for superadmins
- Examples: `/admin/teams`, `/admin/players`, `/admin/leagues`, `/admin/audit-logs`
- Used for entities shared across all leagues

**League-Scoped Routes** (`/admin/[leagueId]/*`)
- League-specific operations
- Examples: `/admin/123/matches`, `/admin/123/evaluators`
- Context automatically provided by URL parameter

**User Routes** (`/[leagueId]/*`)
- All user pages are league-scoped
- Examples: `/123/matches`, `/123/leaderboard`, `/123/chat`
- League selection persisted in localStorage

### Server Action Pattern

All data mutations use Server Actions with consistent patterns:

```typescript
// Example: Save user bet
export async function saveMatchBet(data: MatchBetInput) {
  // 1. Auth check
  const session = await requireLeagueMember(leagueId)

  // 2. Zod validation
  const validated = matchBetSchema.parse(data)

  // 3. Business rules
  if (new Date() >= match.dateTime) {
    throw new AppError('Betting deadline passed', 400)
  }

  // 4. Atomic upsert (prevents race conditions)
  await prisma.userBet.upsert({
    where: { leagueMatchId_leagueUserId_deletedAt: { ... } },
    create: { ... },
    update: { ... }
  })

  // 5. Invalidate cache + revalidate path
  revalidateTag('bet-badges', 'max')
  revalidatePath(`/${leagueId}/matches`)
}
```

### Caching Strategy

TipApp uses Next.js `unstable_cache` for server-side caching with tag-based invalidation:

| Data | TTL | Invalidated By |
|------|-----|----------------|
| Matches, Series, Special Bets, Questions | 20 min | Admin CRUD, evaluation |
| League Selector | 10 hours | League CRUD, user membership |
| Teams/Players | 12 hours | Team/player assignment |
| Leaderboard | 30 min | Bet evaluation |
| Badge Counts | 15 min | User bet saves |

**Cache Pattern:**
- Base data cached (shared across users)
- User's own bets fetched fresh (fast indexed query)
- Merged using `Map` for O(1) lookup
- Admin CRUD + evaluation triggers `revalidateTag()` for instant invalidation

---

## Database Schema

### Entity Relationship Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    User      │────▶│  LeagueUser  │◀────│    League    │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                     │
       ▼                    ▼                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  UserRequest │     │   UserBet    │     │  LeagueMatch │
│  UserSetting │     │  (4 types)   │     │  LeaguePrize │
│  PushSubscr. │     └──────────────┘     │   Evaluator  │
└──────────────┘                          └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Sport     │────▶│     Team     │◀────│    Player    │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │    Match     │───▶ MatchScorer
                     └──────────────┘
```

### 36 Prisma Models

| Category | Models |
|----------|--------|
| **Core** | User, League, LeagueUser, Sport, Team, Player, Match, LeagueMatch |
| **Betting** | UserBet, UserSpecialBetSerie, UserSpecialBetSingle, UserSpecialBetQuestion |
| **League Config** | Evaluator, EvaluatorType, LeaguePrize, LeaguePhase, LeagueTeam, LeaguePlayer |
| **Special Bets** | SpecialBetSerie, SpecialBetSingle, SpecialBetSingleType, LeagueSpecialBetSerie, LeagueSpecialBetSingle, LeagueSpecialBetSingleTeamAdvanced, LeagueSpecialBetQuestion |
| **Match** | MatchPhase, MatchScorer, TopScorerRankingVersion |
| **Features** | Message, UserRequest, UserSetting, PushSubscription, SentNotification |
| **System** | AuditLog, PasswordResetToken, SequelizeMeta |

### Key Design Decisions

- **PascalCase Tables** - Matches Prisma conventions from introspection
- **Soft Delete** - All entities use `deletedAt` timestamp
- **Unique Constraints** - Prevent duplicate bets with composite keys
- **Halers Storage** - Money stored as integers (100 Kč = 10000 halers)
- **SPORT_IDS Constants** - Type-safe sport comparisons (HOCKEY=1, FOOTBALL=2)

---

## Evaluation Engine

The heart of TipApp is its modular evaluation engine with 14 independent evaluators.

### Available Evaluators

| # | Evaluator | Description | Typical Points |
|---|-----------|-------------|----------------|
| 1 | `exact-score` | Exact regulation time score | 5 pts |
| 2 | `score-difference` | Correct goal difference (not exact) | 3 pts |
| 3 | `one-team-score` | One team's score correct | 1 pt |
| 4 | `winner` | Correct winner (including OT/SO) | 2 pts |
| 5 | `scorer` | Predicted scorer scored | 2-8 pts* |
| 6 | `draw` | Correctly predicted draw (football) | 2 pts |
| 7 | `soccer-playoff-advance` | Correct advancing team | 3 pts |
| 8 | `series-exact` | Exact playoff series result | 5 pts |
| 9 | `series-winner` | Correct series winner | 2 pts |
| 10 | `exact-player` | Correct player prediction | 5 pts |
| 11 | `exact-team` | Correct team prediction | 5 pts |
| 12 | `exact-value` | Exact numeric value | 5 pts |
| 13 | `closest-value` | Tiered: exact=full, closest=1/3 | varies |
| 14 | `question` | Yes/no: correct=+pts, wrong=-pts/2 | ±3 pts |

*Scorer evaluator supports rank-based scoring with configurable points per rank.

### Scorer Rank-Based Scoring

For more nuanced scorer predictions, leagues can enable rank-based scoring:

```json
{
  "rankedPoints": {
    "1": 2,
    "2": 4,
    "3": 5
  },
  "unrankedPoints": 8
}
```

This encourages betting on less obvious scorers for higher rewards.

### Evaluation Flow

```
Match Completed
      │
      ▼
┌─────────────────────────┐
│  Fetch League Evaluators │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  For each User Bet:     │
│  • Run matching evaluator│
│  • Calculate points     │
│  • Apply isDoubled      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Update UserBet.points  │
│  Invalidate caches      │
│  Update Leaderboard     │
└─────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Node.js 20 or higher
- PostgreSQL database (Supabase recommended for easy setup)
- Resend account for transactional emails (optional for development)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/tipapp.git
cd tipapp

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your credentials (see below)

# 4. Set up the database
npx prisma db push        # Create tables
npx prisma generate       # Generate Prisma Client

# 5. Seed demo data (optional but recommended)
npm run seed:demo         # Creates sample users, leagues, matches

# 6. Start the development server
npm run dev
# Open http://localhost:3000
```

### Environment Variables

Create a `.env` file with the following:

```bash
# Database (from Supabase Dashboard → Settings → Database)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Authentication (generate with: openssl rand -base64 32)
AUTH_SECRET="your-secret-key-min-32-chars"

# Email service (optional for development)
RESEND_API_KEY="re_xxxxxxxxxxxx"
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# Application
APP_URL="http://localhost:3000"
```

---

## Development

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production bundle (runs `prisma generate` first) |
| `npm start` | Start production server |
| `npm test` | Run all tests once (~6s for 1072 tests) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:ui` | Run tests with Vitest UI |
| `npm run test:coverage` | Generate test coverage report |
| `npm run lint` | Run ESLint |
| `npm run knip` | Find unused code and dependencies |
| `npm run seed:demo` | Seed database with demo data |

### Database Commands

| Command | Description |
|---------|-------------|
| `npx prisma studio` | Open visual database browser |
| `npx prisma db pull` | Sync schema from database |
| `npx prisma generate` | Regenerate Prisma Client |
| `npx prisma db push` | Push schema changes to database |

### Development Workflow

1. **Create feature branch**: `git checkout -b feature/my-feature`
2. **Make changes**: Edit code, add tests
3. **Run tests**: `npm test` (for significant changes)
4. **Build check**: `npm run build`
5. **Manual testing**: Test in browser
6. **Commit**: `git commit -m "feat: description"`

### Code Conventions

- **TypeScript Strict** - No `any` types, full type safety
- **React Compiler** - Automatic memoization, no manual React.memo/useMemo/useCallback
- **Server Components Default** - Client components only when needed
- **Zod 4 Validation** - All inputs validated with Zod schemas
- **Error Handling** - Use `AppError` for consistent error responses
- **Soft Delete** - Always use `deletedAt` instead of hard delete
- **Atomic Operations** - Use upserts to prevent race conditions

---

## Deployment

### Deploying to Vercel

#### 1. Set Up Supabase Database

1. Create account at [supabase.com](https://supabase.com/)
2. Click **New Project** → Enter name and generate password
3. Go to **Settings** → **Database** → **Connection string**
4. Copy both connection strings:
   - **Transaction pooler** (port 6543) → Use as `DATABASE_URL`
   - **Session pooler** (port 5432) → Use as `DIRECT_URL`
5. Open **SQL Editor** and run your migration SQL

#### 2. Deploy to Vercel

1. Push code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Configure environment variables:
   - `DATABASE_URL` - From Supabase (port 6543)
   - `DIRECT_URL` - From Supabase (port 5432)
   - `AUTH_SECRET` - Generate new: `openssl rand -base64 32`
   - `APP_URL` - Will be provided by Vercel after first deploy
5. Click **Deploy**
6. Update `APP_URL` with your Vercel URL

### Deployment Checklist

- [ ] Database created and migrations applied
- [ ] All environment variables configured in Vercel
- [ ] `npm run build` passes locally
- [ ] `npm test` passes (1072 tests)
- [ ] PWA manifest and icons present
- [ ] Live URL updated

---

## Project Structure

```
tipapp/
├── app/                          # Next.js App Router (39 pages)
│   ├── [leagueId]/               # User pages (league-scoped)
│   │   ├── matches/              # Match list and betting
│   │   ├── series/               # Series betting
│   │   ├── special-bets/         # Special bets
│   │   ├── questions/            # Question bets
│   │   ├── leaderboard/          # Rankings with prizes & fines
│   │   ├── chat/                 # League chat with replies
│   │   └── profile/              # User profile
│   ├── admin/
│   │   ├── [leagueId]/           # League-scoped admin
│   │   │   ├── matches/          # Manage league matches
│   │   │   ├── series/           # Manage league series
│   │   │   ├── special-bets/     # Manage special bets
│   │   │   ├── questions/        # Manage questions
│   │   │   ├── evaluators/       # Configure scoring rules
│   │   │   ├── teams/            # League teams
│   │   │   └── players/          # League players
│   │   ├── leagues/              # Global: manage leagues (+ setup, evaluators, users)
│   │   ├── teams/                # Global: all teams
│   │   ├── players/              # Global: all players
│   │   ├── matches/              # Global: all matches
│   │   ├── series/               # Global: all series
│   │   ├── special-bets/         # Global: all special bets
│   │   ├── users/                # Global: all users
│   │   ├── series-types/         # Global: series type templates
│   │   ├── evaluators/           # Global: evaluator types
│   │   ├── match-phases/         # Global: match phases
│   │   ├── audit-logs/           # Global: audit log viewer
│   │   └── profile/              # Admin profile
│   ├── login/                    # Authentication
│   ├── register/                 # Registration
│   ├── forgot-password/          # Password reset request
│   └── reset-password/[token]/   # Password reset form
│
├── src/
│   ├── actions/                  # Server Actions (50 files with tests)
│   │   ├── *.ts                  # Admin actions (matches, teams, players, etc.)
│   │   ├── evaluate-*.ts         # Evaluation engines (matches, series, special-bets, questions)
│   │   ├── league-prizes.ts      # Prize & fine management
│   │   ├── messages.ts           # Chat with reply support
│   │   ├── shared-queries.ts     # Shared DB query utilities
│   │   └── user/                 # User actions (betting, leaderboard, leagues, profile, locale)
│   ├── components/               # React components
│   │   ├── admin/                # 17 component groups (layout, common, leagues, matches, etc.)
│   │   ├── user/                 # 10 component groups (layout, common, matches, leaderboard, etc.)
│   │   └── ui/                   # Shared UI primitives (Radix-based)
│   ├── contexts/                 # React Context providers (league-context, user-league-context)
│   ├── hooks/                    # Custom hooks (7 hooks with tests)
│   ├── i18n/                     # next-intl configuration
│   ├── lib/
│   │   ├── evaluators/           # 14 evaluation modules + types + mapper
│   │   ├── evaluation/           # Evaluation orchestration (match, series, special-bet, question)
│   │   ├── validation/           # Zod schemas (admin, user, message)
│   │   ├── auth/                 # Auth utilities (requireAdmin, requireLeagueMember)
│   │   ├── logging/              # Audit logger + client logger
│   │   ├── email/                # Email service (Resend)
│   │   ├── cache/                # Badge count caching
│   │   ├── chat/                 # Emoji data
│   │   └── *.ts                  # Utilities (prisma, errors, server-actions, constants, etc.)
│   └── types/                    # TypeScript definitions (next-auth.d.ts, user.ts)
│
├── prisma/
│   ├── schema.prisma             # Database schema (36 models)
│   └── seed-demo.ts              # Demo data generator
│
├── translations/                 # i18n translations
│   ├── en.json                   # English (~1350 lines)
│   └── cs.json                   # Czech (~1350 lines)
│
├── public/                       # Static assets (PWA icons, manifest)
├── CLAUDE.md                     # Technical documentation
└── FINES_FEATURE.md              # Fines feature documentation
```

---

## Testing

TipApp has comprehensive test coverage with **1072 tests** across **81 test files** that run in approximately **6 seconds**.

### Running Tests

```bash
# Run all tests once (CI mode)
npm test

# Watch mode for development
npm run test:watch

# With visual UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Test Organization

Tests are co-located with the code they test:

```
src/lib/evaluators/
├── exact-score.ts
├── exact-score.test.ts       # ← Tests next to implementation
├── scorer.ts
├── scorer.test.ts
└── ...
```

### Test Categories

| Category | Description |
|----------|-------------|
| Evaluators | All 14 evaluators with edge cases |
| Server Actions | Admin and user action validation, auth, business logic |
| Evaluation Engine | Match, series, special bet, question evaluation orchestration |
| Components | React component rendering and interaction tests |
| Hooks | Custom hook behavior tests |
| Utilities | Library function tests (error handling, validation, caching, etc.) |

### Test Infrastructure

- **Environment:** happy-dom (fast, lightweight)
- **Global mocks:** Prisma (36 models), audit-logger, next/cache, next/navigation, next-auth/react, @/auth
- **Pattern:** Co-located test files, no separate test directories

---

## Internationalization

TipApp supports **English** and **Czech** with cookie-based locale storage.

### Switching Language

- **User Interface**: Click your avatar (top-right) → Select language
- **Admin Interface**: Click globe icon in topbar → Select language

### Translation Files

```
translations/
├── en.json    # English translations (~1350 lines)
└── cs.json    # Czech translations (~1350 lines)
```

### Using Translations

**Server Components:**
```typescript
import { getTranslations } from 'next-intl/server'

export default async function Page() {
  const t = await getTranslations('user.matches')
  return <h1>{t('title')}</h1>
}
```

**Client Components:**
```typescript
'use client'
import { useTranslations } from 'next-intl'

export function MyComponent() {
  const t = useTranslations('user.matches')
  return <button>{t('save')}</button>
}
```

---

## Security

TipApp implements multiple security layers to protect user data and prevent attacks.

### Authentication
- **Password Hashing**: bcryptjs with salt factor 12
- **JWT Sessions**: Secure session management via Auth.js v5
- **Email Normalization**: Case-insensitive email storage and lookup
- **Login Options**: Username or email authentication

### Input Validation
- **Zod 4 Schemas**: All inputs validated on server
- **Type Safety**: Strict TypeScript prevents type-related bugs
- **Parameterized Queries**: Prisma prevents SQL injection

### Request Protection
- **CSRF Tokens**: Origin + Referer validation on all mutations (via `proxy.ts`)
- **Security Headers**: HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Permissions-Policy
- **XSS Prevention**: HTML escaping via `escapeHtml()` utility

### Data Protection
- **Soft Delete**: Data recovery possible, nothing permanently deleted
- **Unique Constraints**: Database-level duplicate prevention
- **Atomic Operations**: Race condition prevention with upserts
- **Serializable Transactions**: Isolation for critical betting operations
- **Error Boundaries**: React error boundaries at app/, league/, and admin/ levels

### Access Control
- **Admin Checks**: `requireAdmin()` validates superadmin status
- **League Membership**: `requireLeagueMember()` validates league access
- **Betting Deadlines**: Server-side deadline enforcement
- **Audit Logging**: All admin actions tracked with `AuditLogger`

---

## License

This project is for portfolio demonstration purposes. Feel free to use it as a reference for your own projects.

---

*Built with Next.js 16, React 19, and TypeScript for sports betting enthusiasts*
