import type { IncidentType, Severity } from "@bantaybuhay/shared";
import { LayoutGrid, LogOut, MapPinPlus, Moon } from "lucide-react";
import { useState } from "react";
import { STATUS_LABEL, STEPS, TYPE_LABEL } from "../lib/labels";
import { Button, ListCard, Rail, SeverityBadge, Stat, StatusPill, STROKE, SwipeToConfirm, cx, incidentIcon } from "../ui";
import { BarangayMap } from "./BarangayMap";

// Fictional incidents for the preview. The barangays are real; nothing else is.
export interface PreviewIncident {
  id: string;
  type: IncidentType;
  severity: Severity;
  barangay: string;
  status: "detected" | "verified" | "dispatched";
  ago: string;
  source: string;
  responders: string[];
}

export const PREVIEW_INCIDENTS: PreviewIncident[] = [
  {
    id: "person-down",
    type: "person_down",
    severity: "high",
    barangay: "Binicuil",
    status: "detected",
    ago: "2 minutes ago",
    source: "Simulated camera, Binicuil",
    responders: [],
  },
  {
    id: "fire",
    type: "fire_smoke",
    severity: "critical",
    barangay: "Tagukon",
    status: "dispatched",
    ago: "14 minutes ago",
    source: "Reported by phone",
    responders: ["Dennis Alipao, Fire Response"],
  },
  {
    id: "flood",
    type: "flood",
    severity: "medium",
    barangay: "Hilamonan",
    status: "verified",
    ago: "31 minutes ago",
    source: "Reported by phone",
    responders: [],
  },
];

const railIcon = { size: 22, strokeWidth: STROKE };
const RAIL = [
  { id: "ops", label: "Operations", icon: <LayoutGrid {...railIcon} /> },
  { id: "report", label: "Report an incident", icon: <MapPinPlus {...railIcon} /> },
  { id: "theme", label: "Theme", icon: <Moon {...railIcon} /> },
  { id: "out", label: "Sign out", icon: <LogOut {...railIcon} /> },
];

function Progress({ status }: { status: PreviewIncident["status"] }) {
  const reached = STEPS.indexOf(status);
  return (
    <div>
      <div className="grid grid-cols-5 gap-1.5" aria-hidden="true">
        {STEPS.map((step, index) => (
          <span key={step} className={cx("h-2 rounded-full", index <= reached ? "bg-inverse" : "bg-card-muted")} />
        ))}
      </div>
      <p className="mt-2 text-[13px] text-fg-2">
        <span className="font-bold text-fg">{STATUS_LABEL[status]}</span>, step {reached + 1} of 5
      </p>
    </div>
  );
}

// The operator console in one window: rail, map, incident queue and the open incident.
export function ConsolePreview() {
  const [selectedId, setSelectedId] = useState("person-down");
  const selected = PREVIEW_INCIDENTS.find((item) => item.id === selectedId)!;
  const tints = Object.fromEntries(PREVIEW_INCIDENTS.map((item) => [item.barangay, item.severity]));

  return (
    <div className="overflow-hidden rounded-panel bg-canvas shadow-float ring-1 ring-hairline">
      <div className="grid gap-3 p-3 lg:grid-cols-[auto_minmax(0,1fr)_340px] xl:grid-cols-[auto_minmax(0,1fr)_340px_300px]">
        <div className="hidden lg:block">
          <Rail label="Console preview" items={RAIL} activeId="ops" onSelect={() => undefined} />
        </div>

        <div className="relative hidden min-h-[520px] overflow-hidden rounded-card bg-card-muted lg:block">
          <div className="absolute inset-6">
            <BarangayMap
              label="Preview map of Kabankalan City with three incidents"
              tints={tints}
              markers={PREVIEW_INCIDENTS.map((item) => ({
                barangay: item.barangay,
                severity: item.severity,
                selected: item.id === selectedId,
              }))}
            />
          </div>
          <div className="glass absolute top-4 left-4 rounded-card px-5 py-4 shadow-soft">
            <p className="font-display text-[15px] font-medium text-fg-2">Kabankalan City operations</p>
            <div className="mt-2 flex gap-5">
              <Stat value={1} label="need attention" />
              <Stat value={2} label="in progress" />
            </div>
          </div>
        </div>

        <div className="glass space-y-2 rounded-panel p-3">
          <p className="px-1 pt-1 pb-2 font-display text-[15px] font-medium text-fg-2">Incidents</p>
          {PREVIEW_INCIDENTS.map((item) => (
            <ListCard
              key={item.id}
              title={TYPE_LABEL[item.type]}
              meta={`${item.barangay}, ${item.ago}`}
              note={item.status === "detected" ? "Not acknowledged" : STATUS_LABEL[item.status]}
              tile={incidentIcon(item.type)}
              severity={item.severity}
              selected={item.id === selectedId}
              onClick={() => setSelectedId(item.id)}
            />
          ))}
        </div>

        <div className="hidden space-y-5 rounded-panel bg-card p-6 xl:block">
          <div>
            <SeverityBadge severity={selected.severity} />
            <p className="mt-3 font-display text-[24px] font-semibold leading-tight">{TYPE_LABEL[selected.type]}</p>
            <p className="mt-1 text-[15px] text-fg-2">
              {selected.barangay}, detected {selected.ago}
            </p>
          </div>
          <Progress status={selected.status} />
          {selected.status === "detected" && (
            <div className="space-y-2">
              <Button fullWidth>Acknowledge</Button>
              <Button fullWidth variant="secondary">
                Verify incident
              </Button>
            </div>
          )}
          {selected.status === "verified" && (
            <SwipeToConfirm key={selected.id} label="Dispatch" doneLabel="Dispatched" onConfirm={() => undefined} />
          )}
          {selected.status === "dispatched" && <Button fullWidth>Mark on scene</Button>}
          <div>
            <p className="font-display text-[15px] font-medium text-fg-2">Responders</p>
            {selected.responders.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {selected.responders.map((name) => (
                  <StatusPill key={name} tone="inverse">
                    {name}
                  </StatusPill>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-[15px] text-fg-2">No one assigned yet</p>
            )}
          </div>
          <div>
            <p className="font-display text-[15px] font-medium text-fg-2">Source</p>
            <p className="mt-1 text-[15px]">{selected.source}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
