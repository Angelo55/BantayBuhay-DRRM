import type { IncidentType } from "@bantaybuhay/shared";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import {
  AlertBanner,
  AnimatedItem,
  AnimatedList,
  Button,
  DURATION,
  EASE,
  Input,
  ListCard,
  SeverityShape,
  Stat,
  ToastStack,
  incidentIcon,
  useToasts,
} from "../ui";

const CURVE_USE: Record<keyof typeof EASE, string> = {
  standard: "Between two resting states",
  enter: "Arriving: banners, panels, toasts",
  exit: "Leaving: quick, so nothing lingers",
  emphasized: "Attention: alerts, the landing steps",
};

const SAMPLE: { id: number; title: string; type: IncidentType }[] = [
  { id: 1, title: "Person down", type: "person_down" },
  { id: 2, title: "Fire or smoke", type: "fire_smoke" },
  { id: 3, title: "Flooding", type: "flood" },
];

function Demo({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card bg-card p-5 shadow-soft">
      <p className="mb-4 font-display text-[15px] font-medium text-fg-2">{title}</p>
      {children}
    </div>
  );
}

// Every motion primitive and state, for review. Reduced motion is honoured here too.
export function MotionDemos() {
  const reduced = useReducedMotion();
  const [played, setPlayed] = useState(false);
  const [bannerKey, setBannerKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toasts, show, dismiss } = useToasts();
  const [items, setItems] = useState(SAMPLE);
  const [nextId, setNextId] = useState(4);
  const [count, setCount] = useState(2);
  const [shakes, setShakes] = useState(0);

  return (
    <div className="space-y-6">
      <p className="max-w-[70ch] text-[15px] text-fg-2">
        {reduced
          ? "Your device asks for reduced motion, so these demos finish instantly, loops stop, and alerts show a still ring instead of a pulse."
          : "Timings come from the motion tokens in src/ui/motion.ts. Turn on reduced motion in your system settings to see the still versions."}
      </p>

      <Demo title="Durations and curves">
        <ul className="mb-4 flex flex-wrap gap-2">
          {Object.entries(DURATION).map(([name, seconds]) => (
            <li key={name} className="rounded-full bg-card-muted px-3 py-1 text-[13px]">
              <span className="font-bold">{name}</span> {Math.round(seconds * 1000)} ms
            </li>
          ))}
        </ul>
        <div className="space-y-3">
          {(Object.keys(EASE) as (keyof typeof EASE)[]).map((name) => (
            <div key={name} className="grid items-center gap-3 sm:grid-cols-[180px_1fr]">
              <p className="text-[13px]">
                <span className="font-bold">{name}</span>
                <span className="block text-fg-2">{CURVE_USE[name]}</span>
              </p>
              {/* The track is a size container, so the dot can travel its full width with transform. */}
              <div className="h-10 rounded-full bg-card-muted p-1" style={{ containerType: "inline-size" }}>
                <motion.span
                  className="block h-8 w-8 rounded-full bg-inverse"
                  animate={{ x: played ? "calc(100cqw - 2rem)" : 0 }}
                  transition={{ duration: DURATION.slow, ease: EASE[name] }}
                />
              </div>
            </div>
          ))}
        </div>
        <Button className="mt-4" variant="secondary" onClick={() => setPlayed((value) => !value)}>
          Play the curves
        </Button>
      </Demo>

      <div className="grid gap-6 lg:grid-cols-2">
        <Demo title="Emergency banner: arrives firmly, icon pulses until acknowledged">
          <div className="space-y-3">
            <AlertBanner key={`c-${bannerKey}`} severity="critical" title="Critical incident: Fire or smoke">
              Tagukon. Pulses every 1.2 s.
            </AlertBanner>
            <AlertBanner key={`h-${bannerKey}`} severity="high" title="High incident: Person down">
              Binicuil. Pulses every 1.9 s.
            </AlertBanner>
          </div>
          <Button className="mt-4" variant="secondary" onClick={() => setBannerKey((key) => key + 1)}>
            Replay the arrival
          </Button>
        </Demo>

        <Demo title="Map pulse rings by severity">
          <div className="flex items-center gap-10 py-6">
            {(["critical", "high"] as const).map((level) => (
              <div key={level} className="flex flex-col items-center gap-3">
                <span
                  className={`pulse-ring inline-flex rounded-full p-2 ${level === "critical" ? "text-severity-critical" : "text-severity-high"}`}
                  data-severity={level}
                >
                  <SeverityShape severity={level} size={24} />
                </span>
                <span className="text-[13px] font-bold">{level === "critical" ? "Critical" : "High"}</span>
              </div>
            ))}
            <p className="max-w-[28ch] text-[13px] text-fg-2">Medium and low don't pulse; their markers only drop in.</p>
          </div>
        </Demo>

        <Demo title="Buttons: press, then a spinner while working">
          <Button
            loading={loading}
            onClick={() => {
              setLoading(true);
              window.setTimeout(() => setLoading(false), 1500);
            }}
          >
            Verify incident
          </Button>
        </Demo>

        <Demo title="Toasts: stack, pause on hover, swipe away">
          <Button variant="secondary" onClick={() => show(`Dispatched responder ${toasts.length + 1}`)}>
            Show a toast
          </Button>
          <ToastStack toasts={toasts} onDismiss={dismiss} />
        </Demo>

        <Demo title="Live queue: items arrive, leave and reorder">
          <AnimatedList>
            {items.map((item) => (
              <AnimatedItem key={item.id}>
                <ListCard title={item.title} meta="Kabankalan City" tile={incidentIcon(item.type)} />
              </AnimatedItem>
            ))}
          </AnimatedList>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setItems((list) => [{ id: nextId, title: "SOS hand signal", type: "sos_gesture" }, ...list]);
                setNextId((id) => id + 1);
              }}
            >
              Add an incident
            </Button>
            <Button variant="secondary" onClick={() => setItems((list) => list.slice(0, -1))}>
              Close the oldest
            </Button>
            <Button variant="secondary" onClick={() => setItems((list) => [...list].reverse())}>
              Reorder
            </Button>
          </div>
        </Demo>

        <Demo title="Live numbers settle in; they never count up in the console">
          <Stat value={count} label="need attention" />
          <Button className="mt-4" variant="secondary" onClick={() => setCount((value) => value + 1)}>
            Add one
          </Button>
        </Demo>

        <Demo title="Refused sign-in: one shake">
          <div key={shakes} className={shakes ? "shake" : undefined}>
            <Input aria-label="Password" type="password" defaultValue="wrong" />
          </div>
          <Button className="mt-4" variant="secondary" onClick={() => setShakes((value) => value + 1)}>
            Try a wrong password
          </Button>
        </Demo>
      </div>
    </div>
  );
}
