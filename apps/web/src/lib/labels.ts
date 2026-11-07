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

export const SEVERITY_LABEL: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const SEVERITY_RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };

export const SEVERITY_COLOR: Record<Severity, string> = {
  low: "#5AA9F0",
  medium: "#F2C230",
  high: "#F28C28",
  critical: "#FF6166",
};

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
