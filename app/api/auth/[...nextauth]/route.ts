import { handlers } from "@/auth";
import { NextRequest } from "next/server";
import { getClientIp, checkLoginRateLimit } from "@/lib/rate-limit";

export const { GET } = handlers;

export async function POST(request: NextRequest) {
  // Only rate-limit credential sign-in attempts
  if (request.nextUrl.pathname.endsWith("/callback/credentials")) {
    const ip = getClientIp(request);
    const { limited, retryAfterMs } = checkLoginRateLimit(ip);

    if (limited) {
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
      return new Response(
        JSON.stringify({ error: "Too many login attempts. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": retryAfterSeconds.toString(),
          },
        }
      );
    }
  }

  return handlers.POST(request);
}
