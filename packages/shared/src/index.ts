export const ROLES = ["admin", "operator", "responder", "civilian"] as const;
export type Role = (typeof ROLES)[number];

export const INCIDENT_TYPES = ["fire_smoke", "person_down", "flood", "sos_gesture"] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

export const SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const INCIDENT_STATUSES = [
  "detected",
  "verified",
  "dispatched",
  "on_scene",
  "resolved",
  "dismissed",
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

const TRANSITIONS: Record<IncidentStatus, readonly IncidentStatus[]> = {
  detected: ["verified", "dismissed"],
  verified: ["dispatched", "dismissed"],
  dispatched: ["on_scene"],
  on_scene: ["resolved"],
  resolved: [],
  dismissed: [],
};

export function canTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export type DependencyStatus = "ok" | "down";

export interface ReadinessResponse {
  status: "ready" | "not_ready";
  checks: Record<string, DependencyStatus>;
}

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}
