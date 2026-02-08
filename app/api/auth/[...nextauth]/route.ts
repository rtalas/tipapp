import { handlers } from "@/auth";
import { NextRequest } from "next/server";
import { getClientIp, checkLoginRateLimit, recordFailedLogin } from "@/lib/rate-limit";

export const { GET } = handlers;

export async function POST(request: NextRequest) {
  const isCredentialLogin = request.nextUrl.pathname.endsWith("/callback/credentials");
  let ip: string | undefined;

  // Only rate-limit credential sign-in attempts
  if (isCredentialLogin) {
    ip = getClientIp(request);
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

  const response = await handlers.POST(request);

  // Record only failed login attempts (Auth.js redirects with ?error= on failure)
  if (isCredentialLogin && ip) {
    const location = response.headers.get('location');
    if (location?.includes('error=')) {
      recordFailedLogin(ip);
    }
  }

  return response;
}
