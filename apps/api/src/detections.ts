import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import {
  DETECTION_SEVERITY,
  DETECTION_THRESHOLDS,
  INCIDENT_TYPES,
  type IncidentType,
  type PublicUser,
} from "@bantaybuhay/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type pg from "pg";
import { z } from "zod";
import { audit } from "./audit.js";
import type { Guards } from "./auth.js";
import { HttpError, inTransaction, readIncident } from "./incidents.js";
import type { Notifier } from "./realtime.js";
import type { SnapshotStore } from "./snapshots.js";

const MAX_SNAPSHOT_BYTES = 512 * 1024;
const DETECTION_COLUMNS = `detections.id, detections.camera_id AS "cameraId",
  detections.incident_type AS "incidentType", detections.confidence,
  detections.model_version AS "modelVersion", detections.captured_at AS "capturedAt",
  detections.review_status AS "reviewStatus", detections.incident_id AS "incidentId",
  detections.snapshot_path IS NOT NULL AS "hasSnapshot"`;

interface DetectionRow {
  id: string;
  cameraId: string;
  incidentType: IncidentType;
  reviewStatus: string;
  incidentId: string | null;
}

const digest = (value: string) => createHash("sha256").update(value).digest();

export interface DetectionRouteOptions {
  db: pg.Pool;
  guards: Guards;
  notify: Notifier;
  detectorToken?: string;
  // Where snapshots are kept. Without it, detections that include a snapshot are refused.
  snapshots?: SnapshotStore;
}

