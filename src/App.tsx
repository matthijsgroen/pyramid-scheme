import { useState } from "react"
import { PyramidExpedition } from "@/app/PyramidExpedition"
import { Base } from "@/app/Base"
import { useJourneys } from "@/app/state/useJourneys"
import { TombExpedition } from "./app/TombExpedition"
import { FezCompanion } from "./app/fez/FezCompanion"
import { DevelopModeProvider } from "./contexts/DevelopMode"

function App() {
  const [inGame, setInGame] = useState(false)
  const { activeJourney, journeyLog, completeLevel, completeJourney } =
    useJourneys()

  const runNr = journeyLog.filter(
    (log) => log.journeyId === activeJourney?.journeyId && log.completed
  ).length

  return (
    <DevelopModeProvider>
      <FezCompanion>
        {!inGame && <Base startGame={() => setInGame(true)} />}
        {inGame &&
          activeJourney &&
          activeJourney.journey.type === "pyramid" && (
            <PyramidExpedition
              activeJourney={activeJourney}
              runNr={runNr}
              onLevelComplete={completeLevel}
              onJourneyComplete={() => {
                completeJourney()
                setInGame(false)
              }}
              onClose={() => setInGame(false)}
            />
          )}
        {inGame &&
          activeJourney &&
          activeJourney.journey.type === "treasure_tomb" && (
            <TombExpedition
              activeJourney={activeJourney}
              onLevelComplete={completeLevel}
              onJourneyComplete={() => {
                completeJourney()
                setInGame(false)
              }}
              onClose={() => setInGame(false)}
            />
          )}
      </FezCompanion>
    </DevelopModeProvider>
  )
}

export default App
