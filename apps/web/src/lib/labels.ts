import type { IncidentStatus, IncidentType, Severity } from "@bantaybuhay/shared";

export const TYPE_LABEL: Record<IncidentType, string> = {
  fire_smoke: "Fire or smoke",
  person_down: "Person down",
  flood: "Flooding",
  sos_gesture: "SOS hand signal",
};

export const STATUS_LABEL: Record<IncidentStatus, string> = {
  detected: "Detected",
  verified: "Verified",
  dispatched: "Dispatched",
  on_scene: "On scene",
  resolved: "Resolved",
  dismissed: "False alarm",
};

export const SEVERITY_RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };

export const ACTIVE_STATUSES: readonly IncidentStatus[] = [
  "detected",
  "verified",
  "dispatched",
  "on_scene",
];

export const STEPS: readonly IncidentStatus[] = [
  "detected",
  "verified",
  "dispatched",
  "on_scene",
  "resolved",
];
