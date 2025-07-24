import { useCallback, useEffect, useState } from "react"
import { Level } from "./app/Level"
import { generateLevel } from "./game/generateLevel"
import { generateNewSeed, mulberry32 } from "./game/random"
import { generateLevelSettings } from "./game/generateLevelSettings"
import { clsx } from "clsx"
import { useGameStorage } from "./support/useGameStorage"
import { Backdrop } from "./ui/backdrop"

const gameSeed = 12345

const contentForLevel = (levelNr: number) => {
  const levelSeed = generateNewSeed(gameSeed, levelNr)
  const random = mulberry32(levelSeed)

  const settings = generateLevelSettings(levelNr)
  return generateLevel(settings, random)
}

function App() {
  const [levelNr, setLevelNr] = useState(1)
  const [startNextLevel, setStartNextLevel] = useState(false)

  const levelContent = contentForLevel(levelNr)
  const nextLevelContent = contentForLevel(levelNr + 1)
  const nextNextLevelContent = contentForLevel(levelNr + 2)

  useEffect(() => {
    if (startNextLevel) {
      const stopTimeout = setTimeout(() => {
        setStartNextLevel(false)
        setLevelNr((prev) => prev + 1)
      }, 1000)
      return () => clearTimeout(stopTimeout)
    }
  }, [startNextLevel, setLevelNr])
  const onComplete = useCallback(() => {
    if (startNextLevel) return
    setTimeout(() => {
      setStartNextLevel(true)
    }, 1000)
  }, [startNextLevel])

  return (
    <Backdrop levelNr={levelNr}>
      <h1 className="text-3xl font-bold flex-none mt-0 font-pyramid pt-4">
        Pyramid Level {levelNr}
        <button
          onClick={onComplete}
          className="ml-4 text-sm border rounded p-2"
        >
          Complete Level
        </button>
      </h1>
      <div className="flex-1 w-full flex relative">
        <div
          key={levelNr + 2}
          className={clsx(
            "absolute inset-0 flex-1 flex items-center justify-center pointer-events-none transition-transform duration-1000 ease-in-out",
            startNextLevel
              ? "scale-20 translate-x-[25%]"
              : "scale-0 translate-x-[40%]"
          )}
        >
          <Level key={levelNr + 2} content={nextNextLevelContent} />
        </div>
        <div
          key={levelNr + 1}
          className={clsx(
            "absolute inset-0 flex-1 flex items-center justify-center pointer-events-none transition-transform duration-1000 ease-in-out",
            startNextLevel
              ? "scale-100 translate-x-0"
              : "scale-20 translate-x-[25%]"
          )}
        >
          <Level key={levelNr + 1} content={nextLevelContent} />
        </div>
        <div
          key={levelNr}
          className={clsx(
            "absolute inset-0 flex-1 flex items-center justify-center transition-transform duration-1000 ease-in-out",
            startNextLevel ? "scale-300 translate-x-[-200%]" : "scale-100"
          )}
        >
          <Level key={levelNr} content={levelContent} onComplete={onComplete} />
        </div>
      </div>
    </Backdrop>
  )
}

export default App
