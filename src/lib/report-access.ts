// Shared role check for report/export route handlers. Mirrors the /reports
// page guard: ADMIN, ACCOUNTANT, OWNER, PRODUCTION.
import { getSessionUser, type SessionUser } from "./session";
import { ROLES } from "./constants";

const REPORT_ROLES: string[] = [ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.OWNER, ROLES.PRODUCTION];

export async function requireReportAccess(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user || !REPORT_ROLES.includes(user.role)) return null;
  return user;
}
