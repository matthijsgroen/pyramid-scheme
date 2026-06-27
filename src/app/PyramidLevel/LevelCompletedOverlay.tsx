import type { FC } from "react"
import { EntranceTransitionOverlay } from "@/ui/EntranceTransitionOverlay"

// The pyramid's entrance block slides open (animate-stone-entrance, 1s delay + 1.8s slide = 2.8s).
// Circle iris starts at 2.5s so it begins just before the stone finishes, then covers the screen.
export const LevelCompletedOverlay: FC<{ onComplete?: () => void }> = ({ onComplete }) => (
  <div className="pointer-events-none absolute inset-0 z-50">
    <EntranceTransitionOverlay origin="50% 65%" delay="2.5s" onComplete={onComplete} />
  </div>
)
