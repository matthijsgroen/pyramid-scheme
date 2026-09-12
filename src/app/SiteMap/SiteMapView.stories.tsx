import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { assembleFloor } from "../../game/siteAssembler"
import { generatedWorldConfigs } from "../../data/generatedWorld"
import { completeCell } from "../../game/gridNavigation"
import type { CellState, Direction, FloorGrid, GridCell } from "../../game/siteTypes"
import { SiteMapView } from "./SiteMapView"

// A map SCROLLS: its root is an overflow-auto box that sizes to the floor inside it, so it only scrolls
// when something bounds it. Centred layout sizes the wrapper to the content instead, and a real generated
// floor then ran off the screen with no way to reach the rest of it — which is most of what these stories
// are for. Fullscreen plus a viewport-sized box gives the scroll container something to scroll inside.
const meta = {
  component: SiteMapView,
  parameters: { layout: "fullscreen" },
  args: { className: "h-screen w-screen" },
} satisfies Meta<typeof SiteMapView>

export default meta
type Story = StoryObj<typeof meta>

// Use assembleFloor with a fixed seed to get a consistent grid
const getLinearGrid = (): FloorGrid => {
  const result = assembleFloor(
    "story-1",
    { pathPuzzles: 1, difficulty: "starter", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
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
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 0, difficulty: "starter", end: "treasure" },
        { pathPuzzles: 1, difficulty: "junior", end: "staircase", gate: { type: "floor-key" } },
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

// A real floor out of the generated world, which is the only way to see authored content — the
// hand-built configs above carry no decoration pool, so no props land on them.
const getWorldGrid = (siteId: string): FloorGrid => {
  const floor = generatedWorldConfigs[siteId]?.flat()[0]
  if (!floor) throw new Error(`no generated floor for ${siteId}`)
  const result = assembleFloor(`${siteId}:0`, floor, 7)
  if (!result.success) throw new Error("world grid assembly failed")
  return result.grid
}

// starter_1 rather than any starter floor, because its ward-chest teasers are authored at junior: the
// floor is built of two tiers, which is the case a single-material renderer got wrong.
export const WorldFloorStarter: Story = {
  args: { grid: getWorldGrid("starter_1"), revealAllCells: true },
}

// The same floor part-explored, which is the only way to judge what the fog gives away: a wall is
// drawn where lit floor touches stone, so the shape of the drawn stone must not trace passages the
// player has not walked.
export const WorldFloorUnexplored: Story = {
  args: { grid: getWorldGrid("starter_1") },
}

export const WorldFloorMaster: Story = {
  args: { grid: getWorldGrid("master_2"), revealAllCells: true },
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
      <div className="flex h-screen flex-col">
        <SiteMapView
          className="min-h-0 flex-1"
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
      <div className="flex h-screen flex-col gap-3">
        <SiteMapView
          className="min-h-0 flex-1"
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

// ─── Ward gates ────────────────────────────────────────────────────────────────
// NO `revealAllCells` ON THESE: it calls `revealAll`, which sets every cell to "reachable" and so wipes
// the very state the open story is about. Every cell here states itself instead.
//
// THE FOUR FACINGS AND BOTH STATES, on one screen, because that is the question a gate keeps raising and
// no generated floor answers it: a real pyramid has two or three gates on a floor and they all happen to
// face the same way. Here the entrance sits in the middle of a cross and each arm runs out through a gate
// into a pocket, so all four are drawn at once and can be compared against each other.
//
// The pockets are authored EXPERT inside a starter floor, which is what a ward gate really guards, so
// these also show the sill the map lays where one rank's stone meets another's — and show that a shut
// gate wears the floor's own stone rather than the pocket's, which is what stops the next tier being read
// off the paving before it has been earned.
const emptyCell: GridCell = { type: "empty" }

const passage = (dirs: Direction[], difficulty?: "expert"): GridCell => ({
  type: "corridor",
  dirs: new Set(dirs),
  state: "reachable",
  ...(difficulty ? { difficulty } : {}),
})

const wardGate = (dirs: Direction[], state: CellState): GridCell => ({
  type: "room",
  roomType: "encounter",
  family: "key-gate",
  tags: ["gate"],
  gateVariant: "tomb-key",
  requiredKeyId: "expert_a_1",
  difficulty: "expert",
  dirs: new Set(dirs),
  state,
})

/** A cross with a gate down each arm: north and south take the face-on flights, east and west the side
 * ones, and the cell beyond each is the pocket it shuts. */
const gateCrossGrid = (state: CellState): FloorGrid => {
  const g = emptyCell
  const cells: GridCell[][] = [
    [g, g, g, passage(["s"], "expert"), g, g, g],
    [g, g, g, wardGate(["n", "s"], state), g, g, g],
    [g, g, g, passage(["n", "s"]), g, g, g],
    [
      passage(["e"], "expert"),
      wardGate(["e", "w"], state),
      passage(["e", "w"]),
      { type: "room", roomType: "portal", dirs: new Set<Direction>(["n", "s", "e", "w"]), state: "completed" },
      passage(["e", "w"]),
      wardGate(["e", "w"], state),
      passage(["w"], "expert"),
    ],
    [g, g, g, passage(["n", "s"]), g, g, g],
    [g, g, g, wardGate(["n", "s"], state), g, g, g],
    [g, g, g, passage(["n"], "expert"), g, g, g],
  ]
  return {
    cells,
    rows: cells.length,
    cols: cells[0].length,
    entrancePos: [3, 3],
    exitPos: [3, 3],
    siteId: "gate-stories",
    difficulty: "starter",
    staircases: {},
  }
}

/** Shut: the grille is down in all four, and every pocket behind them is still the floor's own stone. */
export const WardGatesShut: Story = {
  args: { grid: gateCrossGrid("reachable") },
}

/** Opened: the grille has sunk into the threshold, and each pocket is its own rank again with a sill
 * laid where the stone changes. */
export const WardGatesOpen: Story = {
  args: { grid: gateCrossGrid("completed") },
}

/** The player standing in a gateway: a gate fades for the two cells it spans, the way an archway does,
 * because a barrier that hid him would be a wall. */
export const WardGateWithPlayerUnderIt: Story = {
  args: { grid: gateCrossGrid("reachable"), explorerPos: [1, 3] },
}
