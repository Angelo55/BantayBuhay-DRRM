import type { Severity } from "@bantaybuhay/shared";
// Official boundaries (NAMRIA and PSA, CC BY-IGO, via OCHA): the same file the database is seeded from.
import raw from "../../../api/data/kabankalan-barangays.geojson?raw";
import { cx } from "../ui";

interface Feature {
  properties: { adm4_en: string; adm4_psgc: string; area_km2: number };
  geometry: { type: "Polygon"; coordinates: number[][][] };
}

const features = (JSON.parse(raw) as { features: Feature[] }).features;

export const BARANGAY_COUNT = features.length;
export const CITY_AREA_KM2 = Math.round(features.reduce((sum, feature) => sum + feature.properties.area_km2, 0));

// A plain equirectangular projection, scaled for latitude: accurate enough for one city, and it
// needs no map library or tiles, so the page stays light.
const points = features.flatMap((feature) => feature.geometry.coordinates.flat());
const minLon = Math.min(...points.map((point) => point[0]!));
const maxLon = Math.max(...points.map((point) => point[0]!));
const minLat = Math.min(...points.map((point) => point[1]!));
const maxLat = Math.max(...points.map((point) => point[1]!));
const xScale = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
const UNIT = 1000 / (maxLat - minLat);
export const VIEW_WIDTH = Math.round((maxLon - minLon) * xScale * UNIT);
export const VIEW_HEIGHT = 1000;

const project = ([lon, lat]: number[]) =>
  [((lon! - minLon) * xScale * UNIT).toFixed(1), ((maxLat - lat!) * UNIT).toFixed(1)] as const;

const SHAPES = features.map((feature) => {
  const ring = feature.geometry.coordinates[0]!;
  const projected = ring.map(project);
  // The average of the outline's points: a fair marker spot for these compact shapes.
  let sumX = 0;
  let sumY = 0;
  for (const [x, y] of projected) {
    sumX += Number(x);
    sumY += Number(y);
  }
  const centre: [number, number] = [sumX / projected.length, sumY / projected.length];
  return {
    name: feature.properties.adm4_en,
    psgc: feature.properties.adm4_psgc,
    d: feature.geometry.coordinates.map((part) => `M${part.map((point) => project(point).join(",")).join("L")}Z`).join(""),
    centre,
  };
});

const TINT: Record<Severity, string> = {
  low: "fill-severity-low/25",
  medium: "fill-severity-medium/30",
  high: "fill-severity-high/30",
  critical: "fill-severity-critical/30",
};
const MARKER: Record<Severity, string> = {
  low: "fill-severity-low",
  medium: "fill-severity-medium",
  high: "fill-severity-high",
  critical: "fill-severity-critical",
};

interface BarangayMapProps {
  label: string;
  // Barangays tinted by the most serious incident in them, by name.
  tints?: Record<string, Severity>;
  // Incident markers, placed in the named barangay.
  markers?: { barangay: string; severity: Severity; selected?: boolean }[];
  highlighted?: string | null;
  onHover?: (name: string | null) => void;
  className?: string;
}

export function BarangayMap({ label, tints = {}, markers = [], highlighted, onHover, className }: BarangayMapProps) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      role="img"
      aria-label={label}
      className={cx("block h-full w-full", className)}
      onPointerLeave={() => onHover?.(null)}
    >
      {SHAPES.map((shape) => (
        <path
          key={shape.psgc}
          d={shape.d}
          onPointerEnter={() => onHover?.(shape.name)}
          className={cx(
            "stroke-fg-2 transition-[fill] duration-200 ease-out-soft [stroke-linejoin:round] [stroke-width:1.5]",
            shape.name === highlighted ? "fill-accent" : tints[shape.name] ? TINT[tints[shape.name]!] : "fill-card",
          )}
        >
          <title>{shape.name}</title>
        </path>
      ))}
      {markers.map((marker) => {
        const shape = SHAPES.find((item) => item.name === marker.barangay);
        if (!shape) return null;
        return (
          // Override 2 in DESIGN.md: every marker gets an ink ring.
          <circle
            key={marker.barangay}
            cx={shape.centre[0]}
            cy={shape.centre[1]}
            r={marker.selected ? 20 : 15}
            className={cx(MARKER[marker.severity], "stroke-inverse", marker.selected ? "[stroke-width:6]" : "[stroke-width:4]")}
          />
        );
      })}
    </svg>
  );
}
