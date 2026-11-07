"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import {
  LayoutDashboard,
  Camera,
  Bell,
  LogOut,
  Shield,
  UserCircle,
  Menu,
  X,
  Activity,
  Users,
  Settings,
  Scan,
  Hand,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

const responderNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Facial Recognition", href: "/dashboard/facial-recognition", icon: Scan },
  { name: "Gesture Recognition", href: "/dashboard/gesture-recognition", icon: Hand },
  { name: "Face Registration", href: "/dashboard/face-registration", icon: Camera },
  { name: "Alerts", href: "/dashboard/alerts", icon: Bell },
  { name: "Activity Logs", href: "/dashboard/logs", icon: Activity },
]

const managerNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Manager Hub", href: "/dashboard/manager", icon: Users },
  { name: "Map", href: "/dashboard/map", icon: Activity },
  { name: "Managers", href: "/dashboard/managers", icon: Shield },
  { name: "Alerts", href: "/dashboard/alerts", icon: Bell },
  { name: "Activity Logs", href: "/dashboard/logs", icon: Activity },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navigation = user?.role === "manager" ? managerNavigation : responderNavigation

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 bg-card border-r border-border transition-transform duration-300",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">BantayBuhay</h1>
              <p className="text-xs text-muted-foreground">
                {user?.role === "manager" ? "Manager Portal" : "Responder Portal"}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                <UserCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.username || "User"}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full justify-start gap-2 bg-transparent" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
