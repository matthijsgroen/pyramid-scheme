import { useState } from "react"
import { Journey } from "./app/Journey"
import { Base } from "./app/Base"

const gameSeed = 12345

function App() {
  const [inGame, setInGame] = useState(false)
  return (
    <>
      {!inGame && <Base startGame={() => setInGame(true)} />}
      {inGame && <Journey gameSeed={gameSeed} />}
    </>
  )
}

export default App
