import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type pg from "pg";
import type { Guards } from "./auth.js";

export const mapRoutes: FastifyPluginAsyncZod<{ db: pg.Pool; guards: Guards }> = async (
  app,
  { db, guards },
) => {
  app.get(
    "/api/barangays",
    { preHandler: guards.authenticate, schema: { tags: ["map"] } },
    async () => {
      const { rows } = await db.query(
        `SELECT json_build_object(
           'type', 'FeatureCollection',
           'features', COALESCE(json_agg(json_build_object(
             'type', 'Feature',
             'id', psgc,
             'properties', json_build_object('psgc', psgc, 'name', name),
             'geometry', ST_AsGeoJSON(boundary, 6)::json
           ) ORDER BY name), '[]')
         ) AS collection
         FROM barangays`,
      );
      return rows[0].collection;
    },
  );

  app.get(
    "/api/cameras",
    {
      preHandler: guards.requireRole("admin", "operator", "responder"),
      schema: { tags: ["map"] },
    },
    async () => {
      const { rows } = await db.query(
        `SELECT cameras.id, cameras.name, cameras.status, cameras.is_simulated AS "isSimulated",
                ST_Y(cameras.location) AS latitude, ST_X(cameras.location) AS longitude,
                barangays.name AS "barangayName"
         FROM cameras LEFT JOIN barangays ON barangays.psgc = cameras.barangay_psgc
         ORDER BY cameras.name`,
      );
      return { cameras: rows };
    },
  );

  app.get(
    "/api/responders",
    { preHandler: guards.requireRole("admin", "operator"), schema: { tags: ["map"] } },
    async () => {
      const { rows } = await db.query(
        `SELECT users.id, users.full_name AS "fullName", responder_profiles.unit,
                responder_profiles.duty_status AS "dutyStatus",
                (SELECT count(*)::int FROM assignments
                 WHERE assignments.responder_id = users.id
                   AND assignments.released_at IS NULL) AS "activeAssignments"
         FROM users JOIN responder_profiles ON responder_profiles.user_id = users.id
         WHERE users.role = 'responder' AND users.disabled_at IS NULL
         ORDER BY users.full_name`,
      );
      return { responders: rows };
    },
  );
};
