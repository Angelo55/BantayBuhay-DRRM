import { INCIDENT_TYPES, SEVERITIES, type IncidentType, type Severity } from "@bantaybuhay/shared";
import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { SEVERITY_LABEL, TYPE_LABEL } from "../lib/labels";
import type { Incident } from "../lib/types";

interface ReportProps {
  point: { latitude: number; longitude: number } | null;
  onReported: (incident: Incident) => void;
  onCancel: () => void;
}

export function ReportIncident({ point, onReported, onCancel }: ReportProps) {
  const [incidentType, setIncidentType] = useState<IncidentType>("fire_smoke");
  const [severity, setSeverity] = useState<Severity>("high");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!point) return;
    setBusy(true);
    setError(null);
    try {
      const body = await api<{ incident: Incident }>("/api/incidents", {
        method: "POST",
        body: { incidentType, severity, description: description || undefined, ...point },
      });
      onReported(body.incident);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't report the incident");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex h-full flex-col" aria-labelledby="report-title">
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 id="report-title" className="text-[21px] font-bold text-ink">
            Report an incident
          </h2>
          <p className="mt-0.5 text-[15px] text-muted">For calls and walk-in reports</p>
        </div>
        <button type="button" onClick={onCancel} className="button-quiet">
          Cancel
        </button>
      </header>
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div>
          <p className="text-[15px] font-bold text-ink">Location</p>
          <p className="mt-1 text-[15px] text-muted" aria-live="polite">
            {point
              ? `Placed at ${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}. Click the map to move it.`
              : "Click the map where it's happening."}
          </p>
        </div>
        <label className="block">
          <span className="text-[15px] font-bold text-ink">What's happening</span>
          <select value={incidentType} onChange={(e) => setIncidentType(e.target.value as IncidentType)} className="field mt-1.5">
            {INCIDENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="text-[15px] font-bold text-ink">Severity</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {SEVERITIES.map((level) => (
              <label key={level} className="flex min-h-11 items-center gap-2 rounded-md border border-line px-3 has-[:checked]:border-action has-[:checked]:bg-raised">
                <input type="radio" name="severity" value={level} checked={severity === level} onChange={() => setSeverity(level)} />
                <span className="text-[15px] text-ink">{SEVERITY_LABEL[level]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="text-[15px] font-bold text-ink">Notes for responders</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} className="field mt-1.5" />
        </label>
        {error && (
          <p role="alert" className="text-[15px] text-ink">
            {error}
          </p>
        )}
        <button type="submit" disabled={!point || busy} className="button-primary w-full">
          Report incident
        </button>
      </div>
    </form>
  );
}
