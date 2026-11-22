// Edge middleware for UX route protection.
// SECURITY NOTE: this only does cheap cookie-presence + role-routing checks
// so users don't land on pages they can't use. The real authorization happens
// server-side: every Server Action calls requireRole() which re-reads the
// role from the database. A forged role cookie can pass middleware but will
// be rejected when any data mutation is attempted.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rolesForPath, dashboardForRole } from "@/lib/rbac";
import { SESSION_COOKIE, ROLE_COOKIE, Role } from "@/lib/constants";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  const role = req.cookies.get(ROLE_COOKIE)?.value as Role | undefined;
  const hasSession = Boolean(session);

  // Logged-in users hitting /login go to their role dashboard.
  if (path === "/login") {
    if (hasSession && role) {
      return NextResponse.redirect(new URL(dashboardForRole(role), req.url));
    }
    return NextResponse.next();
  }

  // Root + shared dashboard require a session.
  if (path === "/" || path === "/dashboard") {
    if (!hasSession) return NextResponse.redirect(new URL("/login", req.url));
    return NextResponse.next();
  }

  const allowed = rolesForPath(path);
  if (!allowed) return NextResponse.next(); // unguarded; server enforces auth

  if (!hasSession) return NextResponse.redirect(new URL("/login", req.url));
  if (role && !allowed.includes(role)) {
    return NextResponse.redirect(new URL(dashboardForRole(role), req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|map|woff|woff2|ttf)$).*)",
  ],
};
