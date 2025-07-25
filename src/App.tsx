import { useCallback, useEffect, useState } from "react"
import { Level } from "./app/Level"
import { generateLevel } from "./game/generateLevel"
import { generateNewSeed, mulberry32 } from "./game/random"
import { generateLevelSettings } from "./game/generateLevelSettings"
import { clsx } from "clsx"
import { useGameStorage } from "./support/useGameStorage"
import { Backdrop } from "./ui/Backdrop"
import { getLevelWidth } from "./game/state"
import { dayNightCycleStep } from "./ui/backdropSelection"

const gameSeed = 12345

const contentForLevel = (levelNr: number) => {
  const levelSeed = generateNewSeed(gameSeed, levelNr)
  const random = mulberry32(levelSeed)

  const settings = generateLevelSettings(levelNr)
  return generateLevel(levelNr, settings, random)
}
const debug = false

function App() {
  const [levelNr, setLevelNr] = useGameStorage("levelNr", 1)
  const [startNextLevel, setStartNextLevel] = useState(false)

  const levelContent = contentForLevel(levelNr)
  const nextLevelContent = contentForLevel(levelNr + 1)
  const nextNextLevelContent = contentForLevel(levelNr + 2)

  const width = getLevelWidth(levelContent.pyramid.floorCount)

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
      <h1
        className={clsx(
          " absolute top-0 left-0 right-0 text-3xl font-bold flex-none mt-0 font-pyramid pt-4 text-center pointer-events-none",
          dayNightCycleStep(levelNr) < 6 ? "text-black" : "text-white"
        )}
      >
        Pyramid Level {levelNr}{" "}
      </h1>
      {debug && (
        <div className="flex flex-row gap-2 text-slate-400">
          <button onClick={() => setLevelNr((x) => x - 1)}>Previous</button>
          <button onClick={() => setLevelNr((x) => x + 1)}>Next</button>
        </div>
      )}
      <div className="flex-1 w-full flex overflow-scroll overscroll-contain">
        <div
          className="relative min-w-(--level-width) w-full h-full min-h-(--level-height)"
          style={{
            "--level-width": `calc(var(--spacing) * 15 * ${width + 2})`,
            "--level-height": `calc(var(--spacing) * 10 * ${levelContent.pyramid.floorCount + 2})`,
          }}
        >
          <div
            key={levelNr + 2}
            className={clsx(
              "absolute inset-0 flex-1 flex items-center justify-center pointer-events-none transition-transform duration-1000 ease-in-out",
              startNextLevel
                ? "scale-20 translate-x-[25%] blur-xs"
                : "scale-0 translate-x-[35%] blur-sm"
            )}
          >
            <Level key={levelNr + 2} content={nextNextLevelContent} />
          </div>
          <div
            key={levelNr + 1}
            className={clsx(
              "absolute inset-0 flex-1 flex items-center justify-center pointer-events-none transition-transform duration-1000 ease-in-out",
              startNextLevel
                ? "scale-100 translate-x-0 blur-none"
                : "scale-20 translate-x-[25%] blur-xs"
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
            <Level
              key={levelNr}
              content={levelContent}
              onComplete={onComplete}
            />
          </div>
        </div>
      </div>
    </Backdrop>
  )
}

export default App
