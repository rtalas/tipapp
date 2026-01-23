import { auth } from "@/auth";

// Routes that don't require authentication
const publicRoutes = ["/login", "/register", "/forgot-password", "/reset-password", "/api/auth", "/api/register"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Protect admin routes - only superadmins can access /admin/*
  if (pathname.startsWith('/admin')) {
    if (!req.auth?.user?.isSuperadmin) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set('callbackUrl', pathname);
      return Response.redirect(url);
    }
  }

  // League routes: require authentication (membership check in layout)
  const leagueRouteMatch = pathname.match(/^\/(\d+)(\/|$)/);
  if (leagueRouteMatch) {
    if (!req.auth?.user?.id) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set('callbackUrl', pathname);
      return Response.redirect(url);
    }
  }

  // Root route handling
  if (pathname === '/') {
    if (req.auth?.user?.isSuperadmin) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      return Response.redirect(url);
    }
    // For regular users, let the page handle redirect to their league
  }

  // Default: require authentication for non-public routes
  if (!req.auth && !isPublicRoute) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set('callbackUrl', pathname);
    return Response.redirect(url);
  }

  // ===== CSRF PROTECTION =====
  // Verify origin for state-changing requests (POST, PUT, DELETE, PATCH)
  if (
    req.method === 'POST' ||
    req.method === 'PUT' ||
    req.method === 'DELETE' ||
    req.method === 'PATCH'
  ) {
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    const host = req.headers.get('host');

    if (host) {
      const allowedOrigins = [
        `https://${host}`,
        `http://${host}`,
        ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
      ];

      // Check origin header (sent by modern browsers)
      if (origin && !allowedOrigins.some((allowed) => allowed === origin)) {
        console.warn(`[CSRF] Blocked request from origin: ${origin}`);
        return new Response('CSRF validation failed', { status: 403 });
      }

      // Check referer header as additional validation
      if (referer) {
        try {
          const refererUrl = new URL(referer);
          const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
          if (!allowedOrigins.some((allowed) => allowed === refererOrigin)) {
            console.warn(`[CSRF] Blocked request from referer: ${referer}`);
            return new Response('CSRF validation failed', { status: 403 });
          }
        } catch (e) {
          console.warn(`[CSRF] Invalid referer header: ${referer}`);
          return new Response('CSRF validation failed', { status: 403 });
        }
      }
    }
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export const preferredRegion = "auto";
