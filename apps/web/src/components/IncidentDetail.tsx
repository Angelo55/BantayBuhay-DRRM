import type { Role } from "@bantaybuhay/shared";
import { useEffect, useState } from "react";
import { canAssign, nextActions, type IncidentAction } from "../lib/actions";
import { api } from "../lib/api";
import { STATUS_LABEL, STEPS, TYPE_LABEL } from "../lib/labels";
import { fullTime, timeAgo } from "../lib/time";
import type { Incident, IncidentEvent, Responder } from "../lib/types";
import { Button, ChoiceCard, ChoiceGroup, Modal, SeverityBadge, SwipeToConfirm, cx } from "../ui";
import { InlineError, PanelHeader, PanelSection } from "./PanelHeader";

interface DetailProps {
  incident: Incident;
  role: Role;
  now: number;
  onChanged: (incident: Incident) => void;
  onClose: () => void;
  onToast: (message: string) => void;
}

// What the toast says after each action, using the same words as the button.
function doneMessage(action: IncidentAction): string {
  if (action.kind === "acknowledge") return "Acknowledged";
  if (action.to === "dismissed") return "Closed as a false alarm";
  return action.to ? STATUS_LABEL[action.to] : "Saved";
}

export function IncidentDetail({ incident, role, now, onChanged, onClose, onToast }: DetailProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<IncidentEvent[]>([]);
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  // Remounts the swipe control if a dispatch fails, so it can be tried again.
  const [attempt, setAttempt] = useState(0);

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
          ? await api<{ incident: Incident }>(`/api/incidents/${incident.id}/acknowledge`, { method: "POST" })
          : await api<{ incident: Incident }>(`/api/incidents/${incident.id}/status`, {
              method: "POST",
              body: { to: action.to },
            });
      onChanged(body.incident);
      onToast(doneMessage(action));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That didn't work. Try again.");
      setAttempt((count) => count + 1);
    } finally {
      setBusy(false);
    }
  }

  const actions = nextActions(incident, role);
  const dismissAction = actions.find((action) => action.to === "dismissed");
  const dismissed = incident.status === "dismissed";
  const reached = STEPS.indexOf(incident.status);
  const place = incident.barangayName ?? "Outside mapped barangays";

  return (
    <article aria-labelledby="incident-title" className="flex h-full flex-col">
      <PanelHeader
        titleId="incident-title"
        title={TYPE_LABEL[incident.incidentType]}
        above={<SeverityBadge severity={incident.severity} />}
        meta={
          <>
            {place}, detected{" "}
            <time dateTime={incident.detectedAt} title={fullTime(incident.detectedAt)}>
              {timeAgo(incident.detectedAt, now)}
            </time>
          </>
        }
        closeLabel="Close incident details"
        onClose={onClose}
      />

      <div className="flex-1 space-y-7 overflow-y-auto px-6 pt-5 pb-8">
        {dismissed ? (
          <p className="rounded-card bg-card-muted px-4 py-3 text-[15px] font-bold">Closed as a false alarm</p>
        ) : (
          <div>
            <ol className="grid grid-cols-5 gap-1.5" aria-label="Incident progress">
              {STEPS.map((step, index) => (
                <li key={step} aria-current={index === reached ? "step" : undefined}>
                  <span className={cx("block h-2 rounded-full", index <= reached ? "bg-inverse" : "bg-card-muted")} />
                  <span className="sr-only">{STATUS_LABEL[step]}</span>
                </li>
              ))}
            </ol>
            {/* One line instead of five labels, which crowd each other at panel width. */}
            <p className="mt-2 text-[13px] text-fg-2" aria-hidden="true">
              <span className="font-bold text-fg">{STATUS_LABEL[incident.status]}</span>, step {reached + 1} of{" "}
              {STEPS.length}
              {reached + 1 < STEPS.length && <>. Next: {STATUS_LABEL[STEPS[reached + 1]!].toLowerCase()}</>}
            </p>
          </div>
        )}

        {actions.length > 0 && (
          <div className="space-y-3">
            {actions
              .filter((action) => action !== dismissAction)
              .map((action) =>
                action.to === "dispatched" ? (
                  <div key={`${action.label}-${attempt}`}>
                    <SwipeToConfirm
                      label="Dispatch"
                      doneLabel="Dispatching"
                      disabled={Boolean(action.disabledReason)}
                      onConfirm={() => void run(action)}
                    />
                    {action.disabledReason && (
                      <p className="mt-1 text-[13px] font-bold text-fg">{action.disabledReason}</p>
                    )}
                  </div>
                ) : (
                  <Button
                    key={action.label}
                    fullWidth
                    size={action.emphasis === "primary" ? "lg" : "md"}
                    variant={action.emphasis === "primary" ? "primary" : action.emphasis === "secondary" ? "secondary" : "ghost"}
                    disabled={busy}
                    onClick={() => void run(action)}
                  >
                    {action.label}
                  </Button>
                ),
              )}
            {dismissAction && (
              <Button fullWidth variant="ghost" disabled={busy} onClick={() => setConfirmDismiss(true)}>
                {dismissAction.label}
              </Button>
            )}
            {error && <InlineError>{error}</InlineError>}
          </div>
        )}

        <PanelSection title="Responders">
          {incident.responders.length === 0 ? (
            <p className="text-[15px] text-fg-2">No one assigned yet</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {incident.responders.map((person) => (
                <li key={person.id} className="rounded-full bg-inverse px-4 py-1.5 text-[15px] text-on-inverse">
                  {person.fullName}
                </li>
              ))}
            </ul>
          )}
          {canAssign(incident, role) && (
            <AssignResponder incident={incident} onChanged={onChanged} onToast={onToast} />
          )}
        </PanelSection>

        {incident.source === "detection" && (
          <PanelSection title="Camera">
            <p className="text-[15px]">Raised by {incident.cameraName ?? "a camera"}</p>
            {incident.snapshotDetectionId && (
              <img
                key={incident.snapshotDetectionId}
                src={`/api/detections/${incident.snapshotDetectionId}/snapshot`}
                alt={`Latest snapshot from ${incident.cameraName ?? "the camera"}`}
                loading="lazy"
                className="mt-3 w-full rounded-card bg-card-muted"
              />
            )}
          </PanelSection>
        )}

        {incident.description && (
          <PanelSection title="Notes">
            <p className="text-[15px]">{incident.description}</p>
          </PanelSection>
        )}

        <PanelSection title="Location">
          <p className="text-[15px] tabular-nums">
            {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}
          </p>
        </PanelSection>

        {events.length > 0 && (
          <PanelSection title="History">
            <ul className="space-y-2">
              {events.map((event) => (
                <li
                  key={`${event.toStatus}-${event.at}`}
                  className="flex items-baseline justify-between gap-3 rounded-control bg-card-muted px-4 py-2.5 text-[13px]"
                >
                  <span className="font-bold">{STATUS_LABEL[event.toStatus]}</span>
                  <time dateTime={event.at} className="tabular-nums text-fg-2">
                    {fullTime(event.at)}
                  </time>
                </li>
              ))}
            </ul>
          </PanelSection>
        )}
      </div>

      {dismissAction && (
        <Modal
          open={confirmDismiss}
          title="Close as a false alarm?"
          onClose={() => setConfirmDismiss(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmDismiss(false)}>
                Keep open
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setConfirmDismiss(false);
                  void run(dismissAction);
                }}
              >
                Close as false alarm
              </Button>
            </>
          }
        >
          <p className="text-fg-2">
            {TYPE_LABEL[incident.incidentType]} in {place} leaves the active list. The history keeps a record of who
            closed it.
          </p>
        </Modal>
      )}
    </article>
  );
}

