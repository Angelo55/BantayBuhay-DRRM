import { INCIDENT_TYPES, SEVERITIES, type IncidentType, type Severity } from "@bantaybuhay/shared";
import { MapPin } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { TYPE_LABEL } from "../lib/labels";
import type { Incident } from "../lib/types";
import {
  Button,
  ChoiceCard,
  ChoiceGroup,
  Field,
  IconTile,
  SEVERITY_WORD,
  STROKE,
  SeverityShape,
  Textarea,
  cx,
  incidentIcon,
} from "../ui";
import { InlineError, PanelHeader } from "./PanelHeader";

interface ReportProps {
  point: { latitude: number; longitude: number } | null;
  onReported: (incident: Incident) => void;
  onCancel: () => void;
  onToast: (message: string) => void;
}

export function ReportIncident({ point, onReported, onCancel, onToast }: ReportProps) {
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
      onToast("Incident reported");
      onReported(body.incident);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't report the incident");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex h-full flex-col" aria-labelledby="report-title">
      <PanelHeader
        titleId="report-title"
        title="Report an incident"
        meta="For calls and walk-in reports"
        closeLabel="Cancel report"
        onClose={onCancel}
      />
      <div className="flex-1 space-y-6 overflow-y-auto px-6 pt-5 pb-8">
        <div className={cx("flex items-center gap-3 rounded-card p-3", point ? "bg-card-muted" : "bg-accent text-on-accent")}>
          <IconTile size={40} tone={point ? "card" : "inverse"}>
            <MapPin aria-hidden="true" size={20} strokeWidth={STROKE} />
          </IconTile>
          <p className="text-[15px]" aria-live="polite">
            {point ? (
              <>
                Placed at <span className="tabular-nums">{point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</span>.
                Tap the map to move it.
              </>
            ) : (
              <span className="font-bold">Tap the map where it's happening.</span>
            )}
          </p>
        </div>

        <ChoiceGroup legend="What's happening">
          <div className="grid grid-cols-2 gap-2">
            {INCIDENT_TYPES.map((type) => (
              <ChoiceCard
                key={type}
                name="incident-type"
                value={type}
                checked={incidentType === type}
                onChange={() => setIncidentType(type)}
                tone="inverse"
              >
                <span className="flex flex-col items-start gap-2">
                  {incidentIcon(type)}
                  <span className="font-display text-[15px] font-medium leading-tight">{TYPE_LABEL[type]}</span>
                </span>
              </ChoiceCard>
            ))}
          </div>
        </ChoiceGroup>

        <ChoiceGroup legend="Severity">
          <div className="grid grid-cols-2 gap-2">
            {SEVERITIES.map((level) => (
              <ChoiceCard
                key={level}
                name="severity"
                value={level}
                checked={severity === level}
                onChange={() => setSeverity(level)}
              >
                <span className="flex items-center gap-2 font-display text-[15px] font-medium">
                  <SeverityShape severity={level} />
                  {SEVERITY_WORD[level]}
                </span>
              </ChoiceCard>
            ))}
          </div>
        </ChoiceGroup>

        <Field label="Notes for responders" hint="Landmarks, how many people, what the caller saw">
          {({ id, describedBy }) => (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={2000}
            />
          )}
        </Field>

        {error && <InlineError>{error}</InlineError>}
        <Button type="submit" fullWidth size="lg" disabled={!point || busy}>
          {busy ? "Reporting" : "Report incident"}
        </Button>
      </div>
    </form>
  );
}
