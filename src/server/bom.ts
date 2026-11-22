// Bill of Materials service.
// The BOM is stored in the DB (never hardcoded in app logic). A BOM defines the
// standard raw + packaging materials for one batch (expectedYield packets).
// To produce a different batch size, planned consumption scales linearly:
//   plannedQty = standardQty * (batchSize / expectedYield)
import { Prisma } from "@prisma/client";
import { z } from "zod";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { D, round2 } from "@/lib/currency";
import { ITEM_CATEGORY } from "@/lib/constants";

export const bomItemSchema = z.object({
  itemId: z.string().min(1),
  standardQuantity: z.number().positive(),
  unit: z.string().min(1),
  wastageTolerance: z.number().nonnegative().optional(),
});

export const bomSchema = z.object({
  productId: z.string().min(1),
  expectedYield: z.number().positive(),
  expectedYieldUnit: z.string().min(1),
  tolerance: z.number().nonnegative().optional().default(3),
  notes: z.string().optional(),
  items: z.array(bomItemSchema).min(1),
});

export type BomInput = z.infer<typeof bomSchema>;

export interface PlannedConsumption {
  itemId: string;
  itemName: string;
  category: string;
  unit: string;
  plannedQuantity: Decimal;
  isPackaging: boolean;
  wastageTolerance?: number;
}

/** Create (or version-up) a BOM. Existing versions remain so history is kept. */
export async function createBom(input: BomInput, userId?: string) {
  const data = bomSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    // Next version for this product.
    const latest = await tx.bOM.findFirst({
      where: { productId: data.productId },
      orderBy: { version: "desc" },
    });
    const version = (latest?.version ?? 0) + 1;

    const bom = await tx.bOM.create({
      data: {
        productId: data.productId,
        version,
        expectedYield: data.expectedYield,
        expectedYieldUnit: data.expectedYieldUnit,
        tolerance: data.tolerance,
        notes: data.notes ?? null,
        createdBy: userId ?? null,
        status: "ACTIVE",
        items: {
          create: data.items.map((it) => ({
            itemId: it.itemId,
            standardQuantity: it.standardQuantity,
            unit: it.unit,
            wastageTolerance: it.wastageTolerance ?? null,
          })),
        },
      },
      include: { items: { include: { item: true } }, product: true },
    });
    return bom;
  });
}

export async function getActiveBom(productId: string) {
  return prisma.bOM.findFirst({
    where: { productId, status: "ACTIVE" },
    orderBy: { version: "desc" },
    include: { items: { include: { item: true } } },
  });
}

export async function listBoms() {
  return prisma.bOM.findMany({
    include: { product: true, items: { include: { item: true } } },
    orderBy: [{ productId: "asc" }, { version: "desc" }],
  });
}

/** Scale a BOM's standard quantities to a target batch size. */
export function planConsumptionForBatch(
  bom: { expectedYield: Decimal.Value; items: { itemId: string; item: { name: string; category: string }; standardQuantity: Decimal.Value; unit: string; wastageTolerance?: Decimal.Value | null }[] },
  batchSize: Decimal.Value,
): PlannedConsumption[] {
  const scale = D(bom.expectedYield).isZero()
    ? new Decimal(1)
    : D(batchSize).div(bom.expectedYield);
  return bom.items.map((it) => ({
    itemId: it.itemId,
    itemName: it.item.name,
    category: it.item.category,
    unit: it.unit,
    plannedQuantity: round2(D(it.standardQuantity).times(scale)),
    isPackaging: it.item.category === ITEM_CATEGORY.PACKAGING,
    wastageTolerance: it.wastageTolerance ? Number(it.wastageTolerance) : undefined,
  }));
}
