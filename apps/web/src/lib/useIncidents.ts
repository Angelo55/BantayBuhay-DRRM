import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { api } from "./api";
import type { Incident } from "./types";

export type Connection = "connecting" | "live" | "offline";

export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [newest, setNewest] = useState<Incident | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const upsert = useCallback((incident: Incident) => {
    setIncidents((list) => {
      const index = list.findIndex((item) => item.id === incident.id);
      if (index < 0) return [incident, ...list];
      const copy = [...list];
      copy[index] = incident;
      return copy;
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const body = await api<{ incidents: Incident[] }>("/api/incidents");
      setIncidents(body.incidents);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Couldn't load incidents");
    }
  }, []);

  useEffect(() => {
    const socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
    // The database is the source of truth: reload everything after every (re)connection.
    socket.on("connect", () => {
      setConnection("live");
      void refresh();
    });
    socket.on("disconnect", () => setConnection("offline"));
    socket.on("connect_error", () => setConnection("offline"));
    socket.on("incident.created", (incident: Incident) => {
      upsert(incident);
      setNewest(incident);
    });
    socket.on("incident.updated", upsert);
    return () => {
      socket.disconnect();
    };
  }, [refresh, upsert]);

  return { incidents, connection, newest, loadError, upsert, refresh };
}
