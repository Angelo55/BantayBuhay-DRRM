"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Camera, Check, X, UserPlus } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

const REGISTRATION_SERVER_URL = "http://localhost:5002"

export function FaceRegistration() {
  const { user } = useAuth()
  const { toast } = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [captures, setCaptures] = useState<string[]>([])
  const [name, setName] = useState(user?.username || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [registeredDirectory, setRegisteredDirectory] = useState<string | null>(null)
  const [isDebugging, setIsDebugging] = useState(false)
  const [isCheckingDB, setIsCheckingDB] = useState(false)

  useEffect(() => {
    if (isCameraActive) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => stopCamera()
  }, [isCameraActive])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
  }

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const imageData = canvas.toDataURL("image/jpeg")
        // add to captures (up to 4)
        setCaptures((prev) => {
          const next = [...prev, imageData].slice(0, 4)
          // auto-stop camera if we've collected 4 captures
          if (next.length >= 4) {
            stopCamera()
            setIsCameraActive(false)
          }
          return next
        })
        setFaceDetected(true)
      }
    }
  }

  const registerFace = async () => {
    if (captures.length < 4 || !name) {
      toast({
        title: "Missing Information",
        description: "Please capture 4 images and enter your name.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(`${REGISTRATION_SERVER_URL}/api/registration/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          responder_id: user?.id,
          images: captures,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      let resJson: any = null
      const ct = response.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        try {
          resJson = await response.json()
        } catch (e) {
          console.log('Failed to parse JSON response', e)
        }
      } else {
        const txt = await response.text()
        resJson = { message: txt }
      }

      if (response.ok) {
        toast({
          title: "Success!",
          description: "Your face has been registered successfully.",
        })
        setCaptures([])
        setName(user?.username || "")
        setFaceDetected(false)
        // Display the directory created on the server
        if (resJson?.directory) {
          setRegisteredDirectory(resJson.directory)
        }        if (resJson?.files) {
          toast({ title: 'Saved', description: `Saved ${resJson.files.length} image(s) to server.` })
        }
        if (resJson?.db_error) {
          toast({ title: 'DB Warning', description: `DB insert failed: ${resJson.db_error}`, variant: 'destructive' })
        }      } else {
        toast({
          title: "Registration Failed",
          description: resJson?.error || resJson?.message || "Could not register face.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast({ title: 'Registration Failed', description: 'Request timed out. Try again.', variant: 'destructive' })
      } else {
        toast({ title: 'Registration Failed', description: error?.message || 'Could not register face. Please try again.', variant: 'destructive' })
      }
    } finally {
      clearTimeout(timeout)
      setIsSubmitting(false)
    }
  }

  const removeCapture = (idx: number) => {
    setCaptures((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Register Your Face
          </CardTitle>
          <CardDescription>
            Capture a clear photo of your face to enable facial recognition in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
            {isCameraActive ? (
              <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
            ) : captures.length > 0 ? (
              <div className="w-full h-full grid grid-cols-2 gap-1 p-1">
                {captures.map((c, i) => (
                  <img key={i} src={c} className="w-full h-full object-cover rounded" />
                ))}
                {Array.from({ length: Math.max(0, 4 - captures.length) }).map((_, i) => (
                  <div key={`placeholder-${i}`} className="bg-gray-800 flex items-center justify-center text-muted-foreground rounded">Step</div>
                ))}
              </div>
            ) : (
              <div className="text-center space-y-2">
                <Camera className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">Click "Start Camera" to begin</p>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          <div className="flex gap-2">
            {captures.length < 4 && (
              <Button onClick={() => setIsCameraActive(!isCameraActive)} className="flex-1">
                {isCameraActive ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </>
                )}
              </Button>
            )}

            {isCameraActive && (
              <Button onClick={captureFrame} className="flex-1" variant="secondary">
                <Check className="h-4 w-4 mr-2" />
                Capture Photo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {captures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registration Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
            </div>

            {faceDetected && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-600">Face detected in image</span>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="relative bg-gray-800 rounded overflow-hidden h-24">
                  {captures[i] ? (
                    <>
                      <img src={captures[i]} className="w-full h-full object-cover" />
                      <button
                        className="absolute top-1 right-1 bg-white bg-opacity-20 text-white px-2 py-1 rounded"
                        onClick={() => removeCapture(i)}
                      >
                        Retake
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Step {i + 1}</div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-sm text-muted-foreground">Captured: {captures.length} / 4</div>

            <div className="flex gap-2">
              <Button onClick={registerFace} disabled={isSubmitting || name.length === 0 || captures.length !== 4} className="flex-1">
                {isSubmitting ? "Registering..." : "Register Face"}
              </Button>

              <Button
                onClick={async () => {
                  console.log('[Registration DEBUG] clicked')
                  setIsDebugging(true)
                  toast({ title: 'Debug', description: 'Testing server...', })
                  try {
                    const resp = await fetch(`${REGISTRATION_SERVER_URL}/api/registration/debug`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name, images: captures })
                    })
                    let data = null
                    try { data = await resp.json() } catch (j) { data = { message: await resp.text() } }
                    console.log('[Registration DEBUG] response', resp.status, data)
                    if (resp.ok) {
                      toast({ title: 'Debug OK', description: `Server received ${data.images_count} image(s)` })
                    } else {
                      toast({ title: 'Debug Failed', description: data.error || data.message || `Status ${resp.status}`, variant: 'destructive' })
                    }
                  } catch (e) {
                    console.log('[Registration DEBUG] error', e)
                    toast({ title: 'Debug Failed', description: 'Could not reach registration server', variant: 'destructive' })
                  } finally {
                    setIsDebugging(false)
                  }
                }}
                variant="ghost"
                disabled={isDebugging}
              >
                {isDebugging ? 'Testing...' : 'Test Server'}
              </Button>

              <Button
                onClick={async () => {
                  setIsCheckingDB(true)
                  toast({ title: 'DB Check', description: 'Checking database connection...', })
                  try {
                    const resp = await fetch(`${REGISTRATION_SERVER_URL}/api/registration/db_status`)
                    const data = await resp.json()
                    console.log('[DB STATUS]', resp.status, data)
                    if (resp.ok) {
                      toast({ title: 'DB OK', description: `Connected=${data.connected} table_exists=${data.table_exists} rows=${data.rows ?? 'N/A'}` })
                    } else {
                      toast({ title: 'DB Check Failed', description: data.error || `Status ${resp.status}`, variant: 'destructive' })
                    }
                  } catch (e) {
                    console.log('[DB STATUS] error', e)
                    toast({ title: 'DB Check Failed', description: 'Could not reach DB endpoint', variant: 'destructive' })
                  } finally {
                    setIsCheckingDB(false)
                  }
                }}
                variant="ghost"
                disabled={isCheckingDB}
              >
                {isCheckingDB ? 'Checking...' : 'Check DB'}
              </Button>
            </div>

            {registeredDirectory && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded">
                <div className="text-sm">Folder created:</div>
                <div className="text-xs text-muted-foreground break-all">{registeredDirectory}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-base">Registration Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Ensure your face is well-lit and clearly visible</p>
          <p>• Capture 4 images from different angles (front, left, right, slightly up/down)</p>
          <p>• Remove sunglasses or masks</p>
          <p>• Keep a neutral expression</p>
          <p>• Registration is recorded in the XAMPP database; images are validated but not saved to disk</p>
          <p>• After registering, the server will create a folder under <strong>registered_faces/</strong> and display its directory path</p>
        </CardContent>
      </Card>
    </div>
  )
}
