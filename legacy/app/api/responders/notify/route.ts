import { NextResponse } from "next/server"

// Simple in-memory notifications (dev only)
const notifications: any[] = []

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { responder_id, message, source } = body
    const note = {
      id: notifications.length + 1,
      responder_id,
      message,
      source: source || "gesture_recognition",
      timestamp: new Date().toISOString(),
    }
    notifications.push(note)
    console.log(`[Responders API] Notification created for responder ${responder_id}: ${message}`)
    return NextResponse.json({ success: true, data: note })
  } catch (e) {
    console.error('[Responders API] Failed to create notification', e)
    return NextResponse.json({ success: false, error: 'Failed to create notification' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ success: true, data: notifications })
}
