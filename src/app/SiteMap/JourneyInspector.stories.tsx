import { useState, useMemo } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { assembleFloor } from "../../game/siteAssembler"
import { completeCell, getCell } from "../../game/gridNavigation"
import type { FloorGrid, TreasureReward } from "../../game/siteTypes"
import { generatedWorldConfigs } from "../../data/generatedWorld"
import { journeys } from "../../data/journeys"
import type { PyramidJourney, TreasureTombJourney } from "../../data/journeys"
import { SiteMapView } from "./SiteMapView"
import { ExplorerDot } from "./ExplorerDot"
import type { FloorConfig } from "../../game/siteTypes"

// ---------------------------------------------------------------------------
// Journey catalogue derived from journeys.ts
// ---------------------------------------------------------------------------
type Tier = "starter" | "junior" | "expert" | "master" | "wizard"
const TIERS: Tier[] = ["starter", "junior", "expert", "master", "wizard"]

const pyramidJourneys = journeys.filter((j): j is PyramidJourney => j.type === "pyramid")
const tombJourneys = journeys.filter((j): j is TreasureTombJourney => j.type === "treasure_tomb")

// { starter: [journey1, journey2, ...], junior: [...], ... }
const byTier: Record<Tier, PyramidJourney[]> = Object.fromEntries(
  TIERS.map(tier => [tier, pyramidJourneys.filter(j => j.difficulty === tier)])
) as Record<Tier, PyramidJourney[]>

// Tomb IDs start with their tier name (e.g. "expert_treasure_tomb")
const tombsByTier: Record<Tier, TreasureTombJourney[]> = Object.fromEntries(
  TIERS.map(tier => [tier, tombJourneys.filter(j => j.id.startsWith(`${tier}_`))])
) as Record<Tier, TreasureTombJourney[]>

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
      return `Map Piece → ${r.tombId}`
    case "locationKey":
      return `Location Key → ${r.tombJourneyId}`
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
    case "locationKey":
      return "text-teal-300"
    case "hieroglyphs":
      return "text-stone-500"
  }
}

