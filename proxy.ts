import { auth } from "@/auth";

// Routes that don't require authentication
const publicRoutes = ["/login", "/register", "/api/auth", "/api/register"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (!req.auth && !isPublicRoute) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export const preferredRegion = "auto";
