import { NextResponse } from "next/server";

const ADMIN_PUBLIC_ROUTES = ["/admin/login"];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Only gate /admin/* routes — the customer storefront is unrelated to
  // this cookie and has its own separate auth, not handled here.
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const hasRefreshCookie = request.cookies.has("refreshToken");
  const isPublicOnlyRoute = ADMIN_PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (!hasRefreshCookie && !isPublicOnlyRoute) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasRefreshCookie && isPublicOnlyRoute) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};