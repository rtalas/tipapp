import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Registration attempt with body:", { ...body, password: "[REDACTED]" });

    // Validate input
    const validatedData = registerSchema.parse(body);
    console.log("Validation passed for:", validatedData.username, validatedData.email);

    // Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: validatedData.username },
          { email: validatedData.email },
        ],
      },
    });

    if (existingUser) {
      console.log("Found existing user:", {
        id: existingUser.id,
        username: existingUser.username,
        email: existingUser.email,
      });
      if (existingUser.username === validatedData.username) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 400 }
        );
      }
      if (existingUser.email === validatedData.email) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await hash(validatedData.password, 12);
    console.log("Creating user:", {
      username: validatedData.username,
      email: validatedData.email,
      firstName: validatedData.firstName,
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        isSuperadmin: false,
        notifyHours: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log("User created successfully:", { id: user.id, username: user.username });

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
    console.error("Registration error:", error);

    // Handle Prisma errors
    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as any;

      // P2002: Unique constraint failed
      if (prismaError.code === "P2002") {
        const field = prismaError.meta?.target?.[0];
        if (field === "username") {
          return NextResponse.json(
            { error: "Username already taken" },
            { status: 400 }
          );
        }
        if (field === "email") {
          return NextResponse.json(
            { error: "Email already registered" },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: "This account information is already registered" },
          { status: 400 }
        );
      }
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
