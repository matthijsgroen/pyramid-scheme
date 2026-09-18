import { useState } from "react"
import { PyramidExpedition } from "@/app/PyramidExpedition"
import { Base } from "@/app/Base"
import { useJourneys } from "@/app/state/useJourneys"
import { useCarveIndependentBackfill } from "@/app/SiteMap/useCarveIndependentBackfill"
import { FezCompanion } from "./app/fez/FezCompanion"
import { DevelopModeProvider } from "./contexts/DevelopMode"
import PWABadge from "./PWABadge"
import { journeys as allJourneys } from "@/data/journeys"

function App() {
  const [inGame, setInGame] = useState(false)
  const journeys = useJourneys()
  const { activeJourneyId, getJourney, completeLevel, completeJourney, startJourney } = journeys
  // One-time, and it must happen in the release BEFORE any floor is reshaped — see the hook.
  useCarveIndependentBackfill(journeys)

  const journeyInfo = activeJourneyId ? getJourney(activeJourneyId) : null

  const runNr = (journeyInfo?.completionCount ?? 0) + 1

  return (
    <DevelopModeProvider>
      <FezCompanion>
        {!inGame && <Base startGame={() => setInGame(true)} />}
        {inGame && journeyInfo && journeyInfo.journey && (
          <PyramidExpedition
            key={activeJourneyId}
            activeJourney={journeyInfo}
            runNr={runNr}
            onLevelComplete={completeLevel}
            onJourneyComplete={() => {
              completeJourney()
              setInGame(false)
            }}
            onStartJourney={journeyId => {
              const journey = allJourneys.find(j => j.id === journeyId)
              if (!journey) return
              completeJourney()
              startJourney(journey)
            }}
            onClose={() => setInGame(false)}
          />
        )}
        <PWABadge />
      </FezCompanion>
    </DevelopModeProvider>
  )
}

export default App
