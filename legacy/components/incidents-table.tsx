"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, AlertCircle, Clock } from "lucide-react"
import type { Incident } from "@/types"

export function IncidentsTable() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [updateStatus, setUpdateStatus] = useState("")
  const [updateNotes, setUpdateNotes] = useState("")

  useEffect(() => {
    fetchIncidents()
  }, [])

  const fetchIncidents = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/incidents")
      const data = await response.json()
      if (data.success) {
        setIncidents(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch incidents:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateIncident = async () => {
    if (selectedIncident && updateStatus) {
      try {
        const response = await fetch(`/api/incidents/${selectedIncident.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: updateStatus,
            notes: updateNotes,
          }),
        })
        const data = await response.json()
        if (data.success) {
          setIncidents(incidents.map((i) => (i.id === selectedIncident.id ? data.data : i)))
          setSelectedIncident(null)
          setUpdateStatus("")
          setUpdateNotes("")
        }
      } catch (error) {
        console.error("Failed to update incident:", error)
      }
    }
  }

  const statusIcons = {
    reported: Clock,
    responding: AlertCircle,
    resolved: CheckCircle,
  }

  const statusColors = {
    reported: "bg-yellow-500/20 text-yellow-600",
    responding: "bg-blue-500/20 text-blue-600",
    resolved: "bg-green-500/20 text-green-600",
  }

  const severityColors = {
    low: "bg-blue-500/20 text-blue-600",
    medium: "bg-yellow-500/20 text-yellow-600",
    high: "bg-orange-500/20 text-orange-600",
    critical: "bg-red-500/20 text-red-600",
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Incidents</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading incidents...</p>
        ) : incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No incidents recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Severity</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Location</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Time</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => {
                  const StatusIcon = statusIcons[incident.status as keyof typeof statusIcons]
                  return (
                    <tr key={incident.id} className="border-b last:border-0">
                      <td className="py-3 px-4 text-sm capitalize">{incident.incident_type.replace(/_/g, " ")}</td>
                      <td className="py-3 px-4">
                        <Badge className={severityColors[incident.severity]}>{incident.severity}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {StatusIcon && <StatusIcon className="h-4 w-4" />}
                          <Badge className={statusColors[incident.status]}>{incident.status}</Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">{incident.location}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date(incident.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedIncident(incident)
                            setUpdateStatus(incident.status)
                            setUpdateNotes(incident.notes || "")
                          }}
                        >
                          Update
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Incident</DialogTitle>
              <DialogDescription>Update the incident status and add notes.</DialogDescription>
            </DialogHeader>
            {selectedIncident && (
              <div className="space-y-4 py-4">
                <div>
                  <p className="text-sm font-medium">Type: {selectedIncident.incident_type}</p>
                  <p className="text-sm text-muted-foreground">Location: {selectedIncident.location}</p>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={updateStatus} onValueChange={setUpdateStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reported">Reported</SelectItem>
                      <SelectItem value="responding">Responding</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Add notes..."
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedIncident(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateIncident}>Update Incident</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
