import { auth } from "@/auth";
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import { NextRequest, NextResponse } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/api/auth", "/api/register"];

// Locale configuration
const locales = ['en', 'cs'] as const;
const defaultLocale = 'en';
const cookieName = 'NEXT_LOCALE';

function getLocale(request: NextRequest): string {
  // 1. Check cookie first (user preference)
  const cookieLocale = request.cookies.get(cookieName)?.value;
  if (cookieLocale && locales.includes(cookieLocale as typeof locales[number])) {
    return cookieLocale;
  }

  // 2. Check Accept-Language header (browser/system preference)
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    try {
      const headers = { 'accept-language': acceptLanguage };
      const languages = new Negotiator({ headers }).languages();
      return match(languages, [...locales], defaultLocale);
    } catch {
      // If matching fails, fall through to default
    }
  }

  // 3. Default to English
  return defaultLocale;
}

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

  // Root route handling - let the page handle redirect to league or available leagues
  // Admins can access user view via the root route, and can switch to admin via the menu

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
        } catch {
          console.warn(`[CSRF] Invalid referer header: ${referer}`);
          return new Response('CSRF validation failed', { status: 403 });
        }
      }
    }
  }

  // ===== LOCALE DETECTION =====
  // Detect user's preferred locale
  const locale = getLocale(req as unknown as NextRequest);

  // Set locale in request headers for Server Components to access
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-locale', locale);

  // Create response with modified headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set locale cookie if not already set or different
  const currentCookie = req.cookies.get(cookieName)?.value;
  if (currentCookie !== locale) {
    response.cookies.set(cookieName, locale, {
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  return response;
});

export const config = {
  // Exclude static files and PWA assets from middleware processing
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons/).*)"],
};

export const preferredRegion = "auto";
