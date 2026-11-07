"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { RecognitionLog } from "@/components/recognition-log"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, UserCircle, Users, UserX, Filter } from "lucide-react"
import type { FacialRecognitionResult } from "@/types"

const mockResults: FacialRecognitionResult[] = [
  {
    id: 1,
    detected_name: "John Doe",
    confidence: 95.5,
    timestamp: new Date().toISOString(),
    camera_id: 1,
    is_known: true,
  },
  {
    id: 2,
    detected_name: "Unknown Person",
    confidence: 45.2,
    timestamp: new Date(Date.now() - 60000).toISOString(),
    camera_id: 2,
    is_known: false,
  },
  {
    id: 3,
    detected_name: "Jane Smith",
    confidence: 88.7,
    timestamp: new Date(Date.now() - 120000).toISOString(),
    camera_id: 1,
    is_known: true,
  },
  {
    id: 4,
    detected_name: "Unknown Person",
    confidence: 32.1,
    timestamp: new Date(Date.now() - 180000).toISOString(),
    camera_id: 3,
    is_known: false,
  },
  {
    id: 5,
    detected_name: "Mike Johnson",
    confidence: 91.3,
    timestamp: new Date(Date.now() - 240000).toISOString(),
    camera_id: 2,
    is_known: true,
  },
  {
    id: 6,
    detected_name: "Sarah Williams",
    confidence: 78.9,
    timestamp: new Date(Date.now() - 300000).toISOString(),
    camera_id: 1,
    is_known: true,
  },
  {
    id: 7,
    detected_name: "Unknown Person",
    confidence: 28.5,
    timestamp: new Date(Date.now() - 360000).toISOString(),
    camera_id: 4,
    is_known: false,
  },
  {
    id: 8,
    detected_name: "David Brown",
    confidence: 94.2,
    timestamp: new Date(Date.now() - 420000).toISOString(),
    camera_id: 3,
    is_known: true,
  },
]

export default function FacialRecognitionPage() {
  const [results] = useState(mockResults)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "known" | "unknown">("all")
  const [filterCamera, setFilterCamera] = useState<string>("all")

  const filteredResults = results.filter((result) => {
    const matchesSearch = result.detected_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType =
      filterType === "all" ||
      (filterType === "known" && result.is_known) ||
      (filterType === "unknown" && !result.is_known)
    const matchesCamera = filterCamera === "all" || result.camera_id === Number.parseInt(filterCamera)
    return matchesSearch && matchesType && matchesCamera
  })

  const knownCount = results.filter((r) => r.is_known).length
  const unknownCount = results.filter((r) => !r.is_known).length
  const avgConfidence = results.reduce((acc, r) => acc + r.confidence, 0) / results.length

  return (
    <div className="min-h-screen">
      <Header title="Facial Recognition" subtitle="View and manage facial detection results" />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/20">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Detections</p>
                  <p className="text-2xl font-bold text-foreground">{results.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/20">
                  <UserCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Known Faces</p>
                  <p className="text-2xl font-bold text-foreground">{knownCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-500/20">
                  <UserX className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unknown Faces</p>
                  <p className="text-2xl font-bold text-foreground">{unknownCount}</p>
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
                  placeholder="Search by name..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Faces</SelectItem>
                  <SelectItem value="known">Known Only</SelectItem>
                  <SelectItem value="unknown">Unknown Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCamera} onValueChange={setFilterCamera}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Camera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cameras</SelectItem>
                  <SelectItem value="1">Camera 1</SelectItem>
                  <SelectItem value="2">Camera 2</SelectItem>
                  <SelectItem value="3">Camera 3</SelectItem>
                  <SelectItem value="4">Camera 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Detection Results</CardTitle>
              <Badge variant="secondary">{filteredResults.length} results</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No results found matching your filters.</div>
            ) : (
              filteredResults.map((result) => (
                <RecognitionLog
                  key={result.id}
                  type="facial"
                  name={result.detected_name}
                  confidence={result.confidence}
                  timestamp={result.timestamp}
                  cameraId={result.camera_id}
                  isDanger={!result.is_known}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
