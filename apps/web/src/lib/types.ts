import type { IncidentStatus, IncidentType, PublicUser, Severity } from "@bantaybuhay/shared";

export type User = PublicUser;

export interface Incident {
  id: string;
  incidentType: IncidentType;
  severity: Severity;
  status: IncidentStatus;
  description: string | null;
  latitude: number;
  longitude: number;
  barangayName: string | null;
  detectedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  responders: { id: string; fullName: string }[];
  source: "report" | "detection";
  cameraName: string | null;
  snapshotDetectionId: string | null;
}

export interface PendingDetection {
  id: string;
  cameraId: string;
  incidentType: IncidentType;
  confidence: number;
  modelVersion: string;
  capturedAt: string;
  reviewStatus: "pending" | "confirmed" | "rejected";
  hasSnapshot: boolean;
  cameraName: string;
  barangayName: string | null;
}

export interface IncidentEvent {
  fromStatus: IncidentStatus | null;
  toStatus: IncidentStatus;
  note: string | null;
  at: string;
}

export interface Camera {
  id: string;
  name: string;
  status: "online" | "offline";
  isSimulated: boolean;
  latitude: number;
  longitude: number;
  barangayName: string | null;
}

export interface Responder {
  id: string;
  fullName: string;
  unit: string;
  dutyStatus: string;
  activeAssignments: number;
}

export interface BarangayCollection {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    id: string;
    properties: { psgc: string; name: string };
    geometry: { type: "MultiPolygon"; coordinates: number[][][][] };
  }[];
}
