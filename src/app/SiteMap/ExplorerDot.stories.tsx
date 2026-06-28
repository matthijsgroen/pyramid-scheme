import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { assembleFloor } from "../../game/siteAssembler"
import { completeCell } from "../../game/gridNavigation"
import type { FloorGrid } from "../../game/siteTypes"
import { ExplorerDot } from "./ExplorerDot"
import { SiteMapView } from "./SiteMapView"

const getGrid = (): FloorGrid => {
  const result = assembleFloor(
    "dot-story",
    { pathPuzzles: 2, difficulty: "starter", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
    7
  )
  if (!result.success) throw new Error("assembly failed")
  const [r, c] = result.grid.entrancePos
  return completeCell(result.grid, r, c)
}

const grid = getGrid()

const meta = {
  title: "App/SiteMap/ExplorerDot",
  component: ExplorerDot,
  parameters: { layout: "centered" },
} satisfies Meta<typeof ExplorerDot>

export default meta
type Story = StoryObj<typeof meta>

export const AtEntrance: Story = {
  args: { grid, pos: grid.entrancePos },
  render: ({ pos }) => (
    <svg width={grid.cols * 44 + 60} height={grid.rows * 44 + 60} style={{ background: "#110d08" }}>
      <ExplorerDot grid={grid} pos={pos} />
    </svg>
  ),
}

export const Interactive: Story = {
  args: { grid, pos: grid.entrancePos },
  render: () => {
    const [currentGrid, setCurrentGrid] = useState<FloorGrid>(grid)
    const [pos, setPos] = useState<readonly [number, number]>(grid.entrancePos)
    return (
      <SiteMapView
        grid={currentGrid}
        explorerPos={pos}
        onCellClick={(r, c) => {
          setCurrentGrid(prev => completeCell(prev, r, c))
          setPos([r, c])
        }}
      />
    )
  },
}
