# TipApp - Sports Betting Platform for Friends

A modern, mobile-first sports betting application built with Next.js 16 for friends and families to compete in predicting football and hockey match outcomes. Track predictions, compete on leaderboards, and have fun with customizable prizes and fines.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-green)](https://supabase.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Vitest-403_tests-6E9F18)](https://vitest.dev/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8)](https://web.dev/progressive-web-apps/)

🔗 **[Live Demo](https://your-demo-url.vercel.app)** | 📖 **[Technical Documentation](CLAUDE.md)**

---

## Table of Contents

- [Overview](#overview)
- [Demo Credentials](#demo-credentials)
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
- [Contributing](#contributing)
- [License](#license)

---

## Overview

TipApp was designed for small groups of friends and family (dozens of users) who want to compete in predicting sports match outcomes. Unlike commercial betting platforms, TipApp focuses on the social aspect of predictions within trusted circles.

### Key Highlights

- **Mobile-First PWA** - Installable on any device, works offline, supports push notifications
- **Dual Sport Support** - Football (soccer) and hockey with sport-specific betting options
- **Flexible Scoring** - 14 configurable evaluators for custom point systems per league
- **Social Features** - See friends' predictions after match starts, compete on leaderboards
- **Gamification** - Prize tiers for top performers, fine tiers for worst performers
- **Multi-League** - Run multiple leagues simultaneously (Euro 2024, NHL Playoffs, etc.)
- **Bilingual** - Full English and Czech translations with auto-detection

### Who Is This For?

- Friend groups wanting to add excitement to watching sports together
- Office pools for major tournaments (World Cup, Euro, NHL Playoffs)
- Family competitions during sports seasons
- Anyone who wants a private, customizable betting platform

---

## Demo Credentials

| Role  | Username     | Password   | Description                         |
|-------|--------------|------------|-------------------------------------|
| Admin | `demo_admin` | `demo123`  | Full admin access, can manage all   |
| User  | `demo_user1` | `demo123`  | Regular user, can place bets        |

The demo includes:
- 15 sample users with randomized bets
- 3 active leagues (Euro 2024, NHL Playoffs, World Cup)
- 30+ matches with various states (upcoming, in-progress, completed)
- Sample series bets, special bets, and questions

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
- **In-App Chat** - Discuss matches and banter with league members

#### Mobile Experience
- **Progressive Web App** - Install on home screen like a native app
- **Pull-to-Refresh** - Swipe down to refresh data
- **Bottom Navigation** - Easy thumb access to all sections
- **Offline Support** - View cached data without connection
- **Push Notifications** - Get reminded before match deadlines (coming soon)

### For Admins

#### League Management
- **Multi-League Support** - Create and manage multiple leagues
- **League Settings** - Configure prizes, fines, and scoring rules
- **User Management** - Add/remove users from leagues, set permissions
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

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16 | React framework with App Router |
| React | 19 | UI library |
| Tailwind CSS | 4 | Utility-first styling |
| next-intl | 4 | Internationalization |
| Lucide Icons | - | Icon library |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Auth.js | 5 | Authentication (credentials + JWT) |
| PostgreSQL | - | Database (via Supabase) |
| Prisma | 6 | Type-safe ORM |
| Zod | - | Runtime validation |
| Server Actions | - | API layer |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Vercel | Hosting & deployment |
| Supabase | Managed PostgreSQL |
| Resend | Transactional emails |

### Quality & Testing
| Technology | Purpose |
|------------|---------|
| TypeScript | Type safety (strict mode) |
| Vitest | Unit & integration testing |
| Testing Library | Component testing |
| ESLint | Code linting |

---

## Architecture

### Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ User Pages  │  │Admin Pages  │  │  PWA Service Worker │  │
│  │ (Mobile UI) │  │(Desktop UI) │  │  (Offline Support)  │  │
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
│  │                 Server Actions                       │    │
│  │  • CSRF protection  • Validation  • Business logic  │    │
│  └──────────────────────────┬──────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Evaluation Engine                       │    │
│  │  • 14 evaluators  • Point calculation  • Rankings   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────┼───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Prisma    │  │  PostgreSQL │  │      Supabase       │  │
│  │    ORM      │◄─┤  (Database) │◄─┤  (Managed Hosting)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Dual Routing System

TipApp uses a sophisticated routing system that separates global and league-scoped operations:

**Global Routes** (`/admin/*`)
- Cross-league management for superadmins
- Examples: `/admin/teams`, `/admin/players`, `/admin/leagues`
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

  // 2. Validation
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

```
┌─────────────────────────────────────────────────────────────┐
│                     Data Fetching Flow                       │
│                                                              │
│  User Request                                                │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────────┐   Cache HIT    ┌──────────────────┐   │
│  │  unstable_cache │──────────────▶│  Return Cached   │   │
│  │  (check cache)  │                │     Data         │   │
│  └────────┬────────┘                └──────────────────┘   │
│           │ Cache MISS                                      │
│           ▼                                                  │
│  ┌─────────────────┐                                        │
│  │  Prisma Query   │──▶ Store in cache ──▶ Return Data     │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

**Cached Data:**

| Data | TTL | Purpose |
|------|-----|---------|
| Matches, Series, Special Bets, Questions | 20 min | Shared bet lists (same for all users) |
| League Selector | 10 hours | User's available leagues |
| Teams/Players | 12 hours | Rarely change during season |
| Leaderboard | 30 min | Only changes on evaluation |
| Badge Counts | 60s | Navigation indicators (short TTL for accuracy) |

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
                            │                     │
                            ▼                     ▼
                     ┌──────────────┐     ┌──────────────┐
                     │   UserBet    │     │  LeagueMatch │
                     │  (various)   │     │  LeaguePrize │
                     └──────────────┘     │   Evaluator  │
                                          └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Sport     │────▶│     Team     │◀────│    Player    │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │    Match     │
                     └──────────────┘
```

### Core Tables

| Table | Description |
|-------|-------------|
| `User` | User accounts with auth credentials |
| `League` | Betting leagues (Euro 2024, NHL Playoffs) |
| `LeagueUser` | Many-to-many: users in leagues |
| `Sport` | Sports (Football, Hockey) |
| `Team` | Teams with sport association |
| `Player` | Players with team association |
| `Match` | Global match records |
| `LeagueMatch` | League-specific match settings (isDoubled) |
| `Evaluator` | Scoring rules per league |
| `LeaguePrize` | Prize/fine tiers per league |

### Bet Tables

| Table | Description |
|-------|-------------|
| `UserBet` | Match score predictions |
| `UserBetSerie` | Series predictions (playoff results) |
| `UserBetSingle` | Special bet predictions |
| `UserBetQuestion` | Yes/no question predictions |

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
    "1": 2,   // 1st ranked scorer = 2 points
    "2": 4,   // 2nd ranked scorer = 4 points
    "3": 5    // 3rd ranked scorer = 5 points
  },
  "unrankedPoints": 8  // Unranked scorer = 8 points
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
npm run seed:demo         # Creates 15 users, 3 leagues, 30+ matches

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
NEXT_PUBLIC_DEMO_MODE="true"  # Shows demo banners in UI
```

---

## Development

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production bundle |
| `npm start` | Start production server |
| `npm test` | Run all tests once (~4.7s for 403 tests) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:ui` | Run tests with Vitest UI |
| `npm run test:coverage` | Generate test coverage report |
| `npm run lint` | Run ESLint |
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
7. **Push & PR**: `git push origin feature/my-feature`

### Code Conventions

- **TypeScript Strict** - No `any` types, full type safety
- **Server Components Default** - Client components only when needed
- **Zod Validation** - All inputs validated with Zod schemas
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
   - `NEXT_PUBLIC_DEMO_MODE` - `"true"` for demo, `"false"` for production
5. Click **Deploy**
6. Update `APP_URL` with your Vercel URL

#### 3. Seed Demo Data

```bash
# Update local .env with production database URL
npm run seed:demo
```

### Production vs Demo Setup

**Recommended:** Maintain separate environments:

| Environment | Database | DEMO_MODE | Purpose |
|-------------|----------|-----------|---------|
| Demo | `tipapp-demo` DB | `true` | Public showcase, can be reset |
| Production | `tipapp-prod` DB | `false` | Real usage, data preserved |

### Deployment Checklist

- [ ] Database created and migrations applied
- [ ] All environment variables configured in Vercel
- [ ] Demo data seeded (for demo deployment)
- [ ] `npm run build` passes locally
- [ ] `npm test` passes (403 tests)
- [ ] PWA manifest and icons present
- [ ] Service worker configured correctly
- [ ] Live URL updated in README

### Troubleshooting Deployment

**"Can't reach database" during build**
- Vercel builds don't need real DB. Add `DATABASE_URL` with mock value if needed.

**"Tenant or user not found"**
- Double-check Supabase connection string hostname and port.

**Demo banner not showing**
- Environment variable must be `NEXT_PUBLIC_DEMO_MODE` (with `NEXT_PUBLIC_` prefix).

**Service worker not loading**
- Verify `vercel.json` has correct headers for `/sw.js`.

---

## Project Structure

```
tipapp/
├── app/                          # Next.js App Router
│   ├── [leagueId]/               # User pages (league-scoped)
│   │   ├── matches/              # Match list and betting
│   │   ├── series/               # Series betting
│   │   ├── special-bets/         # Special bets
│   │   ├── leaderboard/          # Rankings
│   │   └── chat/                 # League chat
│   ├── admin/
│   │   ├── [leagueId]/           # League-scoped admin
│   │   │   ├── matches/          # Manage league matches
│   │   │   ├── evaluators/       # Configure scoring rules
│   │   │   ├── teams/            # League teams
│   │   │   ├── players/          # League players
│   │   │   └── users/            # League members
│   │   ├── leagues/              # Global: manage leagues
│   │   ├── teams/                # Global: all teams
│   │   ├── players/              # Global: all players
│   │   └── users/                # Global: all users
│   ├── auth/                     # Login, register, reset password
│   └── api/                      # API routes (minimal)
│
├── src/
│   ├── actions/                  # Server Actions
│   │   ├── admin/                # Admin-only actions
│   │   └── user/                 # User actions
│   ├── components/               # React components
│   │   ├── admin/                # Admin UI components
│   │   ├── user/                 # User UI components
│   │   └── ui/                   # Shared UI primitives
│   ├── contexts/                 # React Context providers
│   ├── hooks/                    # Custom React hooks
│   ├── lib/
│   │   ├── evaluators/           # 14 evaluation modules
│   │   ├── validation/           # Zod schemas
│   │   ├── auth-utils.ts         # Auth helpers
│   │   ├── error-handler.ts      # Error handling
│   │   └── prisma.ts             # Prisma client
│   └── types/                    # TypeScript definitions
│
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── seed-demo.ts              # Demo data generator
│
├── messages/                     # i18n translations
│   ├── en.json                   # English
│   └── cs.json                   # Czech
│
├── public/
│   ├── icons/                    # PWA icons
│   └── manifest.json             # PWA manifest
│
└── tests/                        # Test files (co-located)
```

---

## Testing

TipApp has comprehensive test coverage with **403 tests** that run in approximately 4.7 seconds.

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

| Category | Count | Description |
|----------|-------|-------------|
| Evaluators | 79 | All 14 evaluators with edge cases |
| Actions | ~100 | Server action validation and logic |
| Utils | ~50 | Utility function tests |
| Components | ~100 | React component tests |
| Integration | ~74 | End-to-end flows |

### Example Test

```typescript
import { evaluateScorer } from './scorer'
import type { ScorerRankedConfig } from './types'

describe('scorer evaluator with rank-based config', () => {
  const config: ScorerRankedConfig = {
    rankedPoints: { '1': 2, '2': 4, '3': 5 },
    unrankedPoints: 8
  }

  it('awards rank-based points for ranked scorers', () => {
    const bet = { scorerId: 1, scorerRanking: 2 }
    const result = { scorerIds: [1], scorerRankings: [2] }

    expect(evaluateScorer(bet, result, config)).toBe(4)  // Rank 2 = 4 points
  })

  it('awards unranked points for unranked scorers', () => {
    const bet = { scorerId: 1, scorerRanking: null }
    const result = { scorerIds: [1] }

    expect(evaluateScorer(bet, result, config)).toBe(8)  // Unranked = 8 points
  })
})
```

---

## Internationalization

TipApp supports **English** and **Czech** with cookie-based locale storage.

### Switching Language

- **User Interface**: Click your avatar (top-right) → Select language
- **Admin Interface**: Click globe icon in topbar → Select language

### Translation Files

```
messages/
├── en.json    # English translations
└── cs.json    # Czech translations
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

### Adding Translations

1. Add key to both `en.json` and `cs.json`:
```json
// messages/en.json
{
  "user": {
    "matches": {
      "newFeature": "New Feature"
    }
  }
}

// messages/cs.json
{
  "user": {
    "matches": {
      "newFeature": "Nová funkce"
    }
  }
}
```

2. Use in component: `{t('newFeature')}`

---

## Security

TipApp implements multiple security layers to protect user data and prevent attacks.

### Authentication

- **Password Hashing**: bcryptjs with salt factor 12
- **JWT Sessions**: Secure session management via Auth.js v5
- **Email Normalization**: Case-insensitive email storage and lookup
- **Login Options**: Username or email authentication

### Input Validation

- **Zod Schemas**: All inputs validated on server
- **Type Safety**: Strict TypeScript prevents type-related bugs
- **Parameterized Queries**: Prisma prevents SQL injection

### Request Protection

- **CSRF Tokens**: Origin + Referer validation on all mutations
- **Security Headers**: CSP, X-Content-Type-Options, X-Frame-Options
- **XSS Prevention**: HTML escaping via `escapeHtml()` utility

### Data Protection

- **Soft Delete**: Data recovery possible, nothing permanently deleted
- **Unique Constraints**: Database-level duplicate prevention
- **Atomic Operations**: Race condition prevention with upserts
- **Serializable Transactions**: Isolation for critical operations

### Access Control

- **Admin Checks**: `requireAdmin()` validates superadmin status
- **League Membership**: `requireLeagueMember()` validates league access
- **Betting Deadlines**: Server-side deadline enforcement

---

## Contributing

Contributions are welcome! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Build check: `npm run build`
6. Commit: `git commit -m 'feat: add amazing feature'`
7. Push: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Style

- Follow existing patterns in the codebase
- Use TypeScript strict mode (no `any`)
- Add tests for new features
- Update translations for UI changes
- Keep components small and focused

### Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

---

## License

This project is for portfolio demonstration purposes. Feel free to use it as a reference for your own projects.

---

## Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Prisma](https://www.prisma.io/) - Database toolkit
- [Auth.js](https://authjs.dev/) - Authentication
- [Supabase](https://supabase.com/) - Database hosting
- [Vercel](https://vercel.com/) - Deployment platform
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide](https://lucide.dev/) - Icons

---

*Built with care for sports betting enthusiasts*
