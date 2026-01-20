This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

# TipApp - Sports Betting Application

A Next.js 16 sports betting application for a private group of friends to compete in football and hockey predictions.

## Documentation

For comprehensive project information, see:

- **[CLAUDE.md](CLAUDE.md)** - Complete project context, tech stack, coding standards, business logic, and development roadmap
- **[Authentication Setup](docs/setup/AUTHENTICATION.md)** - Auth.js v5 integration with Prisma and Supabase

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables in .env
# Required: DATABASE_URL, DIRECT_URL, AUTH_SECRET

# Pull database schema and generate Prisma Client
npx prisma db pull
npx prisma generate

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production (auto-runs prisma generate)
npm test             # Run all tests via Vitest
npx prisma db pull   # Sync Prisma schema from Supabase DB
npx prisma generate  # Update/regenerate Prisma Client
npx prisma studio    # Open local database GUI
```

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Auth:** Auth.js v5 (beta) with CredentialsProvider & JWT sessions
- **Database:** PostgreSQL (Supabase) via Prisma ORM
- **Validation:** Zod schemas
- **Testing:** Vitest + Testing Library
- **Styling:** Tailwind CSS v4 + Lucide Icons

## Project Structure

See [CLAUDE.md](CLAUDE.md) for detailed project structure, architecture patterns, and development phases.

## Environment Variables

Required in `.env`:

```bash
# Database (Supabase)
DATABASE_URL="postgresql://..."    # Pooled connection
DIRECT_URL="postgresql://..."      # Direct connection

# Auth.js
AUTH_SECRET="your-secret-key"      # Generate with: npx auth secret
```

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Auth.js Documentation](https://authjs.dev/)
- [Prisma Documentation](https://www.prisma.io/docs/)
