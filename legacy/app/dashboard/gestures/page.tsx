"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { RecognitionLog } from "@/components/recognition-log"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Hand, AlertTriangle, CheckCircle, Filter } from "lucide-react"
import type { GestureRecognitionResult } from "@/types"

const mockGestures: GestureRecognitionResult[] = [
  {
    id: 1,
    gesture_type: "Wave",
    confidence: 92.3,
    timestamp: new Date().toISOString(),
    camera_id: 1,
    is_danger: false,
    alert_triggered: false,
  },
  {
    id: 2,
    gesture_type: "Help Signal",
    confidence: 87.5,
    timestamp: new Date(Date.now() - 30000).toISOString(),
    camera_id: 3,
    is_danger: true,
    alert_triggered: true,
  },
  {
    id: 3,
    gesture_type: "Thumbs Up",
    confidence: 95.1,
    timestamp: new Date(Date.now() - 90000).toISOString(),
    camera_id: 2,
    is_danger: false,
    alert_triggered: false,
  },
  {
    id: 4,
    gesture_type: "SOS Signal",
    confidence: 89.2,
    timestamp: new Date(Date.now() - 150000).toISOString(),
    camera_id: 1,
    is_danger: true,
    alert_triggered: true,
  },
  {
    id: 5,
    gesture_type: "Peace Sign",
    confidence: 91.7,
    timestamp: new Date(Date.now() - 210000).toISOString(),
    camera_id: 4,
    is_danger: false,
    alert_triggered: false,
  },
  {
    id: 6,
    gesture_type: "Distress Wave",
    confidence: 85.3,
    timestamp: new Date(Date.now() - 270000).toISOString(),
    camera_id: 2,
    is_danger: true,
    alert_triggered: true,
  },
  {
    id: 7,
    gesture_type: "OK Sign",
    confidence: 93.8,
    timestamp: new Date(Date.now() - 330000).toISOString(),
    camera_id: 3,
    is_danger: false,
    alert_triggered: false,
  },
  {
    id: 8,
    gesture_type: "Stop Hand",
    confidence: 88.9,
    timestamp: new Date(Date.now() - 390000).toISOString(),
    camera_id: 1,
    is_danger: false,
    alert_triggered: false,
  },
]

const gestureTypes = [
  "Wave",
  "Help Signal",
  "Thumbs Up",
  "SOS Signal",
  "Peace Sign",
  "Distress Wave",
  "OK Sign",
  "Stop Hand",
]

export default function GestureRecognitionPage() {
  const [gestures] = useState(mockGestures)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "danger" | "normal">("all")
  const [filterCamera, setFilterCamera] = useState<string>("all")

  const filteredGestures = gestures.filter((gesture) => {
    const matchesSearch = gesture.gesture_type.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType =
      filterType === "all" ||
      (filterType === "danger" && gesture.is_danger) ||
      (filterType === "normal" && !gesture.is_danger)
    const matchesCamera = filterCamera === "all" || gesture.camera_id === Number.parseInt(filterCamera)
    return matchesSearch && matchesType && matchesCamera
  })

  const dangerCount = gestures.filter((g) => g.is_danger).length
  const normalCount = gestures.filter((g) => !g.is_danger).length

  return (
    <div className="min-h-screen">
      <Header title="Gesture Recognition" subtitle="Monitor hand gesture detections and alerts" />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/20">
                  <Hand className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Gestures</p>
                  <p className="text-2xl font-bold text-foreground">{gestures.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-500/20">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Danger Signals</p>
                  <p className="text-2xl font-bold text-foreground">{dangerCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/20">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Normal Gestures</p>
                  <p className="text-2xl font-bold text-foreground">{normalCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gesture Types Reference */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recognized Gesture Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {gestureTypes.map((type) => (
                <Badge
                  key={type}
                  variant={["Help Signal", "SOS Signal", "Distress Wave"].includes(type) ? "destructive" : "secondary"}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search gestures..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Gestures</SelectItem>
                  <SelectItem value="danger">Danger Only</SelectItem>
                  <SelectItem value="normal">Normal Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCamera} onValueChange={setFilterCamera}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Camera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cameras</SelectItem>
                  <SelectItem value="1">Camera 1</SelectItem>
                  <SelectItem value="2">Camera 2</SelectItem>
                  <SelectItem value="3">Camera 3</SelectItem>
                  <SelectItem value="4">Camera 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Detection Results</CardTitle>
              <Badge variant="secondary">{filteredGestures.length} results</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredGestures.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No gestures found matching your filters.</div>
            ) : (
              filteredGestures.map((gesture) => (
                <RecognitionLog
                  key={gesture.id}
                  type="gesture"
                  name={gesture.gesture_type}
                  confidence={gesture.confidence}
                  timestamp={gesture.timestamp}
                  cameraId={gesture.camera_id}
                  isDanger={gesture.is_danger}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
