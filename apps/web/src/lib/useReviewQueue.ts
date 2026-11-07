import { useCallback, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { api } from "./api";
import type { PendingDetection } from "./types";

// Detections a camera wasn't sure about, waiting for an operator to confirm or reject.
export function useReviewQueue(socket: Socket | null, enabled: boolean) {
  const [pending, setPending] = useState<PendingDetection[]>([]);

  const remove = useCallback((id: string) => {
    setPending((list) => list.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (!socket || !enabled) return;
    const load = () =>
      api<{ detections: PendingDetection[] }>("/api/detections?status=pending")
        .then((body) => setPending(body.detections))
        .catch(() => undefined);
    const added = (detection: PendingDetection) =>
      setPending((list) => (list.some((item) => item.id === detection.id) ? list : [detection, ...list]));
    const reviewed = (detection: PendingDetection) => remove(detection.id);

    if (socket.connected) void load();
    socket.on("connect", load);
    socket.on("detection.pending", added);
    socket.on("detection.reviewed", reviewed);
    return () => {
      socket.off("connect", load);
      socket.off("detection.pending", added);
      socket.off("detection.reviewed", reviewed);
    };
  }, [socket, enabled, remove]);

  return { pending, remove };
}
