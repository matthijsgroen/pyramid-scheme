import type { FC } from "react"
import { EntranceTransitionOverlay } from "@/ui/EntranceTransitionOverlay"

export const LevelCompletedOverlay: FC<{ onComplete?: () => void }> = ({ onComplete }) => (
  // Circle expands from where the pyramid entrance sits (~65% down the screen)
  <EntranceTransitionOverlay origin="50% 65%" onComplete={onComplete} />
)
