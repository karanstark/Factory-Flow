// Server-side session helpers. The signed ff_session cookie carries an opaque
// token; we ALWAYS re-load the user from the DB (and check active) so the DB
// role is the source of truth — never the cookie. The unsigned ff_role cookie
// is only for edge-middleware UX routing.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { createSessionToken, verifySessionToken } from "./auth";
import { SESSION_COOKIE, ROLE_COOKIE, Role } from "./constants";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/** Current authenticated user, or null. Re-reads role from DB. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.u } });
  if (!user || !user.active) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
  };
}

/** Require any authenticated user; redirect to /login if none. */
export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect("/login");
  return u;
}

/** Require one of the given roles; redirect to /dashboard if unauthorized. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const u = await requireUser();
  if (!roles.includes(u.role)) redirect("/dashboard");
  return u;
}

/** Set session cookies — call from a Server Action (cookies are writable there). */
export async function setSession(userId: string, role: Role): Promise<void> {
  const store = await cookies();
  const token = createSessionToken(userId, role);
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  store.set(ROLE_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

/** Clear session cookies — call from a Server Action. */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(ROLE_COOKIE);
}
