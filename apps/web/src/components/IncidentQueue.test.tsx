import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Incident } from "../lib/types";
import { IncidentQueue } from "./IncidentQueue";

afterEach(cleanup);

const NOW = Date.parse("2026-11-07T12:00:00Z");

function incident(overrides: Partial<Incident>): Incident {
  return {
    id: "a",
    incidentType: "fire_smoke",
    severity: "high",
    status: "detected",
    description: null,
    latitude: 9.98,
    longitude: 122.82,
    barangayName: "Binicuil",
    detectedAt: "2026-11-07T11:58:00Z",
    acknowledgedAt: null,
    resolvedAt: null,
    responders: [],
    source: "report",
    cameraName: null,
    snapshotDetectionId: null,
    ...overrides,
  };
}

const base = { selectedId: null, onSelect: () => undefined, now: NOW, emptyTitle: "All quiet", emptyMessage: "Nothing yet" };

describe("IncidentQueue", () => {
  it("shows a loading skeleton, not the empty state, before the first load", () => {
    render(<IncidentQueue {...base} incidents={[]} loaded={false} />);

    expect(screen.getByRole("status", { name: "Loading incidents" })).toBeTruthy();
    expect(screen.queryByText("All quiet")).toBeNull();
  });

  it("shows the empty state once loaded with nothing to show", () => {
    render(<IncidentQueue {...base} incidents={[]} loaded />);

    expect(screen.getByText("All quiet")).toBeTruthy();
  });

  it("groups incidents, marks unacknowledged ones and shows severity as a word", () => {
    const onSelect = vi.fn();
    render(
      <IncidentQueue
        {...base}
        onSelect={onSelect}
        loaded
        incidents={[
          incident({ id: "new", severity: "critical" }),
          incident({ id: "moving", status: "dispatched", incidentType: "flood", acknowledgedAt: "2026-11-07T11:59:00Z" }),
        ]}
      />,
    );

    const attention = screen.getByRole("region", { name: "Needs attention" });
    expect(attention.textContent).toContain("Not acknowledged");
    expect(attention.textContent).toContain("Critical");
    expect(screen.getByRole("region", { name: "In progress" }).textContent).toContain("Dispatched");

    fireEvent.click(screen.getByRole("button", { name: /Flooding/ }));
    expect(onSelect).toHaveBeenCalledWith("moving");
  });
});
