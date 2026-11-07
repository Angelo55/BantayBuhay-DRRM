import { useEffect, useMemo, useRef, useState } from "react";
import { SEVERITY_RANK } from "./labels";
import { playAlert, saveSoundPreference, soundPreference, soundReady, unlockOnFirstInteraction, unlockSound } from "./alertSound";
import type { Incident } from "./types";

// How often an unhandled alert sounds again, by severity.
const REPEAT_MS = { critical: 30_000, high: 60_000 } as const;

// An incident that needs someone now: high or critical, detected, and not yet acknowledged.
const isUrgent = (incident: Incident) =>
  incident.status === "detected" && !incident.acknowledgedAt && SEVERITY_RANK[incident.severity] >= 3;

const bySeverityThenNewest = (a: Incident, b: Incident) =>
  SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.detectedAt.localeCompare(a.detectedAt);

/**
 * The console's emergency state for operators: the most urgent unacknowledged incident (the
 * banner stays until someone acknowledges it), how many more are waiting, the alert sound and the
 * tab title. Sound and title change; nothing here delays acknowledging or reading.
 */
export function useEmergency(incidents: Incident[], enabled: boolean) {
  const urgent = useMemo(() => (enabled ? incidents.filter(isUrgent).sort(bySeverityThenNewest) : []), [incidents, enabled]);
  const top = urgent[0] ?? null;
  const [soundOn, setSoundOn] = useState(soundPreference);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const announced = useRef(new Set<string>());
  const lastPlayed = useRef({ critical: 0, high: 0 });

  useEffect(() => unlockOnFirstInteraction(), []);

  // A new urgent incident sounds at once; unhandled ones repeat (critical every 30 s, high every 60 s).
  useEffect(() => {
    if (!soundOn || urgent.length === 0) return;
    const sound = () => {
      const now = Date.now();
      const fresh = urgent.find((item) => !announced.current.has(item.id));
      const worst = urgent[0]!.severity === "critical" ? "critical" : "high";
      const due = now - lastPlayed.current[worst] >= REPEAT_MS[worst];
      if (!fresh && !due) return;
      const severity = fresh ? (fresh.severity === "critical" ? "critical" : "high") : worst;
      if (playAlert(severity)) {
        for (const item of urgent) announced.current.add(item.id);
        lastPlayed.current[severity] = now;
        setSoundBlocked(false);
      } else {
        setSoundBlocked(true);
      }
    };
    sound();
    const timer = setInterval(sound, 5_000);
    return () => clearInterval(timer);
  }, [urgent, soundOn]);

  // The tab title says when something is waiting, so it's noticed from another tab.
  useEffect(() => {
    if (!top) return;
    const previous = document.title;
    document.title = `${top.severity === "critical" ? "Critical" : "High"} incident waiting: BantayBuhay`;
    return () => {
      document.title = previous;
    };
  }, [top]);

  return {
    urgent: top,
    waiting: Math.max(0, urgent.length - 1),
    soundOn,
    soundBlocked: soundOn && soundBlocked && Boolean(top),
    setSoundOn(on: boolean) {
      setSoundOn(on);
      saveSoundPreference(on);
      if (on) void unlockSound();
    },
    async enableSound() {
      const ok = await unlockSound();
      if (ok && top) playAlert(top.severity === "critical" ? "critical" : "high");
      setSoundBlocked(!ok || !soundReady());
    },
  };
}
