"use client"

import { Header } from "@/components/header"
import { FaceRegistration } from "@/components/face-registration"

export default function FaceRegistrationPage() {
  return (
    <div className="min-h-screen">
      <Header title="Face Registration" subtitle="Register your face for recognition" />

      <div className="p-4 lg:p-6">
        <FaceRegistration />
      </div>
    </div>
  )
}
