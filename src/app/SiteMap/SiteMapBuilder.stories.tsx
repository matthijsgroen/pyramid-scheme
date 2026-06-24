import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { assembleFloor } from "../../game/siteAssembler"
import { completeCell } from "../../game/gridNavigation"
import type { FloorConfig, FloorGrid, SideSection } from "../../game/siteTypes"
import { SiteMapView } from "./SiteMapView"

type Props = {
  seed: number
  pathPuzzles: number
  exitOrStaircase: FloorConfig["exitOrStaircase"]
  section1: boolean
  section1Puzzles: number
  section1End: SideSection["end"]
  section1Gated: boolean
  section2: boolean
  section2Puzzles: number
  section2End: SideSection["end"]
  section2Gated: boolean
}

const SiteMapBuilder = ({
  seed,
  pathPuzzles,
  exitOrStaircase,
  section1,
  section1Puzzles,
  section1End,
  section1Gated,
  section2,
  section2Puzzles,
  section2End,
  section2Gated,
}: Props) => {
  const sideSections: SideSection[] = []
  if (section1)
    sideSections.push({
      pathPuzzles: section1Puzzles,
      difficulty: "easy",
      end: section1End,
      ...(section1Gated ? { gate: { type: "floor-key" as const } } : {}),
    })
  if (section2)
    sideSections.push({
      pathPuzzles: section2Puzzles,
      difficulty: "medium",
      end: section2End,
      ...(section2Gated ? { gate: { type: "floor-key" as const } } : {}),
    })

  const config: FloorConfig = {
    pathPuzzles,
    difficulty: "easy",
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
    exitOrStaircase: { control: "select", options: ["exit", "staircase"] },
    section1: { control: "boolean" },
    section1Puzzles: { control: { type: "range", min: 0, max: 4, step: 1 } },
    section1End: { control: "select", options: ["treasure", "staircase"] },
    section1Gated: { control: "boolean" },
    section2: { control: "boolean" },
    section2Puzzles: { control: { type: "range", min: 0, max: 4, step: 1 } },
    section2End: { control: "select", options: ["treasure", "staircase"] },
    section2Gated: { control: "boolean" },
  },
} satisfies Meta<typeof SiteMapBuilder>

export default meta
type Story = StoryObj<typeof meta>

export const Builder: Story = {
  args: {
    seed: 1,
    pathPuzzles: 0,
    exitOrStaircase: "exit",
    section1: true,
    section1Puzzles: 0,
    section1End: "treasure",
    section1Gated: false,
    section2: true,
    section2Puzzles: 1,
    section2End: "staircase",
    section2Gated: true,
  },
}

export const FirstPyramid: Story = {
  args: {
    seed: 42,
    pathPuzzles: 0,
    exitOrStaircase: "exit",
    section1: true,
    section1Puzzles: 0,
    section1End: "treasure",
    section1Gated: false,
    section2: true,
    section2Puzzles: 1,
    section2End: "staircase",
    section2Gated: true,
  },
}

// Interactive: click rooms to "complete" them and watch fog-of-war reveal paths
const InteractiveFirstPyramid = () => {
  const config: FloorConfig = {
    pathPuzzles: 0,
    difficulty: "easy",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [
      { pathPuzzles: 0, difficulty: "easy", end: "treasure" },
      { pathPuzzles: 1, difficulty: "medium", end: "staircase", gate: { type: "floor-key" } },
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