// Joins the open incident of the same type from the same camera, or raises a new one.
async function attachOrRaise(client: pg.PoolClient, detection: DetectionRow, actor: PublicUser | null) {
  // One detector at a time per camera and type, so two frames can't raise two incidents.
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
    `${detection.cameraId}:${detection.incidentType}`,
  ]);
  const open = await client.query<{ id: string }>(
    `SELECT id FROM incidents
     WHERE camera_id = $1 AND incident_type = $2 AND status NOT IN ('resolved', 'dismissed')
     ORDER BY detected_at DESC LIMIT 1`,
    [detection.cameraId, detection.incidentType],
  );
  if (open.rows[0]) return { incidentId: open.rows[0].id, raised: false };

  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO incidents
       (incident_type, severity, location, barangay_psgc, camera_id, source, created_by)
     SELECT $2, $3, cameras.location, cameras.barangay_psgc, cameras.id, 'detection', $4
     FROM cameras WHERE cameras.id = $1
     RETURNING id`,
    [detection.cameraId, detection.incidentType, DETECTION_SEVERITY[detection.incidentType], actor?.id ?? null],
  );
  const incidentId = rows[0]!.id;
  await client.query(
    "INSERT INTO incident_events (incident_id, actor_id, to_status, note) VALUES ($1, $2, 'detected', $3)",
    [incidentId, actor?.id ?? null, actor ? "Confirmed from the review queue" : "Raised by camera detection"],
  );
  await audit(client, {
    actorId: actor?.id ?? null,
    action: "incident.detected",
    entity: "incident",
    entityId: incidentId,
    metadata: { detectionId: detection.id },
  });
  return { incidentId, raised: true };
}

export const detectionRoutes: FastifyPluginAsyncZod<DetectionRouteOptions> = async (app, options) => {
  const { db, guards, notify, detectorToken, snapshots } = options;
  const operators = guards.requireRole("admin", "operator");
  const staff = guards.requireRole("admin", "operator", "responder");

  // The inference service proves itself with a shared token, compared in constant time.
  // It runs on request, before body validation, so a caller without it learns nothing.
  async function detectorOnly(request: FastifyRequest, reply: FastifyReply) {
    const header = request.headers.authorization ?? "";
    const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
    const valid =
      Boolean(detectorToken) &&
      presented.length > 0 &&
      timingSafeEqual(digest(presented), digest(detectorToken!));
    if (!valid) return reply.code(401).send({ error: "Detector token required" });
  }

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof HttpError) return reply.code(error.statusCode).send({ error: error.message });
    throw error;
  });

  app.post(
    "/api/detections",
    {
      onRequest: detectorOnly,
      schema: {
        tags: ["detections"],
        body: z.object({
          cameraId: z.uuid(),
          incidentType: z.enum(INCIDENT_TYPES),
          confidence: z.number().min(0).max(1),
          modelVersion: z.string().min(1).max(100),
          capturedAt: z.iso.datetime({ offset: true }),
          snapshot: z.base64().max(Math.ceil((MAX_SNAPSHOT_BYTES * 4) / 3)).optional(),
        }),
      },
    },
    async (request, reply) => {
      const { cameraId, incidentType, confidence, modelVersion, capturedAt, snapshot } = request.body;
      const thresholds = DETECTION_THRESHOLDS[incidentType];
      // Below the review threshold nothing is kept, including the image.
      if (confidence < thresholds.review) return reply.code(202).send({ outcome: "ignored" });

      const image = snapshot ? Buffer.from(snapshot, "base64") : null;
      if (image && !(image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff)) {
        throw new HttpError(400, "The snapshot must be a JPEG");
      }
      const camera = await db.query("SELECT 1 FROM cameras WHERE id = $1", [cameraId]);
      if (!camera.rowCount) throw new HttpError(422, "Unknown camera");

      const id = randomUUID();
      const snapshotPath = image ? `${id}.jpg` : null;
      if (image) {
        if (!snapshots) throw new HttpError(503, "Snapshot storage isn't configured");
        await snapshots.save(snapshotPath!, image);
      }
      const alerting = confidence >= thresholds.alert;

      const result = await inTransaction(db, async (client) => {
        const detection: DetectionRow = { id, cameraId, incidentType, reviewStatus: "pending", incidentId: null };
        let outcome: "alerted" | "attached" | "queued" = "queued";
        if (alerting) {
          const { incidentId, raised } = await attachOrRaise(client, detection, null);
          detection.incidentId = incidentId;
          detection.reviewStatus = raised ? "alerted" : "attached";
          outcome = raised ? "alerted" : "attached";
        }
        await client.query(
          `INSERT INTO detections (id, camera_id, incident_type, confidence, model_version,
             snapshot_path, captured_at, review_status, incident_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [id, cameraId, incidentType, confidence, modelVersion, snapshotPath, capturedAt,
            detection.reviewStatus, detection.incidentId],
        );
        const row = await client.query(`SELECT ${DETECTION_COLUMNS} FROM detections WHERE id = $1`, [id]);
        const incident = detection.incidentId ? await readIncident(client, detection.incidentId) : null;
        return { outcome, detection: row.rows[0], incident };
      });

      if (result.outcome === "alerted") notify.incident("incident.created", result.incident);
      if (result.outcome === "attached") notify.incident("incident.updated", result.incident);
      if (result.outcome === "queued") notify.operators("detection.pending", result.detection);
      return reply.code(201).send({ outcome: result.outcome, detection: result.detection });
    },
  );

  app.get(
    "/api/detections",
    {
      preHandler: operators,
      schema: {
        tags: ["detections"],
        querystring: z.object({ status: z.enum(["pending"]).default("pending") }),
      },
    },
    async () => {
      const { rows } = await db.query(
        `SELECT ${DETECTION_COLUMNS}, cameras.name AS "cameraName", barangays.name AS "barangayName"
         FROM detections
         JOIN cameras ON cameras.id = detections.camera_id
         LEFT JOIN barangays ON barangays.psgc = cameras.barangay_psgc
         WHERE detections.review_status = 'pending'
         ORDER BY detections.received_at DESC LIMIT 100`,
      );
      return { detections: rows };
    },
  );

  app.post(
    "/api/detections/:id/review",
    {
      preHandler: operators,
      schema: {
        tags: ["detections"],
        params: z.object({ id: z.uuid() }),
        body: z.object({ decision: z.enum(["confirm", "reject"]) }),
      },
    },
    async (request) => {
      const user = request.user!;
      const { decision } = request.body;
      const result = await inTransaction(db, async (client) => {
        const { rows } = await client.query<DetectionRow>(
          `SELECT ${DETECTION_COLUMNS} FROM detections WHERE id = $1 FOR UPDATE`,
          [request.params.id],
        );
        const detection = rows[0];
        if (!detection) throw new HttpError(404, "Detection not found");
        if (detection.reviewStatus !== "pending") throw new HttpError(409, "This detection was already reviewed");

        let incidentId: string | null = null;
        let raised = false;
        if (decision === "confirm") {
          ({ incidentId, raised } = await attachOrRaise(client, detection, user));
        }
        await client.query(
          `UPDATE detections SET review_status = $2, incident_id = $3, reviewed_by = $4, reviewed_at = now()
           WHERE id = $1`,
          [detection.id, decision === "confirm" ? "confirmed" : "rejected", incidentId, user.id],
        );
        await audit(client, {
          actorId: user.id,
          action: decision === "confirm" ? "detection.confirmed" : "detection.rejected",
          entity: "detection",
          entityId: detection.id,
        });
        const updated = await client.query(`SELECT ${DETECTION_COLUMNS} FROM detections WHERE id = $1`, [detection.id]);
        const incident = incidentId ? await readIncident(client, incidentId) : null;
        return { detection: updated.rows[0], incident, raised };
      });

      notify.operators("detection.reviewed", result.detection);
      if (result.incident) notify.incident(result.raised ? "incident.created" : "incident.updated", result.incident);
      return { detection: result.detection, incident: result.incident };
    },
  );

  app.get(
    "/api/detections/:id/snapshot",
    { preHandler: staff, schema: { tags: ["detections"], params: z.object({ id: z.uuid() }) } },
    async (request, reply) => {
      const user = request.user!;
      const { rows } = await db.query<{ snapshotPath: string | null; incidentId: string | null }>(
        `SELECT snapshot_path AS "snapshotPath", incident_id AS "incidentId" FROM detections WHERE id = $1`,
        [request.params.id],
      );
      const found = rows[0];
      let allowed = Boolean(found?.snapshotPath);
      if (allowed && user.role === "responder") {
        // A responder sees only snapshots of incidents they're actively assigned to.
        const assigned = await db.query(
          `SELECT 1 FROM assignments
           WHERE incident_id = $1 AND responder_id = $2 AND released_at IS NULL`,
          [found!.incidentId, user.id],
        );
        allowed = Boolean(assigned.rowCount);
      }
      if (!allowed) throw new HttpError(404, "Snapshot not found");

      const image = snapshots ? await snapshots.read(found!.snapshotPath!) : null;
      if (!image) throw new HttpError(404, "Snapshot not found");
      await audit(db, {
        actorId: user.id,
        action: "detection.snapshot_viewed",
        entity: "detection",
        entityId: request.params.id,
      });
      return reply
        .header("content-type", "image/jpeg")
        .header("cache-control", "private, no-store")
        .send(image);
    },
  );

  app.get(
    "/api/internal/cameras",
    { onRequest: detectorOnly, schema: { tags: ["detections"], hide: true } },
    async () => {
      const { rows } = await db.query(
        `SELECT id, name, stream_path AS "streamPath" FROM cameras ORDER BY name`,
      );
      return { cameras: rows };
    },
  );

  app.post(
    "/api/cameras/:id/heartbeat",
    { onRequest: detectorOnly, schema: { tags: ["detections"], hide: true, params: z.object({ id: z.uuid() }) } },
    async (request, reply) => {
      await db.query("UPDATE cameras SET last_seen_at = now() WHERE id = $1", [request.params.id]);
      return reply.code(204).send();
    },
  );
};
