// Production management — the highest-weight module.
//
// createProductionRun: builds a DRAFT run with consumption rows planned from
//   the active BOM (scaled to batch size). No stock moves. Drafts are editable.
//
// postProductionRun: one atomic transaction that
//   - rejects double-posting (must be DRAFT),
//   - issues raw + packaging materials (PRODUCTION_ISSUE),
//   - records damaged packaging as a separate DAMAGE movement,
//   - receives finished goods (PRODUCTION_RECEIPT) at the computed cost/packet,
//   - computes planned-vs-actual consumption variance per line,
//   - computes the full costing snapshot (ProductionCostLine),
//   - refuses negative stock,
//   - writes an audit row.
//
// Historical posted runs are never silently edited; reversal creates REVERSAL
// movements and marks the run REVERSED (a new run would be posted to repost).
import { Prisma } from "@prisma/client";
import { z } from "zod";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { D, round2 } from "@/lib/currency";
import {
  MOVEMENT_TYPES,
  SOURCE_DOC,
  ITEM_CATEGORY,
  PRODUCTION_STATUS,
} from "@/lib/constants";
import {
  consumptionVariancePct,
  yieldVariancePct,
  flagForVariance,
} from "@/lib/inventory-math";
import { postStockMovement } from "./stock";
import { logAudit } from "./audit";
import { computeRunCost, type CostMaterialLine } from "./costing";

export const createRunSchema = z.object({
  productId: z.string().min(1),
  bomId: z.string().min(1),
  batchSize: z.number().positive(), // targeted expected output
  productionDate: z.string().min(1),
});

export const postRunSchema = z.object({
  consumption: z
    .array(
      z.object({
        itemId: z.string(),
        actualQuantity: z.number().nonnegative(),
      }),
    )
    .min(1),
  actualGoodOutput: z.number().nonnegative(),
  damagedPackaging: z.number().nonnegative().default(0),
  damagedItemId: z.string().optional().nullable(),
  scrapWastage: z.number().nonnegative().default(0),
  labourCost: z.number().nonnegative().default(0),
  gasPowerCost: z.number().nonnegative().default(0),
  otherOverheads: z.number().nonnegative().default(0),
});

export type CreateRunInput = z.infer<typeof createRunSchema>;
export type PostRunInput = z.input<typeof postRunSchema>;

/** Create a DRAFT production run with planned consumption from the BOM. */
export async function createProductionRun(input: CreateRunInput, userId?: string) {
  const data = createRunSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const bom = await tx.bOM.findUniqueOrThrow({
      where: { id: data.bomId },
      include: { items: { include: { item: true } }, product: true },
    });
    const product = await tx.product.findUniqueOrThrow({
      where: { id: data.productId },
      include: { inventoryItem: true },
    });

    const count = await tx.productionRun.count();
    const runNumber = `PRD-${String(count + 1).padStart(6, "0")}`;

    const scale = D(bom.expectedYield).isZero()
      ? new Decimal(1)
      : D(data.batchSize).div(bom.expectedYield);

    const run = await tx.productionRun.create({
      data: {
        runNumber,
        productId: product.id,
        bomId: bom.id,
        bomVersion: bom.version,
        batchSize: data.batchSize,
        productionDate: new Date(data.productionDate),
        expectedOutput: D(data.batchSize),
        status: PRODUCTION_STATUS.DRAFT,
        createdById: userId ?? null,
        consumption: {
          create: bom.items.map((it) => ({
            itemId: it.itemId,
            // Planned = standard * (batchSize / expectedYield). Default actual
            // to the planned value so the supervisor can tweak from there.
            plannedQuantity: round2(D(it.standardQuantity).times(scale)),
            actualQuantity: round2(D(it.standardQuantity).times(scale)),
            unit: it.unit,
            isPackaging: it.item.category === ITEM_CATEGORY.PACKAGING,
          })),
        },
      },
      include: { consumption: { include: { item: true } }, product: true, bom: true },
    });
    return run;
  });
}

