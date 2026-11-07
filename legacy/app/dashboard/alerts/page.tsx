"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Clock, Camera, Bell, BellOff, Filter } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { DangerAlert } from "@/types"

const mockAlerts: DangerAlert[] = [
  {
    id: 1,
    alert_type: "gesture",
    severity: "high",
    message: "Help signal detected in main entrance",
    timestamp: new Date().toISOString(),
    camera_id: 1,
    acknowledged: false,
  },
  {
    id: 2,
    alert_type: "facial",
    severity: "medium",
    message: "Unknown person detected in restricted area",
    timestamp: new Date(Date.now() - 300000).toISOString(),
    camera_id: 2,
    acknowledged: false,
  },
  {
    id: 3,
    alert_type: "gesture",
    severity: "critical",
    message: "SOS gesture detected - immediate attention required",
    timestamp: new Date(Date.now() - 600000).toISOString(),
    camera_id: 3,
    acknowledged: true,
    acknowledged_by: "admin",
  },
  {
    id: 4,
    alert_type: "both",
    severity: "high",
    message: "Unknown person with distress signal",
    timestamp: new Date(Date.now() - 900000).toISOString(),
    camera_id: 1,
    acknowledged: true,
    acknowledged_by: "operator1",
  },
  {
    id: 5,
    alert_type: "facial",
    severity: "low",
    message: "Multiple unknown faces in lobby",
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    camera_id: 4,
    acknowledged: false,
  },
  {
    id: 6,
    alert_type: "gesture",
    severity: "medium",
    message: "Unusual hand movements detected",
    timestamp: new Date(Date.now() - 1500000).toISOString(),
    camera_id: 2,
    acknowledged: true,
    acknowledged_by: "admin",
  },
]

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(mockAlerts)
  const [filterSeverity, setFilterSeverity] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const handleAcknowledge = (id: number) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, acknowledged: true, acknowledged_by: "current_user" } : alert,
      ),
    )
  }

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSeverity = filterSeverity === "all" || alert.severity === filterSeverity
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && !alert.acknowledged) ||
      (filterStatus === "acknowledged" && alert.acknowledged)
    return matchesSeverity && matchesStatus
  })

  const activeCount = alerts.filter((a) => !a.acknowledged).length
  const criticalCount = alerts.filter((a) => a.severity === "critical" && !a.acknowledged).length

  const severityColors = {
    low: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
    medium: "bg-orange-500/20 text-orange-600 border-orange-500/30",
    high: "bg-red-500/20 text-red-600 border-red-500/30",
    critical: "bg-red-600/30 text-red-500 border-red-600/50",
  }

  return (
    <div className="min-h-screen">
      <Header title="Alerts" subtitle="Manage danger alerts and notifications" />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-500/20">
                  <Bell className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Alerts</p>
                  <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-600/30">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Critical Alerts</p>
                  <p className="text-2xl font-bold text-foreground">{criticalCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/20">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Acknowledged</p>
                  <p className="text-2xl font-bold text-foreground">{alerts.length - activeCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Alert History</CardTitle>
              <Badge variant="secondary">{filteredAlerts.length} alerts</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No alerts found matching your filters.</div>
            ) : (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "p-4 rounded-lg border",
                    alert.acknowledged ? "bg-muted/50 border-border" : severityColors[alert.severity],
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full shrink-0",
                        alert.acknowledged ? "bg-muted" : "bg-background",
                      )}
                    >
                      {alert.acknowledged ? (
                        <BellOff className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <AlertTriangle
                          className={cn("h-5 w-5", alert.severity === "critical" && "text-red-500 animate-pulse")}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant={alert.acknowledged ? "secondary" : "destructive"} className="capitalize">
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {alert.alert_type}
                        </Badge>
                        {alert.acknowledged && (
                          <Badge variant="secondary" className="text-green-600">
                            Acknowledged
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-foreground mb-2">{alert.message}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Camera className="h-3 w-3" />
                          Camera {alert.camera_id}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(alert.timestamp).toLocaleString()}
                        </span>
                        {alert.acknowledged_by && <span>Acknowledged by: {alert.acknowledged_by}</span>}
                      </div>
                    </div>

                    {!alert.acknowledged && (
                      <Button size="sm" onClick={() => handleAcknowledge(alert.id)}>
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
