import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signInSchema } from "@/lib/validation";
import { AuditLogger } from "@/lib/audit-logger";

export const { handlers, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "jsmith" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const validatedCredentials = signInSchema.parse(credentials);

          // Find user by username or email (email is case-insensitive)
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { username: validatedCredentials.username },
                { email: validatedCredentials.username.toLowerCase() },
              ],
            },
          });

          if (!user) {
            // Audit log failed login (fire-and-forget)
            AuditLogger.loginFailed(
              validatedCredentials.username,
              "User not found"
            ).catch((err) => console.error("Audit log failed:", err));

            return null;
          }

          // Compare passwords using bcryptjs
          const isPasswordValid = await compare(
            validatedCredentials.password,
            user.password
          );

          if (!isPasswordValid) {
            // Audit log failed login (fire-and-forget)
            AuditLogger.loginFailed(
              validatedCredentials.username,
              "Invalid password"
            ).catch((err) => console.error("Audit log failed:", err));

            return null;
          }

          // Audit log successful login (fire-and-forget)
          AuditLogger.loginSuccess(user.id, user.username).catch((err) =>
            console.error("Audit log failed:", err)
          );

          return {
            id: user.id.toString(),
            username: user.username,
            email: user.email,
            isSuperadmin: Boolean(user.isSuperadmin),
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.isSuperadmin = user.isSuperadmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.isSuperadmin = token.isSuperadmin as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
});
