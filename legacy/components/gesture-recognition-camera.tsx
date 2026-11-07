"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Video, VideoOff, Hand } from "lucide-react"

interface GestureDetection {
  type: string
  confidence: number
  is_sos: boolean
  timestamp: string
}

const GESTURE_SERVER_URL = "http://localhost:5001"

export function GestureRecognitionCamera() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isActive, setIsActive] = useState(false)
  const [gestures, setGestures] = useState<GestureDetection[]>([])
  const [sosAlert, setSOSAlert] = useState(false)
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">("checking")
  const [latestGestureMsg, setLatestGestureMsg] = useState<string | null>(null)
  const streamIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    // Poll latest detections (server-held state) so we can display persistent SOS messages
    let poll: number | undefined
    const startPolling = () => {
      poll = window.setInterval(async () => {
        try {
          const r = await fetch(`${GESTURE_SERVER_URL}/api/gesture/detections`, { cache: 'no-store' })
          if (!r.ok) return
          const d = await r.json()
          if (d?.type === 'sos') {
            setLatestGestureMsg(d.message || 'SOS Emergency detected')
            setSOSAlert(true)
          } else {
            setLatestGestureMsg(null)
          }
        } catch (e) {
          // ignore
        }
      }, 1000)
    }
    startPolling()
    return () => { if (poll) clearInterval(poll) }
  }, [])

  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const response = await fetch(`${GESTURE_SERVER_URL}/health`, { method: "GET", mode: "cors" })
        if (response.ok) {
          setServerStatus("online")
        } else {
          setServerStatus("offline")
        }
      } catch (error) {
        setServerStatus("offline")
      }
    }

    checkServerHealth()
    const healthInterval = setInterval(checkServerHealth, 5000)
    return () => clearInterval(healthInterval)
  }, [])

  useEffect(() => {
    let localStream: MediaStream | null = null

    const startClientCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        localStream = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          try {
            await videoRef.current.play()
          } catch (e) {
            // some browsers may reject play() on hidden videos; continue and wait for metadata
          }

          if (videoRef.current.readyState < 2) {
            await new Promise((resolve) => videoRef.current!.addEventListener('loadedmetadata', resolve, { once: true }))
          }
        }

        streamIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || !canvasRef.current) return
          const video = videoRef.current
          const width = video.videoWidth || 640
          const height = video.videoHeight || 480

          if (width === 0 || height === 0) {
            console.log('[Gesture] Skipping capture; video has zero dimensions', video.videoWidth, video.videoHeight)
            return
          }

          // Capture frame
          const off = document.createElement('canvas')
          off.width = width
          off.height = height
          const offCtx = off.getContext('2d')
          if (!offCtx) return
          offCtx.drawImage(video, 0, 0, width, height)

          // Quick brightness check
          try {
            const imgData = offCtx.getImageData(0, 0, Math.min(100, width), Math.min(80, height))
            let sum = 0
            for (let i = 0; i < imgData.data.length; i += 4) {
              sum += imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]
            }
            const mean = sum / ((imgData.data.length / 4) * 3)
            if (mean < 3) {
              console.log('[Gesture] Captured frame appears very dark (mean)', mean)
            }
          } catch (e) {
            console.log('[Gesture] getImageData failed:', e)
          }

          const imageData = off.toDataURL('image/jpeg')

          try {
            const resp = await fetch(`${GESTURE_SERVER_URL}/api/gesture/detect_frame`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image_data: imageData })
            })
            if (!resp.ok) return
            const data = await resp.json()
            const gs = data.gestures || []
            setGestures(gs)
            if (gs.some((g: GestureDetection) => g.is_sos)) {
              setSOSAlert(true)
              setTimeout(() => setSOSAlert(false), 3000)
            }

            // Draw to canvas. Draw live video as background and overlay annotated image when available
            const canvas = canvasRef.current!
            const ctx = canvas.getContext('2d')!
            canvas.width = width
            canvas.height = height

            // draw the live video frame immediately for low-latency preview
            ctx.drawImage(video, 0, 0, width, height)

            if (data?.annotated) {
              try {
                // create an ImageBitmap for efficient drawing
                const blob = await (await fetch(data.annotated)).blob()
                const bitmap = await createImageBitmap(blob)
                ctx.drawImage(bitmap, 0, 0, width, height)
                // release bitmap when the canvas is updated (optional)
                bitmap.close()
              } catch (e) {
                // fallback: draw the data URL via Image
                const img = new Image()
                img.onload = () => ctx.drawImage(img, 0, 0, width, height)
                img.src = data.annotated
              }
            }
          } catch (err) {
            console.log('[v0] Gesture recognition detection fetch error:', err)
          }
        }, 200)
      } catch (err) {
        console.log('[v0] Camera error:', err)
      }
    }

    if (isActive && serverStatus === 'online') {
      startClientCamera()
    } else {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current)
        streamIntervalRef.current = null
      }
      if (videoRef.current?.srcObject) {
        ;(videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop())
        videoRef.current.srcObject = null
      }
      setGestures([])
      setSOSAlert(false)
    }

    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current)
        streamIntervalRef.current = null
      }
      if (localStream) localStream.getTracks().forEach((t) => t.stop())
    }
  }, [isActive, serverStatus])

  return (
    <div className="space-y-4">
      {serverStatus === "offline" && (
        <div className="p-4 rounded-lg bg-yellow-500/20 border border-yellow-500/50">
          <p className="font-semibold text-yellow-600">Gesture Recognition Server Offline</p>
          <p className="text-sm text-yellow-600">
            Run: <code className="bg-background px-2 py-1 rounded">python scripts/gesture_recognition_server.py</code>
          </p>
        </div>
      )}

      {sosAlert && (
        <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center gap-3 animate-pulse">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <div>
            <p className="font-semibold text-red-600">{latestGestureMsg ?? 'SOS Emergency detected'}</p>
            <p className="text-sm text-red-600">Emergency gesture recognized - 4 fingers up with thumb tucked</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Hand className="h-5 w-5" />
            Gesture Recognition Camera
          </CardTitle>
          <div className="flex items-center gap-2">
            {isActive && <Badge className="bg-green-500/20 text-green-600">Live</Badge>}
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
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const r = await fetch(`${GESTURE_SERVER_URL}/api/gesture/trigger_sos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: 'SOS Emergency detected' })
                  })
                  if (r.ok) {
                    const j = await r.json()
                    setLatestGestureMsg(j.message || 'SOS Emergency detected')
                    setSOSAlert(true)
                    setTimeout(() => setSOSAlert(false), 5000)
                  }
                } catch (e) {
                  console.log('Test SOS failed', e)
                }
              }}
              disabled={serverStatus !== 'online'}
            >
              Test SOS
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
            {isActive && serverStatus === "online" ? (
              <>
                <canvas ref={canvasRef} className="w-full h-full object-cover" style={{ display: "block" }} />
                <video ref={videoRef} style={{ position: 'absolute', left: -9999, width: 1, height: 1 }} autoPlay muted playsInline />
              </>
            ) : (
              <div className="text-center space-y-2">
                <VideoOff className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  {serverStatus === "offline" ? "Server Offline" : "Camera is off"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {latestGestureMsg && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700">
          <p className="font-semibold">{latestGestureMsg}</p>
          <p className="text-sm text-red-600">SOS Emergency Signal</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Gesture Detections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {gestures.length === 0 ? (
            <p className="text-sm text-muted-foreground">No gestures detected yet</p>
          ) : (
            gestures.slice(0, 5).map((gesture, idx) => (
              <div
                key={idx}
                className={`p-3 border rounded-lg ${gesture.is_sos ? "bg-red-500/10 border-red-500/50" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{gesture.type}</p>
                  <Badge variant={gesture.is_sos ? "destructive" : "outline"}>
                    {(gesture.confidence * 100).toFixed(1)}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{gesture.timestamp}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-base">SOS Signal Detection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>MediaPipe hand tracking detects the emergency SOS signal:</p>
          <p className="font-medium">4 fingers extended upward + thumb tucked in</p>
          <p>This triggers an immediate alert to all managers and emergency responders.</p>
        </CardContent>
      </Card>
    </div>
  )
}
