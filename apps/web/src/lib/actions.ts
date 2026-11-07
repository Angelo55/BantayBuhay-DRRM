import type { IncidentStatus, Role } from "@bantaybuhay/shared";
import type { Incident } from "./types";

export interface IncidentAction {
  label: string;
  kind: "acknowledge" | "status";
  to?: IncidentStatus;
  emphasis: "primary" | "secondary" | "quiet";
  disabledReason?: string;
}

const isOperator = (role: Role) => role === "operator" || role === "admin";

export function nextActions(incident: Incident, role: Role): IncidentAction[] {
  const { status, acknowledgedAt, responders } = incident;
  const closed = status === "resolved" || status === "dismissed";

  if (role === "responder") {
    if (status === "dispatched") {
      return [{ label: "I'm on scene", kind: "status", to: "on_scene", emphasis: "primary" }];
    }
    if (status === "on_scene") {
      return [{ label: "Mark resolved", kind: "status", to: "resolved", emphasis: "primary" }];
    }
    return [];
  }
  if (!isOperator(role) || closed) return [];

  const actions: IncidentAction[] = [];
  if (!acknowledgedAt) {
    actions.push({ label: "Acknowledge", kind: "acknowledge", emphasis: "primary" });
  }
  const main = acknowledgedAt ? "primary" : "secondary";

  switch (status) {
    case "detected":
      actions.push(
        { label: "Verify incident", kind: "status", to: "verified", emphasis: main },
        { label: "Close as false alarm", kind: "status", to: "dismissed", emphasis: "quiet" },
      );
      break;
    case "verified":
      actions.push(
        {
          label: "Dispatch",
          kind: "status",
          to: "dispatched",
          emphasis: main,
          disabledReason: responders.length ? undefined : "Assign a responder first",
        },
        { label: "Close as false alarm", kind: "status", to: "dismissed", emphasis: "quiet" },
      );
      break;
    case "dispatched":
      actions.push({ label: "Mark on scene", kind: "status", to: "on_scene", emphasis: main });
      break;
    case "on_scene":
      actions.push({ label: "Mark resolved", kind: "status", to: "resolved", emphasis: main });
      break;
  }
  return actions;
}

export function canAssign(incident: Incident, role: Role): boolean {
  return isOperator(role) && ["verified", "dispatched", "on_scene"].includes(incident.status);
}
