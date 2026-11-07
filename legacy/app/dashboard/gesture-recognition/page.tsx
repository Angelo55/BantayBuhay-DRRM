"use client"

import { Header } from "@/components/header"
import { GestureRecognitionCamera } from "@/components/gesture-recognition-camera"

export default function GestureRecognitionPage() {
  return (
    <div className="min-h-screen">
      <Header title="Gesture Recognition" subtitle="Detect SOS signals and hand gestures" />

      <div className="p-4 lg:p-6">
        <GestureRecognitionCamera />
      </div>
    </div>
  )
}
