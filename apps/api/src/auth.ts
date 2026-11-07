import { createHash, randomBytes } from "node:crypto";
import type { PublicUser, Role } from "@bantaybuhay/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type pg from "pg";
import { z } from "zod";
import { audit } from "./audit.js";
import { hashPassword, verifyPassword } from "./password.js";

const COOKIE = "bb_session";
const USER_COLUMNS = "users.id, users.email, users.full_name AS \"fullName\", users.role";

declare module "fastify" {
  interface FastifyRequest {
    user: PublicUser | null;
  }
}

export const SESSION_COOKIE = COOKIE;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// The signed-in user for a session token, or null if it's unknown, expired or disabled.
export async function findSessionUser(db: pg.Pool, token: string): Promise<PublicUser | null> {
  const { rows } = await db.query<PublicUser>(
    `SELECT ${USER_COLUMNS} FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = $1 AND sessions.expires_at > now()
       AND users.disabled_at IS NULL`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

export function createGuards(db: pg.Pool) {
  async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    const token = request.cookies[COOKIE];
    if (token) request.user = await findSessionUser(db, token);
    if (!request.user) return reply.code(401).send({ error: "Sign in required" });
  }

  function requireRole(...roles: Role[]) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      await authenticate(request, reply);
      if (reply.sent) return;
      if (!roles.includes(request.user!.role)) {
        return reply.code(403).send({ error: "You don't have access to this" });
      }
    };
  }

  return { authenticate, requireRole };
}

export type Guards = ReturnType<typeof createGuards>;

export interface AuthOptions {
  db: pg.Pool;
  guards: Guards;
  cookieSecure: boolean;
  sessionTtlMs: number;
  loginAttemptsPerMinute: number;
}

export const authRoutes: FastifyPluginAsyncZod<AuthOptions> = async (app, options) => {
  const { db, guards, cookieSecure, sessionTtlMs, loginAttemptsPerMinute } = options;
  // Checked when an email is unknown, so response time doesn't reveal which emails exist.
  const decoyHash = await hashPassword(randomBytes(16).toString("hex"));

  app.post(
    "/api/auth/login",
    {
      config: { rateLimit: { max: loginAttemptsPerMinute, timeWindow: "1 minute" } },
      schema: {
        tags: ["auth"],
        body: z.object({ email: z.email(), password: z.string().min(1).max(200) }),
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;
      const { rows } = await db.query<PublicUser & { passwordHash: string; disabledAt: Date | null }>(
        `SELECT ${USER_COLUMNS}, users.password_hash AS "passwordHash",
                users.disabled_at AS "disabledAt"
         FROM users WHERE lower(email) = lower($1)`,
        [email],
      );
      const found = rows[0];
      const matches = await verifyPassword(password, found?.passwordHash ?? decoyHash);

      if (!found || !matches || found.disabledAt) {
        await audit(db, {
          actorId: found?.id ?? null,
          action: "auth.login_failed",
          metadata: { email, ip: request.ip },
        });
        return reply.code(401).send({ error: "Incorrect email or password" });
      }

      const token = randomBytes(32).toString("base64url");
      await db.query(
        "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
        [hashToken(token), found.id, new Date(Date.now() + sessionTtlMs)],
      );
      await audit(db, {
        actorId: found.id,
        action: "auth.login",
        metadata: { ip: request.ip },
      });

      reply.setCookie(COOKIE, token, {
        httpOnly: true,
        secure: cookieSecure,
        sameSite: "strict",
        path: "/",
        maxAge: Math.floor(sessionTtlMs / 1000),
      });
      const user: PublicUser = {
        id: found.id,
        email: found.email,
        fullName: found.fullName,
        role: found.role,
      };
      return { user };
    },
  );

  app.post(
    "/api/auth/logout",
    { schema: { tags: ["auth"] }, preHandler: guards.authenticate },
    async (request, reply) => {
      await db.query("DELETE FROM sessions WHERE token_hash = $1", [
        hashToken(request.cookies[COOKIE]!),
      ]);
      await audit(db, { actorId: request.user!.id, action: "auth.logout" });
      reply.clearCookie(COOKIE, { path: "/" });
      return reply.code(204).send();
    },
  );

  app.get(
    "/api/auth/me",
    { schema: { tags: ["auth"] }, preHandler: guards.authenticate },
    async (request) => ({ user: request.user }),
  );
};
