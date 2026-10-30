import type { Meta, StoryObj } from "@storybook/react-vite"
import { drawnSketch } from "@/game/carve/carveFixtures"
import { embedFloor } from "@/game/carve/embed/embedFloor"
import type { FloorGrid, GridCell, RoomCell } from "@/game/siteTypes"
import { SiteMapView } from "./SiteMapView"

// A made-up floor whose every corridor is wide (`corridorWidth: 2`), laid by the rooms engine's embed: a corridor of
// puzzle stops with a door halfway, turning a corner to a treasure room. The explorer and the stop markers stand on
// the centre line between the two lanes; the corridor narrows to one lane at the door and where it meets a room.
const SKETCH = [
  "E.S.S.S.S.S.S.S..",
  "                .",
  "                S",
  "                .",
  "                S",
  "                .",
  "                T",
]
const DOOR: readonly [number, number] = [0, 8]

const wideFloor = (): FloorGrid => {
  const sketch = drawnSketch(SKETCH)
  const cells = sketch.cells.map((row, r) =>
    row.map((cell, c): GridCell => {
      if (cell.type === "empty") return cell
      const lit = { ...cell, state: "visible" as const, difficulty: "starter" as const }
      return r === DOOR[0] && c === DOOR[1]
        ? ({ ...lit, requiredKeyId: "door", tags: ["gate"], keyColor: "blue" } as RoomCell)
        : lit
    })
  )
  const embedded = embedFloor(
    { ...sketch, cells, difficulty: "starter" },
    { seed: 1, spread: 0, rooms: new Map(), wide: true }
  )
  if ("refused" in embedded) throw new Error(embedded.refused)
  return embedded.grid
}

/** The first cell of the floor's way that walks the wide corridor: where the explorer stands. */
const onCentreLine = (grid: FloorGrid): readonly [number, number] => {
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "corridor" && cell.shoulder) return [r, c]
    }
  return grid.entrancePos
}

const WideCorridorView = () => {
  const grid = wideFloor()
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="font-mono text-xs text-stone-400">
        wide corridor · {grid.rows}×{grid.cols}
      </span>
      <SiteMapView grid={grid} explorerPos={onCentreLine(grid)} className="max-h-[85vh] max-w-[95vw]" />
    </div>
  )
}

const meta: Meta<typeof WideCorridorView> = {
  title: "Topology/WideCorridor",
  component: WideCorridorView,
  parameters: { layout: "fullscreen" },
}
export default meta

export const CentreLine: StoryObj<typeof WideCorridorView> = {}
