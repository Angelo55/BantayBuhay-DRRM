"use client"

import { Header } from "@/components/header"
import { CameraTab } from "@/components/camera-tab"

export default function CameraPage() {
  return (
    <div className="min-h-screen">
      <Header title="Camera" subtitle="Real-time facial and gesture recognition" />

      <div className="p-4 lg:p-6">
        <CameraTab />
      </div>
    </div>
  )
}
