import { describe, expect, it } from "vitest"
import { defaultResolveEncounter } from "../encounterFallback"
import type { ResolveEncounter } from "../siteAssembler"
import type { FloorConfig, GridCell, RoomCell } from "../siteTypes"
import { firstCarved } from "./carveFixtures"
import { switchMark } from "./ids"
import { prepareFloor } from "./prepareFloor"
import { render } from "./render"
import { settle } from "./settle"
import type { SettleState } from "./settle"

// A switch needs a family the player can walk back into, which these specs grant without the registry.
const reEnterable: ResolveEncounter = (encounter, defaultTag) => ({
  ...defaultResolveEncounter(encounter, defaultTag),
  reEnterable: true,
})

const switchFloor = (switches?: FloorConfig["switches"]): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
  forks: [{ exits: 2, count: 1 }],
  ...(switches ? { switches } : {}),
})

/** The first seed whose first carved attempt settles, with its prep and grid. */
const settled = (config: FloorConfig) => {
  for (let seed = 0; seed < 40; seed++) {
    const prepared = prepareFloor(`site-${seed}`, config, seed, {
      resolveEncounter: reEnterable,
      floorRef: { journeyId: "settle-spec", levelIndex: 0, floorIndex: 0 },
    })
    if (!prepared.ok) throw new Error(JSON.stringify(prepared.reasons))
    const { prep } = prepared
    const state = firstCarved(prep) as SettleState
    const grid = render(prep, state)
    if (settle(prep, state, grid) === undefined) return { prep, state, grid }
  }
  throw new Error("no seed settled")
}

const rooms = (cells: readonly (readonly GridCell[])[]) =>
  cells.flat().filter((cell): cell is RoomCell => cell.type === "room")

describe("settle", () => {
  it("stands the switch in its junction, and marks it and its doors with the attempt's own switch mark", () => {
    const { prep, state, grid } = settled(switchFloor({ encounter: "sumplete", min: 1, max: 1 }))
    const [r, c] = state.forks.reserved[0].split(",").map(Number)
    const mark = switchMark(prep, 0)
    expect(grid.cells[r][c]).toMatchObject({ roomType: "fork", family: "sumplete", mark })
    const doors = rooms(grid.cells).filter(cell => cell.requiredKeyId?.startsWith("switch:"))
    expect(doors.length).toBeGreaterThan(0)
    for (const door of doors) expect(door.mark).toEqual(mark)
    expect([...prep.marks.markByGateKey.keys()].filter(key => key.startsWith("switch:"))).toEqual([])
  })

  it("opens a reserved junction again where no switch stands in it", () => {
    const { state, grid } = settled(switchFloor())
    const [r, c] = state.forks.reserved[0].split(",").map(Number)
    expect(grid.cells[r][c]).toMatchObject({ roomType: "fork" })
    expect(grid.cells[r][c]).not.toHaveProperty("mechanism")
    expect(rooms(grid.cells).filter(cell => cell.requiredKeyId?.startsWith("switch:"))).toEqual([])
  })
})
