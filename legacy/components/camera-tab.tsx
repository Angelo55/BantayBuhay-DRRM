"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Video, VideoOff, CameraIcon } from "lucide-react"

interface FaceDetection {
  bbox: {
    x_min: number
    y_min: number
    x_max: number
    y_max: number
    confidence: number
  }
  gemini_analysis: {
    verified: boolean
    analysis: string
    confidence: number
  }
  timestamp: string
}

interface GestureDetection {
  type: string
  confidence: number
  timestamp: string
}

const VISION_SERVER_URL = "http://localhost:5000"

export function CameraTab() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isActive, setIsActive] = useState(false)
  const [faceDetections, setFaceDetections] = useState<FaceDetection[]>([])
  const [gestureDetections, setGestureDetections] = useState<GestureDetection[]>([])
  const [sosAlert, setSOSAlert] = useState(false)
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">("checking")
  const streamIntervalRef = useRef<number | null>(null)
  const detectionIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const [f, g] = await Promise.all([
          fetch(`http://localhost:5000/health`, { method: 'GET', mode: 'cors' }),
          fetch(`http://localhost:5001/health`, { method: 'GET', mode: 'cors' })
        ])
        if (f.ok && g.ok) {
          setServerStatus('online')
        } else {
          setServerStatus('offline')
        }
      } catch (error) {
        setServerStatus('offline')
      }
    }

    checkServerHealth()
    const healthInterval = setInterval(checkServerHealth, 5000)
    return () => clearInterval(healthInterval)
  }, [])

  const startStream = async () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current)
      streamIntervalRef.current = null
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) videoRef.current.srcObject = stream

      streamIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return
        const video = videoRef.current
        const width = video.videoWidth || 640
        const height = video.videoHeight || 480

        // Draw the current frame
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        canvas.width = width
        canvas.height = height
        ctx.drawImage(video, 0, 0, width, height)

        // Capture to offscreen and send to servers
        const off = document.createElement('canvas')
        off.width = width
        off.height = height
        const offCtx = off.getContext('2d')
        if (!offCtx) return
        offCtx.drawImage(video, 0, 0, width, height)
        const imageData = off.toDataURL('image/jpeg')

        try {
          const [faceResp, gestureResp] = await Promise.all([
            fetch('http://localhost:5000/api/facial/detect_frame', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image_data: imageData }),
            }),
            fetch('http://localhost:5001/api/gesture/detect_frame', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image_data: imageData }),
            }),
          ])

          if (faceResp.ok) {
            const data = await faceResp.json()
            setFaceDetections(data.faces || [])
            // Draw face boxes
            ;(data.faces || []).forEach((face: any) => {
              const { x, y, width: w, height: h } = face.bbox
              ctx.strokeStyle = face.is_registered ? '#00ff00' : '#ff0000'
              ctx.lineWidth = 3
              ctx.strokeRect(x, y, w, h)
              ctx.fillStyle = ctx.strokeStyle
              ctx.font = 'bold 14px Arial'
              const label = face.is_registered ? `${face.name} (${(face.confidence * 100).toFixed(1)}%)` : 'Unknown'
              ctx.fillText(label, x, y - 10)
            })
          }

          if (gestureResp.ok) {
            const gdata = await gestureResp.json()
            const gs = gdata.gestures || []
            setGestureDetections(gs)
            if (gs.some((g: any) => g.is_sos)) {
              setSOSAlert(true)
              setTimeout(() => setSOSAlert(false), 3000)
            }
          }
        } catch (err) {
          console.log('[v0] Detection fetch error:', err)
        }
      }, 200)
    } catch (err) {
      console.log('[v0] Camera start error:', err)
    }
  }

  const startDetections = async () => {
    // This function is now handled in startStream where frames are POSTed directly
    return
  }

  useEffect(() => {
    if (isActive && serverStatus === "online") {
      startStream()
      startDetections()
    } else {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current)
        streamIntervalRef.current = null
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
        detectionIntervalRef.current = null
      }
      if (videoRef.current?.srcObject) {
        ;(videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop())
        videoRef.current.srcObject = null
      }
      setFaceDetections([])
      setGestureDetections([])
      setSOSAlert(false)
    }

    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current)
        streamIntervalRef.current = null
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
        detectionIntervalRef.current = null
      }
    }
  }, [isActive, serverStatus])

  return (
    <div className="space-y-4">
      {/* Server Status Alert */}
      {serverStatus === "offline" && (
        <div className="p-4 rounded-lg bg-yellow-500/20 border border-yellow-500/50">
          <p className="font-semibold text-yellow-600">⚠ Vision Server Offline</p>
          <p className="text-sm text-yellow-600">
            Python vision server is not running. Run:{" "}
            <code className="bg-background px-2 py-1 rounded">python scripts/vision_server.py</code>
          </p>
        </div>
      )}

      {/* Camera Feed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CameraIcon className="h-5 w-5" />
            Camera Feed with Face Detection
          </CardTitle>
          <div className="flex items-center gap-2">
            {isActive && <Badge className="bg-green-500/20 text-green-600">Live</Badge>}
            {serverStatus === "online" && <Badge className="bg-blue-500/20 text-blue-600">Connected</Badge>}
            <Button
              size="sm"
              variant={isActive ? "destructive" : "default"}
              onClick={() => setIsActive(!isActive)}
              disabled={serverStatus === "offline"}
            >
              {isActive ? (
                <>
                  <VideoOff className="h-4 w-4 mr-2" />
                  Stop Camera
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 mr-2" />
                  Start Camera
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
            {isActive && serverStatus === "online" ? (
              <>
                <canvas ref={canvasRef} className="w-full h-full object-cover" style={{ display: "block" }} />
                <video ref={videoRef} className="hidden" autoPlay muted playsInline />
              </>
            ) : (
              <div className="text-center space-y-2">
                <VideoOff className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  {serverStatus === "offline" ? "Server Offline" : "Camera is off"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {serverStatus === "offline"
                    ? "Start Python vision server to enable camera"
                    : "Click Start Camera to begin"}
                </p>
              </div>
            )}
          </div>

          {/* Hidden image for fetching frames (unused when using browser camera) */}

          {/* SOS Alert */}
          {sosAlert && (
            <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center gap-3 animate-pulse">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-semibold text-red-600">SOS SIGNAL DETECTED!</p>
                <p className="text-sm text-red-600">Emergency gesture recognized</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Facial Recognition Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Facial Detections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {faceDetections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No faces detected yet</p>
            ) : (
              faceDetections.map((detection, idx) => (
                <div key={idx} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">Face #{idx + 1}</p>
                    <Badge variant="outline">{(detection.bbox.confidence * 100).toFixed(1)}%</Badge>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="text-muted-foreground">
                      Position: ({detection.bbox.x_min}, {detection.bbox.y_min})
                    </p>
                    <p className="text-muted-foreground">
                      Gemini Verified: {detection.gemini_analysis.verified ? "Yes" : "No"}
                    </p>
                    <p className="text-muted-foreground truncate">{detection.gemini_analysis.analysis}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{detection.timestamp}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Gesture Recognition Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gesture Detections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {gestureDetections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No gestures detected yet</p>
            ) : (
              gestureDetections.map((detection, idx) => (
                <div key={idx} className="p-3 border rounded-lg space-y-1 bg-red-500/10 border-red-500/50">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{detection.type}</p>
                    <Badge className="bg-red-500/20 text-red-600">{(detection.confidence * 100).toFixed(1)}%</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{detection.timestamp}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Info */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-base">Vision System Info</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="text-muted-foreground">✓ MediaPipe Face Detection with bounding boxes (green rectangles)</p>
          <p className="text-muted-foreground">✓ Google Gemini AI verification for accuracy</p>
          <p className="text-muted-foreground">✓ Hand gesture recognition (SOS signal detection)</p>
          <p className="text-muted-foreground">✓ Real-time streaming from Python server</p>
          <p className="text-xs text-muted-foreground mt-3">
            Server: <code className="bg-background px-2 py-1 rounded">{VISION_SERVER_URL}</code>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
