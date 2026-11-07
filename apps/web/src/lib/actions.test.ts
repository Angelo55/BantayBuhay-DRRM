import { describe, expect, it } from "vitest";
import { canAssign, nextActions } from "./actions";
import type { Incident } from "./types";

const base: Incident = {
  id: "i1",
  incidentType: "fire_smoke",
  severity: "critical",
  status: "detected",
  description: null,
  latitude: 9.98,
  longitude: 122.81,
  barangayName: "Binicuil",
  detectedAt: "2026-11-07T08:00:00Z",
  acknowledgedAt: null,
  resolvedAt: null,
  responders: [],
  source: "report",
  cameraName: null,
  snapshotDetectionId: null,
};
const responder = { id: "r1", fullName: "Dennis Alipao" };
const labels = (incident: Partial<Incident>, role: Parameters<typeof nextActions>[1]) =>
  nextActions({ ...base, ...incident }, role).map((action) => action.label);

describe("nextActions for operators", () => {
  it("asks for acknowledgement first on a new incident", () => {
    const [first] = nextActions(base, "operator");
    expect(first).toMatchObject({ label: "Acknowledge", emphasis: "primary" });
    expect(labels({}, "operator")).toEqual([
      "Acknowledge",
      "Verify incident",
      "Close as false alarm",
    ]);
  });

  it("drops acknowledgement once someone has acknowledged", () => {
    expect(labels({ acknowledgedAt: "2026-11-07T08:01:00Z" }, "operator")).toEqual([
      "Verify incident",
      "Close as false alarm",
    ]);
  });

  it("blocks dispatch until a responder is assigned, and says why", () => {
    const blocked = nextActions({ ...base, status: "verified", acknowledgedAt: "x" }, "operator");
    expect(blocked[0]).toMatchObject({ label: "Dispatch", disabledReason: "Assign a responder first" });

    const ready = nextActions(
      { ...base, status: "verified", acknowledgedAt: "x", responders: [responder] },
      "admin",
    );
    expect(ready[0]).toMatchObject({ label: "Dispatch", disabledReason: undefined });
  });

  it("offers on scene, then resolved", () => {
    expect(labels({ status: "dispatched", acknowledgedAt: "x" }, "operator")).toEqual(["Mark on scene"]);
    expect(labels({ status: "on_scene", acknowledgedAt: "x" }, "operator")).toEqual(["Mark resolved"]);
  });

  it("offers nothing on a closed incident", () => {
    expect(labels({ status: "resolved" }, "operator")).toEqual([]);
    expect(labels({ status: "dismissed" }, "operator")).toEqual([]);
  });
});

describe("nextActions for responders", () => {
  it("lets a responder report arrival and resolution only", () => {
    expect(labels({ status: "dispatched" }, "responder")).toEqual(["I'm on scene"]);
    expect(labels({ status: "on_scene" }, "responder")).toEqual(["Mark resolved"]);
  });

  it("gives a responder no operator actions", () => {
    expect(labels({ status: "detected" }, "responder")).toEqual([]);
    expect(labels({ status: "verified" }, "responder")).toEqual([]);
  });

  it("gives civilians nothing", () => {
    expect(labels({ status: "dispatched" }, "civilian")).toEqual([]);
  });
});

describe("canAssign", () => {
  it("allows operators to assign between verification and resolution", () => {
    expect(canAssign({ ...base, status: "verified" }, "operator")).toBe(true);
    expect(canAssign({ ...base, status: "on_scene" }, "admin")).toBe(true);
    expect(canAssign({ ...base, status: "detected" }, "operator")).toBe(false);
    expect(canAssign({ ...base, status: "resolved" }, "operator")).toBe(false);
    expect(canAssign({ ...base, status: "verified" }, "responder")).toBe(false);
  });
});
