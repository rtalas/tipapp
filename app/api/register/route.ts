import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { isPrismaError, handlePrismaError } from "@/lib/error-handler";
import { NextRequest, NextResponse } from "next/server";
import { AuditLogger } from "@/lib/logging/audit-logger";
import { sendRegistrationConfirmationEmail } from "@/lib/email/email";
import { getClientIp, checkRegistrationRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit registration by IP
  const ip = getClientIp(request);
  const { limited, retryAfterMs } = checkRegistrationRateLimit(ip);

  if (limited) {
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": retryAfterSeconds.toString() },
      }
    );
  }

  try {
    const body = await request.json();

    // Validate input
    const validatedData = registerSchema.parse(body);

    // Hash password
    const hashedPassword = await hash(validatedData.password, 12);

    // Create user atomically — unique constraints on username/email
    // prevent duplicates without a separate check (no TOCTOU race)
    let user;
    try {
      user = await prisma.user.create({
        data: {
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          username: validatedData.username,
          email: validatedData.email.toLowerCase(),
          password: hashedPassword,
          isSuperadmin: false,
          notifyHours: 0, // Default: notifications turned off (stored as minutes)
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0];
        if (field === 'username') {
          return NextResponse.json(
            { error: "Username already taken" },
            { status: 400 }
          );
        }
        if (field === 'email') {
          return NextResponse.json(
            { error: "Email already registered" },
            { status: 400 }
          );
        }
      }
      throw error;
    }

    // Audit log (fire-and-forget)
    AuditLogger.userRegistered(user.id, user.username, user.email).catch((err) =>
      console.error("Audit log failed:", err)
    );

    // Send registration confirmation email (fire-and-forget)
    sendRegistrationConfirmationEmail({
      email: user.email,
      username: user.username,
      firstName: user.firstName,
    }).catch((err) =>
      console.error("Registration confirmation email failed:", err)
    );

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle Prisma errors with type guards
    if (isPrismaError(error)) {
      const prismaErrorResponse = handlePrismaError(error);
      return NextResponse.json(
        { error: prismaErrorResponse.message },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      // Zod validation error
      if (error.message.includes("validation")) {
        return NextResponse.json(
          { error: "Invalid input data" },
          { status: 400 }
        );
      }

      console.error("Registration error:", error.message);
    } else {
      console.error("Registration error:", error);
    }
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
