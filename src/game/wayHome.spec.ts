import { describe, expect, it, vi } from "vitest"
import { ONE_WAY_RUN_CELLS } from "./carveConstants"
import { strandedFromHome } from "./wayHome"
import type { Direction, FloorGrid, GridCell } from "./siteTypes"
import * as siteValidator from "./siteValidator"

vi.mock("./siteValidator", async original => {
  const actual = await original<typeof import("./siteValidator")>()
  return { ...actual, reachableFrom: vi.fn(actual.reachableFrom) }
})

// One row of cells, west to east, each piece naming the ways it opens. A drop is laid as the carve lays
// it: a launch open only back the way it came, the obstacle cells naming nothing, a landing open only on.
const room = (dirs: Direction[], extra: Partial<Extract<GridCell, { type: "room" }>> = {}): GridCell => ({
  type: "room",
  roomType: "encounter",
  dirs: new Set(dirs),
  state: "fogged",
  ...extra,
})
const portal = (dirs: Direction[], stairId?: string): GridCell =>
  room(dirs, { roomType: "portal", ...(stairId ? { stairId } : {}) })
const corridor = (dirs: Direction[]): GridCell => ({ type: "corridor", dirs: new Set(dirs), state: "fogged" })
const dropEast: GridCell[] = [
  corridor(["w"]),
  ...Array.from({ length: ONE_WAY_RUN_CELLS }, (): GridCell => ({
    type: "corridor",
    dirs: new Set<Direction>(),
    state: "fogged",
    obstacle: { dir: "e", kind: "zipline" },
  })),
  corridor(["e"]),
]

const row = (cells: GridCell[], entrance: number, exit: number): FloorGrid => ({
  siteId: "test",
  rows: 1,
  cols: cells.length,
  entrancePos: [0, entrance],
  exitPos: [0, exit],
  staircases: {},
  cells: [cells],
})

describe(strandedFromHome, () => {
  it("finds nothing on a floor whose every room walks back to its stair up", () => {
    const grid = row([portal(["e"], "up"), room(["w", "e"]), room(["w"])], 0, 2)
    expect(strandedFromHome(grid)).toEqual([])
  })

  it("names the pocket a drop leads into on a floor whose only way home is its stair up", () => {
    const cells = [portal(["e"], "up"), room(["w", "e"]), ...dropEast, room(["w"])]
    const grid = row(cells, 0, cells.length - 1)
    expect(strandedFromHome(grid)).toEqual([[0, cells.length - 1]])
  })

  it("names a stair down standing past a drop the exit cannot be walked back to from", () => {
    const cells = [portal(["e"]), room(["w", "e"]), portal(["w", "e"]), ...dropEast, portal(["w"], "down")]
    const grid = row(cells, 2, 0)
    expect(strandedFromHome(grid)).toEqual([[0, cells.length - 1]])
  })

  it("finds nothing when the stair down stands before the drop, on the way to the exit", () => {
    const cells = [portal(["e"]), ...dropEast, room(["w", "e"]), portal(["w", "e"], "down"), portal(["w"])]
    // Leave from the far end, so the walk from the entrance reaches everything only by the drop.
    const grid = row(cells, 0, cells.length - 1)
    expect(strandedFromHome(grid)).toEqual([])
  })

  it("lets a locked door count as opened, since the question is the way home and not the key", () => {
    const cells = [portal(["e"], "up"), room(["w", "e"], { requiredKeyId: "k" }), room(["w"])]
    expect(strandedFromHome(row(cells, 0, 2))).toEqual([])
  })
})

describe("strandedFromHome on a floor with no one-way way", () => {
  const corridorRow = (length: number) =>
    row([portal(["e"], "up"), ...Array.from({ length }, () => room(["w", "e"])), room(["w"])], 0, length + 1)

  it("walks it once, however many rooms it has", () => {
    const walks = vi.mocked(siteValidator.reachableFrom)
    walks.mockClear()
    expect(strandedFromHome(corridorRow(12))).toEqual([])
    expect(walks).toHaveBeenCalledTimes(1)
  })

  it("names every room the entrance reaches when no walk reaches home", () => {
    // The exit portal stands apart: nothing opens onto it.
    const grid = row([room(["e"]), room(["w"]), portal([])], 0, 2)
    expect(strandedFromHome(grid)).toEqual([
      [0, 0],
      [0, 1],
    ])
  })
})
