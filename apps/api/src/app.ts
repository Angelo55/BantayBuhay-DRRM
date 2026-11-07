import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import type { DependencyStatus, ReadinessResponse } from "@bantaybuhay/shared";
import Fastify, { type FastifyServerOptions } from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import type pg from "pg";
import { adminRoutes } from "./admin.js";
import { authRoutes, createGuards } from "./auth.js";
import { incidentRoutes } from "./incidents.js";
import { detectionRoutes } from "./detections.js";
import { mapRoutes } from "./map.js";
import { attachRealtime } from "./realtime.js";
import type { ServerOptions } from "socket.io";

export type HealthCheck = () => Promise<unknown>;

export interface AppOptions {
  checks: Record<string, HealthCheck>;
  db: pg.Pool;
  checkTimeoutMs?: number;
  logger?: FastifyServerOptions["logger"];
  cookieSecure?: boolean;
  sessionTtlMs?: number;
  loginAttemptsPerMinute?: number;
  // Shares live updates across API instances, for example during a blue/green deploy.
  realtimeAdapter?: ServerOptions["adapter"];
  detectorToken?: string;
  snapshotDir?: string;
}

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export function buildApp({
  checks,
  db,
  checkTimeoutMs = 2000,
  logger = false,
  cookieSecure = true,
  sessionTtlMs = TWELVE_HOURS_MS,
  loginAttemptsPerMinute = 10,
  realtimeAdapter,
  detectorToken,
  snapshotDir,
}: AppOptions) {
  // Nginx is the only route in, so the address it forwards can be trusted.
  const app = Fastify({ logger, trustProxy: true }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorateRequest("user", null);

  app.register(cookie);
  app.register(rateLimit, { global: false });
  app.register(swagger, {
    openapi: { info: { title: "BantayBuhay API", version: "0.1.0" } },
    transform: jsonSchemaTransform,
  });

  async function runCheck(name: string, check: HealthCheck): Promise<DependencyStatus> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("health check timed out")), checkTimeoutMs);
    });
    try {
      await Promise.race([check(), timeout]);
      return "ok";
    } catch (error) {
      // Details go to the log only, because they can contain connection strings.
      app.log.error({ err: error, dependency: name }, "health check failed");
      return "down";
    } finally {
      clearTimeout(timer);
    }
  }

  // Liveness: the process is running. Dependencies don't affect this.
  app.get("/api/healthz", async () => ({ status: "ok" }));

  // Readiness: the process can serve requests. Deployments wait for this.
  app.get("/api/readyz", async (_request, reply) => {
    const entries = await Promise.all(
      Object.entries(checks).map(
        async ([name, check]) => [name, await runCheck(name, check)] as const,
      ),
    );
    const allOk = entries.every(([, status]) => status === "ok");
    const body: ReadinessResponse = {
      status: allOk ? "ready" : "not_ready",
      checks: Object.fromEntries(entries),
    };
    return reply.code(allOk ? 200 : 503).send(body);
  });

  const guards = createGuards(db);
  app.register(authRoutes, { db, guards, cookieSecure, sessionTtlMs, loginAttemptsPerMinute });
  app.register(adminRoutes, { db, guards });
  const notify = attachRealtime(app, db, realtimeAdapter);
  app.register(incidentRoutes, { db, guards, notify });
  app.register(mapRoutes, { db, guards });
  app.register(detectionRoutes, { db, guards, notify, detectorToken, snapshotDir });

  app.get(
    "/api/openapi.json",
    { preHandler: guards.authenticate, schema: { hide: true } },
    async () => app.swagger(),
  );

  return app;
}
