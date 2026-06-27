import { useState, useMemo } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { assembleFloor } from "../../game/siteAssembler"
import { completeCell, getCell } from "../../game/gridNavigation"
import type { FloorGrid, TreasureReward } from "../../game/siteTypes"
import { generatedWorldConfigs } from "../../data/generatedWorld"
import { journeys } from "../../data/journeys"
import type { PyramidJourney } from "../../data/journeys"
import { SiteMapView } from "./SiteMapView"
import { ExplorerDot } from "./ExplorerDot"

// ---------------------------------------------------------------------------
// Journey catalogue derived from journeys.ts
// ---------------------------------------------------------------------------
type Tier = "starter" | "junior" | "expert" | "master" | "wizard"
const TIERS: Tier[] = ["starter", "junior", "expert", "master", "wizard"]

const pyramidJourneys = journeys.filter((j): j is PyramidJourney => j.type === "pyramid")

// { starter: [journey1, journey2, ...], junior: [...], ... }
const byTier: Record<Tier, PyramidJourney[]> = Object.fromEntries(
  TIERS.map(tier => [tier, pyramidJourneys.filter(j => j.difficulty === tier)])
) as Record<Tier, PyramidJourney[]>

const DEFAULT_SEED = 42_195_837

// ---------------------------------------------------------------------------
// Edge helpers (same format as SiteMapScreen)
// ---------------------------------------------------------------------------
const encodeEdge = (floor: number, row: number, col: number) => `${floor}:${row},${col}`
const decodeEdge = (id: string): [number, number, number] => {
  if (id.includes(":")) {
    const [f, pos] = id.split(":")
    const [r, c] = pos.split(",").map(Number)
    return [Number(f), r, c]
  }
  const [r, c] = id.split(",").map(Number)
  return [0, r, c]
}

const applyEdges = (grid: FloorGrid, floor: number, edges: string[]): FloorGrid =>
  edges
    .filter(e => decodeEdge(e)[0] === floor)
    .reduce((g, e) => {
      const [, r, c] = decodeEdge(e)
      return completeCell(g, r, c)
    }, grid)

// ---------------------------------------------------------------------------
// Reward display helpers
// ---------------------------------------------------------------------------
const rewardLabel = (r: TreasureReward): string => {
  switch (r.type) {
    case "hieroglyphFragment":
      return `Fragment: ${r.hieroglyphId}`
    case "tombKey":
      return `Tomb Key: ${r.keyId}`
    case "mosaicPiece":
      return "Mosaic Piece"
    case "mapPiece":
      return "Map Piece"
    case "hieroglyphs":
      return "Hieroglyphs"
  }
}

