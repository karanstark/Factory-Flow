"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { clearSession, setSession } from "@/lib/session";
import { dashboardForRole } from "@/lib/rbac";
import type { Role } from "@/lib/constants";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) redirect("/login?error=missing");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active || !verifyPassword(password, user.salt, user.passwordHash)) {
    redirect("/login?error=invalid");
  }

  await setSession(user.id, user.role as Role);
  redirect(dashboardForRole(user.role as Role));
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
