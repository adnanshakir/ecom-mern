import { NextResponse } from "next/server";

const PUBLIC_ONLY_ROUTES = ["/login"];

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const hasRefreshCookie = request.cookies.has("refreshToken");

  const isPublicOnlyRoute = PUBLIC_ONLY_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Logged out and hitting a protected route → bounce to login.
  if (!hasRefreshCookie && !isPublicOnlyRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already logged in and hitting login → send to dashboard.
  if (hasRefreshCookie && isPublicOnlyRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except static assets/api routes/Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};