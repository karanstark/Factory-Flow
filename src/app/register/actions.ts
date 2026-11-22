"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { setSession } from "@/lib/session";
import { dashboardForRole } from "@/lib/rbac";
import { ROLES, Role } from "@/lib/constants";

export async function registerAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = (String(formData.get("role") ?? ROLES.SALESMAN)) as Role;

  // Public self-registration is limited to floor roles; office roles
  // (admin/owner/accountant) are provisioned by an admin under /admin/users.
  if (role !== ROLES.SALESMAN && role !== ROLES.PRODUCTION) {
    redirect("/register?error=role");
  }

  if (!email || !password || !name) {
    redirect("/register?error=missing");
  }

  if (password.length < 8) {
    redirect("/register?error=short");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect("/register?error=exists");
  }

  const { hash, salt } = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      role,
      passwordHash: hash,
      salt,
      active: true,
    },
  });

  await setSession(user.id, user.role as Role);
  redirect(dashboardForRole(user.role as Role));
}