// ---------------------------------------------------------------------------
// Puzzle/chest breakdown for a floor
// ---------------------------------------------------------------------------
const FloorDetail = ({ floor, active }: { floor: FloorConfig; active: boolean }) => {
  const chestPositions: number[] = []
  if (floor.chestEvery && floor.chestEvery > 0) {
    for (let p = 1; p <= floor.pathPuzzles; p++) {
      if (p % floor.chestEvery === 0) chestPositions.push(p)
    }
  }

  return (
    <div className={`mb-3 text-xs ${active ? "text-stone-200" : "text-stone-600"}`}>
      <div className="mb-1 flex gap-2">
        <span className="font-semibold text-stone-400">{floor.puzzleFamily ?? "sumplete"}</span>
        <span className="text-stone-500">{floor.difficulty}</span>
      </div>
      <div>
        {Array.from({ length: floor.pathPuzzles }, (_, i) => {
          const puzzleNum = i + 1
          const hasChest = chestPositions.includes(puzzleNum)
          const chestIdx = chestPositions.indexOf(puzzleNum)
          const chest = hasChest ? (floor.chestRewards?.[chestIdx] ?? { type: "hieroglyphs" as const }) : null
          return (
            <div key={i} className="flex items-baseline gap-1">
              <span className="w-4 shrink-0 text-stone-600">{puzzleNum}.</span>
              <span className="text-stone-500">puzzle</span>
              {chest && <span className={`ml-1 ${rewardColor(chest)}`}>+ {rewardLabel(chest)}</span>}
            </div>
          )
        })}
        {floor.mainEndReward && (
          <div className={`mt-0.5 font-semibold ${rewardColor(floor.mainEndReward)}`}>
            ↳ {rewardLabel(floor.mainEndReward)}
          </div>
        )}
        {floor.sideSections.map((s, si) => (
          <div key={si} className="mt-1 border-l-2 border-stone-700 pl-2">
            <span className="text-stone-500">
              Branch {si + 1}
              {s.gate ? ` [${s.gate.type}]` : ""}: {s.pathPuzzles} puzzles
            </span>
            {s.endReward && <span className={`ml-1 ${rewardColor(s.endReward)}`}>→ {rewardLabel(s.endReward)}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
type CollectedEntry = { reward: TreasureReward; floor: number }

type Props = {
  journeyType: "pyramid" | "tomb"
  tier: Tier
  /** Index within the tier (0-based) */
  journeyIndex: number
  /** Which pyramid in the journey (1-based, up to levelCount) */
  pyramidNumber: number
  seed: number
}

const JourneyInspector = ({ journeyType, tier, journeyIndex, pyramidNumber, seed }: Props) => {
  const journeyList = journeyType === "tomb" ? tombsByTier[tier] : byTier[tier]
  const journey = journeyList[journeyIndex]
  if (!journey) return <div className="p-4 text-red-400">Journey not found</div>

  const siteConfigs = generatedWorldConfigs[journey.id]
  if (!siteConfigs) return <div className="p-4 text-red-400">No site config for {journey.id}</div>

  const clampedPyramidNumber = Math.min(pyramidNumber, journey.levelCount)
  const siteConfig = siteConfigs[Math.min(clampedPyramidNumber - 1, siteConfigs.length - 1)]
  const pyramidSeed = seed + clampedPyramidNumber

  const [solvedEdges, setSolvedEdges] = useState<string[]>([])
  const [currentFloor, setCurrentFloor] = useState(0)
  const [collected, setCollected] = useState<CollectedEntry[]>([])
  const [explorerPos, setExplorerPos] = useState<readonly [number, number] | null>(null)
  const [revealAll, setRevealAll] = useState(false)

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
    if (!grid || revealAll) return
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
    setRevealAll(false)
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
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setRevealAll(v => !v)}
              className={`rounded border px-2 py-0.5 text-xs ${
                revealAll
                  ? "border-amber-600 text-amber-300"
                  : "border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200"
              }`}
            >
              {revealAll ? "Revealed" : "Reveal All"}
            </button>
            <button
              onClick={reset}
              className="rounded border border-stone-700 px-2 py-0.5 text-xs text-stone-400 hover:border-stone-500 hover:text-stone-200"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="relative">
          <SiteMapView grid={grid} onCellClick={handleClick} explorerPos={pos} revealAllCells={revealAll} />
          <ExplorerDot grid={grid} pos={pos} />
        </div>
        <p className="text-xs text-stone-600">
          {revealAll
            ? "Full map revealed — click Reveal All to toggle"
            : "Click reachable rooms — puzzles are auto-skipped"}
        </p>
      </div>

      {/* Sidebar */}
      <div className="flex w-60 flex-shrink-0 flex-col gap-4">
        {/* Journey info */}
        <div>
          <h3 className="mb-1 text-xs font-bold tracking-wider text-stone-500 uppercase">Journey</h3>
          <div className="text-xs text-stone-400">
            <div>{journey.id}</div>
            <div className="mt-0.5 text-stone-600">{journey.description}</div>
          </div>
        </div>

        {/* Floor breakdown — puzzle types, chests, rewards */}
        <div>
          <h3 className="mb-1 text-xs font-bold tracking-wider text-stone-500 uppercase">
            {siteConfig.length > 1 ? "Floors" : "Layout"}
          </h3>
          {siteConfig.map((floor, fi) => (
            <div key={fi}>
              {siteConfig.length > 1 && (
                <div
                  className={`mb-0.5 text-xs font-semibold ${fi === currentFloor ? "text-amber-300" : "text-stone-500"}`}
                >
                  Floor {fi + 1}
                </div>
              )}
              <FloorDetail floor={floor} active={fi === currentFloor || siteConfig.length === 1} />
            </div>
          ))}
        </div>

        {/* Collected rewards (manual exploration mode) */}
        {!revealAll && (
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
        )}
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
    journeyType: {
      control: "select",
      options: ["pyramid", "tomb"],
    },
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
    journeyType: "pyramid",
    tier: "starter",
    journeyIndex: 0,
    pyramidNumber: 1,
    seed: DEFAULT_SEED,
  },
}

export const TombInspector: StoryObj<typeof meta> = {
  args: {
    journeyType: "tomb",
    tier: "starter",
    journeyIndex: 0,
    pyramidNumber: 1,
    seed: DEFAULT_SEED,
  },
}
