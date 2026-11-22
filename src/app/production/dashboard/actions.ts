"use server";

import { requireRole } from "@/lib/session";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { inr } from "@/lib/currency";
import { PRODUCTION_STATUS, ITEM_CATEGORY } from "@/lib/constants";

export async function getProductionDashboardData() {
  const user = await requireRole(ROLES.PRODUCTION, ROLES.ADMIN, ROLES.OWNER);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [recentRuns, inventory, boms] = await Promise.all([
    prisma.productionRun.findMany({
      where: { status: { not: PRODUCTION_STATUS.REVERSED } },
      include: { product: { select: { name: true } } },
      orderBy: { productionDate: "desc" },
      take: 10,
    }),
    prisma.inventoryItem.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true, category: true, unit: true, currentStock: true, reorderLevel: true, avgRate: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.bOM.findMany({
      where: { status: "ACTIVE" },
      include: { product: { select: { name: true } }, items: { include: { item: { select: { name: true, unit: true } } } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  const rawMaterials = inventory.filter((i) => i.category === ITEM_CATEGORY.RAW_MATERIAL);
  const packaging = inventory.filter((i) => i.category === ITEM_CATEGORY.PACKAGING);
  const finishedGoods = inventory.filter((i) => i.category === ITEM_CATEGORY.FINISHED_GOOD);

  const lowStock = inventory.filter((item) => item.reorderLevel !== null && Number(item.currentStock) <= Number(item.reorderLevel));
  const postedRuns = recentRuns.filter((r) => r.status === PRODUCTION_STATUS.POSTED);
  const draftRuns = recentRuns.filter((r) => r.status === PRODUCTION_STATUS.DRAFT);
  const producedThisMonth = postedRuns
    .filter((run) => run.productionDate >= monthStart)
    .reduce((total, run) => total + Number(run.actualGoodOutput), 0);
  const avgCostPerPacket = postedRuns.length > 0
    ? postedRuns.reduce((sum, run) => sum + Number(run.costPerPacket), 0) / postedRuns.length
    : 0;

  return {
    user,
    stats: {
      postedRuns: postedRuns.length,
      draftRuns: draftRuns.length,
      producedThisMonth,
      avgCostPerPacket: inr(avgCostPerPacket),
      lowStockCount: lowStock.length,
      activeBoms: boms.length,
      rawMaterialItems: rawMaterials.length,
      packagingItems: packaging.length,
      fgItems: finishedGoods.length,
    },
    recentRuns,
    lowStock,
    boms,
    rawMaterials: rawMaterials.slice(0, 5),
    packaging: packaging.slice(0, 5),
    finishedGoods: finishedGoods.slice(0, 5),
  };
}