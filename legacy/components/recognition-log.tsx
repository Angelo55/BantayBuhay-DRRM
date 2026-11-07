import { UserCircle, Hand, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface RecognitionLogProps {
  type: "facial" | "gesture"
  name: string
  confidence: number
  timestamp: string
  isDanger?: boolean
  cameraId: number
}

export function RecognitionLog({ type, name, confidence, timestamp, isDanger = false, cameraId }: RecognitionLogProps) {
  const confidenceColor = confidence >= 90 ? "text-green-500" : confidence >= 70 ? "text-yellow-500" : "text-red-500"

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border",
        isDanger ? "border-red-500/50 bg-red-500/10" : "border-border bg-card",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full",
          type === "facial" ? "bg-blue-500/20" : "bg-purple-500/20",
        )}
      >
        {type === "facial" ? (
          <UserCircle className="h-5 w-5 text-blue-500" />
        ) : (
          <Hand className="h-5 w-5 text-purple-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground truncate">{name}</p>
          {isDanger && (
            <Badge variant="destructive" className="text-xs">
              Danger
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <span className={confidenceColor}>{confidence.toFixed(1)}% confidence</span>
          <span>Camera {cameraId}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {new Date(timestamp).toLocaleTimeString()}
      </div>
    </div>
  )
}
