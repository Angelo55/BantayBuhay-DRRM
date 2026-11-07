"use client"

import { Header } from "@/components/header"
import { KabankalanMap } from "@/components/kabankalan-map"

export default function MapPage() {
  return (
    <div className="min-h-screen">
      <Header title="Location Map" subtitle="Track responders and incidents in Kabankalan City" />

      <div className="p-4 lg:p-6">
        <KabankalanMap />
      </div>
    </div>
  )
}
