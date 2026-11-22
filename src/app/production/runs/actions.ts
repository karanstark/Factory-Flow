"use server";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";
import { createProductionRun, postProductionRun } from "@/server/production";
import type { CreateRunInput, PostRunInput } from "@/server/production";

export interface ActionResult {
  ok: boolean;
  error?: string;
  runId?: string;
}

export async function getProductionProducts() {
  const user = await requireRole(ROLES.PRODUCTION, ROLES.ADMIN, ROLES.OWNER);
  const boms = await prisma.bOM.findMany({
    where: { status: "ACTIVE" },
    include: {
      product: { include: { inventoryItem: { select: { currentStock: true } } } },
      items: { include: { item: { select: { name: true, unit: true, category: true, currentStock: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return { user, boms };
}

export async function createRunAction(input: CreateRunInput): Promise<ActionResult> {
  const user = await requireRole(ROLES.PRODUCTION, ROLES.ADMIN, ROLES.OWNER);
  try {
    const run = await createProductionRun(input, user.id);
    return { ok: true, runId: run.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create run." };
  }
}

export async function getRunDetail(runId: string) {
  const user = await requireRole(ROLES.PRODUCTION, ROLES.ADMIN, ROLES.OWNER);
  const run = await prisma.productionRun.findUniqueOrThrow({
    where: { id: runId },
    include: {
      product: { include: { inventoryItem: { select: { currentStock: true } } } },
      bom: { include: { items: { include: { item: true } } } },
      consumption: { include: { item: true } },
      costLines: { include: { item: { select: { name: true } } } },
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
  });
  return { user, run };
}

export async function postRunAction(runId: string, input: PostRunInput): Promise<ActionResult> {
  const user = await requireRole(ROLES.PRODUCTION, ROLES.ADMIN, ROLES.OWNER);
  try {
    await postProductionRun(runId, input, user.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Posting failed." };
  }
}
