import { useState } from "react";
import { api } from "../lib/api";
import { TYPE_LABEL } from "../lib/labels";
import { fullTime, timeAgo } from "../lib/time";
import type { Incident, PendingDetection } from "../lib/types";

interface ReviewProps {
  detection: PendingDetection;
  now: number;
  onDone: (detectionId: string, incident: Incident | null) => void;
  onClose: () => void;
}

export function ReviewDetail({ detection, now, onDone, onClose }: ReviewProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function review(decision: "confirm" | "reject") {
    setBusy(true);
    setError(null);
    try {
      const body = await api<{ incident: Incident | null }>(`/api/detections/${detection.id}/review`, {
        method: "POST",
        body: { decision },
      });
      onDone(detection.id, body.incident);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That didn't work. Try again.");
      setBusy(false);
    }
  }

  return (
    <article aria-labelledby="review-title" className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="text-[13px] text-muted">The camera wasn't sure. Check the snapshot.</p>
          <h2 id="review-title" className="mt-1 text-[21px] font-bold leading-tight text-ink">
            Possible {TYPE_LABEL[detection.incidentType].toLowerCase()}
          </h2>
          <p className="mt-0.5 text-[15px] text-muted">
            {detection.cameraName}, {detection.barangayName ?? "unmapped area"},{" "}
            <time dateTime={detection.capturedAt} title={fullTime(detection.capturedAt)}>
              {timeAgo(detection.capturedAt, now)}
            </time>
          </p>
        </div>
        <button type="button" onClick={onClose} className="button-quiet">
          Close
        </button>
      </header>
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {detection.hasSnapshot ? (
          <img
            src={`/api/detections/${detection.id}/snapshot`}
            alt={`Snapshot from ${detection.cameraName} when this was detected`}
            className="w-full rounded-md border border-line"
          />
        ) : (
          <p className="text-[15px] text-muted">This detection came without a snapshot.</p>
        )}
        <p className="text-[15px] text-muted">
          Model confidence <span className="font-bold tabular-nums text-ink">{Math.round(detection.confidence * 100)}%</span>
        </p>
        <div className="space-y-2">
          <button type="button" disabled={busy} onClick={() => review("confirm")} className="button-primary w-full">
            Confirm and raise incident
          </button>
          <button type="button" disabled={busy} onClick={() => review("reject")} className="button-secondary w-full">
            Reject, nothing's happening
          </button>
          {error && (
            <p role="alert" className="text-[15px] text-ink">
              {error}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