/** Post a DRAFT run: move stock, compute variance + cost, mark POSTED. */
export async function postProductionRun(runId: string, input: PostRunInput, userId?: string) {
  return prisma.$transaction(async (tx) => {
    const run = await tx.productionRun.findUniqueOrThrow({
      where: { id: runId },
      include: {
        consumption: { include: { item: true } },
        product: { include: { inventoryItem: true } },
        bom: true,
      },
    });
    if (run.status !== PRODUCTION_STATUS.DRAFT) {
      throw new Error(`Production run ${run.runNumber} is already posted (status ${run.status}). Cannot post again.`);
    }
    const data = postRunSchema.parse(input);

    // Build an actual-quantity lookup from the input.
    const actualByItem = new Map(data.consumption.map((c) => [c.itemId, D(c.actualQuantity)]));

    // Validate damaged packaging against the damaged item's consumption.
    const damagedQty = D(data.damagedPackaging);
    const damagedItemId = data.damagedItemId ?? null;
    if (damagedQty.gt(0)) {
      if (!damagedItemId) {
        throw new Error("damagedItemId is required when damagedPackaging > 0.");
      }
      const dmgLine = run.consumption.find((c) => c.itemId === damagedItemId);
      if (!dmgLine) {
        throw new Error("damagedItemId does not match any consumption line.");
      }
      const dmgActual = actualByItem.get(damagedItemId) ?? D(dmgLine.actualQuantity);
      if (damagedQty.gt(dmgActual)) {
        throw new Error(
          `Damaged packaging (${damagedQty.toFixed(3)}) cannot exceed actual consumption of that item (${dmgActual.toFixed(3)}).`,
        );
      }
    }

    // Capture each material's weighted-avg rate BEFORE issuing (the rate at
    // which material is valued). Issues don't change the avg rate.
    const materialLines: CostMaterialLine[] = run.consumption.map((c) => {
      const actual = actualByItem.get(c.itemId) ?? D(c.actualQuantity);
      return {
        itemId: c.itemId,
        itemName: c.item.name,
        category: c.item.category,
        quantity: actual,
        rate: new Decimal(c.item.avgRate),
      };
    });

    const cost = computeRunCost(materialLines, {
      labourCost: data.labourCost,
      gasPowerCost: data.gasPowerCost,
      otherOverheads: data.otherOverheads,
      actualGoodOutput: data.actualGoodOutput,
    });

    // 1) Issue materials. For the damaged item, split into PRODUCTION_ISSUE +
    //    DAMAGE so the ledger shows damage explicitly (auditable) while keeping
    //    the total consumed correct.
    for (const c of run.consumption) {
      const actual = actualByItem.get(c.itemId) ?? D(c.actualQuantity);
      if (actual.lte(0)) continue;
      if (c.itemId === damagedItemId && damagedQty.gt(0)) {
        const issueQty = round2(actual.minus(damagedQty));
        if (issueQty.gt(0)) {
          await postStockMovement(tx, {
            itemId: c.itemId,
            movementType: MOVEMENT_TYPES.PRODUCTION_ISSUE,
            quantityOut: issueQty,
            unit: c.unit,
            sourceDocType: SOURCE_DOC.PRODUCTION_RUN,
            sourceDocId: run.id,
            userId,
            remarks: `Production issue ${run.runNumber}`,
          });
        }
        await postStockMovement(tx, {
          itemId: c.itemId,
          movementType: MOVEMENT_TYPES.DAMAGE,
          quantityOut: damagedQty,
          unit: c.unit,
          sourceDocType: SOURCE_DOC.PRODUCTION_RUN,
          sourceDocId: run.id,
          userId,
          remarks: `Damaged packaging ${run.runNumber}`,
        });
      } else {
        await postStockMovement(tx, {
          itemId: c.itemId,
          movementType: MOVEMENT_TYPES.PRODUCTION_ISSUE,
          quantityOut: actual,
          unit: c.unit,
          sourceDocType: SOURCE_DOC.PRODUCTION_RUN,
          sourceDocId: run.id,
          userId,
          remarks: `Production issue ${run.runNumber}`,
        });
      }
    }

    // 2) Receive finished goods at the computed cost per packet.
    const goodOutput = D(data.actualGoodOutput);
    const fgItem = run.product.inventoryItem;
    if (goodOutput.gt(0)) {
      await postStockMovement(tx, {
        itemId: fgItem.id,
        movementType: MOVEMENT_TYPES.PRODUCTION_RECEIPT,
        quantityIn: goodOutput,
        unit: run.product.unit,
        rate: cost.costPerPacket,
        sourceDocType: SOURCE_DOC.PRODUCTION_RUN,
        sourceDocId: run.id,
        userId,
        remarks: `Production receipt ${run.runNumber}`,
      });
    }

    // 3) Update consumption rows with actual quantities + variance.
    const tolerance = run.bom ? await tx.bOM.findUniqueOrThrow({ where: { id: run.bomId! }, select: { tolerance: true } }) : null;
    const tol = tolerance ? Number(tolerance.tolerance) : 3;
    for (const c of run.consumption) {
      const actual = actualByItem.get(c.itemId) ?? D(c.actualQuantity);
      const variance = consumptionVariancePct(actual, c.plannedQuantity);
      await tx.productionConsumption.update({
        where: { id: c.id },
        data: { actualQuantity: round2(actual), variancePct: variance },
      });
    }

    // 4) Persist the costing snapshot (immutable, for historical explainability).
    for (const ml of cost.materialLines) {
      await tx.productionCostLine.create({
        data: {
          productionRunId: run.id,
          itemId: ml.itemId,
          componentType: ml.category, // RAW_MATERIAL | PACKAGING
          description: ml.name,
          quantity: ml.quantity,
          rate: ml.rate,
          amount: ml.amount,
        },
      });
    }
    if (cost.labourCost.gt(0)) {
      await tx.productionCostLine.create({
        data: { productionRunId: run.id, componentType: "LABOUR", description: "Labour", amount: cost.labourCost },
      });
    }
    if (cost.gasPowerCost.gt(0)) {
      await tx.productionCostLine.create({
        data: { productionRunId: run.id, componentType: "GAS_POWER", description: "Gas / Power", amount: cost.gasPowerCost },
      });
    }
    if (cost.otherOverheads.gt(0)) {
      await tx.productionCostLine.create({
        data: { productionRunId: run.id, componentType: "OTHER_OVERHEAD", description: "Other overheads", amount: cost.otherOverheads },
      });
    }

    // 5) Yield variance for the run.
    const yv = yieldVariancePct(goodOutput, run.expectedOutput);

    const updated = await tx.productionRun.update({
      where: { id: run.id },
      data: {
        status: PRODUCTION_STATUS.POSTED,
        actualGoodOutput: goodOutput,
        damagedPackaging: damagedQty,
        scrapWastage: D(data.scrapWastage),
        labourCost: cost.labourCost,
        gasPowerCost: cost.gasPowerCost,
        otherOverheads: cost.otherOverheads,
        totalCost: cost.totalCost,
        costPerPacket: cost.costPerPacket,
        approvedById: userId ?? null,
        postedAt: new Date(),
      },
    });

    await logAudit(tx, {
      userId,
      action: "POST",
      entityType: "ProductionRun",
      entityId: run.id,
      newValue: {
        runNumber: run.runNumber,
        totalCost: cost.totalCost.toFixed(2),
        costPerPacket: cost.costPerPacket.toFixed(2),
        yieldVariancePct: yv.toFixed(2),
      },
      remarks: `Production run ${run.runNumber} posted`,
    });

    return tx.productionRun.findUniqueOrThrow({
      where: { id: updated.id },
      include: {
        consumption: { include: { item: true } },
        costLines: true,
        product: true,
        bom: true,
      },
    });
  });
}

/** Convenience: list runs with consumption + cost lines. */
export async function listRuns() {
  return prisma.productionRun.findMany({
    include: { product: true, consumption: true, bom: true },
    orderBy: { productionDate: "desc" },
  });
}

export async function getRun(id: string) {
  return prisma.productionRun.findUniqueOrThrow({
    where: { id },
    include: {
      consumption: { include: { item: true } },
      costLines: { include: { item: true } },
      product: { include: { inventoryItem: true } },
      bom: true,
    },
  });
}
