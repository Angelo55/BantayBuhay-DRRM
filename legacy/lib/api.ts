// API Configuration for connecting to Python Backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const apiEndpoints = {
  // Authentication
  login: `${API_BASE_URL}/api/auth/login`,
  register: `${API_BASE_URL}/api/auth/register`,
  logout: `${API_BASE_URL}/api/auth/logout`,

  // Users
  users: `${API_BASE_URL}/api/users`,
  userById: (id: number) => `${API_BASE_URL}/api/users/${id}`,

  // Cameras
  cameras: `${API_BASE_URL}/api/cameras`,
  cameraById: (id: number) => `${API_BASE_URL}/api/cameras/${id}`,
  cameraStream: (id: number) => `${API_BASE_URL}/api/cameras/${id}/stream`,

  // Recognition
  facialRecognition: `${API_BASE_URL}/api/recognition/facial`,
  gestureRecognition: `${API_BASE_URL}/api/recognition/gesture`,

  // Alerts
  alerts: `${API_BASE_URL}/api/alerts`,
  acknowledgeAlert: (id: number) => `${API_BASE_URL}/api/alerts/${id}/acknowledge`,

  // Logs
  logs: `${API_BASE_URL}/api/logs`,
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const defaultHeaders = {
    "Content-Type": "application/json",
  }

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: "include",
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "An error occurred" }))
    throw new Error(error.message || "API request failed")
  }

  return response.json()
}
