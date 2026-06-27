import type { FC } from "react"
import { EntranceTransitionOverlay } from "@/ui/EntranceTransitionOverlay"

export const LevelCompletedOverlay: FC<{ onComplete?: () => void }> = ({ onComplete }) => (
  <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
    {/* Stone door slides away, then circle iris fills the screen */}
    <div className="animate-stone-bg absolute inset-0" />
    <div className="animate-stone-entrance absolute inset-0 bg-stone-700" />
    <EntranceTransitionOverlay origin="50% 65%" delay="1.2s" onComplete={onComplete} />
  </div>
)
