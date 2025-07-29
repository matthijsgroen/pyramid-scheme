import { useState } from "react"
import { Journey } from "./app/Journey"
import { JourneySelection } from "./app/JourneySelection"
import { Laboratory } from "./ui/Laboratory"

const gameSeed = 12345

function App() {
  const [inGame, setInGame] = useState(false)
  const [journeyDialog, setJourneyDialog] = useState(false)
  return (
    <>
      {!inGame && (
        <Laboratory
          map={
            <button
              className="flex aspect-video h-48 items-center justify-center rounded bg-blue-500 text-white"
              onClick={() => setJourneyDialog(true)}
            >
              Travel
            </button>
          }
        />
      )}
      {journeyDialog && (
        <JourneySelection
          onStart={() => {
            setInGame(true)
            setJourneyDialog(false)
          }}
          onCancel={() => setJourneyDialog(false)}
        />
      )}
      {inGame && <Journey gameSeed={gameSeed} />}
    </>
  )
}

export default App
