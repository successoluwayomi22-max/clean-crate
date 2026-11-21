import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const response = NextResponse.next();

  // Prevent search indexing and client/proxy caching of sensitive operations & lookup routes
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/bookings")
  ) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/bookings/:path*"],
};
