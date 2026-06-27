import type { FC } from "react"
import { EntranceTransitionOverlay } from "@/ui/EntranceTransitionOverlay"

export const LevelCompletedOverlay: FC<{ onComplete?: () => void }> = ({ onComplete }) => (
  <div className="pointer-events-none absolute inset-0 z-50">
    <EntranceTransitionOverlay origin="50% 65%" onComplete={onComplete} />
  </div>
)
