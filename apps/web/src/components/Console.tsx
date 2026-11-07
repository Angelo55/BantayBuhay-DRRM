import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { SEVERITY_COLOR, SEVERITY_LABEL, TYPE_LABEL } from "../lib/labels";
import { useNow } from "../lib/time";
import type { BarangayCollection, Camera, Incident, User } from "../lib/types";
import { useIncidents, type Connection } from "../lib/useIncidents";
import { IncidentDetail } from "./IncidentDetail";
import { IncidentMap } from "./IncidentMap";
import { IncidentQueue } from "./IncidentQueue";
import { ReportIncident } from "./ReportIncident";

type Panel = { kind: "none" } | { kind: "incident"; id: string } | { kind: "report" };

export function Console({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const isOperator = user.role === "operator" || user.role === "admin";
  const { incidents, connection, newest, loadError, upsert } = useIncidents();
  const [barangays, setBarangays] = useState<BarangayCollection | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [panel, setPanel] = useState<Panel>({ kind: "none" });
  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [view, setView] = useState<"queue" | "map">("queue");
  const [dismissedAlertId, setDismissedAlertId] = useState<string | null>(null);
  const now = useNow();

  useEffect(() => {
    api<BarangayCollection>("/api/barangays").then(setBarangays).catch(() => setBarangays(null));
    api<{ cameras: Camera[] }>("/api/cameras")
      .then((body) => setCameras(body.cameras))
      .catch(() => setCameras([]));
  }, []);

  // The newest incident raises a banner until someone opens or dismisses it.
  const alert: Incident | null =
    isOperator && newest && newest.id !== dismissedAlertId ? newest : null;

  const selected = panel.kind === "incident" ? incidents.find((item) => item.id === panel.id) : undefined;
  const select = (id: string) => {
    setPanel({ kind: "incident", id });
    if (alert?.id === id) setDismissedAlertId(id);
  };

  return (
    <div className="flex h-dvh flex-col bg-ground text-ink">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface px-4 py-2.5">
        <div className="mr-auto">
          <p className="text-[17px] font-bold leading-tight">BantayBuhay</p>
          <p className="text-[13px] text-muted">
            {isOperator ? "Kabankalan City DRRM operations" : "Your assigned incidents"}
          </p>
        </div>
        <ConnectionStatus connection={connection} />
        {isOperator && (
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              setPoint(null);
              setPanel({ kind: "report" });
              setView("map");
            }}
          >
            Report incident
          </button>
        )}
        <p className="text-[13px] text-muted">
          <span className="block text-ink">{user.fullName}</span>
          {user.role === "admin" ? "Administrator" : user.role === "operator" ? "DRRM operator" : "Responder"}
        </p>
        <button type="button" className="button-quiet" onClick={onSignOut}>
          Sign out
        </button>
      </header>

      {alert && (
        <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-line bg-raised px-4 py-2.5" style={{ borderLeft: `6px solid ${SEVERITY_COLOR[alert.severity]}` }}>
          <p className="mr-auto text-[15px]">
            <strong>New {SEVERITY_LABEL[alert.severity].toLowerCase()} incident:</strong>{" "}
            {TYPE_LABEL[alert.incidentType]} in {alert.barangayName ?? "an unmapped area"}
          </p>
          <button type="button" className="button-primary" onClick={() => select(alert.id)}>
            Open
          </button>
          <button type="button" className="button-quiet" onClick={() => setDismissedAlertId(alert.id)}>
            Dismiss banner
          </button>
        </div>
      )}

      {loadError && (
        <p role="alert" className="border-b border-line px-4 py-2 text-[15px]">
          {loadError}. The list will reload when the connection returns.
        </p>
      )}

      <div className="flex border-b border-line lg:hidden" role="tablist" aria-label="View">
        {(["queue", "map"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={view === option}
            onClick={() => setView(option)}
            className={`min-h-11 flex-1 text-[15px] font-bold ${view === option ? "border-b-2 border-action text-ink" : "text-muted"}`}
          >
            {option === "queue" ? "Incidents" : "Map"}
          </button>
        ))}
      </div>

      <div className="relative flex min-h-0 flex-1">
        <aside
          aria-label="Incidents"
          className={`w-full shrink-0 overflow-y-auto border-r border-line bg-surface lg:block lg:w-[360px] ${view === "queue" ? "block" : "hidden"}`}
        >
          <IncidentQueue
            incidents={incidents}
            selectedId={panel.kind === "incident" ? panel.id : null}
            onSelect={select}
            now={now}
            emptyMessage={
              isOperator
                ? "No incidents yet. New detections and reports appear here as they come in."
                : "Nothing assigned to you right now. New assignments appear here."
            }
          />
        </aside>

        <main className={`min-w-0 flex-1 lg:block ${view === "map" ? "block" : "hidden"}`}>
          <IncidentMap
            barangays={barangays}
            cameras={cameras}
            incidents={incidents}
            selectedId={panel.kind === "incident" ? panel.id : null}
            onSelect={select}
            picking={panel.kind === "report"}
            onPick={setPoint}
          />
        </main>

        {panel.kind !== "none" && (
          <aside
            aria-label={panel.kind === "report" ? "Report an incident" : "Incident details"}
            className={`absolute inset-x-0 bottom-0 z-10 max-h-[70%] overflow-hidden border-t border-line bg-surface shadow-2xl lg:static lg:max-h-none lg:w-[400px] lg:shrink-0 lg:border-l lg:border-t-0 lg:shadow-none ${
              panel.kind === "incident" ? "top-0 max-h-none" : ""
            }`}
          >
            {panel.kind === "report" && (
              <ReportIncident
                point={point}
                onCancel={() => setPanel({ kind: "none" })}
                onReported={(incident) => {
                  upsert(incident);
                  setPoint(null);
                  setPanel({ kind: "incident", id: incident.id });
                }}
              />
            )}
            {panel.kind === "incident" && selected && (
              <IncidentDetail
                incident={selected}
                role={user.role}
                now={now}
                onChanged={upsert}
                onClose={() => setPanel({ kind: "none" })}
              />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function ConnectionStatus({ connection }: { connection: Connection }) {
  const text = {
    connecting: "Connecting",
    live: "Live",
    offline: "Reconnecting. Updates are paused.",
  }[connection];
  return (
    <p role="status" className="flex items-center gap-2 text-[13px] text-muted">
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 rounded-full ${connection === "live" ? "bg-action" : "border-2 border-sev-medium"}`}
      />
      {text}
    </p>
  );
}
