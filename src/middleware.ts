import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySession } from "@/lib/session";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Public passthroughs even under a protected prefix. The Telegram webhook
// carries its own auth (a secret header + an owner-id check) since the
// request comes from Telegram's servers, not a logged-in browser.
const PUBLIC_PATHS = new Set([
  "/admin/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/telegram/webhook",
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const isAdminPage = pathname.startsWith("/admin");
  const isApiMutation = pathname.startsWith("/api/") && !SAFE_METHODS.has(req.method);
  const isAdminApiRead =
    pathname === "/api/stats" ||
    pathname === "/api/auth/me" ||
    pathname.startsWith("/api/admin") ||
    (pathname.startsWith("/api/posts") && pathname.includes("/versions"));

  if (!isAdminPage && !isApiMutation && !isAdminApiRead) {
    return NextResponse.next();
  }

  const session = await verifySession(req.cookies.get(COOKIE_NAME)?.value);
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", req.url);
  if (pathname !== "/admin") loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
