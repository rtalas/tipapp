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

## Contents merged from `docs/README.md`

The following content was merged from the `docs/README.md` file in the repository.

# Next.js + Prisma + Auth.js v5 Setup Guide

This project has been configured with a complete authentication system using Prisma ORM and Auth.js v5 (next-auth), integrated with your existing Supabase PostgreSQL database.

## Project Structure

```
├── src/
│   ├── auth.ts                    # Auth.js v5 configuration with CredentialsProvider
│   ├── lib/
│   │   └── prisma.ts              # Prisma client singleton
│   ├── components/
│   │   └── SignOutButton.tsx       # Sign out button component
│   ├── types/
│   │   └── next-auth.d.ts          # TypeScript types for extended session
│   └── app/
│       └── api/auth/[...nextauth]/ # Auth.js route handler
├── app/
│   ├── page.tsx                   # Protected dashboard (requires authentication)
│   └── login/                      # Login page (public)
├── middleware.ts                  # Route protection middleware
├── prisma/
│   └── schema.prisma              # Prisma schema (introspected from DB)
└── .env                           # Environment variables
```

## Database Integration

The database schema was introspected from your existing Supabase PostgreSQL database using:
```bash
npx prisma db pull
```

All table names and fields maintain their original PascalCase format from the database. Key tables used:
- **User**: Stores user information including `username`, `email`, `password`, `salt`, and `isSuperadmin`
- **LeagueUser**: Links users to leagues

## Authentication Flow

### Login Process
1. User visits `/login` page
2. Submits credentials (username or email + password)
3. Auth.js CredentialsProvider validates:
	 - Finds user in database by username OR email
	 - Compares password using bcryptjs
4. On success, creates session with JWT token containing:
	 - `id`: User ID
	 - `username`: Username
	 - `isSuperadmin`: Admin status
	 - Standard `email`, `name` fields

### Session Management
- Sessions persist via JWT tokens (stored in secure HTTP-only cookies)
- Session data available via `auth()` function (server-side)
- Session extended with custom fields: `id`, `username`, `isSuperadmin`

## Route Protection

All routes are protected by middleware except:
- `/login` - Login page (public)
- `/api/auth` - Auth.js API routes (public)

Unauthenticated users are redirected to `/login` with a `callbackUrl` parameter to return to their original destination after login.

## Key Files

### `src/auth.ts`
Configures Auth.js v5 with:
- CredentialsProvider for username/email + password authentication
- Password verification using bcryptjs
- JWT and session callbacks to extend token/session data
- Sign-in and sign-out handlers

### `src/lib/prisma.ts`
Prisma client singleton to prevent multiple instances in development.

### `middleware.ts`
Protects routes by checking authentication status before rendering.

### `src/types/next-auth.d.ts`
TypeScript type definitions extending NextAuth types with custom fields.

## Environment Variables

Required in `.env`:
- `DATABASE_URL`: Connection string for Prisma (with connection pooling)
- `DIRECT_URL`: Direct database URL (for migrations)
- `AUTH_SECRET`: Secret key for JWT signing (already configured)

## Using Prisma Client

Import and use the singleton client:
```typescript
import { prisma } from "@/lib/prisma";

// Example: Find a user
const user = await prisma.user.findFirst({
	where: { username: "john" }
});

// Example: Create a user
const newUser = await prisma.user.create({
	data: {
		username: "jane",
		email: "jane@example.com",
		firstName: "Jane",
		lastName: "Doe",
		password: "hashedPassword",
	}
});
```

## Getting User Session

### Server-side (Server Components)
```typescript
import { auth } from "@/auth";

export default async function Page() {
	const session = await auth();
	const userId = session?.user?.id;
	const username = session?.user?.username;
	const isAdmin = session?.user?.isSuperadmin;
	// ...
}
```

### Client-side (Client Components)
```typescript
"use client";
import { useSession } from "next-auth/react";

export default function Component() {
	const { data: session } = useSession();
	const userId = session?.user?.id;
	// ...
}
```

## Authentication Actions

### Sign In
```typescript
import { signIn } from "next-auth/react";

await signIn("credentials", {
	username: "john",
	password: "password123",
	redirect: true,
	redirectTo: "/"
});
```

### Sign Out
```typescript
import { signOut } from "next-auth/react";

await signOut({ redirectTo: "/login" });
```

## Database Queries

The Prisma schema includes all tables from your database. Use camelCase for model names:
- `prisma.user` (User table)
- `prisma.leagueUser` (LeagueUser table)
- `prisma.league` (League table)
- `prisma.match` (Match table)
- `prisma.userBet` (UserBet table)
- etc.

For a complete list, check `prisma/schema.prisma`.

## Development

Start the dev server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### First Login
You'll need to use credentials for an existing user in your database. If you need to test with a new user, you can:
1. Create a user directly in the database with hashed password
2. Or use an existing user from your system

### Debugging
Enable Prisma query logging by setting in `.env`:
```
DATABASE_LOG_LEVEL=query
```

## Important Notes

1. **Password Hashing**: The current implementation compares passwords using bcryptjs. If your existing passwords aren't bcrypt-hashed, you'll need to update them first.

2. **Table Names**: All database operations use the exact PascalCase table names as they appear in the database schema.

3. **Middleware Warning**: Next.js shows a deprecation warning about middleware. This is expected and the middleware will continue to work properly.

4. **Session Timeout**: Configure session duration in `src/auth.ts` callbacks if needed.

## Next Steps

1. Test login with existing database credentials
2. Create additional pages and protect them with authentication
3. Add authorization checks based on `isSuperadmin` flag
4. Set up database migrations if you modify the schema
5. Consider adding more authentication providers (OAuth, etc.)

---

For more information:
- [Auth.js Documentation](https://authjs.dev/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Next.js Documentation](https://nextjs.org/docs/)
