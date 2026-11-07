export const ROLES = ["admin", "operator", "responder", "civilian"] as const;
export type Role = (typeof ROLES)[number];

export const INCIDENT_TYPES = ["fire_smoke", "person_down", "flood", "sos_gesture"] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

export const INCIDENT_STATUSES = [
  "detected",
  "verified",
  "dispatched",
  "on_scene",
  "resolved",
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export type DependencyStatus = "ok" | "down";

export interface ReadinessResponse {
  status: "ready" | "not_ready";
  checks: Record<string, DependencyStatus>;
}
