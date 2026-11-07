import {
  LngLatBounds,
  Map as MapLibre,
  NavigationControl,
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ACTIVE_STATUSES, SEVERITY_COLOR, SEVERITY_RANK } from "../lib/labels";
import type { BarangayCollection, Camera, Incident } from "../lib/types";

// Vite doesn't copy MapLibre's worker on its own, so it's bundled as an asset and named here.
setWorkerUrl(workerUrl);

const GROUND = "#0F1B24";
const BASEMAP = "https://tiles.openfreemap.org/styles/dark";
const FALLBACK: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": GROUND } }],
};
const BOUNDARY_CREDIT = "Boundaries: NAMRIA and PSA, CC BY-IGO, via OCHA";

// The street basemap needs the internet. Without it, the map still shows barangays.
async function loadBaseStyle(): Promise<StyleSpecification> {
  try {
    const response = await fetch(BASEMAP, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error(String(response.status));
    return (await response.json()) as StyleSpecification;
  } catch {
    return FALLBACK;
  }
}

type SourceData = Parameters<GeoJSONSource["setData"]>[0];

const severityColor: ExpressionSpecification = [
  "match",
  ["get", "severity"],
  "critical",
  SEVERITY_COLOR.critical,
  "high",
  SEVERITY_COLOR.high,
  "medium",
  SEVERITY_COLOR.medium,
  SEVERITY_COLOR.low,
];

interface MapProps {
  barangays: BarangayCollection | null;
  cameras: Camera[];
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  picking: boolean;
  onPick: (point: { latitude: number; longitude: number }) => void;
}

export function IncidentMap({ barangays, cameras, incidents, selectedId, onSelect, picking, onPick }: MapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const [ready, setReady] = useState(false);
  // Map event listeners are added once, so they read the latest props from here.
  const handlers = useRef({ onSelect, onPick, picking });
  useLayoutEffect(() => {
    handlers.current = { onSelect, onPick, picking };
  });

  useEffect(() => {
    let disposed = false;
    let map: MapLibre | undefined;
    void loadBaseStyle().then((style) => {
      if (disposed || !container.current) return;
      map = new MapLibre({
        container: container.current,
        style,
        center: [122.82, 9.98],
        zoom: 10.5,
        attributionControl: { compact: true, customAttribution: BOUNDARY_CREDIT },
      });
      mapRef.current = map;
      map.addControl(new NavigationControl({ showCompass: false }), "top-right");
      map.on("load", () => {
        const m = map!;
        m.addSource("barangays", { type: "geojson", data: { type: "FeatureCollection", features: [] }, promoteId: "psgc" });
        m.addSource("cameras", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addSource("incidents", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({
          id: "barangay-fill",
          type: "fill",
          source: "barangays",
          paint: {
            "fill-color": [
              "match",
              ["coalesce", ["feature-state", "rank"], 0],
              4, SEVERITY_COLOR.critical,
              3, SEVERITY_COLOR.high,
              2, SEVERITY_COLOR.medium,
              1, SEVERITY_COLOR.low,
              GROUND,
            ],
            "fill-opacity": ["case", [">", ["coalesce", ["feature-state", "rank"], 0], 0], 0.28, 0.05],
          },
        });
        m.addLayer({
          id: "barangay-line",
          type: "line",
          source: "barangays",
          paint: { "line-color": "#6E8A9A", "line-width": 1, "line-opacity": 0.8 },
        });
        if (m.getStyle().glyphs) {
          m.addLayer({
            id: "barangay-label",
            type: "symbol",
            source: "barangays",
            minzoom: 11.5,
            layout: { "text-field": ["get", "name"], "text-size": 12 },
            paint: { "text-color": "#C9D6DD", "text-halo-color": GROUND, "text-halo-width": 1.5 },
          });
        }
        m.addLayer({
          id: "cameras",
          type: "circle",
          source: "cameras",
          paint: {
            "circle-radius": 4,
            "circle-color": GROUND,
            "circle-stroke-color": "#6CC4D4",
            "circle-stroke-width": 2,
          },
        });
        m.addLayer({
          id: "incident-pulse",
          type: "circle",
          source: "incidents",
          filter: ["==", ["get", "pulse"], true],
          paint: { "circle-radius": 14, "circle-color": severityColor, "circle-opacity": 0.35 },
        });
        m.addLayer({
          id: "incidents",
          type: "circle",
          source: "incidents",
          paint: {
            "circle-radius": ["+", 5, ["*", 2, ["get", "rank"]]],
            "circle-color": severityColor,
            "circle-stroke-color": ["case", ["get", "selected"], "#FFFFFF", GROUND],
            "circle-stroke-width": ["case", ["get", "selected"], 3, 1.5],
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
    };
  }, []);

  // Barangay outlines, framed to fit the city once.
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
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 24, duration: 0 });
  }, [ready, barangays]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource("cameras") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: cameras.map((camera) => ({
        type: "Feature",
        properties: { id: camera.id, name: camera.name },
        geometry: { type: "Point", coordinates: [camera.longitude, camera.latitude] },
      })),
    });
  }, [ready, cameras]);

  // Incident markers, and each barangay tinted by its most serious active incident.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const active = incidents.filter((item) => ACTIVE_STATUSES.includes(item.status));
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

  // The one ambient animation: unacknowledged high and critical incidents pulse.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const tick = (time: number) => {
      const phase = (time % 1600) / 1600;
      map.setPaintProperty("incident-pulse", "circle-radius", 12 + phase * 18);
      map.setPaintProperty("incident-pulse", "circle-opacity", 0.45 * (1 - phase));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ready]);

  useEffect(() => {
    const canvas = mapRef.current?.getCanvas();
    if (canvas) canvas.style.cursor = picking ? "crosshair" : "";
  }, [picking, ready]);

  return (
    <div
      ref={container}
      className="h-full w-full"
      role="region"
      aria-label="Map of Kabankalan City showing incidents, cameras and barangays"
    />
  );
}
