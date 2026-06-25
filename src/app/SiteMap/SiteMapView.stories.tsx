import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { assembleFloor } from "../../game/siteAssembler"
import { completeCell } from "../../game/gridNavigation"
import type { FloorGrid } from "../../game/siteTypes"
import { SiteMapView } from "./SiteMapView"

const meta = {
  title: "App/SiteMap/SiteMapView",
  component: SiteMapView,
  parameters: { layout: "centered" },
} satisfies Meta<typeof SiteMapView>

export default meta
type Story = StoryObj<typeof meta>

// Use assembleFloor with a fixed seed to get a consistent grid
const getLinearGrid = (): FloorGrid => {
  const result = assembleFloor(
    "story-1",
    { pathPuzzles: 1, difficulty: "easy", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
    42
  )
  if (!result.success) throw new Error("story grid assembly failed")
  return result.grid
}

const linearGrid = getLinearGrid()

export const AllFogged: Story = {
  args: {
    grid: linearGrid,
  },
}

export const RevealAll: Story = {
  args: {
    grid: linearGrid,
    revealAllCells: true,
  },
}

// Entrance completed: use completeCell
const entranceCompletedGrid = (() => {
  const [r, c] = linearGrid.entrancePos
  return completeCell(linearGrid, r, c)
})()

export const EntranceCompleted: Story = {
  args: {
    grid: entranceCompletedGrid,
  },
}

// Get a grid with the first pyramid config for the complex story
const getFirstPyramidGrid = (): FloorGrid => {
  const result = assembleFloor(
    "story-complex",
    {
      pathPuzzles: 0,
      difficulty: "easy",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 0, difficulty: "easy", end: "treasure" },
        { pathPuzzles: 1, difficulty: "medium", end: "staircase", gate: { type: "floor-key" } },
      ],
    },
    42
  )
  if (!result.success) throw new Error("complex story grid assembly failed")
  return result.grid
}

export const FirstPyramidRevealAll: Story = {
  args: {
    grid: getFirstPyramidGrid(),
    revealAllCells: true,
  },
}

export const Interactive: Story = {
  args: { grid: linearGrid },
  render: () => {
    const initial = (() => {
      const [r, c] = linearGrid.entrancePos
      return completeCell(linearGrid, r, c)
    })()
    const [grid, setGrid] = useState<FloorGrid>(initial)
    const [explorerPos, setExplorerPos] = useState<readonly [number, number]>(linearGrid.entrancePos)
    return (
      <div>
        <SiteMapView
          grid={grid}
          explorerPos={explorerPos}
          onCellClick={(r, c) => {
            setGrid(prev => completeCell(prev, r, c))
            setExplorerPos([r, c])
          }}
        />
        <p className="mt-2 text-sm text-gray-500">Click reachable rooms to complete them</p>
      </div>
    )
  },
}

const firstPyramidGrid = getFirstPyramidGrid()
const firstPyramidInitial = (() => {
  const [r, c] = firstPyramidGrid.entrancePos
  return completeCell(firstPyramidGrid, r, c)
})()

export const InteractiveFirstPyramid: Story = {
  args: { grid: firstPyramidInitial },
  render: () => {
    const [grid, setGrid] = useState<FloorGrid>(firstPyramidInitial)
    const [explorerPos, setExplorerPos] = useState<readonly [number, number]>(firstPyramidGrid.entrancePos)
    return (
      <div className="flex flex-col gap-3">
        <SiteMapView
          grid={grid}
          explorerPos={explorerPos}
          onCellClick={(r, c) => {
            setGrid(prev => completeCell(prev, r, c))
            setExplorerPos([r, c])
          }}
        />
        <div className="flex items-center justify-between text-xs text-amber-600/70">
          <span>Click reachable rooms to explore. Find the key to unlock the gate.</span>
          <button
            className="rounded border border-amber-900/50 px-2 py-1 hover:bg-amber-900/20"
            onClick={() => {
              setGrid(firstPyramidInitial)
              setExplorerPos(firstPyramidGrid.entrancePos)
            }}
          >
            Reset
          </button>
        </div>
      </div>
    )
  },
}
