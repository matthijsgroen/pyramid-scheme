import { useState } from "react"
import { PyramidExpedition } from "@/app/PyramidExpedition"
import { Base } from "@/app/Base"
import { useJourneys } from "@/app/state/useJourneys"

function App() {
  const [inGame, setInGame] = useState(false)
  const { activeJourney, completeLevel, completeJourney } = useJourneys()

  return (
    <>
      {!inGame && <Base startGame={() => setInGame(true)} />}
      {inGame && activeJourney && (
        <PyramidExpedition
          activeJourney={activeJourney}
          onLevelComplete={completeLevel}
          onJourneyComplete={() => {
            completeJourney()
            setInGame(false)
          }}
          onClose={() => setInGame(false)}
        />
      )}
    </>
  )
}

export default App
