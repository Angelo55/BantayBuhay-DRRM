import { type NextRequest, NextResponse } from "next/server"
import type { Analytics } from "@/types"

// Mock incident data for analytics
const mockIncidents = [
  { incident_type: "sos", severity: "critical", status: "resolved" },
  { incident_type: "gesture_recognition", severity: "high", status: "resolved" },
  { incident_type: "facial_recognition", severity: "medium", status: "responding" },
]

export async function GET(request: NextRequest) {
  const responder_id = request.nextUrl.searchParams.get("responder_id")

  // Calculate analytics
  const total = mockIncidents.length
  const resolved = mockIncidents.filter((i) => i.status === "resolved").length
  const byType = mockIncidents.reduce(
    (acc, i) => {
      acc[i.incident_type] = (acc[i.incident_type] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const bySeverity = mockIncidents.reduce(
    (acc, i) => {
      acc[i.severity] = (acc[i.severity] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const analytics: Analytics = {
    total_incidents: total,
    resolved_incidents: resolved,
    average_response_time: 1200, // seconds
    incidents_by_type: byType,
    incidents_by_severity: bySeverity,
    responders_active: 2,
    responders_total: 2,
    last_updated: new Date().toISOString(),
  }

  return NextResponse.json({
    success: true,
    data: analytics,
  })
}
