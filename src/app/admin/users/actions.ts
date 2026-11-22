"use server";

import { requireRole } from "@/lib/session";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function createUserAction(formData: FormData) {
  await requireRole(ROLES.ADMIN, ROLES.OWNER);

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? ROLES.SALESMAN);

  if (!email || !password || !name) {
    redirect("/admin/users?error=missing");
  }

  if (password.length < 8) {
    redirect("/admin/users?error=short");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect("/admin/users?error=exists");
  }

  const { hash, salt } = await hashPassword(password);

  await prisma.user.create({
    data: {
      email,
      name,
      role,
      passwordHash: hash,
      salt,
      active: true,
    },
  });

  redirect("/admin/users?success=created");
}

export async function toggleUserActiveAction(formData: FormData) {
  await requireRole(ROLES.ADMIN, ROLES.OWNER);

  const userId = String(formData.get("userId") ?? "");
  const active = String(formData.get("active") ?? "true") === "true";

  if (!userId) {
    redirect("/admin/users?error=missing");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { active: !active },
  });

  redirect("/admin/users?success=toggled");
}

export async function deleteUserAction(formData: FormData) {
  await requireRole(ROLES.ADMIN, ROLES.OWNER);

  const userId = String(formData.get("userId") ?? "");

  if (!userId) {
    redirect("/admin/users?error=missing");
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  redirect("/admin/users?success=deleted");
}