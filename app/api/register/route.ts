import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { isPrismaError, handlePrismaError } from "@/lib/error-handler";
import { NextRequest, NextResponse } from "next/server";
import { AuditLogger } from "@/lib/logging/audit-logger";
import { sendRegistrationConfirmationEmail } from "@/lib/email/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = registerSchema.parse(body);

    // Check if username or email already exists (email is case-insensitive)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: validatedData.username },
          { email: validatedData.email.toLowerCase() },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.username === validatedData.username) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 400 }
        );
      }
      if (existingUser.email.toLowerCase() === validatedData.email.toLowerCase()) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await hash(validatedData.password, 12);

    // Create user (store email in lowercase for case-insensitive comparisons)
    const user = await prisma.user.create({
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

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
