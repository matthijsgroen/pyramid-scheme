import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { assembleFloor } from "../../game/siteAssembler"
import { completeCell } from "../../game/gridNavigation"
import type { Direction, FloorGrid } from "../../game/siteTypes"
import { CELL } from "./mapScale"
import { ART_IMAGE_RENDERING } from "./tileAssets"
import { ExplorerDot, ExplorerFigure } from "./ExplorerDot"
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

const FACINGS: Direction[] = ["s", "n", "e", "w"]

const meta = {
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

// The look, on its own and away from the map: three facings plus the mirrored fourth, at 1:1 (the size
// the map draws) and at 3x (the size to draw art at), over pale limestone and black granite — the two
// grounds a figure has to read against. This is the story to open when judging character art, and the
// one to compare a new set against; delete the three PNGs and it falls back to the old dot.
export const Facings: Story = {
  args: { grid, pos: grid.entrancePos },
  render: () => {
    const grounds = ["#b9b6ae", "#14110d"]
    return (
      <div className="flex flex-col gap-4">
        {grounds.map(ground => (
          <div key={ground} className="flex gap-4">
            {[1, 3].map(scale => (
              <svg
                key={scale}
                width={FACINGS.length * CELL * scale}
                height={CELL * scale}
                viewBox={`0 0 ${FACINGS.length * CELL} ${CELL}`}
                style={{ background: ground, imageRendering: ART_IMAGE_RENDERING }}
              >
                {FACINGS.map((facing, i) => (
                  <g key={facing} transform={`translate(${i * CELL + CELL / 2}, ${CELL / 2})`}>
                    <ExplorerFigure facing={facing} />
                  </g>
                ))}
              </svg>
            ))}
          </div>
        ))}
      </div>
    )
  },
}
