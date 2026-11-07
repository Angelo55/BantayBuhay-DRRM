import type { IncidentType, Severity } from "@bantaybuhay/shared";
import {
  Bell,
  Cctv,
  Flame,
  Hand,
  LayoutGrid,
  Map as MapIcon,
  Minus,
  PersonStanding,
  Plus,
  Settings,
  Users,
  Waves,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import {
  AlertBanner,
  Button,
  Card,
  CountBadge,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  IconTile,
  Input,
  ListCard,
  MapCallout,
  MapPill,
  Modal,
  OfflineNotice,
  Rail,
  SEVERITY_FILL,
  SegmentedControl,
  Select,
  SeverityBadge,
  SeverityLabel,
  SeverityShape,
  Skeleton,
  Stat,
  StatusPill,
  SwipeToConfirm,
  Textarea,
  Toast,
  cx,
  useTheme,
} from "../ui";

const STROKE = 1.75;
const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];

export const INCIDENT_ICON: Record<IncidentType, ReactNode> = {
  fire_smoke: <Flame aria-hidden="true" size={24} strokeWidth={STROKE} />,
  // A standing figure turned on its side reads as someone on the ground.
  person_down: <PersonStanding aria-hidden="true" size={24} strokeWidth={STROKE} className="rotate-90" />,
  flood: <Waves aria-hidden="true" size={24} strokeWidth={STROKE} />,
  sos_gesture: <Hand aria-hidden="true" size={24} strokeWidth={STROKE} />,
};

const COLOR_TOKENS = [
  ["canvas", "Page and map background"],
  ["card", "Cards and inputs"],
  ["card-muted", "Quiet cards, tracks, skeletons"],
  ["fg", "Main text"],
  ["fg-2", "Secondary text"],
  ["hairline", "Decorative dividers"],
  ["border-ui", "Control borders"],
  ["accent", "Active and selected"],
  ["accent-strong", "Accent hover"],
  ["info", "Counts, links, focus"],
  ["info-soft", "Info backgrounds"],
  ["inverse", "Black pills"],
  ["critical-banner", "Critical alert banner"],
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-hairline py-10">
      <h2 id={id} className="font-display text-[24px] font-semibold tracking-[-0.01em] text-fg">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="mb-3 font-display text-[15px] font-medium text-fg-2">{children}</p>;
}

