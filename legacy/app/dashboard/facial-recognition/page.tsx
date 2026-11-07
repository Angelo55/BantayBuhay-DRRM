"use client"

import { Header } from "@/components/header"
import { FacialRecognitionCamera } from "@/components/facial-recognition-camera"

export default function FacialRecognitionPage() {
  return (
    <div className="min-h-screen">
      <Header title="Facial Recognition" subtitle="Detect and identify faces in real-time" />

      <div className="p-4 lg:p-6">
        <FacialRecognitionCamera />
      </div>
    </div>
  )
}
