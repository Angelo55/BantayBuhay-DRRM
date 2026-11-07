import { type NextRequest, NextResponse } from "next/server"
import type { Incident } from "@/types"

// Mock database reference
const incidents: Incident[] = [
  {
    id: 1,
    incident_type: "gesture_recognition",
    responder_id: 2,
    severity: "high",
    status: "resolved",
    description: "SOS gesture detected",
    location: "District 1, Main Street",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    resolved_at: new Date(Date.now() - 1800000).toISOString(),
    notes: "Responder helped person safely",
  },
]

// PATCH update incident
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const updates = await request.json()

    const incidentIndex = incidents.findIndex((i) => i.id === id)
    if (incidentIndex === -1) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    incidents[incidentIndex] = {
      ...incidents[incidentIndex],
      ...updates,
      resolved_at: updates.status === "resolved" ? new Date().toISOString() : incidents[incidentIndex].resolved_at,
    }

    return NextResponse.json({
      success: true,
      data: incidents[incidentIndex],
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update incident" }, { status: 500 })
  }
}
