import type { ReadinessResponse } from "@bantaybuhay/shared";
import { useEffect, useState } from "react";

type State = "checking" | "ready" | "unavailable";

const MESSAGES: Record<State, string> = {
  checking: "Checking system status",
  ready: "All systems ready",
  unavailable: "System unavailable",
};

export function SystemStatus() {
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/readyz", { signal: controller.signal })
      .then((response) => response.json() as Promise<ReadinessResponse>)
      .then((body) => setState(body.status === "ready" ? "ready" : "unavailable"))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error("Readiness check failed", error);
          setState("unavailable");
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <p role="status" className="text-lg">
      {MESSAGES[state]}
    </p>
  );
}
