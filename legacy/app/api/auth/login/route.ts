import { type NextRequest, NextResponse } from "next/server"

// Mock database
const mockUsers = [
  {
    id: 1,
    username: "manager_admin",
    email: "manager@bantaybuhay.com",
    password: "manager123", // In production, use bcrypt
    role: "manager" as const,
    created_at: new Date().toISOString(),
    can_create_managers: true,
    department: "Headquarters",
  },
  {
    id: 2,
    username: "responder_juan",
    email: "responder@bantaybuhay.com",
    password: "responder123",
    role: "responder" as const,
    created_at: new Date().toISOString(),
    status: "active",
    assigned_area: "District 1",
  },
]

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    const user = mockUsers.find((u) => u.email === email && u.password === password)

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const { password: _, ...userWithoutPassword } = user
    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
    })
  } catch (error) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
