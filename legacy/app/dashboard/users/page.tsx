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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreHorizontal, Pencil, Trash2, UserCircle, Users, Shield, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import type { User } from "@/types"

const mockUsers: User[] = [
  {
    id: 1,
    username: "admin",
    email: "admin@bantaybuhay.com",
    role: "admin",
    created_at: "2024-01-15T08:00:00Z",
    last_login: new Date().toISOString(),
  },
  {
    id: 2,
    username: "operator1",
    email: "operator1@bantaybuhay.com",
    role: "operator",
    created_at: "2024-02-20T10:30:00Z",
    last_login: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 3,
    username: "operator2",
    email: "operator2@bantaybuhay.com",
    role: "operator",
    created_at: "2024-03-10T14:15:00Z",
    last_login: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 4,
    username: "viewer1",
    email: "viewer1@bantaybuhay.com",
    role: "viewer",
    created_at: "2024-04-05T09:45:00Z",
    last_login: new Date(Date.now() - 172800000).toISOString(),
  },
  { id: 5, username: "viewer2", email: "viewer2@bantaybuhay.com", role: "viewer", created_at: "2024-05-01T11:00:00Z" },
]

export default function UsersPage() {
  const [users, setUsers] = useState(mockUsers)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "viewer" as User["role"],
  })

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAddUser = () => {
    if (newUser.username && newUser.email && newUser.password) {
      const user: User = {
        id: Date.now(),
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        created_at: new Date().toISOString(),
      }
      setUsers((prev) => [...prev, user])
      setNewUser({ username: "", email: "", password: "", role: "viewer" })
      setIsAddDialogOpen(false)
    }
  }

  const handleEditUser = () => {
    if (editingUser) {
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? editingUser : u)))
      setEditingUser(null)
    }
  }

  const handleDeleteUser = (id: number) => {
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  const roleColors = {
    admin: "bg-red-500/20 text-red-600",
    operator: "bg-blue-500/20 text-blue-600",
    viewer: "bg-green-500/20 text-green-600",
  }

  const roleIcons = {
    admin: Shield,
    operator: Users,
    viewer: Eye,
  }

  return (
    <div className="min-h-screen">
      <Header title="User Management" subtitle="Manage system users and permissions" />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/20">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold text-foreground">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-500/20">
                  <Shield className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Admins</p>
                  <p className="text-2xl font-bold text-foreground">{users.filter((u) => u.role === "admin").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/20">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Operators</p>
                  <p className="text-2xl font-bold text-foreground">
                    {users.filter((u) => u.role === "operator").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>Create a new user account for the surveillance system.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-username">Username</Label>
                  <Input
                    id="new-username"
                    placeholder="johndoe"
                    value={newUser.username}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="john@example.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={newUser.password}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-role">Role</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(v) => setNewUser((prev) => ({ ...prev, role: v as User["role"] }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="operator">Operator</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddUser}>Add User</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">User Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden md:table-cell">
                      Created
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                      Last Login
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const RoleIcon = roleIcons[user.role]
                    return (
                      <tr key={user.id} className="border-b border-border last:border-0">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                              <UserCircle className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{user.username}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={cn("capitalize", roleColors[user.role])}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {user.role}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground hidden md:table-cell">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground hidden lg:table-cell">
                          {user.last_login ? new Date(user.last_login).toLocaleString() : "Never"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingUser(user)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(user.id)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user account details.</DialogDescription>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-username">Username</Label>
                  <Input
                    id="edit-username"
                    value={editingUser.username}
                    onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, username: e.target.value } : null))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, email: e.target.value } : null))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select
                    value={editingUser.role}
                    onValueChange={(v) =>
                      setEditingUser((prev) => (prev ? { ...prev, role: v as User["role"] } : null))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="operator">Operator</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditUser}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
