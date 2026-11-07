import { LayoutGrid, LogOut, Map as MapIcon, MapPinPlus, Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { SEVERITY_RANK, TYPE_LABEL } from "../lib/labels";
import { useNow } from "../lib/time";
import type { BarangayCollection, Camera, Incident, User } from "../lib/types";
import { createSocket, useIncidents, type Connection } from "../lib/useIncidents";
import { useEmergency } from "../lib/useEmergency";
import { useMediaQuery } from "../lib/useMediaQuery";
import { useReviewQueue } from "../lib/useReviewQueue";
import {
  AlertBanner,
  Button,
  OfflineNotice,
  Rail,
  SEVERITY_WORD,
  STROKE,
  Stat,
  StatusPill,
  IconButton,
  ToastStack,
  useToasts,
  cx,
  transition,
  type RailItem,
  type Theme,
} from "../ui";
import { IncidentDetail } from "./IncidentDetail";
import { IncidentMap } from "./IncidentMap";
import { IncidentQueue } from "./IncidentQueue";
import { ReportIncident } from "./ReportIncident";
import { ReviewDetail } from "./ReviewDetail";

type Panel =
  | { kind: "none" }
  | { kind: "incident"; id: string }
  | { kind: "review"; id: string }
  | { kind: "report" };

const ROLE_NAME = { admin: "Administrator", operator: "DRRM operator", responder: "Responder" } as const;

// Floating-panel geometry, in pixels, so the map can keep incidents out from under them.
const RAIL_SPACE = 96;
const QUEUE_SPACE = 392;
const PANEL_SPACE = 436;


interface ConsoleProps {
  user: User;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onSignOut: () => void;
}

export function Console({ user, theme, onThemeChange, onSignOut }: ConsoleProps) {
  const isOperator = user.role === "operator" || user.role === "admin";
  const [socket] = useState(createSocket);
  const { incidents, connection, offlineSince, newest, loadError, loaded, upsert } = useIncidents(socket);
  const { pending, remove } = useReviewQueue(socket, isOperator);
  const [barangays, setBarangays] = useState<BarangayCollection | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [panel, setPanel] = useState<Panel>({ kind: "none" });
  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [view, setView] = useState<"incidents" | "map">("incidents");
  const { toasts, show: showToast, dismiss: dismissToast } = useToasts();
  const [acknowledging, setAcknowledging] = useState(false);
  // Responders: an incident newly assigned to them stays announced until they open it.
  const [assignedAlertId, setAssignedAlertId] = useState<string | null>(null);
  const known = useRef<Set<string> | null>(null);
  const now = useNow();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const wide = useMediaQuery("(min-width: 1400px)");

  useEffect(() => {
    api<BarangayCollection>("/api/barangays").then(setBarangays).catch(() => setBarangays(null));
    // Camera status comes from detector heartbeats, so refresh it now and then.
    const loadCameras = () =>
      api<{ cameras: Camera[] }>("/api/cameras")
        .then((body) => setCameras(body.cameras))
        .catch(() => setCameras([]));
    void loadCameras();
    const timer = setInterval(loadCameras, 30_000);
    return () => clearInterval(timer);
  }, []);

  // Operators: high and critical incidents raise a banner and sound until acknowledged. Medium
  // and low ones arrive as a toast and a marker on the map, without a siren.
  const emergency = useEmergency(incidents, isOperator);
  useEffect(() => {
    if (!isOperator || !newest || SEVERITY_RANK[newest.severity] >= 3) return;
    showToast(`New ${SEVERITY_WORD[newest.severity].toLowerCase()} incident: ${TYPE_LABEL[newest.incidentType]}`);
  }, [newest, isOperator, showToast]);

  // Responders: anything that appears in their list after it first loads is a new assignment.
  useEffect(() => {
    if (isOperator || !loaded) return;
    if (!known.current) {
      known.current = new Set(incidents.map((item) => item.id));
      return;
    }
    const fresh = incidents.find((item) => !known.current!.has(item.id));
    for (const item of incidents) known.current.add(item.id);
    if (fresh) setAssignedAlertId(fresh.id);
  }, [incidents, isOperator, loaded]);
  const assigned: Incident | null = assignedAlertId ? (incidents.find((item) => item.id === assignedAlertId) ?? null) : null;

  async function acknowledge(id: string) {
    setAcknowledging(true);
    try {
      const body = await api<{ incident: Incident }>(`/api/incidents/${id}/acknowledge`, { method: "POST" });
      upsert(body.incident);
      showToast("Acknowledged");
    } catch {
      showToast("Couldn't acknowledge. Try again.");
    } finally {
      setAcknowledging(false);
    }
  }

  const selected = panel.kind === "incident" ? incidents.find((item) => item.id === panel.id) : undefined;
  const reviewing = panel.kind === "review" ? pending.find((item) => item.id === panel.id) : undefined;
  const panelOpen = panel.kind !== "none";

  const select = (id: string) => {
    setPanel({ kind: "incident", id });
    if (assignedAlertId === id) setAssignedAlertId(null);
  };
  const startReport = () => {
    setPoint(null);
    setPanel({ kind: "report" });
    setView("map");
  };
  const closePanel = () => setPanel({ kind: "none" });

  const attention = incidents.filter((item) => item.status === "detected").length + pending.length;
  const inProgress = incidents.filter((item) => ["verified", "dispatched", "on_scene"].includes(item.status)).length;
  const online = cameras.filter((camera) => camera.status === "online").length;

  const railIcon = { size: 22, strokeWidth: STROKE };
  const navItems: RailItem[] = [
    { id: "incidents", label: isOperator ? "Operations" : "Your assignments", icon: <LayoutGrid {...railIcon} /> },
    ...(desktop ? [] : [{ id: "map", label: "Map", icon: <MapIcon {...railIcon} /> }]),
    ...(isOperator ? [{ id: "report", label: "Report an incident", icon: <MapPinPlus {...railIcon} /> }] : []),
    {
      id: "theme",
      label: `Switch to ${theme === "light" ? "dark" : "light"} theme`,
      icon: theme === "light" ? <Moon {...railIcon} /> : <Sun {...railIcon} />,
    },
    { id: "sign-out", label: `Sign out ${user.fullName}`, icon: <LogOut {...railIcon} /> },
  ];
  const activeNav = panel.kind === "report" ? "report" : desktop ? "incidents" : view;
  const onNav = (id: string) => {
    if (id === "theme") onThemeChange(theme === "light" ? "dark" : "light");
    else if (id === "sign-out") onSignOut();
    else if (id === "report") startReport();
    else {
      if (panel.kind === "report") closePanel();
      setView(id === "map" ? "map" : "incidents");
    }
  };

  const header = (
    <div className="glass rounded-panel p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <p className="font-display text-[15px] font-medium text-fg-2">BantayBuhay</p>
        <div className="flex items-center gap-2">
          {isOperator && (
            <IconButton
              label={emergency.soundOn ? "Turn alert sound off" : "Turn alert sound on"}
              aria-pressed={emergency.soundOn}
              onClick={() => emergency.setSoundOn(!emergency.soundOn)}
              className="h-9 w-9"
            >
              {emergency.soundOn ? <Volume2 size={18} strokeWidth={STROKE} /> : <VolumeX size={18} strokeWidth={STROKE} />}
            </IconButton>
          )}
          <ConnectionPill connection={connection} />
        </div>
      </div>
      <h1 className="mt-2 font-display text-[32px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[40px]">
        {isOperator ? "Kabankalan City operations" : "Your assignments"}
      </h1>
      <p className="mt-2 text-[15px] text-fg-2">
        {user.fullName}, {ROLE_NAME[user.role as keyof typeof ROLE_NAME] ?? "Staff"}
      </p>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
        <Stat value={attention} label={isOperator ? "need attention" : "new"} />
        <Stat value={inProgress} label="in progress" />
        {isOperator && <Stat value={`${online}/${cameras.length}`} label="cameras online" />}
      </div>
    </div>
  );

  const urgent = emergency.urgent;
  const banner = urgent ? (
    <AlertBanner
      key={urgent.id}
      severity={urgent.severity === "critical" ? "critical" : "high"}
      title={`${SEVERITY_WORD[urgent.severity]} incident: ${TYPE_LABEL[urgent.incidentType]}`}
      actions={
        <>
          <Button variant="secondary" loading={acknowledging} onClick={() => void acknowledge(urgent.id)}>
            Acknowledge
          </Button>
          <Button variant="inherit" onClick={() => select(urgent.id)}>
            Open
          </Button>
          {emergency.soundBlocked && (
            <Button variant="inherit" onClick={() => void emergency.enableSound()}>
              Enable alert sound
            </Button>
          )}
        </>
      }
    >
      {urgent.barangayName ?? "Outside mapped barangays"}
      {emergency.waiting > 0 && `. ${emergency.waiting} more waiting.`}
    </AlertBanner>
  ) : assigned ? (
    <AlertBanner
      key={assigned.id}
      tone={SEVERITY_RANK[assigned.severity] >= 3 ? "critical" : "info"}
      severity={assigned.severity === "critical" ? "critical" : assigned.severity === "high" ? "high" : undefined}
      title={`Assigned to you: ${TYPE_LABEL[assigned.incidentType]}`}
      actions={
        <Button variant="secondary" onClick={() => select(assigned.id)}>
          Open
        </Button>
      }
    >
      {assigned.barangayName ?? "Outside mapped barangays"}
    </AlertBanner>
  ) : null;

  const notices = (
    <>
      {offlineSince && <OfflineNotice since={offlineSince} />}
      {loadError && (
        <p role="alert" className="rounded-card bg-card px-4 py-3 text-[15px] shadow-soft">
          {loadError}. The list reloads when the connection returns.
        </p>
      )}
    </>
  );

  const queue = (
    <IncidentQueue
      incidents={incidents}
      loaded={loaded}
      selectedId={panel.kind === "incident" ? panel.id : null}
      onSelect={select}
      reviews={isOperator ? pending : []}
      selectedReviewId={panel.kind === "review" ? panel.id : null}
      onSelectReview={(id) => setPanel({ kind: "review", id })}
      now={now}
      emptyTitle={isOperator ? "All quiet" : "Nothing assigned"}
      emptyMessage={
        isOperator
          ? "New detections and reports appear here as they come in. Report a call with the pin button."
          : "Assignments from the operations center appear here, with an alert."
      }
    />
  );

  const panelBody = (
    <>
      {panel.kind === "report" && (
        <ReportIncident
          point={point}
          onCancel={closePanel}
          onToast={showToast}
          onReported={(incident) => {
            upsert(incident);
            setPoint(null);
            setPanel({ kind: "incident", id: incident.id });
          }}
        />
      )}
      {panel.kind === "review" && reviewing && (
        <ReviewDetail
          detection={reviewing}
          now={now}
          onClose={closePanel}
          onToast={showToast}
          onDone={(detectionId, incident) => {
            remove(detectionId);
            if (incident) {
              upsert(incident);
              setPanel({ kind: "incident", id: incident.id });
            } else {
              closePanel();
            }
          }}
        />
      )}
      {panel.kind === "incident" && selected && (
        <IncidentDetail
          incident={selected}
          role={user.role}
          now={now}
          onChanged={upsert}
          onClose={closePanel}
          onToast={showToast}
        />
      )}
    </>
  );
  const panelLabel =
    panel.kind === "report" ? "Report an incident" : panel.kind === "review" ? "Review a detection" : "Incident details";

  return (
    <div className="relative h-dvh overflow-hidden bg-canvas text-fg">
      {/* The map fills the screen; on phones it stops above the bottom navigation. */}
      <div className="absolute inset-x-0 top-0 bottom-[88px] lg:bottom-0">
        <IncidentMap
          key={theme}
          theme={theme}
          barangays={barangays}
          cameras={cameras}
          incidents={incidents}
          selectedId={panel.kind === "incident" ? panel.id : null}
          onSelect={select}
          picking={panel.kind === "report"}
          onPick={setPoint}
          picked={panel.kind === "report" ? point : null}
          coveredLeft={desktop ? RAIL_SPACE : 0}
          coveredRight={desktop ? (panelOpen && wide ? QUEUE_SPACE + PANEL_SPACE : panelOpen ? PANEL_SPACE : QUEUE_SPACE) : 0}
          controlsClassName="right-4 bottom-16 lg:right-auto lg:left-4 lg:bottom-12"
        />
      </div>

      {/* Desktop: rail, header column, queue column and the detail panel float over the map. */}
      <div className="absolute top-4 left-4 z-20 hidden lg:block">
        <Rail label="Main" orientation="vertical" items={navItems} activeId={activeNav} onSelect={onNav} />
      </div>
      <div className="absolute top-4 left-24 z-10 hidden w-[440px] max-w-[calc(100%-536px)] space-y-3 lg:block">
        {header}
        {banner}
        {notices}
      </div>
      <aside
        aria-label="Incidents"
        className="glass absolute top-4 right-4 bottom-4 z-10 hidden w-[360px] flex-col rounded-panel shadow-soft lg:flex"
      >
        <div className="flex-1 overflow-y-auto p-4">{queue}</div>
      </aside>

      {/* Phones: the incident list is its own view, and the map is the other. */}
      {!desktop && view === "incidents" && (
        <div className="absolute inset-x-0 top-0 bottom-[88px] z-10 space-y-4 overflow-y-auto bg-canvas p-4">
          {banner}
          {header}
          {notices}
          <section aria-label="Incidents">{queue}</section>
        </div>
      )}
      {!desktop && view === "map" && (
        <div className="absolute top-4 left-4 right-4 z-10 space-y-3">
          {banner}
          {notices}
        </div>
      )}
      <div className="absolute inset-x-4 bottom-3 z-30 lg:hidden">
        <Rail label="Main" orientation="horizontal" items={navItems} activeId={activeNav} onSelect={onNav} />
      </div>

      {panelOpen && (
          <motion.aside
            key={panel.kind === "report" ? "report" : panel.id}
            aria-label={panelLabel}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition.enter}
            className={cx(
              "z-40 overflow-hidden",
              panel.kind === "report"
                ? // On phones the report form is a sheet, leaving the map visible to place the pin.
                  "absolute inset-x-0 bottom-[88px] max-h-[58%] rounded-t-panel bg-card shadow-float"
                : "absolute inset-0 bg-canvas",
              // Solid, not frosted: map shapes behind glass made action text harder to read.
              "lg:top-4 lg:right-4 lg:bottom-4 lg:left-auto lg:max-h-none lg:w-[420px] lg:rounded-panel lg:bg-card lg:shadow-float",
              "min-[1400px]:right-[392px]",
            )}
          >
            {panelBody}
          </motion.aside>
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function ConnectionPill({ connection }: { connection: Connection }) {
  if (connection === "live") {
    return (
      <span role="status">
        <StatusPill tone="info">Live</StatusPill>
      </span>
    );
  }
  return (
    <span role="status">
      <StatusPill>{connection === "connecting" ? "Connecting" : "Reconnecting"}</StatusPill>
    </span>
  );
}
