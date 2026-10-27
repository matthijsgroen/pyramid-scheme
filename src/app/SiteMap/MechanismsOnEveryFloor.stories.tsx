import type { Meta, StoryObj } from "@storybook/react-vite"
import type { FC } from "react"
import { cellAddress } from "@/game/cellAddress"
import { difficulties } from "@/data/difficultyLevels"
import type { FloorGrid, GridCell, MechanismRecord, RoomCell, Tileset } from "@/game/siteTypes"
import { SiteMapView } from "./SiteMapView"
import "@/mods/registerModApps"

// Every mechanism piece on every floor, drawn by the real map: one strip per tileset, the pieces along one
// corridor in each of their looks. The explorer stands at the west end, so the pieces stand in the floor's night
// the way the player sees them across the map; only the lit torch brings its own pool.

type Piece = { label: string; cell: Partial<RoomCell>; state?: string }

const record = (states: string[], initial: string, extra: Partial<MechanismRecord> = {}): MechanismRecord => ({
  states,
  initial,
  returnsToInitial: true,
  positions: [],
  ...extra,
})

const PIECES: Piece[] = [
  { label: "lever, one side", cell: { family: "handle", mechanism: record(["left", "right"], "left") } },
  { label: "lever, other side", cell: { family: "handle", mechanism: record(["left", "right"], "right") } },
  { label: "lever, middle of three", cell: { family: "handle", mechanism: record(["a", "b", "c"], "b") } },
  {
    label: "torch, unlit",
    cell: { family: "torch", mechanism: record(["unlit", "lit"], "unlit", { returnsToInitial: false }) },
  },
  {
    label: "torch, lit",
    cell: { family: "torch", mechanism: record(["unlit", "lit"], "unlit", { returnsToInitial: false }) },
    state: "lit",
  },
  { label: "plate, empty", cell: { plate: { id: "p1" }, mechanism: record(["none", "p1"], "none") } },
  { label: "plate, stone on it", cell: { plate: { id: "p2" }, mechanism: record(["none", "p2"], "p2") } },
  {
    label: "pipe hole, empty",
    cell: { pipeHole: { pipe: "q", region: "r" }, mechanism: record(["none", "q@r"], "none") },
  },
  {
    label: "pipe hole, stone in it",
    cell: { pipeHole: { pipe: "q", region: "r" }, mechanism: record(["none", "q@r"], "q@r") },
  },
  {
    label: "sequence tile, unwalked",
    cell: { sequenceTile: { id: "s", step: 0, glyph: 0x13080, entrance: "x" }, mechanism: record(["0", "1"], "0") },
  },
  {
    label: "sequence tile, walked",
    cell: { sequenceTile: { id: "s", step: 0, glyph: 0x13080, entrance: "x" }, mechanism: record(["0", "1"], "1") },
  },
  { label: "gate, shut", cell: { tags: ["gate"], requiredKeyId: "k-shut" } },
  { label: "gate, open", cell: { tags: ["gate"], requiredKeyId: "k-open", state: "completed" } },
  {
    label: "narrow passage",
    cell: { tags: ["gate"], requiredKeyId: "k-pass", passage: { realisation: "narrowPassage" } },
  },
  {
    label: "water",
    cell: {
      tags: ["gate"],
      requiredKeyId: "k-water",
      regionBarrier: { region: "wet", entrance: "x", realisation: "water" },
    },
  },
  {
    label: "sand",
    cell: {
      tags: ["gate"],
      requiredKeyId: "k-sand",
      regionBarrier: { region: "dry", entrance: "x", realisation: "sand" },
    },
  },
]

/** Corridor cells a drop's run spans (ONE_WAY_RUN_CELLS), drawn after the rooms. */
const DROP_CELLS = 3
/** Two cells per piece: its room and a corridor cell before the next, so no two rooms touch. */
const PITCH = 2
const LEAD = 2

const stripGrid = (tier: Tileset) => {
  const rank = tier === "cave" || tier === "sphinx" ? "starter" : tier
  const cols = LEAD + PIECES.length * PITCH + DROP_CELLS + 2
  const row: GridCell[] = Array.from({ length: cols }, (_, c): GridCell => ({
    type: "corridor",
    dirs: new Set(c === 0 ? ["e"] : c === cols - 1 ? ["w"] : ["e", "w"]),
    state: "completed",
  }))
  PIECES.forEach((piece, i) => {
    const c = LEAD + i * PITCH
    row[c] = {
      type: "room",
      roomType: "encounter",
      dirs: new Set(["e", "w"]),
      state: "reachable",
      difficulty: rank,
      mechanismId: `piece-${i}`,
      sectionAddress: "sheet",
      ...piece.cell,
    } as RoomCell
  })
  const dropStart = LEAD + PIECES.length * PITCH
  for (let k = 0; k < DROP_CELLS; k++)
    row[dropStart + k] = {
      type: "corridor",
      dirs: new Set(["e", "w"]),
      state: "completed",
      obstacle: { dir: "e", kind: "drop" },
    }
  const empty = (): GridCell[] => Array.from({ length: cols }, (): GridCell => ({ type: "empty" }))
  const grid: FloorGrid = {
    siteId: `${tier}-mechanisms`,
    difficulty: rank,
    ...(tier === "cave" || tier === "sphinx" ? { tileset: tier } : {}),
    rows: 3,
    cols,
    cells: [empty(), row, empty()],
    entrancePos: [1, 0],
    exitPos: [1, cols - 1],
    staircases: {},
  }
  const states = new Map<string, string>()
  PIECES.forEach((piece, i) => {
    const address = piece.state && cellAddress(grid, 0, 1, LEAD + i * PITCH)
    if (address && piece.state) states.set(address, piece.state)
  })
  return { grid, states }
}

const TILESETS: Tileset[] = [...difficulties, "cave", "sphinx"]

const Sheet: FC<{ tilesets: Tileset[] }> = ({ tilesets }) => (
  <div className="flex min-h-screen w-max flex-col gap-1 bg-neutral-900 p-2">
    <ol className="m-0 flex gap-x-3 p-1 text-[11px] text-white/70">
      {[...PIECES.map(p => p.label), "drop"].map((label, i) => (
        <li key={label}>
          {i + 1}. {label}
        </li>
      ))}
    </ol>
    {tilesets.map(tier => {
      const { grid, states } = stripGrid(tier)
      return (
        <figure key={tier} data-tileset={tier} className="m-0 flex flex-col">
          <figcaption className="text-xs text-white">{tier}</figcaption>
          <SiteMapView
            grid={grid}
            currentFloor={0}
            explorerPos={[1, 0]}
            mechanismStates={states}
            className="h-64 w-675"
          />
        </figure>
      )
    })}
  </div>
)

const meta = {
  title: "Topology/On every floor",
  component: Sheet,
  parameters: { layout: "fullscreen" },
  args: { tilesets: TILESETS },
} satisfies Meta<typeof Sheet>

export default meta
type Story = StoryObj<typeof meta>

/** Rows are tilesets, columns are pieces in their looks; mechanism art is shared, so only the floor changes. */
export const Sheet_: Story = { name: "every piece on every floor" }
