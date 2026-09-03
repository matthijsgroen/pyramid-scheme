import { useMemo, useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { assembleFloor } from "../../game/siteAssembler"
import { completeCell, getCell } from "../../game/gridNavigation"
import type { Difficulty, FloorConfig, FloorGrid, GateConfig, SideSection, SiteConfig } from "../../game/siteTypes"
import { SiteMapView } from "./SiteMapView"

type GateOption = "none" | GateConfig["type"]

const DIFFICULTIES: Difficulty[] = ["starter", "junior", "expert", "master", "wizard"]

type Props = {
  seed: number
  difficulty: Difficulty
  pathPuzzles: number
  exitOrStaircase: FloorConfig["exitOrStaircase"]
  corridorStraightness: number
  packing: number
  section1: boolean
  section1Difficulty: Difficulty
  section1Puzzles: number
  section1End: SideSection["end"]
  section1Gate: GateOption
  section2: boolean
  section2Difficulty: Difficulty
  section2Puzzles: number
  section2End: SideSection["end"]
  section2Gate: GateOption
}

const SiteMapBuilder = ({
  seed,
  difficulty,
  pathPuzzles,
  exitOrStaircase,
  corridorStraightness,
  packing,
  section1,
  section1Difficulty,
  section1Puzzles,
  section1End,
  section1Gate,
  section2,
  section2Difficulty,
  section2Puzzles,
  section2End,
  section2Gate,
}: Props) => {
  // A real ward key is `<difficulty>_a_<n>`, so a tomb-key gate uses its section's own tier — the
  // map then tints the gate by that difficulty, exactly as in the generated world.
  const toGate = (opt: GateOption, difficulty: Difficulty): GateConfig | undefined =>
    opt === "none"
      ? undefined
      : opt === "floor-key"
        ? { type: "floor-key" }
        : { type: "tomb-key", wardKeyId: `${difficulty}_a_1` }

  const sideSections: SideSection[] = []
  if (section1)
    sideSections.push({
      pathPuzzles: section1Puzzles,
      difficulty: section1Difficulty,
      end: section1End,
      gate: toGate(section1Gate, section1Difficulty),
    })
  if (section2)
    sideSections.push({
      pathPuzzles: section2Puzzles,
      difficulty: section2Difficulty,
      end: section2End,
      gate: toGate(section2Gate, section2Difficulty),
    })

  const config: FloorConfig = {
    pathPuzzles,
    difficulty,
    end: "treasure",
    exitOrStaircase,
    sideSections,
    corridorStraightness,
    packing,
  }

  const result = assembleFloor("builder", config, seed)
  if (!result.success) {
    return (
      <div className="p-4 font-mono text-sm text-red-400">
        Assembly failed:
        <ul className="mt-1 list-disc pl-4">
          {result.reasons.map((r, i) => (
            <li key={i}>{JSON.stringify(r)}</li>
          ))}
        </ul>
      </div>
    )
  }
  return <SiteMapView grid={result.grid} revealAllCells className="max-h-[80vh] max-w-[90vw]" />
}

const meta = {
  component: SiteMapBuilder,
  parameters: { layout: "centered" },
  argTypes: {
    seed: { control: { type: "number" } },
    // The five ranks, so a floor can be built out of any combination of stone. A floor routinely shows two
    // or three at once — the material follows each SECTION, not the floor — and a seam is where a rank's
    // art has to hold up against its neighbour's.
    difficulty: { control: "select", options: DIFFICULTIES },
    section1Difficulty: { control: "select", options: DIFFICULTIES },
    section2Difficulty: { control: "select", options: DIFFICULTIES },
    pathPuzzles: { control: { type: "range", min: 0, max: 5, step: 1 } },
    exitOrStaircase: { control: "select", options: ["exit", "staircase"] },
    corridorStraightness: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    packing: { control: { type: "range", min: 0.3, max: 2, step: 0.1 } },
    section1: { control: "boolean" },
    section1Puzzles: { control: { type: "range", min: 0, max: 4, step: 1 } },
    section1End: { control: "select", options: ["treasure", "staircase"] },
    section1Gate: { control: "select", options: ["none", "floor-key", "tomb-key"] },
    section2: { control: "boolean" },
    section2Puzzles: { control: { type: "range", min: 0, max: 4, step: 1 } },
    section2End: { control: "select", options: ["treasure", "staircase"] },
    section2Gate: { control: "select", options: ["none", "floor-key", "tomb-key"] },
  },
} satisfies Meta<typeof SiteMapBuilder>

export default meta
type Story = StoryObj<typeof meta>

export const Builder: Story = {
  args: {
    seed: 1,
    difficulty: "starter",
    pathPuzzles: 0,
    exitOrStaircase: "exit",
    corridorStraightness: 0.65,
    packing: 1,
    section1: true,
    section1Difficulty: "starter",
    section1Puzzles: 0,
    section1End: "treasure",
    section1Gate: "none",
    section2: true,
    section2Difficulty: "junior",
    section2Puzzles: 1,
    section2End: "staircase",
    section2Gate: "floor-key",
  },
}

/**
 * Three ranks on one floor, which is the case a rank's art has to survive: the material follows each
 * SECTION rather than the floor, so a gate can put one tomb's stone against another's across a single
 * doorway. Over the generated world twenty of fifty-six sampled floors are multi-tier.
 */
export const RankSeams: Story = {
  args: {
    seed: 3,
    difficulty: "starter",
    pathPuzzles: 1,
    exitOrStaircase: "staircase",
    corridorStraightness: 0.65,
    packing: 1,
    section1: true,
    section1Difficulty: "junior",
    section1Puzzles: 1,
    section1End: "treasure",
    section1Gate: "floor-key",
    section2: true,
    section2Difficulty: "expert",
    section2Puzzles: 1,
    section2End: "staircase",
    section2Gate: "tomb-key",
  },
  parameters: { layout: "fullscreen" },
}

/** Dedicated demo for dialing the two layout knobs against a fixed amount of content:
 * `packing` (grid footprint tightness) and `corridorStraightness` (corridor turniness). */
export const PackingAndStraightness: Story = {
  args: {
    seed: 7,
    difficulty: "starter",
    pathPuzzles: 4,
    exitOrStaircase: "exit",
    corridorStraightness: 0.65,
    packing: 1,
    section1: true,
    section1Difficulty: "starter",
    section1Puzzles: 2,
    section1End: "treasure",
    section1Gate: "none",
    section2: true,
    section2Difficulty: "junior",
    section2Puzzles: 2,
    section2End: "staircase",
    section2Gate: "floor-key",
  },
  parameters: { layout: "fullscreen" },
}

export const FirstPyramid: Story = {
  args: {
    seed: 42,
    difficulty: "starter",
    pathPuzzles: 0,
    exitOrStaircase: "exit",
    corridorStraightness: 0.65,
    packing: 1,
    section1: true,
    section1Difficulty: "starter",
    section1Puzzles: 0,
    section1End: "treasure",
    section1Gate: "none",
    section2: true,
    section2Difficulty: "junior",
    section2Puzzles: 1,
    section2End: "staircase",
    section2Gate: "floor-key",
  },
}

// Interactive: click rooms to "complete" them and watch fog-of-war reveal paths
const InteractiveFirstPyramid = () => {
  const config: FloorConfig = {
    pathPuzzles: 0,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [
      { pathPuzzles: 0, difficulty: "starter", end: "treasure" },
      { pathPuzzles: 1, difficulty: "junior", end: "staircase", gate: { type: "floor-key" } },
    ],
  }
  const result = assembleFloor("demo", config, 42)

  const [grid, setGrid] = useState<FloorGrid | null>(result.success ? result.grid : null)

  if (!grid) return <div className="p-4 text-red-400">Assembly failed</div>

  const handleClick = (row: number, col: number) => {
    setGrid(prev => (prev ? completeCell(prev, row, col) : prev))
  }

  return (
    <div className="flex flex-col gap-2">
      <SiteMapView grid={grid} onCellClick={handleClick} />
      <button
        className="rounded bg-amber-900 px-3 py-1 text-xs text-amber-200 hover:bg-amber-800"
        onClick={() => {
          if (result.success) setGrid(result.grid)
        }}
      >
        Reset
      </button>
    </div>
  )
}

export const Interactive: StoryObj = {
  render: () => <InteractiveFirstPyramid />,
  parameters: { layout: "centered" },
}

// ── Multi-floor explorer ───────────────────────────────────────────────────────

const MultiFloorExplorer = ({ siteConfig, seed }: { siteConfig: SiteConfig; seed: number }) => {
  const [floorIdx, setFloorIdx] = useState(0)
  const [edges, setEdges] = useState<string[]>([])

  const baseGrid = useMemo(
    () => assembleFloor("story", siteConfig[floorIdx], seed + floorIdx),
    [siteConfig, floorIdx, seed]
  )

  const grid = useMemo(() => {
    if (!baseGrid.success) return null
    return edges
      .filter(e => e.startsWith(`${floorIdx}:`))
      .reduce((g, e) => {
        const [, rc] = e.split(":")
        const [r, c] = rc.split(",").map(Number)
        return completeCell(g, r, c)
      }, baseGrid.grid)
  }, [baseGrid, edges, floorIdx])

  const handleClick = (row: number, col: number) => {
    const edge = `${floorIdx}:${row},${col}`
    setEdges(prev => (prev.includes(edge) ? prev : [...prev, edge]))
    const cell = grid && getCell(grid, row, col)
    if (cell?.type === "room" && cell.roomType === "portal" && cell.stairId && floorIdx < siteConfig.length - 1)
      setFloorIdx(f => f + 1)
  }

  if (!baseGrid.success)
    return <div className="p-4 font-mono text-sm text-red-400">Assembly failed: {JSON.stringify(baseGrid.reasons)}</div>

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4 font-mono text-sm text-amber-300">
        <button
          className="rounded bg-amber-900 px-3 py-1 text-amber-200 hover:bg-amber-800 disabled:opacity-30"
          disabled={floorIdx === 0}
          onClick={() => setFloorIdx(f => f - 1)}
        >
          ↑ Up
        </button>
        <span>
          Floor {floorIdx + 1} / {siteConfig.length}
        </span>
        <button
          className="rounded bg-amber-900 px-3 py-1 text-amber-200 hover:bg-amber-800 disabled:opacity-30"
          disabled={floorIdx === siteConfig.length - 1}
          onClick={() => setFloorIdx(f => f + 1)}
        >
          ↓ Down
        </button>
        <button
          className="rounded bg-stone-800 px-3 py-1 text-stone-400 hover:bg-stone-700"
          onClick={() => {
            setEdges([])
            setFloorIdx(0)
          }}
        >
          Reset
        </button>
      </div>
      {grid && <SiteMapView grid={grid} onCellClick={handleClick} className="max-h-[80vh] max-w-[90vw]" />}
    </div>
  )
}

