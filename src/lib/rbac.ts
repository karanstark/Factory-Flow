// Route -> allowed roles map, used by edge middleware for UX routing.
// This is NOT the authorization boundary: every Server Action re-checks the
// role via requireRole() against the DB. Middleware only prevents obvious
// navigation mistakes (e.g. a salesman clicking an admin URL).
import { ROLES, Role } from "./constants";

export interface RouteGuard {
  prefix: string;
  roles: Role[];
}

// Order matters: first matching prefix wins.
export const ROUTE_GUARDS: RouteGuard[] = [
  { prefix: "/salesman", roles: [ROLES.SALESMAN] },
  { prefix: "/admin", roles: [ROLES.ADMIN] },
  { prefix: "/production", roles: [ROLES.PRODUCTION] },
  { prefix: "/inventory", roles: [ROLES.ADMIN, ROLES.PRODUCTION, ROLES.OWNER, ROLES.ACCOUNTANT] },
  { prefix: "/orders", roles: [ROLES.SALESMAN, ROLES.ADMIN, ROLES.OWNER, ROLES.ACCOUNTANT] },
  { prefix: "/invoices", roles: [ROLES.SALESMAN, ROLES.ADMIN, ROLES.OWNER, ROLES.ACCOUNTANT] },
  { prefix: "/costing", roles: [ROLES.PRODUCTION, ROLES.ACCOUNTANT, ROLES.OWNER, ROLES.ADMIN] },
  { prefix: "/payments", roles: [ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.OWNER] },
  { prefix: "/reports", roles: [ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.OWNER, ROLES.PRODUCTION] },
  { prefix: "/settings", roles: [ROLES.ADMIN, ROLES.OWNER] },
];

/** Roles allowed for a path, or null if the path is not guarded. */
export function rolesForPath(path: string): Role[] | null {
  for (const g of ROUTE_GUARDS) {
    if (path === g.prefix || path.startsWith(g.prefix + "/")) {
      return g.roles;
    }
  }
  return null;
}

/** Default landing dashboard for a role (post-login / unauthorized redirect). */
export function dashboardForRole(role: Role): string {
  switch (role) {
    case ROLES.SALESMAN:
      return "/salesman/dashboard";
    case ROLES.PRODUCTION:
      return "/production/dashboard";
    case ROLES.ACCOUNTANT:
      return "/reports";
    case ROLES.OWNER:
      return "/dashboard";
    case ROLES.ADMIN:
    default:
      return "/admin/dashboard";
  }
}
