import { useState } from "react"
import { Journey } from "./app/Journey"
import { Base } from "./app/Base"
import { useJourneys } from "./app/state/useJourneys"

function App() {
  const [inGame, setInGame] = useState(false)
  const { activeJourney, completeLevel, completeJourney } = useJourneys()

  return (
    <>
      {!inGame && <Base startGame={() => setInGame(true)} />}
      {inGame && activeJourney && (
        <Journey
          activeJourney={activeJourney}
          onLevelComplete={completeLevel}
          onJourneyComplete={() => {
            completeJourney()
            setInGame(false)
          }}
        />
      )}
    </>
  )
}

export default App