// Dense floor: 6 main puzzles, 5 keyed side paths + 1 key-holder path
const denseFloorConfig: FloorConfig = {
  pathPuzzles: 6,
  difficulty: "wizard",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 0, difficulty: "wizard", end: "treasure" }, // ungated: holds all keys
    { pathPuzzles: 3, difficulty: "wizard", end: "treasure", gate: { type: "floor-key", color: "blue" } },
    { pathPuzzles: 3, difficulty: "wizard", end: "treasure", gate: { type: "floor-key", color: "red" } },
    { pathPuzzles: 3, difficulty: "wizard", end: "treasure", gate: { type: "floor-key", color: "green" } },
    { pathPuzzles: 2, difficulty: "wizard", end: "treasure", gate: { type: "floor-key", color: "yellow" } },
    { pathPuzzles: 2, difficulty: "wizard", end: "treasure", gate: { type: "floor-key", color: "purple" } },
  ],
}

const DenseFloorDemo = () => {
  const result = useMemo(() => assembleFloor("dense", denseFloorConfig, 2), [])

  if (!result.success) return <div className="p-4 text-red-400">Assembly failed: {JSON.stringify(result.reasons)}</div>

  return <SiteMapView grid={result.grid} revealAllCells className="max-h-[90vh] max-w-[90vw]" />
}

export const DensePuzzlesAndKeys: StoryObj = {
  render: () => <DenseFloorDemo />,
  parameters: { layout: "fullscreen" },
}

export const TwoFloorLayout: StoryObj = {
  render: () => (
    <MultiFloorExplorer
      seed={1}
      siteConfig={[
        {
          // Floor 1: direct path to treasure, junior-key gate to staircase (floor 2)
          pathPuzzles: 0,
          difficulty: "starter",
          end: "treasure",
          exitOrStaircase: "exit",
          sideSections: [
            {
              gate: { type: "tomb-key", wardKeyId: "junior_ward" },
              pathPuzzles: 0,
              difficulty: "starter",
              end: "staircase",
            },
          ],
        },
        {
          // Floor 2: junior puzzles + two side branches (one with puzzle, one direct chest)
          pathPuzzles: 3,
          difficulty: "junior",
          end: "treasure",
          exitOrStaircase: "exit",
          sideSections: [
            { pathPuzzles: 1, difficulty: "junior", end: "treasure" },
            { pathPuzzles: 0, difficulty: "junior", end: "treasure" },
          ],
        },
      ]}
    />
  ),
  parameters: { layout: "centered" },
}
