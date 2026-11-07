"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, X, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DangerAlert } from "@/types"

interface DangerAlertPopupProps {
  alert: DangerAlert | null
  onDismiss: () => void
  onAcknowledge: (id: number) => void
}

export function DangerAlertPopup({ alert, onDismiss, onAcknowledge }: DangerAlertPopupProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (alert) {
      setIsVisible(true)
      // Play alert sound (browser audio API)
      const audio = new Audio("/alert-sound.mp3")
      audio.play().catch(() => {})
    } else {
      setIsVisible(false)
    }
  }, [alert])

  if (!alert || !isVisible) return null

  const severityColors = {
    low: "border-yellow-500 bg-yellow-500/10",
    medium: "border-orange-500 bg-orange-500/10",
    high: "border-red-500 bg-red-500/10",
    critical: "border-red-600 bg-red-600/20 animate-pulse",
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div
        className={cn("relative w-full max-w-md rounded-xl border-2 p-6 shadow-2xl", severityColors[alert.severity])}
      >
        <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={onDismiss}>
          <X className="h-4 w-4" />
        </Button>

        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full",
              alert.severity === "critical" ? "bg-red-600" : "bg-red-500",
            )}
          >
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-foreground">DANGER ALERT</h3>
              <Volume2 className="h-4 w-4 text-red-500 animate-pulse" />
            </div>
            <p className="text-sm font-medium text-foreground mb-2">{alert.message}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-4">
              <span className="px-2 py-1 rounded-full bg-muted">Camera {alert.camera_id}</span>
              <span className="px-2 py-1 rounded-full bg-muted capitalize">{alert.alert_type} Detection</span>
              <span
                className={cn(
                  "px-2 py-1 rounded-full capitalize font-medium",
                  alert.severity === "critical"
                    ? "bg-red-600 text-white"
                    : alert.severity === "high"
                      ? "bg-red-500 text-white"
                      : alert.severity === "medium"
                        ? "bg-orange-500 text-white"
                        : "bg-yellow-500 text-foreground",
                )}
              >
                {alert.severity}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{new Date(alert.timestamp).toLocaleString()}</p>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => onAcknowledge(alert.id)}>
                Acknowledge
              </Button>
              <Button variant="outline" className="flex-1 bg-transparent" onClick={onDismiss}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
