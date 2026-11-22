// Audit trail helper. Call inside the same transaction as the business change
// so the audit row commits or rolls back with the operation it records.
import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export interface AuditInput {
  userId?: string | null;
  action: string; // CREATE | UPDATE | DELETE | POST | APPROVE | REJECT | REVERSE
  entityType: string;
  entityId?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  remarks?: string;
}

export async function logAudit(tx: Tx, input: AuditInput) {
  return tx.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      previousValue:
        input.previousValue !== undefined
          ? JSON.stringify(input.previousValue)
          : null,
      newValue: input.newValue !== undefined ? JSON.stringify(input.newValue) : null,
      remarks: input.remarks ?? null,
    },
  });
}
