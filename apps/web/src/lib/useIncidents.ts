import { useCallback, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { api } from "./api";
import type { Incident } from "./types";

export type Connection = "connecting" | "live" | "offline";

// One live connection per signed-in page, shared by everything that needs updates.
export function createSocket(): Socket {
  return io({ path: "/socket.io", transports: ["websocket", "polling"], autoConnect: false });
}

export function useIncidents(socket: Socket) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [newest, setNewest] = useState<Incident | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // False until the first load answers, so screens can show a skeleton instead of "all quiet".
  const [loaded, setLoaded] = useState(false);
  // When the live connection dropped, so screens can say how old what they show is.
  const [offlineSince, setOfflineSince] = useState<string | null>(null);

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
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // The database is the source of truth: reload everything after every (re)connection.
    const connected = () => {
      setConnection("live");
      setOfflineSince(null);
      void refresh();
    };
    const lost = () => {
      setConnection("offline");
      setOfflineSince((since) => since ?? new Date().toLocaleTimeString("en-PH", { timeStyle: "short" }));
    };
    const created = (incident: Incident) => {
      upsert(incident);
      setNewest(incident);
    };
    socket.on("connect", connected);
    socket.on("disconnect", lost);
    socket.on("connect_error", lost);
    socket.on("incident.created", created);
    socket.on("incident.updated", upsert);
    socket.connect();
    return () => {
      socket.off("connect", connected);
      socket.off("disconnect", lost);
      socket.off("connect_error", lost);
      socket.off("incident.created", created);
      socket.off("incident.updated", upsert);
      socket.disconnect();
    };
  }, [socket, refresh, upsert]);

  return { incidents, connection, offlineSince, newest, loadError, loaded, upsert, refresh };
}
