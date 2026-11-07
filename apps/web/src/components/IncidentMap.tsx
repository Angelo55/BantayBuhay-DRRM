import { Minus, Plus } from "lucide-react";
import {
  AttributionControl,
  LngLatBounds,
  Map as MapLibre,
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ACTIVE_STATUSES, SEVERITY_RANK } from "../lib/labels";
import type { BarangayCollection, Camera, Incident } from "../lib/types";
import { DURATION, IconButton, PULSE, cx, type Theme } from "../ui";
import { STROKE } from "../ui/icons";

// Vite doesn't copy MapLibre's worker on its own, so it's bundled as an asset and named here.
setWorkerUrl(workerUrl);

const BASEMAP: Record<Theme, string> = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};
const BOUNDARY_CREDIT = "Boundaries: NAMRIA and PSA, CC BY-IGO, via OCHA";

// The map can't use CSS classes, so it reads the same token values the stylesheet defines.
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--bb-${name}`).trim();
}

// The street basemap needs the internet. Without it, the map still shows barangays.
async function loadBaseStyle(theme: Theme): Promise<StyleSpecification> {
  try {
    const response = await fetch(BASEMAP[theme], { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error(String(response.status));
    return (await response.json()) as StyleSpecification;
  } catch {
    return {
      version: 8,
      sources: {},
      layers: [{ id: "background", type: "background", paint: { "background-color": token("canvas") } }],
    };
  }
}

type SourceData = Parameters<GeoJSONSource["setData"]>[0];

interface MapProps {
  theme: Theme;
  barangays: BarangayCollection | null;
  cameras: Camera[];
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  picking: boolean;
  onPick: (point: { latitude: number; longitude: number }) => void;
  // The spot chosen for a new report, drawn as a butter pin with an ink ring.
  picked?: { latitude: number; longitude: number } | null;
  // Room the floating panels cover, so the city and a selected incident sit in the visible part.
  coveredLeft?: number;
  coveredRight?: number;
  controlsClassName?: string;
}

export function IncidentMap({
  theme,
  barangays,
  cameras,
  incidents,
  selectedId,
  onSelect,
  picking,
  onPick,
  picked = null,
  coveredLeft = 0,
  coveredRight = 0,
  controlsClassName,
}: MapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const [ready, setReady] = useState(false);
  const framed = useRef(false);
  // Map event listeners are added once, so they read the latest props from here.
  const handlers = useRef({ onSelect, onPick, picking });
  useLayoutEffect(() => {
    handlers.current = { onSelect, onPick, picking };
  });

  useEffect(() => {
    let disposed = false;
    let map: MapLibre | undefined;
    void loadBaseStyle(theme).then((style) => {
      if (disposed || !container.current) return;
      map = new MapLibre({
        container: container.current,
        style,
        center: [122.82, 9.98],
        zoom: 10.5,
        // Bottom left, because the incident panels float over the right side.
        attributionControl: false,
      });
      map.addControl(new AttributionControl({ compact: true, customAttribution: BOUNDARY_CREDIT }), "bottom-left");
      mapRef.current = map;
      map.on("load", () => {
        const m = map!;
        const severity: ExpressionSpecification = [
          "match",
          ["get", "severity"],
          "critical",
          token("severity-critical"),
          "high",
          token("severity-high"),
          "medium",
          token("severity-medium"),
          token("severity-low"),
        ];
        const ring = token("inverse");
        m.addSource("barangays", { type: "geojson", data: { type: "FeatureCollection", features: [] }, promoteId: "psgc" });
        m.addSource("cameras", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        // promoteId lets each marker keep its own animation state (feature-state) across updates.
        m.addSource("incidents", { type: "geojson", data: { type: "FeatureCollection", features: [] }, promoteId: "id" });
        m.addSource("picked", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({
          id: "barangay-fill",
          type: "fill",
          source: "barangays",
          paint: {
            "fill-color": [
              "match",
              ["coalesce", ["feature-state", "rank"], 0],
              4, token("severity-critical"),
              3, token("severity-high"),
              2, token("severity-medium"),
              1, token("severity-low"),
              token("canvas"),
            ],
            "fill-opacity": ["case", [">", ["coalesce", ["feature-state", "rank"], 0], 0], 0.22, 0],
          },
        });
        m.addLayer({
          id: "barangay-line",
          type: "line",
          source: "barangays",
          paint: { "line-color": token("fg-2"), "line-width": 1, "line-opacity": 0.55 },
        });
        if (m.getStyle().glyphs) {
          m.addLayer({
            id: "barangay-label",
            type: "symbol",
            source: "barangays",
            minzoom: 11.5,
            // OpenFreeMap serves Noto Sans; MapLibre's default font isn't there.
            layout: { "text-field": ["get", "name"], "text-size": 12, "text-font": ["Noto Sans Regular"] },
            paint: { "text-color": token("fg"), "text-halo-color": token("canvas"), "text-halo-width": 1.5 },
          });
        }
        m.addLayer({
          id: "cameras",
          type: "circle",
          source: "cameras",
          paint: {
            "circle-radius": 5,
            "circle-color": token("card"),
            "circle-stroke-color": ["case", ["get", "online"], ring, token("border-ui")],
            "circle-stroke-width": 2,
          },
        });
        // Pulse rings for unacknowledged high and critical incidents, one layer per severity so
        // each can keep its own rhythm. These static values are what reduced motion shows: a
        // wider, softer ring that marks the incident without moving.
        for (const level of ["critical", "high"] as const) {
          m.addLayer({
            id: `incident-pulse-${level}`,
            type: "circle",
            source: "incidents",
            filter: ["all", ["==", ["get", "pulse"], true], ["==", ["get", "severity"], level]],
            paint: { "circle-radius": PULSE[level].radius * 0.7, "circle-color": severity, "circle-opacity": 0.35 },
          });
        }
        m.addLayer({
          id: "incidents",
          type: "circle",
          source: "incidents",
          paint: {
            // "appear" grows a new marker from nothing to full size (see the drop-in below).
            "circle-radius": ["*", ["coalesce", ["feature-state", "appear"], 1], ["+", 6, ["*", 2, ["get", "rank"]]]],
            "circle-opacity": ["coalesce", ["feature-state", "appear"], 1],
            "circle-stroke-opacity": ["coalesce", ["feature-state", "appear"], 1],
            "circle-color": severity,
            // Override 2: every marker gets an ink ring, since some fills are faint on a light map.
            "circle-stroke-color": ["case", ["get", "selected"], token("accent-strong"), ring],
            "circle-stroke-width": ["case", ["get", "selected"], 5, 2],
          },
        });
        m.addLayer({
          id: "picked",
          type: "circle",
          source: "picked",
          paint: {
            "circle-radius": 10,
            "circle-color": token("accent-strong"),
            "circle-stroke-color": ring,
            "circle-stroke-width": 3,
          },
        });
        m.on("click", "incidents", (event) => {
          const id = event.features?.[0]?.properties?.id;
          if (id && !handlers.current.picking) handlers.current.onSelect(String(id));
        });
        m.on("click", (event) => {
          if (handlers.current.picking) {
            handlers.current.onPick({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
          }
        });
        m.on("mouseenter", "incidents", () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", "incidents", () => (m.getCanvas().style.cursor = ""));
        setReady(true);
      });
    });
    return () => {
      disposed = true;
      map?.remove();
      mapRef.current = null;
      framed.current = false;
      setReady(false);
    };
  }, [theme]);

  // Barangay outlines. The city is framed once, so opening a panel doesn't undo the user's zoom.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !barangays) return;
    (map.getSource("barangays") as GeoJSONSource).setData(barangays as SourceData);
    const bounds = new LngLatBounds();
    for (const feature of barangays.features) {
      for (const polygon of feature.geometry.coordinates) {
        for (const [lng, lat] of polygon[0]!) bounds.extend([lng!, lat!]);
      }
    }
    if (framed.current || bounds.isEmpty()) return;
    framed.current = true;
    map.fitBounds(bounds, {
      padding: { top: 24, bottom: 24, left: 24 + coveredLeft, right: 24 + coveredRight },
      duration: 0,
    });
    // Framing uses the panel sizes at the moment the outlines arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, barangays]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource("cameras") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: cameras.map((camera) => ({
        type: "Feature",
        properties: { id: camera.id, name: camera.name, online: camera.status === "online" },
        geometry: { type: "Point", coordinates: [camera.longitude, camera.latitude] },
      })),
    });
  }, [ready, cameras]);

  // Incident markers, and each barangay tinted by its most serious active incident.
  const knownIncidents = useRef<Set<string> | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const active = incidents.filter((item) => ACTIVE_STATUSES.includes(item.status));
    // Markers already there when the map loads just appear; ones that arrive later drop in.
    const fresh = knownIncidents.current ? active.filter((item) => !knownIncidents.current!.has(item.id)) : [];
    knownIncidents.current = new Set([...(knownIncidents.current ?? []), ...active.map((item) => item.id)]);
    (map.getSource("incidents") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: active.map((item) => ({
        type: "Feature",
        properties: {
          id: item.id,
          severity: item.severity,
          rank: SEVERITY_RANK[item.severity],
          selected: item.id === selectedId,
          pulse: !item.acknowledgedAt && SEVERITY_RANK[item.severity] >= 3,
        },
        geometry: { type: "Point", coordinates: [item.longitude, item.latitude] },
      })),
    });
    if (fresh.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const started = performance.now();
      const grow = (time: number) => {
        const t = Math.min(1, (time - started) / (DURATION.base * 1000));
        // Ease-out cubic, close to the "enter" curve: quick to appear, soft to settle.
        const appear = 1 - (1 - t) ** 3;
        for (const item of fresh) map.setFeatureState({ source: "incidents", id: item.id }, { appear });
        if (t < 1) requestAnimationFrame(grow);
      };
      for (const item of fresh) map.setFeatureState({ source: "incidents", id: item.id }, { appear: 0 });
      requestAnimationFrame(grow);
    }
    if (barangays) {
      const worst = new Map<string, number>();
      for (const item of active) {
        if (!item.barangayName) continue;
        worst.set(item.barangayName, Math.max(worst.get(item.barangayName) ?? 0, SEVERITY_RANK[item.severity]));
      }
      for (const feature of barangays.features) {
        map.setFeatureState(
          { source: "barangays", id: feature.properties.psgc },
          { rank: worst.get(feature.properties.name) ?? 0 },
        );
      }
    }
  }, [ready, incidents, selectedId, barangays]);

  // Glide to a newly selected incident, keeping it clear of the floating panels.
  useEffect(() => {
    const map = mapRef.current;
    const target = incidents.find((item) => item.id === selectedId);
    if (!ready || !map || !target) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.easeTo({
      center: [target.longitude, target.latitude],
      zoom: Math.max(map.getZoom(), 13),
      padding: { top: 0, bottom: 0, left: coveredLeft, right: coveredRight },
      duration: reduced ? 0 : DURATION.slow * 1000,
    });
    // Only when the selection changes, not on every live update to the same incident.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selectedId]);

  // The one ambient animation: unacknowledged high and critical incidents pulse until someone
  // acknowledges them, critical faster and wider than high (PULSE in the motion tokens).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const tick = (time: number) => {
      for (const level of ["critical", "high"] as const) {
        const phase = (time % PULSE[level].period) / PULSE[level].period;
        map.setPaintProperty(`incident-pulse-${level}`, "circle-radius", 10 + phase * (PULSE[level].radius - 10));
        map.setPaintProperty(`incident-pulse-${level}`, "circle-opacity", 0.5 * (1 - phase));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource("picked") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: picked
        ? [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [picked.longitude, picked.latitude] } }]
        : [],
    });
  }, [ready, picked]);

  useEffect(() => {
    const canvas = mapRef.current?.getCanvas();
    if (canvas) canvas.style.cursor = picking ? "crosshair" : "";
  }, [picking, ready]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={container}
        className="h-full w-full"
        role="region"
        aria-label="Map of Kabankalan City showing incidents, cameras and barangays"
      />
      <div className={cx("absolute flex flex-col gap-2", controlsClassName)}>
        <IconButton label="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
          <Plus size={20} strokeWidth={STROKE} />
        </IconButton>
        <IconButton label="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
          <Minus size={20} strokeWidth={STROKE} />
        </IconButton>
      </div>
    </div>
  );
}
