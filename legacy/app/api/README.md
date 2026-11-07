# API Implementation Guide

## Overview
The BantayBuhay API provides endpoints for managing responders, incidents, and system analytics. All endpoints are RESTful and return JSON responses.

## Directory Structure
\`\`\`
app/api/
├── auth/
│   └── login/route.ts          - Authentication
├── responders/
│   └── route.ts                 - Responder management
├── incidents/
│   ├── route.ts                 - Incident CRUD
│   └── [id]/route.ts            - Incident updates
├── analytics/
│   └── route.ts                 - System analytics
└── vision/
    └── detections/route.ts      - Vision system integration
\`\`\`

## Creating New Endpoints

1. **Create Route Handler**:
   \`\`\`typescript
   export async function GET(request: NextRequest) {
     // Your code
   }
   \`\`\`

2. **Add to API Documentation**:
   Update `PUBLIC_API.md` with endpoint details

3. **Test with cURL**:
   \`\`\`bash
   curl -X GET http://localhost:3000/api/responders
   \`\`\`

## Environment Variables

Add these to your `.env.local`:
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `DATABASE_URL` - Database connection string (for production)

## Security Best Practices

- Validate input on all endpoints
- Use parameterized queries
- Implement rate limiting
- Validate authentication tokens
- Log all sensitive operations