const rewardColor = (r: TreasureReward): string => {
  switch (r.type) {
    case "hieroglyphFragment":
      return "text-amber-300"
    case "tombKey":
      return "text-purple-300"
    case "mosaicPiece":
      return "text-cyan-300"
    case "mapPiece":
      return "text-green-300"
    case "hieroglyphs":
      return "text-stone-500"
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
type CollectedEntry = { reward: TreasureReward; floor: number }

type Props = {
  tier: Tier
  /** Index within the tier (0-based) */
  journeyIndex: number
  /** Which pyramid in the journey (1-based, up to levelCount) */
  pyramidNumber: number
  seed: number
}

const JourneyInspector = ({ tier, journeyIndex, pyramidNumber, seed }: Props) => {
  const journey = byTier[tier][journeyIndex]
  if (!journey) return <div className="p-4 text-red-400">Journey not found</div>

  const siteConfigs = generatedWorldConfigs[journey.id]
  if (!siteConfigs) return <div className="p-4 text-red-400">No site config for {journey.id}</div>

  // Clamp pyramidNumber to valid range (1-based), then pick the per-pyramid SiteConfig
  const clampedPyramidNumber = Math.min(pyramidNumber, journey.levelCount)
  const siteConfig = siteConfigs[Math.min(clampedPyramidNumber - 1, siteConfigs.length - 1)]
  const pyramidSeed = seed + clampedPyramidNumber

  const [solvedEdges, setSolvedEdges] = useState<string[]>([])
  const [currentFloor, setCurrentFloor] = useState(0)
  const [collected, setCollected] = useState<CollectedEntry[]>([])
  const [explorerPos, setExplorerPos] = useState<readonly [number, number] | null>(null)

  const floorConfig = siteConfig[Math.min(currentFloor, siteConfig.length - 1)]

  const baseGrid = useMemo(
    () => {
      const result = assembleFloor(journey.id, floorConfig, pyramidSeed + currentFloor)
      return result.success ? result.grid : null
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [journey.id, pyramidSeed, currentFloor]
  )

  const grid = useMemo(
    () => (baseGrid ? applyEdges(baseGrid, currentFloor, solvedEdges) : null),
    [baseGrid, currentFloor, solvedEdges]
  )

  const pos: readonly [number, number] = explorerPos ?? grid?.entrancePos ?? [0, 0]

  const handleClick = (row: number, col: number) => {
    if (!grid) return
    const cell = getCell(grid, row, col)
    if (!cell || cell.type !== "room" || cell.state !== "reachable") return

    const edgeId = encodeEdge(currentFloor, row, col)
    setSolvedEdges(prev => [...prev, edgeId])
    setExplorerPos([row, col])

    if (cell.reward) setCollected(prev => [...prev, { reward: cell.reward!, floor: currentFloor }])

    if (cell.roomType === "stairhead") {
      setCurrentFloor(f => f + 1)
      setExplorerPos(null)
    }
  }

  const reset = () => {
    setSolvedEdges([])
    setCurrentFloor(0)
    setCollected([])
    setExplorerPos(null)
  }

  if (!grid) return <div className="p-4 text-red-400">Assembly failed for {journey.id}</div>

  return (
    <div className="flex gap-6 bg-stone-950 p-4 text-stone-200">
      {/* Map */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 text-sm">
          <div>
            <span className="font-bold text-amber-300">{journey.name}</span>
            <span className="ml-2 text-stone-500">
              pyramid {pyramidNumber}/{journey.levelCount}
            </span>
            {siteConfig.length > 1 && (
              <span className="ml-2 text-stone-400">
                · floor {currentFloor + 1}/{siteConfig.length}
              </span>
            )}
          </div>
          <button
            onClick={reset}
            className="ml-auto rounded border border-stone-700 px-2 py-0.5 text-xs text-stone-400 hover:border-stone-500 hover:text-stone-200"
          >
            Reset
          </button>
        </div>
        <div className="relative">
          <SiteMapView grid={grid} onCellClick={handleClick} explorerPos={pos} />
          <ExplorerDot grid={grid} pos={pos} />
        </div>
        <p className="text-xs text-stone-600">Click reachable rooms — puzzles are auto-skipped</p>
      </div>

      {/* Sidebar */}
      <div className="flex w-52 flex-shrink-0 flex-col gap-4">
        {/* Journey info */}
        <div>
          <h3 className="mb-1 text-xs font-bold tracking-wider text-stone-500 uppercase">Journey</h3>
          <div className="text-xs text-stone-400">
            <div>{journey.id}</div>
            <div className="mt-0.5 text-stone-600">{journey.description}</div>
          </div>
        </div>

        {/* Collected rewards */}
        <div>
          <h3 className="mb-1 text-xs font-bold tracking-wider text-stone-500 uppercase">Collected</h3>
          {collected.length === 0 ? (
            <p className="text-xs text-stone-700">None yet</p>
          ) : (
            <ul className="space-y-0.5">
              {collected.map((c, i) => (
                <li key={i} className={`text-xs ${rewardColor(c.reward)}`}>
                  {siteConfig.length > 1 && <span className="text-stone-600">F{c.floor + 1} </span>}
                  {rewardLabel(c.reward)}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Site layout */}
        <div>
          <h3 className="mb-1 text-xs font-bold tracking-wider text-stone-500 uppercase">Site Layout</h3>
          {siteConfig.map((floor, fi) => (
            <div key={fi} className={`mb-2 text-xs ${fi === currentFloor ? "text-stone-200" : "text-stone-600"}`}>
              {siteConfig.length > 1 && <div className="mb-0.5 font-semibold text-stone-400">Floor {fi + 1}</div>}
              <div>Path: {floor.pathPuzzles} puzzles</div>
              {floor.chestEvery && <div>Chest every {floor.chestEvery}</div>}
              {floor.mainEndReward && (
                <div className={rewardColor(floor.mainEndReward)}>End: {rewardLabel(floor.mainEndReward)}</div>
              )}
              {floor.sideSections.map((s, si) => (
                <div key={si} className="mt-0.5 border-l border-stone-700 pl-2 text-stone-500">
                  Branch {si + 1}
                  {s.gate ? ` [${s.gate.type}]` : ""}:{" "}
                  {s.end === "staircase" ? "staircase" : s.endReward ? rewardLabel(s.endReward) : "treasure"}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------
const meta = {
  title: "App/SiteMap/JourneyInspector",
  component: JourneyInspector,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
  argTypes: {
    tier: {
      control: "select",
      options: TIERS,
    },
    journeyIndex: {
      control: { type: "range", min: 0, max: 3, step: 1 },
      description: "Journey within tier (0 = first journey)",
    },
    pyramidNumber: {
      control: { type: "range", min: 1, max: 11, step: 1 },
      description: "Pyramid number within the journey (max depends on levelCount)",
    },
    seed: { control: { type: "number" } },
  },
} satisfies Meta<typeof JourneyInspector>

export default meta

export const Inspector: StoryObj<typeof meta> = {
  args: {
    tier: "starter",
    journeyIndex: 0,
    pyramidNumber: 1,
    seed: DEFAULT_SEED,
  },
}
