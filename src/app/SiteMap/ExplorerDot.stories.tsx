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

// The look, on its own and away from the map: every facing (the fourth mirrored from the third) across
// every frame of its walk, at 1:1 — the size the map draws — and at 3x, over pale limestone and black
// granite, the two grounds a figure has to read against. This is the story to open when judging character
// art or a new set of frames; with no frames in `tiles/default/` it falls back to the dot the map had
// before, so nothing here is load-bearing on the art existing.
//
// Rows are facings and columns are steps, which is also how a sheet arrives — so a frame that breaks the
// cycle (a mirrored pose, a leg that does not swing) is visible as a break in its row.
const STEPS = 4

export const Facings: Story = {
  args: { grid, pos: grid.entrancePos },
  render: () => {
    const grounds = ["#b9b6ae", "#14110d"]
    // The figure stands taller than its cell — feet on the floor line, head into the wall band above — so
    // the viewBox has to be the figure's height, not the cell's.
    const rowH = CELL * 1.5
    return (
      <div className="flex flex-col gap-4">
        {grounds.map(ground => (
          <div key={ground} className="flex gap-4">
            {[1, 3].map(scale => (
              <svg
                key={scale}
                width={STEPS * CELL * scale}
                height={FACINGS.length * rowH * scale}
                viewBox={`0 0 ${STEPS * CELL} ${FACINGS.length * rowH}`}
                style={{ background: ground, imageRendering: ART_IMAGE_RENDERING }}
              >
                {FACINGS.map((facing, row) =>
                  Array.from({ length: STEPS }, (_, step) => (
                    <g
                      key={`${facing}-${step}`}
                      transform={`translate(${step * CELL + CELL / 2}, ${row * rowH + rowH - CELL / 2})`}
                    >
                      <ExplorerFigure facing={facing} step={step} />
                    </g>
                  ))
                )}
              </svg>
            ))}
          </div>
        ))}
      </div>
    )
  },
}

// The walk cycle RUNNING, which the Facings grid above cannot show: that one lays the frames out side by
// side, and a set of poses that reads fine in a row can still stutter, drift or swap two frames once it
// moves. Every facing cycles at once so they can be compared against each other — a leg that hitches only
// on the north view shows up as one figure out of step with its neighbours.
//
// The cycle is a CSS animation, so it keeps time on its own: the slider slows the WALK down — the frame
// rate follows it, and follows each facing's own frame count, so a facing drawn in twelve frames and one
// drawn in four still take the same two cells to complete a stride. Unticking WALKING drops each figure
// onto its standing pose, which is what the player sees the moment they arrive.
export const Walking: Story = {
  args: { grid, pos: grid.entrancePos },
  render: () => {
    // The map's own walking speed.
    const [cellMs, setCellMs] = useState(180)
    const [walking, setWalking] = useState(true)
    const grounds = ["#b9b6ae", "#14110d"]
    const rowH = CELL * 1.5
    return (
      <div className="flex flex-col gap-4">
        <label className="flex items-center gap-3 text-sm text-gray-500">
          <input type="checkbox" checked={walking} onChange={e => setWalking(e.target.checked)} />
          walking
          <input
            type="range"
            min={60}
            max={800}
            step={20}
            value={cellMs}
            onChange={e => setCellMs(Number(e.target.value))}
          />
          {cellMs}ms a cell
        </label>
        {grounds.map(ground => (
          <div key={ground} className="flex gap-4">
            {[1, 3].map(scale => (
              <svg
                key={scale}
                width={FACINGS.length * CELL * scale}
                height={rowH * scale}
                viewBox={`0 0 ${FACINGS.length * CELL} ${rowH}`}
                style={{ background: ground, imageRendering: ART_IMAGE_RENDERING }}
              >
                {FACINGS.map((facing, col) => (
                  <g key={facing} transform={`translate(${col * CELL + CELL / 2}, ${rowH - CELL / 2})`}>
                    <ExplorerFigure facing={facing} walking={walking} cellMs={cellMs} />
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
