import {
  canTransition,
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  SEVERITIES,
  type IncidentStatus,
  type PublicUser,
} from "@bantaybuhay/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type pg from "pg";
import { z } from "zod";
import { audit } from "./audit.js";
import type { Guards } from "./auth.js";
import type { Notifier } from "./realtime.js";

const COLUMNS = `incidents.id, incidents.incident_type AS "incidentType", incidents.severity,
  incidents.status, incidents.description, ST_Y(incidents.location) AS latitude,
  ST_X(incidents.location) AS longitude, incidents.barangay_psgc AS "barangayPsgc",
  barangays.name AS "barangayName", incidents.detected_at AS "detectedAt",
  incidents.source, cameras.name AS "cameraName",
  (SELECT detections.id FROM detections
   WHERE detections.incident_id = incidents.id AND detections.snapshot_path IS NOT NULL
   ORDER BY detections.captured_at DESC LIMIT 1) AS "snapshotDetectionId",
  incidents.acknowledged_at AS "acknowledgedAt", incidents.resolved_at AS "resolvedAt",
  COALESCE((SELECT json_agg(json_build_object('id', users.id, 'fullName', users.full_name)
              ORDER BY assignments.assigned_at)
            FROM assignments JOIN users ON users.id = assignments.responder_id
            WHERE assignments.incident_id = incidents.id AND assignments.released_at IS NULL),
           '[]') AS responders`;
const FROM = `incidents
  LEFT JOIN barangays ON barangays.psgc = incidents.barangay_psgc
  LEFT JOIN cameras ON cameras.id = incidents.camera_id`;

const ASSIGNABLE: readonly IncidentStatus[] = ["verified", "dispatched", "on_scene"];
const RESPONDER_MAY_SET: readonly IncidentStatus[] = ["on_scene", "resolved"];
const CLOSED: readonly IncidentStatus[] = ["resolved", "dismissed"];

const idParams = z.object({ id: z.uuid() });

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export async function inTransaction<T>(db: pg.Pool, work: (client: pg.PoolClient) => Promise<T>) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Locks the row, so simultaneous changes to one incident happen one at a time.
async function lockStatus(client: pg.PoolClient, id: string): Promise<IncidentStatus> {
  const { rows } = await client.query<{ status: IncidentStatus }>(
    "SELECT status FROM incidents WHERE id = $1 FOR UPDATE",
    [id],
  );
  if (!rows[0]) throw new HttpError(404, "Incident not found");
  return rows[0].status;
}

async function isAssigned(db: pg.Pool | pg.PoolClient, incidentId: string, responderId: string) {
  const { rowCount } = await db.query(
    `SELECT 1 FROM assignments
     WHERE incident_id = $1 AND responder_id = $2 AND released_at IS NULL`,
    [incidentId, responderId],
  );
  return rowCount !== 0;
}

export async function readIncident(db: pg.Pool | pg.PoolClient, id: string) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM ${FROM} WHERE incidents.id = $1`, [id]);
  return rows[0];
}

async function changeStatus(
  db: pg.Pool,
  user: PublicUser,
  id: string,
  to: IncidentStatus,
  note?: string,
) {
  if (user.role === "responder" && !RESPONDER_MAY_SET.includes(to)) {
    throw new HttpError(403, "Only an operator can make this change");
  }
  return inTransaction(db, async (client) => {
    const from = await lockStatus(client, id);
    if (user.role === "responder" && !(await isAssigned(client, id, user.id))) {
      // The same answer as a missing incident, so its existence isn't revealed.
      throw new HttpError(404, "Incident not found");
    }
    if (!canTransition(from, to)) {
      throw new HttpError(409, `Can't change an incident from ${from} to ${to}`);
    }
    if (to === "dispatched") {
      const { rowCount } = await client.query(
        "SELECT 1 FROM assignments WHERE incident_id = $1 AND released_at IS NULL",
        [id],
      );
      if (!rowCount) throw new HttpError(409, "Assign a responder before dispatching");
    }

    await client.query(
      `UPDATE incidents SET status = $2,
         resolved_at = CASE WHEN $2 = 'resolved' THEN now() ELSE resolved_at END
       WHERE id = $1`,
      [id, to],
    );
    // Kept so the released responders still hear that their incident closed.
    let released: string[] = [];
    if (CLOSED.includes(to)) {
      const result = await client.query<{ responderId: string }>(
        `UPDATE assignments SET released_at = now()
         WHERE incident_id = $1 AND released_at IS NULL
         RETURNING responder_id AS "responderId"`,
        [id],
      );
      released = result.rows.map((row) => row.responderId);
    }
    await client.query(
      `INSERT INTO incident_events (incident_id, actor_id, from_status, to_status, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, user.id, from, to, note ?? null],
    );
    await audit(client, {
      actorId: user.id,
      action: "incident.status_changed",
      entity: "incident",
      entityId: id,
      metadata: { from, to },
    });
    return { incident: await readIncident(client, id), released };
  });
}

async function assignResponder(db: pg.Pool, user: PublicUser, id: string, responderId: string) {
  return inTransaction(db, async (client) => {
    const status = await lockStatus(client, id);
    if (!ASSIGNABLE.includes(status)) {
      throw new HttpError(409, `Can't assign a responder while an incident is ${status}`);
    }
    const responder = await client.query(
      "SELECT 1 FROM users WHERE id = $1 AND role = 'responder' AND disabled_at IS NULL",
      [responderId],
    );
    if (!responder.rowCount) throw new HttpError(422, "That user isn't an active responder");

    const { rows } = await client.query(
      `INSERT INTO assignments (incident_id, responder_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (incident_id, responder_id) WHERE released_at IS NULL DO NOTHING
       RETURNING id, incident_id AS "incidentId", responder_id AS "responderId",
                 assigned_at AS "assignedAt"`,
      [id, responderId, user.id],
    );
    if (!rows[0]) throw new HttpError(409, "That responder is already assigned");

    await audit(client, {
      actorId: user.id,
      action: "incident.responder_assigned",
      entity: "incident",
      entityId: id,
      metadata: { responderId },
    });
    return { assignment: rows[0], incident: await readIncident(client, id) };
  });
}

