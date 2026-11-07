import type { FastifyInstance } from "fastify";
import type pg from "pg";
import { Server, type ServerOptions } from "socket.io";
import { findSessionUser, SESSION_COOKIE } from "./auth.js";

export type IncidentEvent = "incident.created" | "incident.updated";

export interface IncidentPayload {
  id: string;
  responders: { id: string }[];
}

export interface Notifier {
  // Operators see every incident. Responders see only their own, plus any listed in alsoTo.
  incident(event: IncidentEvent, incident: IncidentPayload, alsoTo?: string[]): void;
}

export function attachRealtime(
  app: FastifyInstance,
  db: pg.Pool,
  adapter?: ServerOptions["adapter"],
): Notifier {
  const io = new Server(app.server, { path: "/socket.io", serveClient: false, adapter });

  io.use(async (socket, next) => {
    try {
      const cookies = app.parseCookie(socket.handshake.headers.cookie ?? "");
      const token = cookies[SESSION_COOKIE];
      const user = token ? await findSessionUser(db, token) : null;
      if (!user) return next(new Error("unauthorized"));
      socket.data.user = user;
      next();
    } catch (error) {
      app.log.error({ err: error }, "socket authentication failed");
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { id, role } = socket.data.user;
    socket.join(`user:${id}`);
    if (role === "admin" || role === "operator") socket.join("operators");
  });

  // Close live connections first, so the HTTP server can finish shutting down.
  app.addHook("preClose", async () => {
    io.disconnectSockets(true);
  });

  return {
    incident(event, incident, alsoTo = []) {
      const responderRooms = [...incident.responders.map((item) => item.id), ...alsoTo].map(
        (id) => `user:${id}`,
      );
      io.to(["operators", ...responderRooms]).emit(event, incident);
    },
  };
}
