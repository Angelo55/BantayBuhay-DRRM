"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, FileText, Download, Filter, UserCircle, Bell, Settings, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SystemLog } from "@/types"

const mockLogs: SystemLog[] = [
  {
    id: 1,
    log_type: "recognition",
    message: "Face detected: John Doe (95.5% confidence)",
    timestamp: new Date().toISOString(),
    details: "Camera 1 - Main Entrance",
  },
  {
    id: 2,
    log_type: "alert",
    message: "Danger alert triggered: Help signal detected",
    timestamp: new Date(Date.now() - 60000).toISOString(),
    details: "Camera 3 - Lobby",
  },
  {
    id: 3,
    log_type: "system",
    message: "Camera 4 connection restored",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    details: "Back Exit camera online",
  },
  {
    id: 4,
    log_type: "user",
    message: "User admin logged in",
    timestamp: new Date(Date.now() - 180000).toISOString(),
    details: "IP: 192.168.1.100",
  },
  {
    id: 5,
    log_type: "recognition",
    message: "Unknown person detected",
    timestamp: new Date(Date.now() - 240000).toISOString(),
    details: "Camera 2 - Parking Lot",
  },
  {
    id: 6,
    log_type: "recognition",
    message: "Gesture detected: Wave (92.3% confidence)",
    timestamp: new Date(Date.now() - 300000).toISOString(),
    details: "Camera 1 - Main Entrance",
  },
  {
    id: 7,
    log_type: "alert",
    message: "Alert acknowledged by operator1",
    timestamp: new Date(Date.now() - 360000).toISOString(),
    details: "Alert ID: 3",
  },
  {
    id: 8,
    log_type: "system",
    message: "Database backup completed",
    timestamp: new Date(Date.now() - 420000).toISOString(),
    details: "Size: 245MB",
  },
  {
    id: 9,
    log_type: "user",
    message: "New user registered: operator2",
    timestamp: new Date(Date.now() - 480000).toISOString(),
    details: "Role: Operator",
  },
  {
    id: 10,
    log_type: "system",
    message: "System started",
    timestamp: new Date(Date.now() - 540000).toISOString(),
    details: "All services initialized",
  },
]

export default function LogsPage() {
  const [logs] = useState(mockLogs)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("all")

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesType = filterType === "all" || log.log_type === filterType
    return matchesSearch && matchesType
  })

  const logTypeIcons = {
    recognition: UserCircle,
    alert: Bell,
    system: Settings,
    user: UserCircle,
  }

  const logTypeColors = {
    recognition: "text-blue-500 bg-blue-500/20",
    alert: "text-red-500 bg-red-500/20",
    system: "text-green-500 bg-green-500/20",
    user: "text-purple-500 bg-purple-500/20",
  }

  const handleExport = () => {
    const csvContent = [
      ["ID", "Type", "Message", "Details", "Timestamp"],
      ...filteredLogs.map((log) => [log.id, log.log_type, log.message, log.details || "", log.timestamp]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bantaybuhay-logs-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen">
      <Header title="System Logs" subtitle="View recognition logs and system activity" />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <UserCircle className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Recognition</p>
                  <p className="text-xl font-bold text-foreground">
                    {logs.filter((l) => l.log_type === "recognition").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <Bell className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Alerts</p>
                  <p className="text-xl font-bold text-foreground">
                    {logs.filter((l) => l.log_type === "alert").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Settings className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">System</p>
                  <p className="text-xl font-bold text-foreground">
                    {logs.filter((l) => l.log_type === "system").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <UserCircle className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">User</p>
                  <p className="text-xl font-bold text-foreground">
                    {logs.filter((l) => l.log_type === "user").length}
                  </p>
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
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Log type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="recognition">Recognition</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Log Entries
              </CardTitle>
              <Badge variant="secondary">{filteredLogs.length} entries</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No logs found matching your filters.</div>
              ) : (
                filteredLogs.map((log) => {
                  const Icon = logTypeIcons[log.log_type]
                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
                          logTypeColors[log.log_type],
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{log.message}</p>
                        {log.details && <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
