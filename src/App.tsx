import { useState } from "react"
import { PyramidExpedition } from "@/app/PyramidExpedition"
import { Base } from "@/app/Base"
import { useJourneys } from "@/app/state/useJourneys"
import { TombExpedition } from "./app/TombExpedition"
import { FezCompanion } from "./app/fez/FezCompanion"
import { DevelopModeProvider } from "./contexts/DevelopMode"
import PWABadge from "./PWABadge"

function App() {
  const [inGame, setInGame] = useState(false)
  const { activeJourneyId, getJourney, completeLevel, completeJourney } = useJourneys()

  const journeyInfo = activeJourneyId ? getJourney(activeJourneyId) : null

  const runNr = (journeyInfo?.completionCount ?? 0) + 1

  return (
    <DevelopModeProvider>
      <FezCompanion>
        {!inGame && <Base startGame={() => setInGame(true)} />}
        {inGame && journeyInfo && journeyInfo.journey.type === "pyramid" && (
          <PyramidExpedition
            activeJourney={journeyInfo}
            runNr={runNr}
            onLevelComplete={completeLevel}
            onJourneyComplete={() => {
              completeJourney()
              setInGame(false)
            }}
            onClose={() => setInGame(false)}
          />
        )}
        {inGame && journeyInfo && journeyInfo.journey.type === "treasure_tomb" && (
          <TombExpedition
            activeJourney={journeyInfo}
            onLevelComplete={completeLevel}
            onJourneyComplete={() => {
              completeJourney()
              setInGame(false)
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