export interface IncidentRouteOptions {
  db: pg.Pool;
  guards: Guards;
  notify: Notifier;
}

export const incidentRoutes: FastifyPluginAsyncZod<IncidentRouteOptions> = async (
  app,
  { db, guards, notify },
) => {
  const operators = guards.requireRole("admin", "operator");
  const staff = guards.requireRole("admin", "operator", "responder");

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({ error: error.message });
    }
    throw error;
  });

  app.post(
    "/api/incidents",
    {
      preHandler: operators,
      schema: {
        tags: ["incidents"],
        body: z.object({
          incidentType: z.enum(INCIDENT_TYPES),
          severity: z.enum(SEVERITIES),
          description: z.string().max(2000).optional(),
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
        }),
      },
    },
    async (request, reply) => {
      const { incidentType, severity, description, latitude, longitude } = request.body;
      const user = request.user!;
      const incident = await inTransaction(db, async (client) => {
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO incidents
             (incident_type, severity, description, location, created_by, barangay_psgc)
           VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6,
             (SELECT psgc FROM barangays
              WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint($4, $5), 4326)) LIMIT 1))
           RETURNING id`,
          [incidentType, severity, description ?? null, longitude, latitude, user.id],
        );
        const id = rows[0]!.id;
        await client.query(
          `INSERT INTO incident_events (incident_id, actor_id, to_status)
           VALUES ($1, $2, 'detected')`,
          [id, user.id],
        );
        await audit(client, {
          actorId: user.id,
          action: "incident.reported",
          entity: "incident",
          entityId: id,
        });
        return readIncident(client, id);
      });
      notify.incident("incident.created", incident);
      return reply.code(201).send({ incident });
    },
  );

  app.get(
    "/api/incidents",
    { preHandler: staff, schema: { tags: ["incidents"] } },
    async (request) => {
      const user = request.user!;
      const { rows } =
        user.role === "responder"
          ? await db.query(
              `SELECT ${COLUMNS} FROM ${FROM}
               JOIN assignments ON assignments.incident_id = incidents.id
               WHERE assignments.responder_id = $1 AND assignments.released_at IS NULL
               ORDER BY incidents.detected_at DESC LIMIT 200`,
              [user.id],
            )
          : await db.query(
              `SELECT ${COLUMNS} FROM ${FROM} ORDER BY incidents.detected_at DESC LIMIT 200`,
            );
      return { incidents: rows };
    },
  );

  app.get(
    "/api/incidents/:id",
    { preHandler: staff, schema: { tags: ["incidents"], params: idParams } },
    async (request) => {
      const { id } = request.params;
      const user = request.user!;
      const incident = await readIncident(db, id);
      const hidden = user.role === "responder" && !(await isAssigned(db, id, user.id));
      if (!incident || hidden) throw new HttpError(404, "Incident not found");
      const events = await db.query(
        `SELECT from_status AS "fromStatus", to_status AS "toStatus", note, actor_id AS "actorId", at
         FROM incident_events WHERE incident_id = $1 ORDER BY at, id`,
        [id],
      );
      return { incident, events: events.rows };
    },
  );

  app.post(
    "/api/incidents/:id/status",
    {
      preHandler: staff,
      schema: {
        tags: ["incidents"],
        params: idParams,
        body: z.object({ to: z.enum(INCIDENT_STATUSES), note: z.string().max(2000).optional() }),
      },
    },
    async (request) => {
      const { to, note } = request.body;
      const { incident, released } = await changeStatus(
        db,
        request.user!,
        request.params.id,
        to,
        note,
      );
      notify.incident("incident.updated", incident, released);
      return { incident };
    },
  );

  app.post(
    "/api/incidents/:id/assignments",
    {
      preHandler: operators,
      schema: {
        tags: ["incidents"],
        params: idParams,
        body: z.object({ responderId: z.uuid() }),
      },
    },
    async (request, reply) => {
      const { assignment, incident } = await assignResponder(
        db,
        request.user!,
        request.params.id,
        request.body.responderId,
      );
      notify.incident("incident.updated", incident);
      return reply.code(201).send({ assignment });
    },
  );

  app.post(
    "/api/incidents/:id/acknowledge",
    { preHandler: operators, schema: { tags: ["incidents"], params: idParams } },
    async (request) => {
      const { id } = request.params;
      const user = request.user!;
      // Only the first acknowledgement is recorded; later ones change nothing.
      const { rowCount } = await db.query(
        `UPDATE incidents SET acknowledged_at = now(), acknowledged_by = $2
         WHERE id = $1 AND acknowledged_at IS NULL`,
        [id, user.id],
      );
      const incident = await readIncident(db, id);
      if (!incident) throw new HttpError(404, "Incident not found");
      if (rowCount) {
        await audit(db, {
          actorId: user.id,
          action: "incident.acknowledged",
          entity: "incident",
          entityId: id,
        });
        notify.incident("incident.updated", incident);
      }
      return { incident };
    },
  );
};
