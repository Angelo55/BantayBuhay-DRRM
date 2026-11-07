"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MapPin, Search, Navigation } from "lucide-react"
import type { Location } from "@/types"

export function KabankalanMap() {
  const [locations, setLocations] = useState<Location[]>([])
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)

  useEffect(() => {
    fetch("/api/locations")
      .then((res) => res.json())
      .then((data) => {
        setLocations(data.locations || [])
        setFilteredLocations(data.locations || [])
      })
      .catch((error) => console.error("Failed to fetch locations:", error))
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredLocations(locations)
    } else {
      const filtered = locations.filter(
        (loc) =>
          loc.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          loc.barangay?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          loc.province.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredLocations(filtered)
    }
  }, [searchQuery, locations])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Map Card */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Kabankalan City Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
            <iframe
              title="Kabankalan City Map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d62740.89472842865!2d122.78910795!3d9.986389!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33ae4ec6a5e72e89%3A0x3b3e9c0a9a2a8f0!2sKabankalan%2C%20Negros%20Occidental!5e0!3m2!1sen!2sph!4v1234567890"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {selectedLocation && (
            <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedLocation.barangay || selectedLocation.city}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedLocation.city}, {selectedLocation.province}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Coordinates: {selectedLocation.latitude}, {selectedLocation.longitude}
                  </p>
                </div>
                <Badge>{selectedLocation.marker_type}</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Search & List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search Locations
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search city or barangay..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredLocations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No locations found</p>
            ) : (
              filteredLocations.map((location) => (
                <div
                  key={location.id}
                  onClick={() => setSelectedLocation(location)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                    selectedLocation?.id === location.id ? "bg-accent border-primary" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{location.barangay || location.city}</p>
                      <p className="text-xs text-muted-foreground">
                        {location.city}, {location.province}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {location.marker_type}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card className="lg:col-span-3 bg-blue-500/5 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Coverage Areas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-background rounded-lg border">
              <p className="text-2xl font-bold text-primary">{locations.length}</p>
              <p className="text-sm text-muted-foreground">Total Locations</p>
            </div>
            <div className="p-4 bg-background rounded-lg border">
              <p className="text-2xl font-bold text-green-500">
                {locations.filter((l) => l.marker_type === "station").length}
              </p>
              <p className="text-sm text-muted-foreground">Stations</p>
            </div>
            <div className="p-4 bg-background rounded-lg border">
              <p className="text-2xl font-bold text-blue-500">
                {locations.filter((l) => l.marker_type === "responder").length}
              </p>
              <p className="text-sm text-muted-foreground">Responders</p>
            </div>
            <div className="p-4 bg-background rounded-lg border">
              <p className="text-2xl font-bold text-red-500">
                {locations.filter((l) => l.marker_type === "incident").length}
              </p>
              <p className="text-sm text-muted-foreground">Active Incidents</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
