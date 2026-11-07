"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, Database, Shield, Monitor, Volume2, Save, RefreshCw } from "lucide-react"

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    // Notification Settings
    enableAlertSound: true,
    enableDesktopNotifications: true,
    alertVolume: "80",

    // Recognition Settings
    facialConfidenceThreshold: "70",
    gestureConfidenceThreshold: "80",
    enableAutoAlert: true,

    // System Settings
    recordingQuality: "high",
    storageRetention: "30",
    autoBackup: true,

    // API Settings
    apiUrl: "http://localhost:8000",
    apiTimeout: "30",
  })

  const handleSave = () => {
    // In production, save to backend/database
    localStorage.setItem("bantaybuhay_settings", JSON.stringify(settings))
    alert("Settings saved successfully!")
  }

  const handleReset = () => {
    setSettings({
      enableAlertSound: true,
      enableDesktopNotifications: true,
      alertVolume: "80",
      facialConfidenceThreshold: "70",
      gestureConfidenceThreshold: "80",
      enableAutoAlert: true,
      recordingQuality: "high",
      storageRetention: "30",
      autoBackup: true,
      apiUrl: "http://localhost:8000",
      apiTimeout: "30",
    })
  }

  return (
    <div className="min-h-screen">
      <Header title="Settings" subtitle="Configure system preferences" />

      <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Settings
            </CardTitle>
            <CardDescription>Configure how you receive alerts and notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Alert Sound</Label>
                <p className="text-sm text-muted-foreground">Play sound when danger is detected</p>
              </div>
              <Switch
                checked={settings.enableAlertSound}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, enableAlertSound: checked }))}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Desktop Notifications</Label>
                <p className="text-sm text-muted-foreground">Show browser notifications for alerts</p>
              </div>
              <Switch
                checked={settings.enableDesktopNotifications}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, enableDesktopNotifications: checked }))}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Alert Volume
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.alertVolume}
                  onChange={(e) => setSettings((prev) => ({ ...prev, alertVolume: e.target.value }))}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground w-12">{settings.alertVolume}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recognition Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Recognition Settings
            </CardTitle>
            <CardDescription>Configure facial and gesture recognition parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Facial Recognition Threshold (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.facialConfidenceThreshold}
                  onChange={(e) => setSettings((prev) => ({ ...prev, facialConfidenceThreshold: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Minimum confidence to identify a face</p>
              </div>
              <div className="space-y-2">
                <Label>Gesture Recognition Threshold (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.gestureConfidenceThreshold}
                  onChange={(e) => setSettings((prev) => ({ ...prev, gestureConfidenceThreshold: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Minimum confidence to detect a gesture</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Alert on Danger</Label>
                <p className="text-sm text-muted-foreground">Automatically trigger alerts for danger gestures</p>
              </div>
              <Switch
                checked={settings.enableAutoAlert}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, enableAutoAlert: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              System Settings
            </CardTitle>
            <CardDescription>Configure recording and storage options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Recording Quality</Label>
                <Select
                  value={settings.recordingQuality}
                  onValueChange={(v) => setSettings((prev) => ({ ...prev, recordingQuality: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (480p)</SelectItem>
                    <SelectItem value="medium">Medium (720p)</SelectItem>
                    <SelectItem value="high">High (1080p)</SelectItem>
                    <SelectItem value="ultra">Ultra (4K)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Storage Retention (Days)</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={settings.storageRetention}
                  onChange={(e) => setSettings((prev) => ({ ...prev, storageRetention: e.target.value }))}
                />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto Backup</Label>
                <p className="text-sm text-muted-foreground">Automatically backup database daily</p>
              </div>
              <Switch
                checked={settings.autoBackup}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, autoBackup: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* API Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              API Configuration
            </CardTitle>
            <CardDescription>Configure Python backend connection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Backend API URL</Label>
              <Input
                value={settings.apiUrl}
                onChange={(e) => setSettings((prev) => ({ ...prev, apiUrl: e.target.value }))}
                placeholder="http://localhost:8000"
              />
            </div>
            <div className="space-y-2">
              <Label>API Timeout (seconds)</Label>
              <Input
                type="number"
                min="5"
                max="120"
                value={settings.apiTimeout}
                onChange={(e) => setSettings((prev) => ({ ...prev, apiTimeout: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button onClick={handleSave} className="flex-1 md:flex-none">
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  )
}
