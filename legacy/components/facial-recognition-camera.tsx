"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Video, VideoOff, UserCheck, UserX } from "lucide-react"

interface DetectedFace {
  bbox: {
    x: number
    y: number
    width: number
    height: number
  }
  is_registered: boolean
  name: string
  confidence: number
}

const FACIAL_SERVER_URL = "http://localhost:5000"

export function FacialRecognitionCamera() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isActive, setIsActive] = useState(false)
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([])
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">("checking")
  const streamIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const response = await fetch(`${FACIAL_SERVER_URL}/health`, { method: "GET", mode: "cors" })
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
          // Ensure the video is playing and metadata is loaded before capturing frames
          try {
            await videoRef.current.play()
          } catch (e) {
            // Some browsers may reject play() for hidden videos; still wait for metadata
          }

          if (videoRef.current.readyState < 2) {
            await new Promise((resolve) => videoRef.current!.addEventListener('loadedmetadata', resolve, { once: true }))
          }
        }

        // Start periodic detection
        streamIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || !canvasRef.current) return
          const video = videoRef.current

          // Ensure we have dimensions
          const width = video.videoWidth || 640
          const height = video.videoHeight || 480

          if (width === 0 || height === 0) {
            console.log('[Facial] Skipping capture; video has zero dimensions', video.videoWidth, video.videoHeight)
            return
          }

          // Capture frame to hidden canvas
          const off = document.createElement('canvas')
          off.width = width
          off.height = height
          const offCtx = off.getContext('2d')
          if (!offCtx) return
          offCtx.drawImage(video, 0, 0, width, height)

          // Quick pixel mean check to detect black frames early
          try {
            const imgData = offCtx.getImageData(0, 0, Math.min(100, width), Math.min(80, height))
            let sum = 0
            for (let i = 0; i < imgData.data.length; i += 4) {
              sum += imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]
            }
            const mean = sum / ((imgData.data.length / 4) * 3)
            if (mean < 3) {
              console.log('[Facial] Captured frame appears very dark (mean)', mean)
            }
          } catch (e) {
            console.log('[Facial] getImageData failed:', e)
          }

          const imageData = off.toDataURL('image/jpeg')

          // Send to server for detection
          try {
            const resp = await fetch(`${FACIAL_SERVER_URL}/api/facial/detect_frame`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image_data: imageData })
            })
            if (!resp.ok) return
            const data = await resp.json()
            const faces: DetectedFace[] = data.faces || []
            setDetectedFaces(faces)

            // Draw onto visible canvas
            const canvas = canvasRef.current!
            const ctx = canvas.getContext('2d')!
            canvas.width = width
            canvas.height = height
            ctx.drawImage(video, 0, 0, width, height)

            faces.forEach((face) => {
              const color = face.is_registered ? '#00ff00' : '#ff0000'
              ctx.strokeStyle = color
              ctx.lineWidth = 3
              ctx.strokeRect(face.bbox.x, face.bbox.y, face.bbox.width, face.bbox.height)

              ctx.fillStyle = color
              ctx.font = 'bold 14px Arial'
              const label = face.is_registered ? `${face.name} (${(face.confidence * 100).toFixed(1)}%)` : 'Unknown'
              ctx.fillText(label, face.bbox.x, face.bbox.y - 10)
            })
          } catch (err) {
            console.log('[v0] Facial recognition detection fetch error:', err)
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
        ;(videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop())
        videoRef.current.srcObject = null
      }
      setDetectedFaces([])
    }

    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current)
        streamIntervalRef.current = null
      }
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [isActive, serverStatus])

  const registeredCount = detectedFaces.filter((f) => f.is_registered).length
  const unknownCount = detectedFaces.filter((f) => !f.is_registered).length

  return (
    <div className="space-y-4">
      {serverStatus === "offline" && (
        <div className="p-4 rounded-lg bg-yellow-500/20 border border-yellow-500/50">
          <p className="font-semibold text-yellow-600">Facial Recognition Server Offline</p>
          <p className="text-sm text-yellow-600">
            Run: <code className="bg-background px-2 py-1 rounded">python scripts/facial_recognition_server.py</code>
          </p>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Facial Recognition Camera
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

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span>Registered: {registeredCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded" />
              <span>Unknown: {unknownCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-base">Detection Legend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-green-500" />
            <span className="font-medium text-green-600">Green Rectangle:</span>
            <span className="text-muted-foreground">Registered face detected</span>
          </div>
          <div className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-red-500" />
            <span className="font-medium text-red-600">Red Rectangle:</span>
            <span className="text-muted-foreground">Unknown/Unregistered face</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
