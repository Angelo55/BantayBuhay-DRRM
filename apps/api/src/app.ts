import type { DependencyStatus, ReadinessResponse } from "@bantaybuhay/shared";
import Fastify, { type FastifyServerOptions } from "fastify";

export type HealthCheck = () => Promise<unknown>;

export interface AppOptions {
  checks: Record<string, HealthCheck>;
  checkTimeoutMs?: number;
  logger?: FastifyServerOptions["logger"];
}

export function buildApp({ checks, checkTimeoutMs = 2000, logger = false }: AppOptions) {
  const app = Fastify({ logger });

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

  return app;
}
