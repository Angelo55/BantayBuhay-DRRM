"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { StatsCard } from "@/components/stats-card"
import { CameraFeed } from "@/components/camera-feed"
import { RecognitionLog } from "@/components/recognition-log"
import { DangerAlertPopup } from "@/components/danger-alert-popup"
import { Camera, Users, Hand, AlertTriangle, Activity, Shield } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Camera as CameraType, DangerAlert, FacialRecognitionResult, GestureRecognitionResult } from "@/types"

// Mock data for demonstration
const mockCameras: CameraType[] = [
  { id: 1, name: "Camera 1", location: "Main Entrance", stream_url: "", status: "online", is_recording: true },
  { id: 2, name: "Camera 2", location: "Parking Lot", stream_url: "", status: "online", is_recording: true },
  { id: 3, name: "Camera 3", location: "Lobby", stream_url: "", status: "online", is_recording: true },
  { id: 4, name: "Camera 4", location: "Back Exit", stream_url: "", status: "offline", is_recording: false },
]

const mockFacialResults: FacialRecognitionResult[] = [
  {
    id: 1,
    detected_name: "John Doe",
    confidence: 95.5,
    timestamp: new Date().toISOString(),
    camera_id: 1,
    is_known: true,
  },
  {
    id: 2,
    detected_name: "Unknown Person",
    confidence: 45.2,
    timestamp: new Date(Date.now() - 60000).toISOString(),
    camera_id: 2,
    is_known: false,
  },
  {
    id: 3,
    detected_name: "Jane Smith",
    confidence: 88.7,
    timestamp: new Date(Date.now() - 120000).toISOString(),
    camera_id: 1,
    is_known: true,
  },
]

const mockGestureResults: GestureRecognitionResult[] = [
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
]

export default function DashboardPage() {
  const [currentAlert, setCurrentAlert] = useState<DangerAlert | null>(null)
  const [facialResults] = useState(mockFacialResults)
  const [gestureResults] = useState(mockGestureResults)

  // Simulate real-time alerts
  useEffect(() => {
    const timer = setTimeout(() => {
      // Uncomment to test alert popup
      // setCurrentAlert({
      //   id: 1,
      //   alert_type: 'gesture',
      //   severity: 'high',
      //   message: 'Help signal detected in Camera 3 - Lobby',
      //   timestamp: new Date().toISOString(),
      //   camera_id: 3,
      //   acknowledged: false,
      // })
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  const handleAcknowledgeAlert = (id: number) => {
    console.log("Alert acknowledged:", id)
    setCurrentAlert(null)
  }

  return (
    <div className="min-h-screen">
      <Header title="Dashboard" subtitle="Real-time surveillance monitoring" />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Active Cameras"
            value={mockCameras.filter((c) => c.status === "online").length}
            change={`${mockCameras.length} total`}
            icon={Camera}
            iconColor="text-blue-500"
          />
          <StatsCard
            title="Faces Detected"
            value={facialResults.length}
            change="Last hour"
            changeType="neutral"
            icon={Users}
            iconColor="text-green-500"
          />
          <StatsCard
            title="Gestures Detected"
            value={gestureResults.length}
            change="Last hour"
            changeType="neutral"
            icon={Hand}
            iconColor="text-purple-500"
          />
          <StatsCard
            title="Active Alerts"
            value={gestureResults.filter((g) => g.is_danger).length}
            change="Requires attention"
            changeType="negative"
            icon={AlertTriangle}
            iconColor="text-red-500"
          />
        </div>

        {/* Camera Grid */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Live Camera Feeds</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {mockCameras.map((camera) => (
              <CameraFeed key={camera.id} camera={camera} size="small" />
            ))}
          </div>
        </div>

        {/* Recognition Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Facial Recognition */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Recent Facial Detections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {facialResults.slice(0, 5).map((result) => (
                <RecognitionLog
                  key={result.id}
                  type="facial"
                  name={result.detected_name}
                  confidence={result.confidence}
                  timestamp={result.timestamp}
                  cameraId={result.camera_id}
                  isDanger={!result.is_known}
                />
              ))}
            </CardContent>
          </Card>

          {/* Gesture Recognition */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Hand className="h-4 w-4 text-purple-500" />
                Recent Gesture Detections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {gestureResults.slice(0, 5).map((result) => (
                <RecognitionLog
                  key={result.id}
                  type="gesture"
                  name={result.gesture_type}
                  confidence={result.confidence}
                  timestamp={result.timestamp}
                  cameraId={result.camera_id}
                  isDanger={result.is_danger}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-xs text-muted-foreground">Facial Recognition</p>
                <p className="text-lg font-semibold text-green-500">Active</p>
              </div>
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-xs text-muted-foreground">Gesture Recognition</p>
                <p className="text-lg font-semibold text-green-500">Active</p>
              </div>
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-xs text-muted-foreground">Alert System</p>
                <p className="text-lg font-semibold text-green-500">Online</p>
              </div>
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-xs text-muted-foreground">Database</p>
                <p className="text-lg font-semibold text-yellow-500">Connected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danger Alert Popup */}
      <DangerAlertPopup
        alert={currentAlert}
        onDismiss={() => setCurrentAlert(null)}
        onAcknowledge={handleAcknowledgeAlert}
      />
    </div>
  )
}