function AssignResponder({
  incident,
  onChanged,
  onToast,
}: {
  incident: Incident;
  onChanged: (incident: Incident) => void;
  onToast: (message: string) => void;
}) {
  const [roster, setRoster] = useState<Responder[] | null>(null);
  const [choice, setChoice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ responders: Responder[] }>("/api/responders")
      .then((body) => setRoster(body.responders))
      .catch(() => setError("Couldn't load the responder list"));
  }, [incident.responders.length]);

  const assignedIds = new Set(incident.responders.map((person) => person.id));
  const available = (roster ?? []).filter((person) => !assignedIds.has(person.id));

  async function assign() {
    const person = available.find((item) => item.id === choice);
    setBusy(true);
    setError(null);
    try {
      await api(`/api/incidents/${incident.id}/assignments`, { method: "POST", body: { responderId: choice } });
      const body = await api<{ incident: Incident }>(`/api/incidents/${incident.id}`);
      onChanged(body.incident);
      setChoice("");
      onToast(`Assigned ${person?.fullName ?? "the responder"}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't assign that responder");
    } finally {
      setBusy(false);
    }
  }

  if (roster && available.length === 0 && !error) return null;
  return (
    <div className="mt-4">
      <ChoiceGroup legend="Assign a responder">
        <div className="grid gap-2">
          {available.map((person) => (
            <ChoiceCard
              key={person.id}
              name={`assign-${incident.id}`}
              value={person.id}
              checked={person.id === choice}
              onChange={() => setChoice(person.id)}
            >
              <span className="flex items-center justify-between gap-3">
                <span>
                  <span className="block font-display text-[15px] font-medium leading-tight">{person.fullName}</span>
                  <span className={cx("block text-[13px]", person.id === choice ? "text-on-accent" : "text-fg-2")}>
                    {person.unit}
                  </span>
                </span>
                <span className={cx("shrink-0 text-[13px]", person.id === choice ? "text-on-accent" : "text-fg-2")}>
                  {person.activeAssignments ? `On ${person.activeAssignments} now` : "Free"}
                </span>
              </span>
            </ChoiceCard>
          ))}
        </div>
      </ChoiceGroup>
      <Button className="mt-3" variant="secondary" disabled={!choice || busy} onClick={() => void assign()}>
        Assign
      </Button>
      {error && (
        <div className="mt-2">
          <InlineError>{error}</InlineError>
        </div>
      )}
    </div>
  );
}
