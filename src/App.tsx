import { useState } from "react"
import { PyramidExpedition } from "@/app/PyramidExpedition"
import { Base } from "@/app/Base"
import { useJourneys } from "@/app/state/useJourneys"
import { TombExpedition } from "./app/TombExpedition"
import { FezCompanion } from "./app/fez/FezCompanion"
import { DevelopModeProvider } from "./contexts/DevelopMode"
import PWABadge from "./PWABadge"
import type { Difficulty } from "@/data/difficultyLevels"
import { journeys as allJourneys, type TreasureTombJourney } from "@/data/journeys"

function App() {
  const [inGame, setInGame] = useState(false)
  const [pendingHieroglyphSearch, setPendingHieroglyphSearch] = useState<Difficulty | null>(null)
  const { activeJourneyId, getJourney, completeLevel, completeJourney, cancelJourney, startJourney } = useJourneys()

  const journeyInfo = activeJourneyId ? getJourney(activeJourneyId) : null

  const runNr = (journeyInfo?.completionCount ?? 0) + 1

  return (
    <DevelopModeProvider>
      <FezCompanion>
        {!inGame && (
          <Base
            startGame={() => {
              setInGame(true)
              setPendingHieroglyphSearch(null)
            }}
            pendingHieroglyphSearch={pendingHieroglyphSearch}
          />
        )}
        {inGame && journeyInfo && journeyInfo.journey.type === "pyramid" && (
          <PyramidExpedition
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
        {inGame && journeyInfo && journeyInfo.journey.type === "treasure_tomb" && (
          <TombExpedition
            activeJourney={journeyInfo}
            onLevelComplete={completeLevel}
            onJourneyComplete={() => {
              completeJourney()
              setInGame(false)
            }}
            onClose={() => setInGame(false)}
            onFindHieroglyphs={() => {
              const difficulty = (journeyInfo.journey as TreasureTombJourney).difficulty
              cancelJourney()
              setPendingHieroglyphSearch(difficulty)
              setInGame(false)
            }}
          />
        )}
        <PWABadge />
      </FezCompanion>
    </DevelopModeProvider>
  )
}

export default App
