"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { ResponderList } from "@/components/responder-list"
import { AnalyticsOverview } from "@/components/analytics-overview"
import { IncidentsTable } from "@/components/incidents-table"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Users, AlertTriangle, CheckCircle, Clock } from "lucide-react"

export default function ManagerDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (user && user.role !== "manager") {
      router.push("/dashboard")
    }
  }, [user, router])

  if (user?.role !== "manager") {
    return null
  }

  return (
    <div className="min-h-screen">
      <Header title="Manager Dashboard" subtitle="Manage responders and view incidents" />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/20">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Responders</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-500/20">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Incidents</p>
                  <p className="text-2xl font-bold">1</p>
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
                  <p className="text-sm text-muted-foreground">Resolved Today</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-yellow-500/20">
                  <Clock className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                  <p className="text-2xl font-bold">20m</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics */}
        <AnalyticsOverview />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Responders List */}
          <div className="lg:col-span-1">
            <ResponderList onRefresh={() => setRefreshKey((prev) => prev + 1)} />
          </div>

          {/* Incidents Table */}
          <div className="lg:col-span-2">
            <IncidentsTable />
          </div>
        </div>
      </div>
    </div>
  )
}
