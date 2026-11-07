"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import type { Analytics } from "@/types"

export function AnalyticsOverview() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/analytics")
      const data = await response.json()
      if (data.success) {
        setAnalytics(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !analytics) {
    return <p className="text-sm text-muted-foreground">Loading analytics...</p>
  }

  const incidentTypeData = Object.entries(analytics.incidents_by_type).map(([type, count]) => ({
    name: type.replace(/_/g, " "),
    value: count,
  }))

  const severityData = Object.entries(analytics.incidents_by_severity).map(([severity, count]) => ({
    name: severity,
    value: count,
  }))

  const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981"]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Key Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Key Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Incidents</p>
            <p className="text-2xl font-bold">{analytics.total_incidents}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Resolved</p>
            <p className="text-2xl font-bold text-green-500">{analytics.resolved_incidents}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg Response Time</p>
            <p className="text-2xl font-bold">{Math.round(analytics.average_response_time / 60)}m</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active Responders</p>
            <p className="text-2xl font-bold">
              {analytics.responders_active}/{analytics.responders_total}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Incidents by Type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Incidents by Type</CardTitle>
        </CardHeader>
        <CardContent>
          {incidentTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={incidentTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={{ fontSize: 12 }}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {incidentTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground">No incident data</p>
          )}
        </CardContent>
      </Card>

      {/* Incidents by Severity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Incidents by Severity</CardTitle>
        </CardHeader>
        <CardContent>
          {severityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--color-primary)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground">No incident data</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
