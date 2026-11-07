import type { Queryable } from "./database.js";

export interface AuditEntry {
  actorId: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function audit(db: Queryable, entry: AuditEntry): Promise<void> {
  await db.query(
    `INSERT INTO audit_logs (actor_id, action, entity, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      entry.actorId,
      entry.action,
      entry.entity ?? null,
      entry.entityId ?? null,
      JSON.stringify(entry.metadata ?? {}),
    ],
  );
}
