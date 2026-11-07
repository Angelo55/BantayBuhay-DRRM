"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Search, Phone, MapPin } from "lucide-react"
import type { Responder } from "@/types"

interface ResponderListProps {
  onRefresh?: () => void
}

export function ResponderList({ onRefresh }: ResponderListProps) {
  const [responders, setResponders] = useState<Responder[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newResponder, setNewResponder] = useState({
    username: "",
    email: "",
    phone: "",
    assigned_area: "",
  })

  useEffect(() => {
    fetchResponders()
  }, [])

  const fetchResponders = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/responders")
      const data = await response.json()
      if (data.success) {
        setResponders(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch responders:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddResponder = async () => {
    if (newResponder.username && newResponder.email) {
      try {
        const response = await fetch("/api/responders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newResponder),
        })
        const data = await response.json()
        if (data.success) {
          setResponders([...responders, data.data])
          setNewResponder({ username: "", email: "", phone: "", assigned_area: "" })
          setIsAddDialogOpen(false)
          onRefresh?.()
        }
      } catch (error) {
        console.error("Failed to add responder:", error)
      }
    }
  }

  const filteredResponders = responders.filter(
    (r) =>
      r.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const statusColors = {
    active: "bg-green-500/20 text-green-600",
    inactive: "bg-gray-500/20 text-gray-600",
    on_duty: "bg-blue-500/20 text-blue-600",
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Responders</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Responder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register New Responder</DialogTitle>
              <DialogDescription>Add a new responder to the system.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  placeholder="responder_name"
                  value={newResponder.username}
                  onChange={(e) => setNewResponder({ ...newResponder, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="responder@bantaybuhay.com"
                  value={newResponder.email}
                  onChange={(e) => setNewResponder({ ...newResponder, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  placeholder="+63-999-0000000"
                  value={newResponder.phone}
                  onChange={(e) => setNewResponder({ ...newResponder, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Assigned Area</Label>
                <Input
                  placeholder="District/Area"
                  value={newResponder.assigned_area}
                  onChange={(e) => setNewResponder({ ...newResponder, assigned_area: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddResponder}>Add Responder</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search responders..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading responders...</p>
          ) : filteredResponders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No responders found</p>
          ) : (
            filteredResponders.map((responder) => (
              <div key={responder.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{responder.username}</p>
                    <p className="text-sm text-muted-foreground">{responder.email}</p>
                  </div>
                  <Badge className={statusColors[responder.status || "active"]}>{responder.status || "active"}</Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {responder.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {responder.phone}
                    </div>
                  )}
                  {responder.assigned_area && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {responder.assigned_area}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
