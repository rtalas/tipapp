# TipApp - Sports Betting Platform for Friends

A modern, mobile-first sports betting application built with Next.js 16 for friends and families to compete in predicting match outcomes.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-green)](https://supabase.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Vitest-403_tests-6E9F18)](https://vitest.dev/)

🔗 **[Live Demo](https://your-demo-url.vercel.app)** | 📖 **[Documentation](CLAUDE.md)**

---

## Demo Credentials

| Role  | Username    | Password |
|-------|-------------|----------|
| Admin | `demo_admin` | `demo123` |
| User  | `demo_user1` | `demo123` |

---

## Features

### For Users
- **Match Predictions** - Bet on scores, overtime, and goal scorers
- **Series & Special Bets** - Predict playoff series and tournament winners
- **Live Leaderboard** - Rankings with prize tiers 🥇🥈🥉 and fine indicators
- **Mobile PWA** - Installable app with push notifications and offline support
- **Dual Language** - English and Czech with automatic detection

### For Admins
- **League Management** - Multi-league support with custom evaluators
- **Prizes & Fines** - Configure up to 10 prize tiers and 10 fine tiers
- **Expandable Rows** - View and manage user bets inline
- **Dual-Routing System** - Global routes vs league-scoped routes
- **Result Entry** - Record scores, scorers, and evaluate points

---

## Tech Stack

**Frontend**: Next.js 16 • React 19 • Tailwind CSS 4 • next-intl v4 • PWA

**Backend**: Auth.js v5 • PostgreSQL (Supabase) • Prisma 6 • Zod • Server Actions

**Quality**: TypeScript Strict • Vitest (403 tests) • ESLint

---

## Architecture Highlights

### Dual-Routing System
- **Global Routes** (`/admin/teams`) - Cross-league management for superadmins
- **League-Scoped Routes** (`/admin/[leagueId]/matches`) - League-specific operations
- League context persisted in localStorage + URL

### Modular Evaluation Engine
14 independent evaluators with full test coverage:
1. exact-score, 2. score-difference, 3. one-team-score, 4. winner
5. **scorer** (supports rank-based points), 6. draw, 7. soccer-playoff-advance
8. series-exact, 9. series-winner, 10. exact-player, 11. exact-team
12. exact-value, 13. closest-value, 14. question

Each evaluator is configurable per league with custom point values.

### Race Condition Prevention
All user betting actions use **atomic upserts** with unique constraints:
```typescript
await prisma.userBet.upsert({
  where: {
    leagueMatchId_leagueUserId_deletedAt: {
      leagueMatchId, leagueUserId, deletedAt: null
    }
  },
  create: { /* bet data */ },
  update: { /* bet data */ }
})
```

### Security Features
- CSRF Protection (origin + referer validation)
- SQL Injection Prevention (Prisma parameterized queries)
- XSS Prevention (HTML escaping, CSP headers)
- bcrypt password hashing (salt: 12), JWT sessions
- Input validation (Zod schemas)

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database (Supabase recommended)
- Resend account (for emails - optional)

### Installation

```bash
# 1. Clone and install
git clone https://github.com/yourusername/tipapp.git
cd tipapp
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Setup database
npx prisma db push        # Create tables
npx prisma generate       # Generate Prisma Client

# 4. Seed demo data (optional)
npm run seed:demo         # Creates 15 users, 3 leagues, 30 matches

# 5. Start dev server
npm run dev               # Open http://localhost:3000
```

### Required Environment Variables

```bash
# Database (get from Supabase)
DATABASE_URL="postgresql://..."   # Port 6543 (pooler)
DIRECT_URL="postgresql://..."      # Port 5432 (direct)

# Authentication
AUTH_SECRET=""                     # Generate: openssl rand -base64 32

# Email (optional for demo)
RESEND_API_KEY=""
RESEND_FROM_EMAIL=""

# App Config
APP_URL="http://localhost:3000"
NEXT_PUBLIC_DEMO_MODE="true"       # Show demo banners
```

### Development Commands

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm test                 # Run 403 tests (~4.7s)
npx prisma studio        # Open database GUI
npm run seed:demo        # Reseed demo data
```

---

## Deployment to Vercel

### 1. Setup Database (Supabase)

1. Create account at [supabase.com](https://supabase.com/)
2. New Project → Name: `tipapp-demo` → Generate password → Create
3. Go to **Settings** → **Database** → **Connection string**
4. Copy both:
   - **Transaction pooler** (port 6543) → `DATABASE_URL`
   - **Session pooler** (port 5432) → `DIRECT_URL`
5. Open **SQL Editor** → Run `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` output
6. Seed data: Update local `.env` with demo database, run `npm run seed:demo`

### 2. Deploy to Vercel

1. Push to GitHub: `git push origin main`
2. Visit [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Add environment variables:
   - `DATABASE_URL` (from Supabase)
   - `DIRECT_URL` (from Supabase)
   - `AUTH_SECRET` (generate new: `openssl rand -base64 32`)
   - `NEXT_PUBLIC_DEMO_MODE="true"`
   - `APP_URL` (Vercel will provide after deployment)
   - Other variables from `.env.example`
5. Click **Deploy**
6. Get URL: `https://[project-name].vercel.app`
7. Update this README with your live demo URL

### Separate Demo vs Production

**Recommended:** Create separate Vercel projects and databases:
- **Demo**: `tipapp-demo` project + demo database + `NEXT_PUBLIC_DEMO_MODE="true"`
- **Production**: `tipapp` project + production database + `NEXT_PUBLIC_DEMO_MODE="false"`

Benefits: Safe isolation, easy demo reset, no production interference

### Deployment Checklist
- [ ] Database created and migration applied
- [ ] Environment variables configured in Vercel
- [ ] Demo data seeded (for demo deployment)
- [ ] Build successful: `npm run build`
- [ ] Tests passing: `npm test`
- [ ] Live URL added to README

### Common Deployment Issues

**Build fails: "Can't reach database"**
- Solution: Add mock `DATABASE_URL` in Vercel build settings (build doesn't need real DB)

**"Tenant or user not found" error**
- Solution: Use correct hostname for port 5432 (check Supabase connection strings)

**Demo banner not showing**
- Solution: Set `NEXT_PUBLIC_DEMO_MODE="true"` (requires `NEXT_PUBLIC_` prefix for client components)

**Service worker not loading**
- Solution: Check `vercel.json` has correct headers for `/sw.js`

---

## Project Structure

```
app/
├── [leagueId]/              # User interface (matches, leaderboard, chat)
└── admin/
    ├── [leagueId]/          # League-scoped admin (matches, evaluators, teams)
    └── */                   # Global admin (leagues, teams, players, users)

src/
├── actions/                 # Server Actions with CSRF protection
├── components/              # UI components (admin + user)
├── lib/
│   ├── evaluators/          # 14 modular evaluators (79 tests)
│   ├── auth-utils.ts        # requireAdmin(), requireLeagueMember()
│   ├── error-handler.ts     # AppError, handleActionError()
│   └── validation/          # Zod schemas
├── contexts/                # React Context (league context)
└── types/                   # TypeScript definitions

prisma/
├── schema.prisma            # Database schema (introspected from DB)
└── seed-demo.ts             # Demo data generator (500+ entries)

translations/
├── en.json                  # English translations
└── cs.json                  # Czech translations
```

---

## Testing

**403 tests** covering evaluators, actions, utilities, and components (~4.7s runtime):

```bash
npm test                 # Run all tests once
npm run test:watch       # Watch mode for development
npm run test:ui          # Run with UI
npm run test:coverage    # Generate coverage report
```

Example test:
```typescript
it('should award rank-based points for ranked scorers', () => {
  const config: ScorerRankedConfig = {
    rankedPoints: { '1': 2, '2': 4, '3': 5 },
    unrankedPoints: 8
  }
  const bet = { scorerId: 1, scorerRanking: 2 }
  const result = { scorerIds: [1], scorerRankings: [2] }

  expect(evaluateScorer(bet, result, config)).toBe(4) // Rank 2 = 4 points
})
```

---

## Internationalization

Supports **English** and **Czech** with cookie-based locale storage.

**Switch language:**
- User: User menu (top-right) → Globe icon
- Admin: Topbar → Globe icon

**Add translations:**
1. Add to `translations/en.json` and `translations/cs.json`
2. Use in components:
   ```typescript
   // Server Component
   const t = await getTranslations('namespace')

   // Client Component
   const t = useTranslations('namespace')
   ```

---

## License

This project is for portfolio demonstration purposes.

---

*Made with ❤️ for sports betting enthusiasts*
