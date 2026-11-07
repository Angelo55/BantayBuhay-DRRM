import { type NextRequest, NextResponse } from "next/server"

// Mock database
const responders = [
  {
    id: 2,
    username: "responder_juan",
    email: "responder@bantaybuhay.com",
    role: "responder",
    created_at: new Date().toISOString(),
    status: "active",
    assigned_area: "District 1",
    phone: "+63-999-1234567",
  },
  {
    id: 3,
    username: "responder_maria",
    email: "maria@bantaybuhay.com",
    role: "responder",
    created_at: new Date().toISOString(),
    status: "active",
    assigned_area: "District 2",
    phone: "+63-999-2345678",
  },
]

// GET all responders
export async function GET() {
  return NextResponse.json({
    success: true,
    data: responders,
  })
}

// POST create new responder
export async function POST(request: NextRequest) {
  try {
    const { username, email, phone, assigned_area } = await request.json()

    const newResponder = {
      id: responders.length + 2,
      username,
      email,
      role: "responder",
      created_at: new Date().toISOString(),
      status: "active",
      assigned_area,
      phone,
    }

    responders.push(newResponder)

    return NextResponse.json({
      success: true,
      message: "Responder created successfully",
      data: newResponder,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create responder" }, { status: 500 })
  }
}
