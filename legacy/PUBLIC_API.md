# BantayBuhay Public API Documentation

## Base URL
\`\`\`
http://localhost:3000/api
\`\`\`

## Authentication

All API requests use basic authentication or session-based authentication via cookies.

### Login
- **POST** `/auth/login`
- **Body**: `{ email: string, password: string }`
- **Response**: `{ success: boolean, user: User }`

### Logout
- **POST** `/auth/logout`
- **Response**: `{ success: boolean }`

---

## Responder Management

### Get All Responders
- **GET** `/responders`
- **Response**: `{ success: boolean, data: Responder[] }`

### Create Responder
- **POST** `/responders`
- **Body**: 
  \`\`\`json
  {
    "username": "string",
    "email": "string",
    "phone": "string",
    "assigned_area": "string"
  }
  \`\`\`
- **Response**: `{ success: boolean, data: Responder }`

### Get Responder by ID
- **GET** `/responders/:id`
- **Response**: `{ success: boolean, data: Responder }`

### Update Responder
- **PATCH** `/responders/:id`
- **Body**: `{ status: "active" | "inactive" | "on_duty", ... }`
- **Response**: `{ success: boolean, data: Responder }`

---

## Incident Management

### Get All Incidents
- **GET** `/incidents`
- **Query Parameters**:
  - `responder_id`: Filter by responder ID
  - `status`: Filter by status (reported, responding, resolved)
- **Response**: `{ success: boolean, data: Incident[] }`

### Create Incident
- **POST** `/incidents`
- **Body**:
  \`\`\`json
  {
    "incident_type": "sos" | "facial_recognition" | "gesture_recognition" | "other",
    "responder_id": "number",
    "severity": "low" | "medium" | "high" | "critical",
    "status": "reported" | "responding" | "resolved",
    "description": "string",
    "location": "string"
  }
  \`\`\`
- **Response**: `{ success: boolean, data: Incident }`

### Update Incident
- **PATCH** `/incidents/:id`
- **Body**: `{ status: string, notes: string, ... }`
- **Response**: `{ success: boolean, data: Incident }`

---

## Analytics

### Get System Analytics
- **GET** `/analytics`
- **Query Parameters**:
  - `responder_id`: Get analytics for specific responder
- **Response**:
  \`\`\`json
  {
    "success": true,
    "data": {
      "total_incidents": 10,
      "resolved_incidents": 8,
      "average_response_time": 1200,
      "incidents_by_type": { "sos": 5, "gesture_recognition": 3, ... },
      "incidents_by_severity": { "critical": 2, "high": 3, ... },
      "responders_active": 5,
      "responders_total": 10,
      "last_updated": "ISO 8601 timestamp"
    }
  }
  \`\`\`

---

## Vision/Detection API

### Process Camera Frame
- **POST** `/vision/process`
- **Body**: `{ frame: base64, camera_id: number }`
- **Response**:
  \`\`\`json
  {
    "success": true,
    "detections": {
      "facial": [
        {
          "name": "string",
          "confidence": 0-100,
          "timestamp": "ISO 8601"
        }
      ],
      "gestures": [
        {
          "gesture": "string",
          "confidence": 0-100,
          "is_sos": boolean,
          "timestamp": "ISO 8601"
        }
      ]
    }
  }
  \`\`\`

---

## User Types

### Manager
- Can view all responders
- Can register new responders
- Can view analytics
- Can create/manage manager accounts
- Can view incidents and update status

### Responder
- Can access camera feed
- Can view assigned area alerts
- Can log incidents
- Cannot manage other responders

---

## Default Accounts

### Manager Account
- **Email**: `manager@bantaybuhay.com`
- **Password**: `manager123`
- **Role**: Manager

### Responder Account
- **Email**: `responder@bantaybuhay.com`
- **Password**: `responder123`
- **Role**: Responder

---

## Error Responses

### 401 Unauthorized
\`\`\`json
{ "error": "Invalid credentials" }
\`\`\`

### 404 Not Found
\`\`\`json
{ "error": "Resource not found" }
\`\`\`

### 500 Server Error
\`\`\`json
{ "error": "Internal server error", "details": "error message" }
\`\`\`

---

## Data Types

### User
\`\`\`typescript
{
  id: number
  username: string
  email: string
  role: "manager" | "responder"
  created_at: ISO 8601
  last_login?: ISO 8601
  avatar?: string
}
\`\`\`

### Responder (extends User)
\`\`\`typescript
{
  id: number
  username: string
  email: string
  role: "responder"
  phone?: string
  status: "active" | "inactive" | "on_duty"
  assigned_area?: string
  created_by?: number
}
\`\`\`

### Incident
\`\`\`typescript
{
  id: number
  incident_type: "sos" | "facial_recognition" | "gesture_recognition" | "other"
  responder_id: number
  severity: "low" | "medium" | "high" | "critical"
  status: "reported" | "responding" | "resolved"
  description: string
  location: string
  timestamp: ISO 8601
  resolved_at?: ISO 8601
  notes?: string
}
\`\`\`

---

## Integration with Python Backend

To integrate the Python vision system with this API:

1. **Start the Vision Server**:
   \`\`\`bash
   python scripts/vision_server.py
   \`\`\`

2. **Configure API Endpoint**:
   - Update `API_BASE_URL` in the Python script to match your deployment URL

3. **Send Detections**:
   - POST to `/api/incidents` when SOS is detected
   - POST to `/api/vision/detections` for facial/gesture data

4. **Retrieve Incident Data**:
   - GET `/api/incidents` to view all incidents
   - GET `/api/analytics` to get system-wide insights
