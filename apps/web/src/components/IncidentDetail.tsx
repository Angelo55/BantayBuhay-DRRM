import type { Role } from "@bantaybuhay/shared";
import { useEffect, useState } from "react";
import { canAssign, nextActions, type IncidentAction } from "../lib/actions";
import { api } from "../lib/api";
import { STATUS_LABEL, STEPS, TYPE_LABEL } from "../lib/labels";
import { fullTime, timeAgo } from "../lib/time";
import type { Incident, IncidentEvent, Responder } from "../lib/types";
import { SeverityBadge } from "./SeverityBadge";

interface DetailProps {
  incident: Incident;
  role: Role;
  now: number;
  onChanged: (incident: Incident) => void;
  onClose: () => void;
}

export function IncidentDetail({ incident, role, now, onChanged, onClose }: DetailProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<IncidentEvent[]>([]);

  // Reload the history whenever the incident changes, including live updates.
  useEffect(() => {
    let cancelled = false;
    api<{ events: IncidentEvent[] }>(`/api/incidents/${incident.id}`)
      .then((body) => !cancelled && setEvents(body.events))
      .catch(() => !cancelled && setEvents([]));
    return () => {
      cancelled = true;
    };
  }, [incident.id, incident.status, incident.acknowledgedAt]);

  async function run(action: IncidentAction) {
    setBusy(true);
    setError(null);
    try {
      const body =
        action.kind === "acknowledge"
          ? await api<{ incident: Incident }>(`/api/incidents/${incident.id}/acknowledge`, {
              method: "POST",
            })
          : await api<{ incident: Incident }>(`/api/incidents/${incident.id}/status`, {
              method: "POST",
              body: { to: action.to },
            });
      onChanged(body.incident);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const actions = nextActions(incident, role);
  const dismissed = incident.status === "dismissed";
  const reached = STEPS.indexOf(incident.status);

  return (
    <article aria-labelledby="incident-title" className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <SeverityBadge severity={incident.severity} />
          <h2 id="incident-title" className="mt-2 text-[21px] font-bold leading-tight text-ink">
            {TYPE_LABEL[incident.incidentType]}
          </h2>
          <p className="mt-0.5 text-[15px] text-muted">
            {incident.barangayName ?? "Outside mapped barangays"}, detected{" "}
            <time dateTime={incident.detectedAt} title={fullTime(incident.detectedAt)}>
              {timeAgo(incident.detectedAt, now)}
            </time>
          </p>
        </div>
        <button type="button" onClick={onClose} className="button-quiet" aria-label="Close incident details">
          Close
        </button>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        {dismissed ? (
          <p className="text-[15px] font-bold text-ink">Closed as a false alarm</p>
        ) : (
          <div>
            <ol className="grid grid-cols-5 gap-1" aria-label="Incident progress">
              {STEPS.map((step, index) => (
                <li key={step} aria-current={index === reached ? "step" : undefined}>
                  <span className={`block h-1.5 rounded-full ${index <= reached ? "bg-action" : "bg-line"}`} />
                  {/* Every label fits on wide panels; phones show only the current step below. */}
                  <span
                    className={`mt-1.5 hidden text-[13px] sm:block ${index === reached ? "font-bold text-ink" : "text-muted"}`}
                  >
                    {STATUS_LABEL[step]}
                  </span>
                  <span className="sr-only sm:hidden">{STATUS_LABEL[step]}</span>
                </li>
              ))}
            </ol>
            <p className="mt-1.5 text-[13px] text-muted sm:hidden" aria-hidden="true">
              <span className="font-bold text-ink">{STATUS_LABEL[incident.status]}</span>, step {reached + 1} of{" "}
              {STEPS.length}
            </p>
          </div>
        )}

        {actions.length > 0 && (
          <div className="space-y-2">
            {actions.map((action) => (
              <div key={action.label}>
                <button
                  type="button"
                  disabled={busy || Boolean(action.disabledReason)}
                  onClick={() => run(action)}
                  aria-describedby={action.disabledReason ? `${action.label}-why` : undefined}
                  className={`w-full ${
                    action.emphasis === "primary"
                      ? "button-primary"
                      : action.emphasis === "secondary"
                        ? "button-secondary"
                        : "button-quiet"
                  }`}
                >
                  {action.label}
                </button>
                {action.disabledReason && (
                  <p id={`${action.label}-why`} className="mt-1 text-[13px] text-muted">
                    {action.disabledReason}
                  </p>
                )}
              </div>
            ))}
            {error && (
              <p role="alert" className="text-[15px] text-ink">
                {error}
              </p>
            )}
          </div>
        )}

        <section aria-labelledby="responders-heading">
          <h3 id="responders-heading" className="text-[15px] font-bold text-ink">
            Responders
          </h3>
          {incident.responders.length === 0 ? (
            <p className="mt-1 text-[15px] text-muted">No one assigned yet</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-[15px] text-ink">
              {incident.responders.map((person) => (
                <li key={person.id}>{person.fullName}</li>
              ))}
            </ul>
          )}
          {canAssign(incident, role) && <AssignResponder incident={incident} onChanged={onChanged} />}
        </section>

        {incident.source === "detection" && (
          <section>
            <h3 className="text-[15px] font-bold text-ink">Camera</h3>
            <p className="mt-1 text-[15px] text-muted">Raised by {incident.cameraName ?? "a camera"}</p>
            {incident.snapshotDetectionId && (
              <img
                key={incident.snapshotDetectionId}
                src={`/api/detections/${incident.snapshotDetectionId}/snapshot`}
                alt={`Latest snapshot from ${incident.cameraName ?? "the camera"}`}
                loading="lazy"
                className="mt-2 w-full rounded-md border border-line"
              />
            )}
          </section>
        )}

        {incident.description && (
          <section>
            <h3 className="text-[15px] font-bold text-ink">Notes</h3>
            <p className="mt-1 text-[15px] text-ink">{incident.description}</p>
          </section>
        )}

        <section>
          <h3 className="text-[15px] font-bold text-ink">Location</h3>
          <p className="mt-1 text-[15px] tabular-nums text-muted">
            {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}
          </p>
        </section>

        {events.length > 0 && (
          <section>
            <h3 className="text-[15px] font-bold text-ink">History</h3>
            <ul className="mt-1 space-y-1">
              {events.map((event) => (
                <li key={`${event.toStatus}-${event.at}`} className="flex justify-between gap-3 text-[13px]">
                  <span className="text-ink">{STATUS_LABEL[event.toStatus]}</span>
                  <time dateTime={event.at} className="tabular-nums text-muted">
                    {fullTime(event.at)}
                  </time>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}

function AssignResponder({ incident, onChanged }: { incident: Incident; onChanged: (i: Incident) => void }) {
  const [roster, setRoster] = useState<Responder[]>([]);
  const [choice, setChoice] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ responders: Responder[] }>("/api/responders")
      .then((body) => setRoster(body.responders))
      .catch(() => setError("Couldn't load the responder list"));
  }, [incident.responders.length]);

  const assignedIds = new Set(incident.responders.map((person) => person.id));
  const available = roster.filter((person) => !assignedIds.has(person.id));

  async function assign() {
    setError(null);
    try {
      await api(`/api/incidents/${incident.id}/assignments`, {
        method: "POST",
        body: { responderId: choice },
      });
      const body = await api<{ incident: Incident }>(`/api/incidents/${incident.id}`);
      onChanged(body.incident);
      setChoice("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't assign that responder");
    }
  }

  if (available.length === 0 && !error) return null;
  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <label className="min-w-0 flex-1">
        <span className="block text-[13px] text-muted">Assign a responder</span>
        <select value={choice} onChange={(event) => setChoice(event.target.value)} className="field mt-1">
          <option value="">Choose a responder</option>
          {available.map((person) => (
            <option key={person.id} value={person.id}>
              {person.fullName}, {person.unit}
              {person.activeAssignments ? ` (on ${person.activeAssignments} now)` : ""}
            </option>
          ))}
        </select>
      </label>
      <button type="button" disabled={!choice} onClick={assign} className="button-secondary">
        Assign
      </button>
      {error && (
        <p role="alert" className="w-full text-[13px] text-ink">
          {error}
        </p>
      )}
    </div>
  );
}
