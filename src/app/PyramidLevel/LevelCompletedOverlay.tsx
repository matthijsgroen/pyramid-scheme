import type { FC } from "react"
import { EntranceTransitionOverlay } from "@/ui/EntranceTransitionOverlay"

export const LevelCompletedOverlay: FC<{ onComplete?: () => void }> = ({ onComplete }) => (
  <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
    {/* Stone slides immediately (1.8s), then circle iris expands (starts at 2s) */}
    <div className="animate-stone-bg absolute inset-0" style={{ animationDelay: "0s" }} />
    <div className="animate-stone-entrance absolute inset-0 bg-stone-700" style={{ animationDelay: "0s" }} />
    <EntranceTransitionOverlay origin="50% 65%" delay="2s" onComplete={onComplete} />
  </div>
)
