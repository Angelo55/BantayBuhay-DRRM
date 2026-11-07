"use client"

import { useState } from "react"
import { Camera, Maximize2, Volume2, VolumeX, Circle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Camera as CameraType } from "@/types"

interface CameraFeedProps {
  camera: CameraType
  size?: "small" | "medium" | "large"
  onFullscreen?: () => void
}

export function CameraFeed({ camera, size = "medium", onFullscreen }: CameraFeedProps) {
  const [isMuted, setIsMuted] = useState(true)

  const sizeClasses = {
    small: "h-40",
    medium: "h-56",
    large: "h-80",
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Camera Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{camera.name}</span>
          <Badge variant={camera.status === "online" ? "default" : "destructive"} className="text-xs">
            {camera.status}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {camera.is_recording && (
            <div className="flex items-center gap-1 text-red-500 mr-2">
              <Circle className="h-2 w-2 fill-current animate-pulse" />
              <span className="text-xs">REC</span>
            </div>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFullscreen}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Camera Feed */}
      <div className={cn("relative bg-muted flex items-center justify-center", sizeClasses[size])}>
        {camera.status === "online" ? (
          <>
            {/* Simulated video feed - replace with actual stream */}
            <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20">
              <img
                src={`/security-camera-footage-.jpg?height=320&width=480&query=security camera footage ${camera.location}`}
                alt={`${camera.name} feed`}
                className="w-full h-full object-cover opacity-80"
              />
            </div>

            {/* Overlay info */}
            <div className="absolute bottom-2 left-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs bg-background/80 backdrop-blur">
                {camera.location}
              </Badge>
            </div>

            {/* Timestamp */}
            <div className="absolute bottom-2 right-2">
              <span className="text-xs text-foreground bg-background/80 backdrop-blur px-2 py-1 rounded">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-8 w-8" />
            <span className="text-sm">Camera Offline</span>
          </div>
        )}
      </div>
    </div>
  )
}