export function StyleGuide() {
  const { theme, setTheme } = useTheme();
  const [railActive, setRailActive] = useState("incidents");
  const [view, setView] = useState<"incidents" | "map">("incidents");
  const [selectedCard, setSelectedCard] = useState("person");
  const [responder, setResponder] = useState("dennis");
  const [modalOpen, setModalOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [entrance, setEntrance] = useState(0);
  const [swipeKey, setSwipeKey] = useState(0);

  const railItems = [
    { id: "incidents", label: "Incidents", icon: <LayoutGrid size={22} strokeWidth={STROKE} /> },
    { id: "map", label: "Map", icon: <MapIcon size={22} strokeWidth={STROKE} /> },
    { id: "responders", label: "Responders", icon: <Users size={22} strokeWidth={STROKE} /> },
    { id: "cameras", label: "Cameras", icon: <Cctv size={22} strokeWidth={STROKE} /> },
    { id: "settings", label: "Settings", icon: <Settings size={22} strokeWidth={STROKE} /> },
  ];

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-8">
        <header className="flex flex-wrap items-end justify-between gap-6 pt-12 pb-10">
          <div>
            <p className="font-display text-[15px] font-medium text-fg-2">BantayBuhay</p>
            <h1 className="mt-2 max-w-[12ch] font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.02em]">
              Design system
            </h1>
            <p className="mt-3 max-w-[60ch] text-[15px] text-fg-2">
              Every token and component, for review before screens are rebuilt. The rules are in DESIGN.md.
            </p>
          </div>
          <SegmentedControl
            label="Theme"
            value={theme}
            onChange={setTheme}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </header>

        <Section id="colors" title="Color">
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {COLOR_TOKENS.map(([token, use]) => (
              <li key={token} className="rounded-card bg-card p-3 shadow-soft">
                <span
                  className="block h-16 rounded-tile border border-hairline"
                  style={{ backgroundColor: `var(--bb-${token})` }}
                />
                <p className="mt-3 font-display text-[15px] font-medium">{token}</p>
                <p className="text-[13px] text-fg-2">{use}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="severity" title="Severity">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <Label>Badges carry shape, word and color</Label>
              <div className="flex flex-wrap gap-2">
                {SEVERITIES.map((level) => (
                  <SeverityBadge key={level} severity={level} />
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-4">
                {SEVERITIES.map((level) => (
                  <SeverityLabel key={level} severity={level} />
                ))}
              </div>
            </div>
            <div>
              <Label>Map markers, each with an ink ring</Label>
              <div className="flex items-center gap-5 rounded-card bg-card-muted p-5">
                {SEVERITIES.map((level, index) => (
                  <span
                    key={level}
                    className={cx(
                      "inline-flex items-center justify-center rounded-full border-2 border-inverse text-on-severity",
                      SEVERITY_FILL[level],
                    )}
                    style={{ width: 18 + index * 4, height: 18 + index * 4 }}
                  >
                    <SeverityShape severity={level} size={8 + index} />
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6">
            <AlertBanner
              title="Critical: fire or smoke in Binicuil"
              actions={
                <>
                  <Button variant="secondary">Open</Button>
                  <Button variant="ghost" className="text-on-critical-banner hover:bg-transparent hover:underline">
                    Dismiss banner
                  </Button>
                </>
              }
            >
              Raised by Simulated camera, Binicuil, just now. Not acknowledged.
            </AlertBanner>
          </div>
        </Section>

        <Section id="type" title="Type">
          <div className="space-y-6">
            <div>
              <Label>Display, Outfit 40/600</Label>
              <p className="max-w-[14ch] font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.02em]">
                Kabankalan City operations
              </p>
            </div>
            <div className="flex flex-wrap gap-10">
              <Stat value={4} label="Need attention" />
              <Stat value={3} label="Responders available" />
              <Stat value={6} label="Cameras online" />
            </div>
            <div>
              <Label>Section heading, Outfit 18/500</Label>
              <p className="font-display text-[18px] font-medium">Needs review</p>
            </div>
            <div>
              <Label>Body and data, Atkinson Hyperlegible Next 15/400</Label>
              <p className="max-w-[60ch] text-[15px] leading-normal">
                Allergic to penicillin. Avoid metformin 500 mg. Characters that matter in medicine names stay
                distinct: Il1 O0 rn m.
              </p>
              <p className="mt-1 text-[13px] text-fg-2">Meta text, 13 px: detected 3 minutes ago</p>
            </div>
          </div>
        </Section>

        <Section id="shape" title="Shape, depth and motion">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["rounded-tile", "Tile, 18 px"],
              ["rounded-control", "Control, 16 px"],
              ["rounded-card", "Card, 24 px"],
              ["rounded-panel", "Panel, 40 px"],
            ].map(([radius, name]) => (
              <div key={name} className={cx("flex h-28 items-end bg-card p-4 shadow-soft", radius)}>
                <p className="text-[13px] text-fg-2">{name}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["shadow-soft", "Soft, resting"],
              ["shadow-lift", "Lift, hover"],
              ["shadow-float", "Float, overlays"],
            ].map(([shadow, name]) => (
              <div key={name} className={cx("rounded-card bg-card p-5", shadow)}>
                <p className="text-[13px] text-fg-2">{name}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-start gap-4">
            <Card className="w-56 p-5 transition-[transform,box-shadow] duration-200 ease-out-soft hover:-translate-y-0.5 hover:shadow-lift">
              <p className="font-display text-[15px] font-medium">Hover me</p>
              <p className="mt-1 text-[13px] text-fg-2">Lifts 2 px in 200 ms</p>
            </Card>
            <div>
              <Button variant="secondary" onClick={() => setEntrance((count) => count + 1)}>
                Replay entrance
              </Button>
              <motion.div
                key={entrance}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="mt-3 rounded-card bg-card p-5 shadow-soft"
              >
                <p className="text-[13px] text-fg-2">Fades in and rises 8 px in 320 ms</p>
              </motion.div>
            </div>
          </div>
        </Section>

        <Section id="icons" title="Icons">
          <div className="flex flex-wrap gap-4">
            {(Object.keys(INCIDENT_ICON) as IncidentType[]).map((type) => (
              <div key={type} className="flex flex-col items-center gap-2">
                <IconTile>{INCIDENT_ICON[type]}</IconTile>
                <span className="text-[13px] text-fg-2">{type.replace("_", " ")}</span>
              </div>
            ))}
            <div className="flex flex-col items-center gap-2">
              <IconTile>
                <Bell aria-hidden="true" size={24} strokeWidth={STROKE} />
              </IconTile>
              <span className="text-[13px] text-fg-2">alerts</span>
            </div>
          </div>
        </Section>

        <Section id="actions" title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Verify incident</Button>
            <Button variant="accent">Acknowledge</Button>
            <Button variant="secondary">Report incident</Button>
            <Button variant="ghost">Close as false alarm</Button>
            <Button variant="danger">Escalate to critical</Button>
            <Button disabled>Dispatch</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <IconButton label="Zoom in">
              <Plus size={20} strokeWidth={STROKE} />
            </IconButton>
            <IconButton label="Zoom out">
              <Minus size={20} strokeWidth={STROKE} />
            </IconButton>
            <IconButton label="Close incident details" shape="square" tone="inverse">
              <X size={20} strokeWidth={STROKE} />
            </IconButton>
            <Button size="lg">Large primary</Button>
          </div>
        </Section>

        <Section id="navigation" title="Navigation">
          <div className="flex flex-wrap items-start gap-10">
            <Rail label="Main" items={railItems} activeId={railActive} onSelect={setRailActive} />
            <div className="min-w-[280px] flex-1 space-y-6">
              <div>
                <Label>Phones use the same rail along the bottom</Label>
                <Rail label="Main, mobile" items={railItems} activeId={railActive} onSelect={setRailActive} orientation="horizontal" />
              </div>
              <div>
                <Label>Switches between two views</Label>
                <SegmentedControl
                  label="View"
                  value={view}
                  onChange={setView}
                  options={[
                    { value: "incidents", label: "Incidents" },
                    { value: "map", label: "Map" },
                  ]}
                />
              </div>
            </div>
          </div>
        </Section>

        <Section id="cards" title="Cards">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-3">
              <Label>Incident cards; the selected one inverts</Label>
              <ListCard
                title="Fire or smoke"
                meta="Binicuil, 3 min ago"
                tile={INCIDENT_ICON.fire_smoke}
                severity="critical"
                note="Not acknowledged"
                selected={selectedCard === "fire"}
                onClick={() => setSelectedCard("fire")}
              />
              <ListCard
                title="Person down"
                meta="Tagukon, 12 min ago"
                tile={INCIDENT_ICON.person_down}
                severity="high"
                selected={selectedCard === "person"}
                onClick={() => setSelectedCard("person")}
              />
              <ListCard
                title="Flooding"
                meta="Hilamonan, 49 min ago"
                tile={INCIDENT_ICON.flood}
                severity="medium"
                selected={selectedCard === "flood"}
                onClick={() => setSelectedCard("flood")}
              />
            </div>
            <div className="space-y-4">
              <Label>Glass panel for the focused item</Label>
              <Card tone="glass" shape="panel" className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <SeverityBadge severity="high" />
                    <p className="mt-3 font-display text-[24px] font-semibold leading-tight">Person down</p>
                    <p className="mt-1 text-[15px] text-fg-2">Tagukon, detected 12 minutes ago</p>
                  </div>
                  <IconButton label="Close" shape="square" tone="inverse">
                    <X size={20} strokeWidth={STROKE} />
                  </IconButton>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusPill tone="inverse">Verified</StatusPill>
                  <StatusPill>Raised by camera</StatusPill>
                  <StatusPill tone="info">
                    Medicines to avoid <CountBadge count={2} label="medicines to avoid" />
                  </StatusPill>
                </div>
              </Card>
              <Label>Choose a responder; the chosen card turns butter</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["dennis", "Dennis Alipao", "Fire Response, free"],
                  ["mylene", "Mylene Gatuslao", "Emergency Medical, on 1"],
                ].map(([id, name, detail]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={responder === id}
                    onClick={() => setResponder(id!)}
                    className={cx(
                      "rounded-card p-4 text-left transition-[background-color,box-shadow] duration-200 ease-out-soft",
                      responder === id ? "bg-accent text-on-accent" : "bg-card shadow-soft hover:shadow-lift",
                    )}
                  >
                    <span className="block font-display text-[15px] font-medium">{name}</span>
                    <span className={cx("mt-1 block text-[13px]", responder === id ? "text-on-accent" : "text-fg-2")}>
                      {detail}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section id="map" title="Map overlays">
          <div className="relative flex min-h-48 flex-wrap items-center gap-6 overflow-hidden rounded-panel bg-card-muted p-8">
            <MapCallout
              tile={<Cctv aria-hidden="true" size={20} strokeWidth={STROKE} />}
              title="Simulated camera, Binicuil"
              detail="Online"
            />
            <MapPill>Binicuil</MapPill>
            <MapPill>Tagukon</MapPill>
            <div className="ml-auto flex flex-col gap-2">
              <IconButton label="Zoom in">
                <Plus size={20} strokeWidth={STROKE} />
              </IconButton>
              <IconButton label="Zoom out">
                <Minus size={20} strokeWidth={STROKE} />
              </IconButton>
            </div>
          </div>
        </Section>

        <Section id="forms" title="Forms">
          <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
            <Field label="What's happening">
              {({ id }) => (
                <Select id={id} defaultValue="fire_smoke">
                  <option value="fire_smoke">Fire or smoke</option>
                  <option value="person_down">Person down</option>
                  <option value="flood">Flooding</option>
                  <option value="sos_gesture">SOS hand signal</option>
                </Select>
              )}
            </Field>
            <Field label="Email" error="Enter an email address, such as name@bantaybuhay.test">
              {({ id, describedBy, invalid }) => (
                <Input id={id} type="email" defaultValue="carmela" aria-describedby={describedBy} invalid={invalid} />
              )}
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes for responders" hint="What they should know before arriving">
                {({ id, describedBy }) => <Textarea id={id} rows={3} aria-describedby={describedBy} />}
              </Field>
            </div>
          </div>
        </Section>

        <Section id="confirm" title="Confirming a dispatch">
          <div className="max-w-md">
            <SwipeToConfirm key={swipeKey} label="Swipe to dispatch" doneLabel="Dispatched" onConfirm={() => setToastOpen(true)} />
            <Button variant="ghost" onClick={() => setSwipeKey((count) => count + 1)} className="mt-2">
              Reset
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Open a dialog
            </Button>
            <Button variant="secondary" onClick={() => setToastOpen(true)}>
              Show a toast
            </Button>
          </div>
          <Modal
            open={modalOpen}
            title="Close as false alarm?"
            onClose={() => setModalOpen(false)}
            footer={
              <>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>
                  Keep it open
                </Button>
                <Button onClick={() => setModalOpen(false)}>Close as false alarm</Button>
              </>
            }
          >
            <p className="text-fg-2">The camera snapshot shows nothing happening. Responders won't be sent.</p>
          </Modal>
          <Toast message="Dispatched Dennis Alipao to Tagukon" open={toastOpen} onClose={() => setToastOpen(false)} />
        </Section>

        <Section id="states" title="States">
          <div className="grid gap-6 lg:grid-cols-2">
            <EmptyState
              icon={<LayoutGrid aria-hidden="true" size={24} strokeWidth={STROKE} />}
              title="No incidents yet"
              action={<Button variant="secondary">Report incident</Button>}
            >
              New camera detections and reports appear here as they come in.
            </EmptyState>
            <ErrorState title="Couldn't load incidents" onRetry={() => {}}>
              BantayBuhay couldn't reach its server. Your last list stays on screen until it's back.
            </ErrorState>
            <div>
              <Label>Loading</Label>
              <div className="space-y-3">
                <Skeleton className="h-20 rounded-card" />
                <Skeleton className="h-20 rounded-card" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
            <div className="space-y-4">
              <Label>Offline</Label>
              <OfflineNotice since="8:42 PM" />
              <Label>Info</Label>
              <AlertBanner tone="info" title="Two detections need review">
                The cameras weren't sure. Check the snapshots.
              </AlertBanner>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
