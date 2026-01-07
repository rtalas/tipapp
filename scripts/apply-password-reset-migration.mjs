import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log("Applying password reset migration...");

    // 1. Backfill users without email
    console.log("Backfilling users without email...");
    const result = await prisma.$executeRawUnsafe(`
      UPDATE "User"
      SET "email" = 'user' || "id" || '@tipapp.placeholder'
      WHERE "email" IS NULL;
    `);
    console.log(`Updated ${result} users with placeholder emails`);

    // 2. Create PasswordResetToken table
    console.log("Creating PasswordResetToken table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
          "id" SERIAL NOT NULL,
          "userId" INTEGER NOT NULL,
          "token" VARCHAR(255) NOT NULL,
          "expiresAt" TIMESTAMPTZ(6) NOT NULL,
          "createdAt" TIMESTAMPTZ(6) NOT NULL,
          "usedAt" TIMESTAMPTZ(6),

          CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
      );
    `);

    // 3. Add indexes
    console.log("Adding indexes...");
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");
    `);

    // 4. Add foreign key
    console.log("Adding foreign key...");
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `);
    } catch (e) {
      // Foreign key might already exist
      console.log("Foreign key constraint may already exist:", e.message.substring(0, 100));
    }

    // 5. Make email required and add unique constraint
    console.log("Making email required and adding unique constraint...");
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
    `);

    console.log("✅ Migration applied successfully!");
  } catch (error) {
    console.error("❌ Error applying migration:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
