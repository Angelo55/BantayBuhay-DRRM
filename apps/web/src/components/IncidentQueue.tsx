import { SEVERITY_COLOR, SEVERITY_RANK, STATUS_LABEL, TYPE_LABEL } from "../lib/labels";
import { timeAgo } from "../lib/time";
import type { Incident, PendingDetection } from "../lib/types";
import { SeverityShape } from "./SeverityBadge";

const bySeverityThenNewest = (a: Incident, b: Incident) =>
  SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
  b.detectedAt.localeCompare(a.detectedAt);

export function groupIncidents(incidents: Incident[]) {
  return {
    attention: incidents.filter((item) => item.status === "detected").sort(bySeverityThenNewest),
    active: incidents
      .filter((item) => ["verified", "dispatched", "on_scene"].includes(item.status))
      .sort(bySeverityThenNewest),
    closed: incidents
      .filter((item) => item.status === "resolved" || item.status === "dismissed")
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
      .slice(0, 10),
  };
}

interface QueueProps {
  incidents: Incident[];
  reviews?: PendingDetection[];
  selectedReviewId?: string | null;
  onSelectReview?: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  now: number;
  emptyMessage: string;
}

export function IncidentQueue({
  incidents,
  reviews = [],
  selectedReviewId = null,
  onSelectReview,
  selectedId,
  onSelect,
  now,
  emptyMessage,
}: QueueProps) {
  const groups = groupIncidents(incidents);
  if (incidents.length === 0 && reviews.length === 0) {
    return <p className="px-4 py-6 text-[15px] text-muted">{emptyMessage}</p>;
  }
  return (
    <div className="space-y-5 py-3">
      {reviews.length > 0 && onSelectReview && (
        <section aria-label="Needs review">
          <h2 className="px-4 pb-1.5 text-[13px] font-bold text-muted">
            Needs review <span className="tabular-nums">({reviews.length})</span>
          </h2>
          <ul>
            {reviews.map((detection) => (
              <li key={detection.id}>
                <button
                  type="button"
                  onClick={() => onSelectReview(detection.id)}
                  aria-current={detection.id === selectedReviewId ? "true" : undefined}
                  className={`flex w-full items-start gap-3 border-l-4 border-dashed border-l-muted px-4 py-2.5 text-left hover:bg-raised ${
                    detection.id === selectedReviewId ? "bg-raised" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[15px] font-bold text-ink">
                        Possible {TYPE_LABEL[detection.incidentType].toLowerCase()}
                      </span>
                      <span className="shrink-0 text-[13px] tabular-nums text-muted">
                        {timeAgo(detection.capturedAt, now)}
                      </span>
                    </span>
                    <span className="block truncate text-[13px] text-muted">
                      {detection.cameraName}, {Math.round(detection.confidence * 100)}% sure
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Group title="Needs attention" items={groups.attention} {...{ selectedId, onSelect, now }} />
      <Group title="In progress" items={groups.active} {...{ selectedId, onSelect, now }} />
      <Group title="Recently closed" items={groups.closed} {...{ selectedId, onSelect, now }} />
    </div>
  );
}

function Group({
  title,
  items,
  selectedId,
  onSelect,
  now,
}: {
  title: string;
  items: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  now: number;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title}>
      <h2 className="px-4 pb-1.5 text-[13px] font-bold text-muted">
        {title} <span className="tabular-nums">({items.length})</span>
      </h2>
      <ul>
        {items.map((incident) => (
          <li key={incident.id}>
            <button
              type="button"
              onClick={() => onSelect(incident.id)}
              aria-current={incident.id === selectedId ? "true" : undefined}
              className={`flex w-full items-start gap-3 border-l-4 px-4 py-2.5 text-left hover:bg-raised ${
                incident.id === selectedId ? "bg-raised" : ""
              }`}
              style={{ borderLeftColor: SEVERITY_COLOR[incident.severity] }}
            >
              <span className="mt-1" style={{ color: SEVERITY_COLOR[incident.severity] }}>
                <SeverityShape severity={incident.severity} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[15px] font-bold text-ink">
                    {TYPE_LABEL[incident.incidentType]}
                  </span>
                  <span className="shrink-0 text-[13px] tabular-nums text-muted">
                    {timeAgo(incident.detectedAt, now)}
                  </span>
                </span>
                <span className="block truncate text-[13px] text-muted">
                  {incident.barangayName ?? "Outside mapped barangays"}, {STATUS_LABEL[incident.status].toLowerCase()}
                </span>
                {!incident.acknowledgedAt && incident.status === "detected" && (
                  <span className="mt-1 inline-block rounded border border-ink/40 px-1.5 text-[13px] font-bold text-ink">
                    Not acknowledged
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
