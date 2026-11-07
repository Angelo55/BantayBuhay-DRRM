import type { IncidentType } from "@bantaybuhay/shared";
import { Flame, Hand, PersonStanding, Waves } from "lucide-react";
import type { ReactNode } from "react";

export const STROKE = 1.75;

// The reference's tiles hold 3D illustrations; BantayBuhay uses outline icons instead.
export function incidentIcon(type: IncidentType, size = 24): ReactNode {
  switch (type) {
    case "fire_smoke":
      return <Flame aria-hidden="true" size={size} strokeWidth={STROKE} />;
    case "person_down":
      // A standing figure on its side. DESIGN.md logs this as weak; a custom icon is planned.
      return <PersonStanding aria-hidden="true" size={size} strokeWidth={STROKE} className="rotate-90" />;
    case "flood":
      return <Waves aria-hidden="true" size={size} strokeWidth={STROKE} />;
    case "sos_gesture":
      return <Hand aria-hidden="true" size={size} strokeWidth={STROKE} />;
  }
}

export const INCIDENT_ICON: Record<IncidentType, ReactNode> = {
  fire_smoke: incidentIcon("fire_smoke"),
  person_down: incidentIcon("person_down"),
  flood: incidentIcon("flood"),
  sos_gesture: incidentIcon("sos_gesture"),
};
