import { useMemo, useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { assembleFloor } from "../../game/siteAssembler"
import { completeCell, getCell } from "../../game/gridNavigation"
import type { FloorConfig, FloorGrid, GateConfig, SideSection, SiteConfig } from "../../game/siteTypes"
import { SiteMapView } from "./SiteMapView"

type GateOption = "none" | GateConfig["type"]

type Props = {
  seed: number
  pathPuzzles: number
  chestEvery: number
  exitOrStaircase: FloorConfig["exitOrStaircase"]
  section1: boolean
  section1Puzzles: number
  section1ChestEvery: number
  section1End: SideSection["end"]
  section1Gate: GateOption
  section2: boolean
  section2Puzzles: number
  section2ChestEvery: number
  section2End: SideSection["end"]
  section2Gate: GateOption
}

const SiteMapBuilder = ({
  seed,
  pathPuzzles,
  chestEvery,
  exitOrStaircase,
  section1,
  section1Puzzles,
  section1ChestEvery,
  section1End,
  section1Gate,
  section2,
  section2Puzzles,
  section2ChestEvery,
  section2End,
  section2Gate,
}: Props) => {
  const toGate = (opt: GateOption): GateConfig | undefined =>
    opt === "none"
      ? undefined
      : opt === "floor-key"
        ? { type: "floor-key" }
        : { type: "tomb-key", wardKeyId: "preview_ward" }

  const sideSections: SideSection[] = []
  if (section1)
    sideSections.push({
      pathPuzzles: section1Puzzles,
      ...(section1ChestEvery > 0 ? { chestEvery: section1ChestEvery } : {}),
      difficulty: "starter",
      end: section1End,
      gate: toGate(section1Gate),
    })
  if (section2)
    sideSections.push({
      pathPuzzles: section2Puzzles,
      ...(section2ChestEvery > 0 ? { chestEvery: section2ChestEvery } : {}),
      difficulty: "junior",
      end: section2End,
      gate: toGate(section2Gate),
    })

  const config: FloorConfig = {
    pathPuzzles,
    ...(chestEvery > 0 ? { chestEvery } : {}),
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase,
    sideSections,
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
  return <SiteMapView grid={result.grid} revealAllCells />
}

const meta = {
  title: "App/SiteMap/SiteMapBuilder",
  component: SiteMapBuilder,
  parameters: { layout: "centered" },
  argTypes: {
    seed: { control: { type: "number" } },
    pathPuzzles: { control: { type: "range", min: 0, max: 5, step: 1 } },
    chestEvery: { control: { type: "range", min: 0, max: 5, step: 1 } },
    exitOrStaircase: { control: "select", options: ["exit", "staircase"] },
    section1: { control: "boolean" },
    section1Puzzles: { control: { type: "range", min: 0, max: 4, step: 1 } },
    section1ChestEvery: { control: { type: "range", min: 0, max: 4, step: 1 } },
    section1End: { control: "select", options: ["treasure", "staircase"] },
    section1Gate: { control: "select", options: ["none", "floor-key", "tomb-key"] },
    section2: { control: "boolean" },
    section2Puzzles: { control: { type: "range", min: 0, max: 4, step: 1 } },
    section2ChestEvery: { control: { type: "range", min: 0, max: 4, step: 1 } },
    section2End: { control: "select", options: ["treasure", "staircase"] },
    section2Gate: { control: "select", options: ["none", "floor-key", "tomb-key"] },
  },
} satisfies Meta<typeof SiteMapBuilder>

export default meta
type Story = StoryObj<typeof meta>

export const Builder: Story = {
  args: {
    seed: 1,
    pathPuzzles: 0,
    chestEvery: 0,
    exitOrStaircase: "exit",
    section1: true,
    section1Puzzles: 0,
    section1ChestEvery: 0,
    section1End: "treasure",
    section1Gate: "none",
    section2: true,
    section2Puzzles: 1,
    section2ChestEvery: 0,
    section2End: "staircase",
    section2Gate: "floor-key",
  },
}

export const FirstPyramid: Story = {
  args: {
    seed: 42,
    pathPuzzles: 0,
    chestEvery: 0,
    exitOrStaircase: "exit",
    section1: true,
    section1Puzzles: 0,
    section1ChestEvery: 0,
    section1End: "treasure",
    section1Gate: "none",
    section2: true,
    section2Puzzles: 1,
    section2ChestEvery: 0,
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
    if (cell?.type === "room" && cell.roomType === "stairhead" && floorIdx < siteConfig.length - 1)
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
      {grid && <SiteMapView grid={grid} onCellClick={handleClick} />}
    </div>
  )
}

// Dense floor: 6 main puzzles, 5 keyed side paths + 1 key-holder path
const DenseFloorDemo = () => {
  const config: FloorConfig = {
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
  const result = useMemo(() => assembleFloor("dense", config, 2), [])

  if (!result.success) return <div className="p-4 text-red-400">Assembly failed: {JSON.stringify(result.reasons)}</div>

  return <SiteMapView grid={result.grid} revealAllCells />
}

export const DensePuzzlesAndKeys: StoryObj = {
  render: () => <DenseFloorDemo />,
  parameters: { layout: "centered" },
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
