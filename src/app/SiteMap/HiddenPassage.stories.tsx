import type { StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import type { FloorConfig } from "../../game/siteTypes"
import { SiteMapView } from "./SiteMapView"
import { useAssembledFloor } from "./useAssembledFloor"
import { cellAddress, keyOfAddress, sectionOfAddress } from "./cellIdentity"

const SEED = 17
const JOURNEY_ID = "hidden-story"

const config: FloorConfig = {
  pathPuzzles: 2,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  // Pinned so the main path's own treasure can never roll the same mosaicPiece reward as
  // the hidden one below — that coincidence let a demo player "win" on the ordinary path
  // before ever reaching the hidden branch, making the detector look broken.
  mainEndReward: { type: "money", amount: 5 },
  sideSections: [
    { pathPuzzles: 1, difficulty: "expert", end: "treasure" },
    // Hidden branch — tagged hidden:true, masked by useAssembledFloor
    { pathPuzzles: 0, difficulty: "expert", end: "treasure", hidden: true, endReward: { type: "mosaicPiece" } },
  ],
}

// ── Component ─────────────────────────────────────────────────────────────────

const HiddenPassageDemo = ({ detectionLevel }: { detectionLevel: number }) => {
  const [exploredCells, setExploredCells] = useState<Record<string, string[]>>({})
  const [positionKey, setPositionKey] = useState<string | null>(null)
  const [revealedSections, setRevealedSections] = useState<ReadonlySet<string>>(new Set())
  const [mosaicFound, setMosaicFound] = useState(false)

  const { grid, explorerPos, hiddenJunctions, hiddenSections } = useAssembledFloor(
    JOURNEY_ID,
    config,
    SEED,
    0,
    exploredCells,
    positionKey,
    detectionLevel,
    revealedSections
  )

  const stoppedAtHidden =
    detectionLevel >= 1 && grid !== null && hiddenJunctions.has(`${explorerPos[0]},${explorerPos[1]}`)

  const handleClick = (row: number, col: number) => {
    if (!grid) return
    const cell = grid.cells[row]?.[col]
    if (!cell || cell.type === "empty") return
    if (cell.state !== "reachable" && cell.state !== "completed") return

    const address = cellAddress(grid, 0, row, col)
    if (!address) return
    const section = sectionOfAddress(address)
    const key = keyOfAddress(address)

    if (cell.state === "reachable") {
      setExploredCells(prev => {
        const existing = prev[section] ?? []
        if (existing.includes(key)) return prev
        return { ...prev, [section]: [...existing, key] }
      })
      if (cell.type === "room" && cell.reward?.type === "mosaicPiece") {
        setMosaicFound(true)
      }
    }
    setPositionKey(address)
  }

  const handleReveal = () => {
    setRevealedSections(prev => new Set([...prev, ...hiddenSections]))
  }

  const handleReset = () => {
    setExploredCells({})
    setPositionKey(null)
    setRevealedSections(new Set())
    setMosaicFound(false)
  }

  const heading = mosaicFound
    ? "Mosaic piece recovered!"
    : stoppedAtHidden
      ? "Something is behind this wall…"
      : revealedSections.size > 0
        ? "Hidden passage revealed!"
        : "Explore the pyramid"

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-stone-950 p-6">
      <div className="flex w-full max-w-lg flex-col items-center gap-1 text-center">
        <h2
          className={`font-pyramid text-2xl transition-colors duration-300 ${
            mosaicFound
              ? "text-amber-400"
              : stoppedAtHidden
                ? "text-yellow-300"
                : revealedSections.size > 0
                  ? "text-green-300"
                  : "text-amber-300"
          }`}
        >
          {heading}
        </h2>
        <p className="text-sm text-stone-500">
          {mosaicFound
            ? "The ancient mosaic piece joins your collection."
            : stoppedAtHidden
              ? "Your detector stopped you here. Press Reveal to investigate."
              : revealedSections.size > 0
                ? "A hidden chamber is now visible — navigate to the chest inside."
                : detectionLevel >= 1
                  ? "You carry a detector. It will stop you at hidden passages."
                  : "No detector. Navigate normally — hidden passages are invisible."}
        </p>
      </div>

      <div className="flex h-10 items-center">
        {stoppedAtHidden && (
          <button
            onClick={handleReveal}
            className="rounded-lg border border-yellow-700 bg-yellow-950 px-5 py-2 font-pyramid text-sm text-yellow-200 shadow-[0_0_12px_1px_rgba(200,160,0,0.25)] transition hover:bg-yellow-900 active:scale-95"
          >
            ✦ Reveal hidden passage
          </button>
        )}
        {mosaicFound && (
          <span className="font-pyramid text-sm text-amber-400">✦ Mosaic piece added to your collection</span>
        )}
      </div>

      <div
        className={`rounded-xl border transition-all duration-500 ${
          mosaicFound
            ? "border-amber-700 shadow-[0_0_24px_2px_rgba(180,100,0,0.2)]"
            : revealedSections.size > 0
              ? "border-green-800 shadow-[0_0_20px_2px_rgba(0,180,80,0.15)]"
              : stoppedAtHidden
                ? "border-yellow-800 shadow-[0_0_16px_2px_rgba(200,160,0,0.2)]"
                : "border-stone-800"
        }`}
      >
        {grid ? (
          <SiteMapView
            grid={grid}
            onCellClick={handleClick}
            explorerPos={explorerPos}
            className="h-[58vh] w-[58vw] max-w-130"
          />
        ) : (
          <div className="flex h-[58vh] w-[58vw] max-w-130 items-center justify-center text-red-400">
            Assembly failed
          </div>
        )}
      </div>

      <button
        onClick={handleReset}
        className="rounded bg-stone-800 px-4 py-1.5 text-xs text-stone-500 transition hover:bg-stone-700 hover:text-stone-300"
      >
        Reset
      </button>
    </div>
  )
}

export default {
  parameters: { layout: "fullscreen" },
}

export const WithoutDetector: StoryObj = {
  render: () => <HiddenPassageDemo detectionLevel={0} />,
  name: "Without Detector — corner looks normal, player glides through",
}

export const WithDetector: StoryObj = {
  render: () => <HiddenPassageDemo detectionLevel={1} />,
  name: "With Detector — stops at hidden junction, reveals on tap",
}
