import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type pg from "pg";
import type { Guards } from "./auth.js";

export const adminRoutes: FastifyPluginAsyncZod<{ db: pg.Pool; guards: Guards }> = async (
  app,
  { db, guards },
) => {
  const adminOnly = guards.requireRole("admin");

  app.get(
    "/api/users",
    { schema: { tags: ["admin"] }, preHandler: adminOnly },
    async () => {
      const { rows } = await db.query(
        `SELECT id, email, full_name AS "fullName", role, disabled_at AS "disabledAt"
         FROM users ORDER BY role, email`,
      );
      return { users: rows };
    },
  );

  app.get(
    "/api/audit-logs",
    { schema: { tags: ["admin"] }, preHandler: adminOnly },
    async () => {
      const { rows } = await db.query(
        `SELECT id, actor_id AS "actorId", action, entity, entity_id AS "entityId", metadata, at
         FROM audit_logs ORDER BY id DESC LIMIT 200`,
      );
      return { logs: rows };
    },
  );
};
