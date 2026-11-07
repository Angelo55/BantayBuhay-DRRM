import { ImageOff } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { TYPE_LABEL } from "../lib/labels";
import { fullTime, timeAgo } from "../lib/time";
import type { Incident, PendingDetection } from "../lib/types";
import { Button, EmptyState, STROKE, Stat, StatusPill } from "../ui";
import { InlineError, PanelHeader } from "./PanelHeader";

interface ReviewProps {
  detection: PendingDetection;
  now: number;
  onDone: (detectionId: string, incident: Incident | null) => void;
  onClose: () => void;
  onToast: (message: string) => void;
}

export function ReviewDetail({ detection, now, onDone, onClose, onToast }: ReviewProps) {
  const [busy, setBusy] = useState(false);
  const [decided, setDecided] = useState<"confirm" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(decision: "confirm" | "reject") {
    setBusy(true);
    setDecided(decision);
    setError(null);
    try {
      const body = await api<{ incident: Incident | null }>(`/api/detections/${detection.id}/review`, {
        method: "POST",
        body: { decision },
      });
      onToast(decision === "confirm" ? "Incident raised" : "Detection rejected");
      onDone(detection.id, body.incident);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That didn't work. Try again.");
      setBusy(false);
    }
  }

  return (
    <article aria-labelledby="review-title" className="flex h-full flex-col">
      <PanelHeader
        titleId="review-title"
        title={`Possible ${TYPE_LABEL[detection.incidentType].toLowerCase()}`}
        above={<StatusPill tone="info">The camera wasn't sure</StatusPill>}
        meta={
          <>
            {detection.cameraName}, {detection.barangayName ?? "unmapped area"},{" "}
            <time dateTime={detection.capturedAt} title={fullTime(detection.capturedAt)}>
              {timeAgo(detection.capturedAt, now)}
            </time>
          </>
        }
        closeLabel="Close review"
        onClose={onClose}
      />
      <div className="flex-1 space-y-6 overflow-y-auto px-6 pt-5 pb-8">
        {detection.hasSnapshot ? (
          <img
            src={`/api/detections/${detection.id}/snapshot`}
            alt={`Snapshot from ${detection.cameraName} when this was detected`}
            className="w-full rounded-card bg-card-muted"
          />
        ) : (
          <EmptyState icon={<ImageOff aria-hidden="true" size={24} strokeWidth={STROKE} />} title="No snapshot">
            This detection came without a picture. Check the live feed or call someone nearby before confirming.
          </EmptyState>
        )}
        <Stat value={`${Math.round(detection.confidence * 100)}%`} label="model confidence" />
        <div className="space-y-3">
          <Button fullWidth size="lg" disabled={busy && decided !== "confirm"} loading={busy && decided === "confirm"} onClick={() => void review("confirm")}>
            Confirm and raise incident
          </Button>
          <Button fullWidth variant="secondary" disabled={busy && decided !== "reject"} loading={busy && decided === "reject"} onClick={() => void review("reject")}>
            Reject, nothing's happening
          </Button>
          {error && <InlineError>{error}</InlineError>}
        </div>
      </div>
    </article>
  );
}
