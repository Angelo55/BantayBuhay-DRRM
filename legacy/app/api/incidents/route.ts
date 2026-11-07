import { type NextRequest, NextResponse } from "next/server"
import type { Incident } from "@/types"

// Mock database
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
  {
    id: 2,
    incident_type: "sos",
    responder_id: 3,
    severity: "critical",
    status: "responding",
    description: "Critical emergency detected",
    location: "District 2, Emergency Zone",
    timestamp: new Date(Date.now() - 300000).toISOString(),
  },
]

// GET incidents with filtering
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const responder_id = searchParams.get("responder_id")
  const status = searchParams.get("status")

  let filtered = incidents

  if (responder_id) {
    filtered = filtered.filter((i) => i.responder_id === Number.parseInt(responder_id))
  }
  if (status) {
    filtered = filtered.filter((i) => i.status === status)
  }

  return NextResponse.json({
    success: true,
    data: filtered,
  })
}

// POST create new incident
export async function POST(request: NextRequest) {
  try {
    const incidentData = await request.json()

    const newIncident: Incident = {
      id: incidents.length + 1,
      timestamp: new Date().toISOString(),
      ...incidentData,
    }

    incidents.push(newIncident)

    return NextResponse.json({
      success: true,
      message: "Incident reported successfully",
      data: newIncident,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create incident" }, { status: 500 })
  }
}
