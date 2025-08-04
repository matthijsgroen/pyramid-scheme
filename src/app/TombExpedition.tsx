import type { JourneyState } from "@/app/state/useJourneys"
import type { FC } from "react"

export const TombExpedition: FC<{
  activeJourney: JourneyState
  onLevelComplete?: () => void
  onJourneyComplete?: () => void
  onClose?: () => void
}> = () => {
  return (
    <div>
      <p>Tomb Expedition</p>
    </div>
  )
}
