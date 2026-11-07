"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { CameraFeed } from "@/components/camera-feed"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Grid, LayoutGrid, Maximize } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Camera } from "@/types"

const initialCameras: Camera[] = [
  { id: 1, name: "Camera 1", location: "Main Entrance", stream_url: "", status: "online", is_recording: true },
  { id: 2, name: "Camera 2", location: "Parking Lot", stream_url: "", status: "online", is_recording: true },
  { id: 3, name: "Camera 3", location: "Lobby", stream_url: "", status: "online", is_recording: true },
  { id: 4, name: "Camera 4", location: "Back Exit", stream_url: "", status: "offline", is_recording: false },
  { id: 5, name: "Camera 5", location: "Hallway A", stream_url: "", status: "online", is_recording: true },
  { id: 6, name: "Camera 6", location: "Storage Room", stream_url: "", status: "online", is_recording: false },
]

export default function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>(initialCameras)
  const [layout, setLayout] = useState<"2x2" | "3x3" | "full">("3x3")
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newCamera, setNewCamera] = useState({ name: "", location: "", stream_url: "" })

  const handleAddCamera = () => {
    if (newCamera.name && newCamera.location) {
      const camera: Camera = {
        id: Date.now(),
        name: newCamera.name,
        location: newCamera.location,
        stream_url: newCamera.stream_url,
        status: "online",
        is_recording: false,
      }
      setCameras((prev) => [...prev, camera])
      setNewCamera({ name: "", location: "", stream_url: "" })
      setIsAddDialogOpen(false)
    }
  }

  const layoutClasses = {
    "2x2": "grid-cols-1 md:grid-cols-2",
    "3x3": "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
    full: "grid-cols-1",
  }

  return (
    <div className="min-h-screen">
      <Header title="Live Cameras" subtitle="Monitor all connected surveillance cameras" />

      <div className="p-4 lg:p-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Layout:</span>
            <div className="flex items-center border border-border rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                className={cn("rounded-r-none", layout === "2x2" && "bg-muted")}
                onClick={() => setLayout("2x2")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn("rounded-none border-x border-border", layout === "3x3" && "bg-muted")}
                onClick={() => setLayout("3x3")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn("rounded-l-none", layout === "full" && "bg-muted")}
                onClick={() => setLayout("full")}
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Camera
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Camera</DialogTitle>
                <DialogDescription>Configure a new camera for surveillance monitoring.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="camera-name">Camera Name</Label>
                  <Input
                    id="camera-name"
                    placeholder="Camera 7"
                    value={newCamera.name}
                    onChange={(e) => setNewCamera((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="camera-location">Location</Label>
                  <Input
                    id="camera-location"
                    placeholder="Conference Room"
                    value={newCamera.location}
                    onChange={(e) => setNewCamera((prev) => ({ ...prev, location: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="camera-url">Stream URL (Optional)</Label>
                  <Input
                    id="camera-url"
                    placeholder="rtsp://192.168.1.100:554/stream"
                    value={newCamera.stream_url}
                    onChange={(e) => setNewCamera((prev) => ({ ...prev, stream_url: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddCamera}>Add Camera</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Camera Grid */}
        <div className={cn("grid gap-4", layoutClasses[layout])}>
          {cameras.map((camera) => (
            <CameraFeed
              key={camera.id}
              camera={camera}
              size={layout === "full" ? "large" : layout === "2x2" ? "medium" : "small"}
              onFullscreen={() => setSelectedCamera(camera)}
            />
          ))}
        </div>

        {/* Fullscreen Camera Modal */}
        {selectedCamera && (
          <Dialog open={!!selectedCamera} onOpenChange={() => setSelectedCamera(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedCamera.name} - {selectedCamera.location}
                </DialogTitle>
              </DialogHeader>
              <CameraFeed camera={selectedCamera} size="large" />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
