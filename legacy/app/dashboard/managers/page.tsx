"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Search, Shield } from "lucide-react"

const mockManagers = [
  {
    id: 1,
    username: "manager_admin",
    email: "manager@bantaybuhay.com",
    department: "Headquarters",
    created_at: new Date().toISOString(),
  },
]

export default function ManagersPage() {
  const [managers, setManagers] = useState(mockManagers)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newManager, setNewManager] = useState({
    username: "",
    email: "",
    department: "",
  })

  const handleAddManager = () => {
    if (newManager.username && newManager.email) {
      const manager = {
        id: managers.length + 1,
        ...newManager,
        created_at: new Date().toISOString(),
      }
      setManagers([...managers, manager])
      setNewManager({ username: "", email: "", department: "" })
      setIsAddDialogOpen(false)
    }
  }

  const filteredManagers = managers.filter(
    (m) =>
      m.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="min-h-screen">
      <Header title="Manager Management" subtitle="Manage system administrators" />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search managers..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Manager
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Manager Account</DialogTitle>
                <DialogDescription>Add a new manager to the system.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    placeholder="manager_name"
                    value={newManager.username}
                    onChange={(e) => setNewManager({ ...newManager, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="manager@bantaybuhay.com"
                    value={newManager.email}
                    onChange={(e) => setNewManager({ ...newManager, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    placeholder="Department name"
                    value={newManager.department}
                    onChange={(e) => setNewManager({ ...newManager, department: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddManager}>Create Manager</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Managers Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">System Managers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Manager</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Department</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden md:table-cell">
                      Created
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredManagers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                        No managers found
                      </td>
                    </tr>
                  ) : (
                    filteredManagers.map((manager) => (
                      <tr key={manager.id} className="border-b border-border last:border-0">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-foreground">{manager.username}</p>
                            <p className="text-sm text-muted-foreground">{manager.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">{manager.department}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground hidden md:table-cell">
                          {new Date(manager.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Badge className="bg-red-500/20 text-red-600">
                            <Shield className="h-3 w-3 mr-1" />
                            Manager
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
