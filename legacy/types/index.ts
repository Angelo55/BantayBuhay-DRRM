// BantayBuhay System Types

export type UserRole = "manager" | "responder"

export interface User {
  id: number
  username: string
  email: string
  role: UserRole
  created_at: string
  last_login?: string
  avatar?: string
  created_by?: number
}

export interface Responder extends User {
  id_number?: string
  phone?: string
  status: "active" | "inactive" | "on_duty"
  assigned_area?: string
}

export interface Manager extends User {
  id_number?: string
  department?: string
  can_create_managers: boolean
}

export interface FacialRecognitionResult {
  id: number
  detected_name: string
  confidence: number
  timestamp: string
  camera_id: number
  responder_id?: number
  image_snapshot?: string
  is_known: boolean
}

export interface GestureRecognitionResult {
  id: number
  gesture_type: string
  confidence: number
  timestamp: string
  camera_id: number
  responder_id?: number
  is_danger: boolean
  alert_triggered: boolean
}

export interface Incident {
  id: number
  incident_type: "sos" | "facial_recognition" | "gesture_recognition" | "other"
  responder_id: number
  severity: "low" | "medium" | "high" | "critical"
  status: "reported" | "responding" | "resolved"
  description: string
  location: string
  timestamp: string
  resolved_at?: string
  notes?: string
}

export interface DangerAlert {
  id: number
  alert_type: "facial" | "gesture" | "both"
  severity: "low" | "medium" | "high" | "critical"
  message: string
  timestamp: string
  camera_id: number
  responder_id?: number
  acknowledged: boolean
  acknowledged_by?: string
}

export interface Camera {
  id: number
  name: string
  location: string
  stream_url: string
  status: "online" | "offline" | "error"
  is_recording: boolean
  responder_id?: number
}

export interface Analytics {
  total_incidents: number
  resolved_incidents: number
  average_response_time: number
  incidents_by_type: Record<string, number>
  incidents_by_severity: Record<string, number>
  responders_active: number
  responders_total: number
  last_updated: string
}

export interface SystemLog {
  id: number
  log_type: "recognition" | "alert" | "system" | "user"
  message: string
  timestamp: string
  details?: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface RegisteredFace {
  id: number
  responder_id: number
  face_encoding: string
  image_path: string
  registered_by: number
  registered_at: string
  is_active: boolean
  notes?: string
}

export interface Location {
  id: number
  city: string
  province: string
  barangay?: string
  latitude: number
  longitude: number
  responder_id?: number
  incident_id?: number
  marker_type: "responder" | "incident" | "camera" | "station"
  created_at: string
}

export interface MapMarker {
  id: number
  position: [number, number]
  type: "responder" | "incident" | "camera" | "station"
  title: string
  description?: string
  status?: string
}
