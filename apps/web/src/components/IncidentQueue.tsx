import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { SEVERITY_RANK, STATUS_LABEL, TYPE_LABEL } from "../lib/labels";
import { timeAgo } from "../lib/time";
import type { Incident, PendingDetection } from "../lib/types";
import { AnimatedItem, AnimatedList, CountBadge, EmptyState, ListCard, STROKE, Skeleton, incidentIcon } from "../ui";

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
  loaded: boolean;
  reviews?: PendingDetection[];
  selectedReviewId?: string | null;
  onSelectReview?: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  now: number;
  emptyTitle: string;
  emptyMessage: string;
}

export function IncidentQueue({
  incidents,
  loaded,
  reviews = [],
  selectedReviewId = null,
  onSelectReview,
  selectedId,
  onSelect,
  now,
  emptyTitle,
  emptyMessage,
}: QueueProps) {
  if (!loaded) {
    return (
      <div className="space-y-3" aria-label="Loading incidents" role="status">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-20 rounded-card" />
        ))}
      </div>
    );
  }
  if (incidents.length === 0 && reviews.length === 0) {
    return (
      <EmptyState icon={<ShieldCheck aria-hidden="true" size={24} strokeWidth={STROKE} />} title={emptyTitle}>
        {emptyMessage}
      </EmptyState>
    );
  }
  const groups = groupIncidents(incidents);
  return (
    <div className="space-y-6">
      {reviews.length > 0 && onSelectReview && (
        <Group title="Needs review" count={reviews.length}>
          {reviews.map((detection) => (
            <AnimatedItem key={detection.id}>
              <ListCard
                title={`Possible ${TYPE_LABEL[detection.incidentType].toLowerCase()}`}
                meta={`${detection.cameraName}, ${Math.round(detection.confidence * 100)}% sure`}
                note={`Check the snapshot, ${timeAgo(detection.capturedAt, now)}`}
                tile={incidentIcon(detection.incidentType)}
                selected={detection.id === selectedReviewId}
                onClick={() => onSelectReview(detection.id)}
              />
            </AnimatedItem>
          ))}
        </Group>
      )}
      <IncidentGroup title="Needs attention" items={groups.attention} {...{ selectedId, onSelect, now }} />
      <IncidentGroup title="In progress" items={groups.active} {...{ selectedId, onSelect, now }} />
      <IncidentGroup title="Recently closed" items={groups.closed} {...{ selectedId, onSelect, now }} />
    </div>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 flex items-center gap-2 px-1 font-display text-[15px] font-medium text-fg-2">
        {title}
        <CountBadge count={count} label={title.toLowerCase()} />
      </h2>
      <AnimatedList>{children}</AnimatedList>
    </section>
  );
}

function IncidentGroup({
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
    <Group title={title} count={items.length}>
      {items.map((incident) => {
        const unacknowledged = !incident.acknowledgedAt && incident.status === "detected";
        return (
          <AnimatedItem key={incident.id}>
            <ListCard
              title={TYPE_LABEL[incident.incidentType]}
              meta={`${incident.barangayName ?? "Outside mapped barangays"}, ${timeAgo(incident.detectedAt, now)}`}
              note={unacknowledged ? "Not acknowledged" : STATUS_LABEL[incident.status]}
              tile={incidentIcon(incident.incidentType)}
              severity={incident.severity}
              selected={incident.id === selectedId}
              onClick={() => onSelect(incident.id)}
            />
          </AnimatedItem>
        );
      })}
    </Group>
  );
}
