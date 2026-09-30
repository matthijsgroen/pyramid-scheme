import { describe, expect, it } from "vitest"
import {
  completeCell,
  findPath,
  getOwnedKeys,
  isOneWayMouth,
  oneWayMouthDir,
  oneWayRuns,
  renderAscii,
  revealAll,
  walkableFrom,
} from "./gridNavigation"
import { assembleFloor, ONE_WAY_RUN_CELLS } from "./siteAssembler"
import type { Direction, FloorConfig, FloorGrid, GridCell } from "./siteTypes"

// Simple 1×3 grid: [entrance room -e- corridor -e- exit room]
const makeLinearGrid = (): FloorGrid => ({
  siteId: "test",
  rows: 1,
  cols: 3,
  entrancePos: [0, 0],
  exitPos: [0, 2],
  staircases: {},
  cells: [
    [
      { type: "room", roomType: "encounter", dirs: new Set<Direction>(["e"]), state: "reachable" },
      { type: "corridor", dirs: new Set<Direction>(["w", "e"]), state: "fogged" },
      { type: "room", roomType: "portal", dirs: new Set<Direction>(["w"]), state: "fogged" },
    ],
  ],
})

describe(getOwnedKeys, () => {
  it("returns empty set when no completed tombKey rooms", () => {
    const grid = makeLinearGrid()
    expect(getOwnedKeys(grid).size).toBe(0)
  })

  it("returns key from completed tombKey treasure room", () => {
    const grid: FloorGrid = {
      siteId: "test",
      rows: 1,
      cols: 1,
      entrancePos: [0, 0],
      exitPos: [0, 0],
      staircases: {},
      cells: [
        [
          {
            type: "room",
            roomType: "encounter",
            dirs: new Set<Direction>(),
            state: "completed",
            reward: { type: "tombKey", keyId: "my-key" },
          },
        ],
      ],
    }
    const keys = getOwnedKeys(grid)
    expect(keys.has("my-key")).toBe(true)
  })
})

describe(completeCell, () => {
  it("marks the cell as completed", () => {
    const grid = makeLinearGrid()
    const updated = completeCell(grid, 0, 0)
    const cell = updated.cells[0][0]
    expect(cell.type).toBe("room")
    if (cell.type === "room") expect(cell.state).toBe("completed")
  })

  it("corridor becomes visible after completing adjacent room", () => {
    const grid = makeLinearGrid()
    const updated = completeCell(grid, 0, 0)
    const corridor = updated.cells[0][1]
    expect(corridor.type).toBe("corridor")
    if (corridor.type === "corridor") expect(corridor.state).toBe("visible")
  })

  it("exit room becomes reachable after completing corridor is visible (BFS continues)", () => {
    const grid = makeLinearGrid()
    const updated = completeCell(grid, 0, 0)
    // After completing entrance: corridor visible, exit room reachable
    const exitCell = updated.cells[0][2]
    expect(exitCell.type).toBe("room")
    if (exitCell.type === "room") expect(exitCell.state).toBe("reachable")
  })

  it("gate becomes reachable (clickable) even when its key isn't owned — gating is soft", () => {
    // A locked gate is still approachable and clickable; the gate family itself refuses
    // to solve until the key is held (see mods/core/app/keyGate/plugin.tsx). Reachability
    // no longer hard-blocks on requiredKeyId the way it used to.
    const gateGrid: FloorGrid = {
      siteId: "test",
      rows: 1,
      cols: 2,
      entrancePos: [0, 0],
      exitPos: [0, 1],
      staircases: {},
      cells: [
        [
          { type: "room", roomType: "encounter", dirs: new Set<Direction>(["e"]), state: "reachable" },
          {
            type: "room",
            roomType: "encounter",
            tags: ["gate"],
            dirs: new Set<Direction>(["w"]),
            state: "fogged",
            requiredKeyId: "some-key",
          },
        ],
      ],
    }
    const updated = completeCell(gateGrid, 0, 0)
    const gate = updated.cells[0][1]
    expect(gate.type).toBe("room")
    if (gate.type === "room") expect(gate.state).toBe("reachable")
  })

  it("gate reached around a corner follows the same corner-reveal rule as any other room", () => {
    // layout: entrance(0,0) -e- key-chest(0,1) -s- corridor(1,1) -w- gate(1,0)
    // The corridor at (1,1) is a corner {n,w}, so it becomes "reachable" after the chest;
    // the gate itself (around the corner) stays fogged until the corner is clicked.
    const grid: FloorGrid = {
      siteId: "test",
      rows: 2,
      cols: 2,
      entrancePos: [0, 0],
      exitPos: [1, 0],
      staircases: {},
      cells: [
        [
          { type: "room", roomType: "portal", dirs: new Set<Direction>(["e"]), state: "reachable" },
          {
            type: "room",
            roomType: "encounter",
            dirs: new Set<Direction>(["w", "s"]),
            state: "reachable",
            reward: { type: "tombKey", keyId: "the-key" },
          },
        ],
        [
          {
            type: "room",
            roomType: "encounter",
            tags: ["gate"],
            dirs: new Set<Direction>(["e"]),
            state: "fogged",
            requiredKeyId: "the-key",
          },
          { type: "corridor", dirs: new Set<Direction>(["n", "w"]), state: "fogged" },
        ],
      ],
    }
    const afterChest = completeCell(grid, 0, 1)
    // Corner corridor becomes reachable (player can see it, must click to look around)
    expect((afterChest.cells[1][1] as { state: string }).state).toBe("reachable")
    // Gate still fogged (around the corner)
    expect((afterChest.cells[1][0] as { state: string }).state).toBe("fogged")

    // Player clicks the corner
    const afterCorner = completeCell(afterChest, 1, 1)
    const gate = afterCorner.cells[1][0]
    expect(gate.type).toBe("room")
    if (gate.type === "room") expect(gate.state).toBe("reachable")
  })

  it("completing a corridor marks it completed and reveals the next room", () => {
    const grid = makeLinearGrid()
    // first reveal the corridor
    const afterEntrance = completeCell(grid, 0, 0)
    // now complete the corridor itself
    const updated = completeCell(afterEntrance, 0, 1)
    const corridor = updated.cells[0][1]
    expect(corridor.type).toBe("corridor")
    if (corridor.type === "corridor") expect(corridor.state).toBe("completed")
  })

  it("completing an already-completed cell is a no-op for other cells", () => {
    const grid = makeLinearGrid()
    const once = completeCell(grid, 0, 0)
    const twice = completeCell(once, 0, 0)
    // exit room should still be reachable either way
    const exit = twice.cells[0][2]
    expect(exit.type).toBe("room")
    if (exit.type === "room") expect(exit.state).toBe("reachable")
  })

  it("walks straight through a one-way connector instead of stopping there like a corner", () => {
    // A floor authoring a drop (oneWays: [{ from: "upper", to: "lower" }]) carves the source cell's
    // own direction toward the connector, the connector's single onward direction, and nothing
    // pointing back — the asymmetry the feature is for. At seed 0 that lands the source at (2,2), the
    // run at (3,2) to (7,2) with dirs of just "s", and the landing at (8,2), a corridor.
    const config: FloorConfig = {
      pathPuzzles: 2,
      difficulty: "junior",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "upper" },
        { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "lower" },
      ],
      oneWays: [{ from: "upper", to: "lower" }],
    }
    const result = assembleFloor("spike:1", config, 0, undefined, {
      floorRef: { journeyId: "spike", levelIndex: 0, floorIndex: 0 },
    })
    if (!result.success) throw new Error("seed 0 no longer carves the authored drop")
    const grid = result.grid

    const source = grid.cells[2][2]
    const landing = grid.cells[8][2]
    if (source.type !== "room" || landing.type !== "corridor")
      throw new Error("the carve at seed 0 moved — re-read the coordinates before trusting this test")
    for (let r = 3; r <= 7; r++) {
      const cell = grid.cells[r][2]
      if (cell.type !== "corridor") throw new Error("the carve at seed 0 moved — re-read the coordinates")
      expect([...cell.dirs]).toEqual(["s"])
    }

    // Completing the source is the whole player action: nobody taps a run cell on its own, because it
    // offers no branch to look around. Every cell of the run comes out lit for free, the same as any
    // other straight corridor, and the landing past it is a junction the player may look around.
    const updated = completeCell(grid, 2, 2)
    const states = [3, 4, 5, 6, 7, 8]
      .map(r => updated.cells[r][2])
      .map(cell => (cell.type === "empty" ? "empty" : cell.state))
    expect(states).toEqual([...Array(ONE_WAY_RUN_CELLS).fill("visible"), "reachable"])
  })

  it("shows a one-way's connector from the landing side, and reveals nothing past it", () => {
    // Same drop as above, completed from the OTHER end this time: the landing names no direction
    // back into the connector (a real dead end would), so the graph walk this function otherwise
    // does can never reach it — a player standing right beside the mouth would see none of it.
    const config: FloorConfig = {
      pathPuzzles: 2,
      difficulty: "junior",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "upper" },
        { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "lower" },
      ],
      oneWays: [{ from: "upper", to: "lower" }],
    }
    const result = assembleFloor("spike:1", config, 0, undefined, {
      floorRef: { journeyId: "spike", levelIndex: 0, floorIndex: 0 },
    })
    if (!result.success) throw new Error("seed 0 no longer carves the authored drop")
    const grid = result.grid

    const source = grid.cells[2][2]
    const landing = grid.cells[8][2]
    if (source.type !== "room" || landing.type !== "corridor")
      throw new Error("the carve at seed 0 moved — re-read the coordinates before trusting this test")

    // The whole run comes out of the fog, because the run is the zipline and the player is meant to
    // see it from its foot.
    const updated = completeCell(grid, 8, 2)
    const run = [3, 4, 5, 6, 7].map(r => updated.cells[r][2])
    expect(run.map(cell => cell.type)).toEqual(Array(ONE_WAY_RUN_CELLS).fill("corridor"))
    expect(run.map(cell => (cell.type === "corridor" ? cell.state : "empty"))).toEqual(
      Array(ONE_WAY_RUN_CELLS).fill("visible")
    )

    // Past the run, still dark: the source is six cells from the landing, and nothing reaches it from
    // this side.
    const updatedSource = updated.cells[2][2]
    expect(updatedSource.type).toBe("room")
    if (updatedSource.type === "room") expect(updatedSource.state).toBe("fogged")
  })

  it("stops at a one-way's landing when it is a corridor, even if its own onward direction matches the drop's", () => {
    // A region-addressed drop (an `obstacles` one-way, unlike the two tests above) can land mid-
    // corridor rather than in a room. The landing's dirs never include the direction back to the
    // connector (the asymmetry is the whole feature), so when its own real onward direction happens
    // to be the SAME compass direction the drop travels in — "e" here, both ways — the straight-
    // through check must not read that coincidence as "no branch to click around": the landing is a
    // fresh junction (it also opens south), not a continuation of the same hallway.
    const grid: FloorGrid = {
      siteId: "test",
      rows: 2,
      cols: 4,
      entrancePos: [0, 0],
      exitPos: [0, 3],
      staircases: {},
      cells: [
        [
          { type: "room", roomType: "encounter", dirs: new Set<Direction>(["e"]), state: "reachable" },
          { type: "corridor", dirs: new Set<Direction>(["e"]), state: "fogged" },
          { type: "corridor", dirs: new Set<Direction>(["e", "s"]), state: "fogged" },
          { type: "corridor", dirs: new Set<Direction>(["w"]), state: "fogged" },
        ],
        [
          { type: "empty" },
          { type: "empty" },
          { type: "corridor", dirs: new Set<Direction>(["n"]), state: "fogged" },
          { type: "empty" },
        ],
      ],
    }

    const updated = completeCell(grid, 0, 0)
    const connector = updated.cells[0][1]
    const landing = updated.cells[0][2]
    expect(connector.type).toBe("corridor")
    if (connector.type === "corridor") expect(connector.state).toBe("visible")
    // The landing itself is drawn — a fresh corner the player can choose to walk to, same as any
    // other newly-found junction — but nothing beyond it is.
    expect(landing.type).toBe("corridor")
    if (landing.type === "corridor") expect(landing.state).toBe("reachable")
    const furtherEast = updated.cells[0][3]
    const furtherSouth = updated.cells[1][2]
    expect(furtherEast.type).toBe("corridor")
    if (furtherEast.type === "corridor") expect(furtherEast.state).toBe("fogged")
    expect(furtherSouth.type).toBe("corridor")
    if (furtherSouth.type === "corridor") expect(furtherSouth.state).toBe("fogged")
  })
})

// source(0,0) --e--> mouth(0,1), dirs {e} only --e--> landing(0,2), dirs {} — the same shape the
// SiteMapView arrow spec uses: the landing names no direction back into the mouth (the asymmetry
// itself), so this isolates exactly the two cells a zipline's mouth ever touches.
const oneWayMouthGrid = (): FloorGrid => ({
  siteId: "test",
  rows: 1,
  cols: 3,
  entrancePos: [0, 0],
  exitPos: [0, 2],
  staircases: {},
  cells: [
    [
      { type: "room", roomType: "encounter", dirs: new Set<Direction>(["e"]), state: "reachable" },
      { type: "corridor", dirs: new Set<Direction>(["e"]), state: "visible" },
      { type: "room", roomType: "encounter", dirs: new Set<Direction>(), state: "reachable" },
    ],
  ],
})

describe(isOneWayMouth, () => {
  it("is true for the mouth, and false for its landing and its source", () => {
    const grid = oneWayMouthGrid()
    expect(isOneWayMouth(grid, 0, 1)).toBe(true)
    expect(isOneWayMouth(grid, 0, 2)).toBe(false)
    expect(isOneWayMouth(grid, 0, 0)).toBe(false)
  })

  // A 1x3 row or 3x1 column, source - corridor - landing, with the corridor's one direction pointing at
  // the landing. `landingNamesBack` is the only thing that differs between a drop and a dead-end stub.
  const axes: { name: string; toward: Direction; back: Direction; at: [number, number]; size: [number, number] }[] = [
    { name: "east", toward: "e", back: "w", at: [0, 1], size: [1, 3] },
    { name: "west", toward: "w", back: "e", at: [0, 1], size: [1, 3] },
    { name: "south", toward: "s", back: "n", at: [1, 0], size: [3, 1] },
    { name: "north", toward: "n", back: "s", at: [1, 0], size: [3, 1] },
  ]
  const line = (toward: Direction, back: Direction, size: [number, number], landingNamesBack: boolean): FloorGrid => {
    const [rows, cols] = size
    const source: GridCell = { type: "room", roomType: "encounter", dirs: new Set([toward]), state: "reachable" }
    const mouth: GridCell = { type: "corridor", dirs: new Set([toward]), state: "visible" }
    const land: GridCell = {
      type: "room",
      roomType: "encounter",
      dirs: new Set(landingNamesBack ? [back] : []),
      state: "reachable",
    }
    // The corridor points at the landing, so the landing sits on the `toward` side of it.
    const cells = [source, mouth, land]
    const ordered = toward === "e" || toward === "s" ? cells : [...cells].reverse()
    return {
      siteId: "test",
      rows,
      cols,
      entrancePos: [0, 0],
      exitPos: [0, 0],
      staircases: {},
      cells: rows === 1 ? [ordered] : ordered.map(cell => [cell]),
    }
  }

  it.each(axes)("recognises a drop's mouth going $name, where the landing names no way back", axis => {
    expect(isOneWayMouth(line(axis.toward, axis.back, axis.size, false), ...axis.at)).toBe(true)
  })

  it.each(axes)("does not take a dead-end stub going $name for a mouth, where the landing names the stub", axis => {
    expect(isOneWayMouth(line(axis.toward, axis.back, axis.size, true), ...axis.at)).toBe(false)
  })

  it("finds exactly the last cell of the drop's run as a mouth on a carved floor, for every seed that carves it", () => {
    const config: FloorConfig = {
      pathPuzzles: 2,
      difficulty: "junior",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "upper" },
        { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "lower" },
      ],
      oneWays: [{ from: "upper", to: "lower" }],
    }
    let carved = 0
    for (let seed = 0; seed < 30; seed++) {
      const result = assembleFloor("spike:1", config, seed, undefined, {
        floorRef: { journeyId: "spike", levelIndex: 0, floorIndex: 0 },
      })
      if (!result.success) continue
      carved++
      const grid = result.grid
      // A run cell is a corridor whose one direction leads into a cell that names no way back into it.
      // Only the last of them has the landing for its onward neighbour; the others lead into the next.
      const mouths: string[] = []
      const connectors: string[] = []
      const isConnector = (r: number, c: number): boolean => {
        const cell = grid.cells[r]?.[c]
        if (cell?.type !== "corridor" || cell.dirs.size !== 1) return false
        const [dir] = cell.dirs
        const step = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }[dir]
        const onward = grid.cells[r + step[0]][c + step[1]]
        const back = { n: "s", s: "n", e: "w", w: "e" }[dir] as Direction
        return onward.type !== "empty" && !onward.dirs.has(back)
      }
      const ends: string[] = []
      for (let r = 0; r < grid.rows; r++)
        for (let c = 0; c < grid.cols; c++) {
          const cell = grid.cells[r][c]
          if (cell.type !== "corridor" || cell.dirs.size !== 1) continue
          const [dir] = cell.dirs
          const step = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }[dir]
          if (isConnector(r, c)) {
            connectors.push(`${r},${c}`)
            if (!isConnector(r + step[0], c + step[1])) ends.push(`${r},${c}`)
          }
          if (isOneWayMouth(grid, r, c)) mouths.push(`${r},${c}`)
        }
      expect(connectors).toHaveLength(ONE_WAY_RUN_CELLS)
      expect(ends).toHaveLength(1)
      expect(mouths).toEqual(ends)
    }
    expect(carved).toBeGreaterThan(0)
  })
})

describe(walkableFrom, () => {
  it("from the landing, the mouth is walkable — and nothing beyond it is", () => {
    const grid = oneWayMouthGrid()
    expect(walkableFrom(grid, [0, 2])).toEqual(new Set(["0,2", "0,1"]))
  })

  it("from the mouth, the only walkable neighbour is the landing", () => {
    const grid = oneWayMouthGrid()
    expect(walkableFrom(grid, [0, 1])).toEqual(new Set(["0,1", "0,2"]))
  })
})

// A MOUTH CHAIN ENDS AT A CELL WITH MORE THAN ONE WAY OUT, which is why walking up a drop from its
// landing never breaches a region. A cell with one `dirs` entry can only be left along it, so the only
// ground such a walk climbs is corridors that name just the way onward; the first cell with two ways out,
// or a room, is never a mouth (`isRunEnd` demands a lone direction) and the climb stops below it.
describe("walking up from a landing", () => {
  const corridor = (dirs: Direction[]): GridCell => ({ type: "corridor", dirs: new Set(dirs), state: "visible" })
  const landingRoom: GridCell = { type: "room", roomType: "encounter", dirs: new Set(), state: "reachable" }
  const rowOf = (cells: GridCell[]): FloorGrid => ({
    siteId: "test",
    rows: 1,
    cols: cells.length,
    entrancePos: [0, 0],
    exitPos: [0, cells.length - 1],
    staircases: {},
    cells: [cells],
  })
  // room{e}, `departure` (if any), ONE_WAY_RUN_CELLS run cells naming only "e", landing{}.
  const chainGrid = (departures: GridCell[]): FloorGrid =>
    rowOf([
      { type: "room", roomType: "encounter", dirs: new Set<Direction>(["e"]), state: "reachable" },
      ...departures,
      ...Array.from({ length: ONE_WAY_RUN_CELLS }, () => corridor(["e"])),
      landingRoom,
    ])
  const climbedFrom = (grid: FloorGrid): number[] => {
    const landing = grid.cols - 1
    return [...walkableFrom(grid, [0, landing])].map(key => Number(key.split(",")[1])).filter(col => col !== landing)
  }

  it.each([0, 1, 2, 3])(
    "climbs only lone-direction corridors, never the room behind them, with %i of them before the run",
    lone => {
      const grid = chainGrid(Array.from({ length: lone }, () => corridor(["e"])))
      const climbed = climbedFrom(grid)
      expect(climbed.length).toBeGreaterThan(0)
      for (const col of climbed) {
        const cell = grid.cells[0][col]
        expect(cell).toMatchObject({ type: "corridor", dirs: new Set<Direction>(["e"]) })
      }
      expect(climbed).not.toContain(0)
    }
  )

  it("climbs past the mouth into a run cell when a lone-direction departure lengthens the chain to one past the run", () => {
    // Columns: room 0, departure 1, run 2-6, landing 7. Cell 5 is the fifth of a chain of six, so it too
    // reads as the end of a run of ONE_WAY_RUN_CELLS and is a mouth in its own right.
    const grid = chainGrid([corridor(["e"])])
    expect(climbedFrom(grid).sort()).toEqual([5, 6])
  })

  it("climbs no further than the mouth when the chain is any other length", () => {
    // Columns: room 0, two lone departures 1-2, run 3-7, landing 8. Cell 6 is the sixth of the chain, not
    // the fifth, so the mouth at 7 has no mouth beside it to climb to.
    expect(climbedFrom(chainGrid([corridor(["e"]), corridor(["e"])]))).toEqual([7])
    expect(climbedFrom(chainGrid([]))).toEqual([ONE_WAY_RUN_CELLS])
  })

  // The order the departure's directions are written in must not matter: "the only direction" is a
  // question of how many there are, never of which one is listed first.
  it.each([[["w", "e"]], [["e", "w"]], [["n", "e"]], [["e", "n"]], [["s", "e"]], [["e", "s"]]] as Direction[][][])(
    "stops at the mouth when the departure names %j, leaving the run and all behind it unclimbed",
    dirs => {
      expect(climbedFrom(chainGrid([corridor(dirs)]))).toEqual([ONE_WAY_RUN_CELLS + 1])
    }
  )

  it("never meets a lone-direction departure on a carved floor: every drop leaves a node that also names its way in", () => {
    const config: FloorConfig = {
      pathPuzzles: 2,
      difficulty: "junior",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "upper" },
        { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "lower" },
      ],
      oneWays: [{ from: "upper", to: "lower" }],
    }
    let drops = 0
    for (let seed = 0; seed < 30; seed++) {
      const result = assembleFloor("spike:1", config, seed, undefined, {
        floorRef: { journeyId: "spike", levelIndex: 0, floorIndex: 0 },
      })
      if (!result.success) continue
      for (const run of oneWayRuns(result.grid)) {
        drops++
        const [r, c] = run.departure
        const departure = result.grid.cells[r][c]
        expect(departure.type === "empty" ? 0 : departure.dirs.size).toBeGreaterThan(1)
      }
    }
    expect(drops).toBeGreaterThan(0)
  })
})

// A drop at full length on one row: departure, ONE_WAY_RUN_CELLS run cells each naming only "e", landing.
// Every cell starts as `state`, so what a walk or a reveal does to it is the only thing under test.
const runGrid = (state: "visible" | "fogged"): FloorGrid => ({
  siteId: "test",
  rows: 1,
  cols: ONE_WAY_RUN_CELLS + 2,
  entrancePos: [0, 0],
  exitPos: [0, ONE_WAY_RUN_CELLS + 1],
  staircases: {},
  cells: [
    [
      { type: "room", roomType: "encounter", dirs: new Set<Direction>(["e"]), state: "reachable" },
      ...Array.from({ length: ONE_WAY_RUN_CELLS }, (): GridCell => ({
        type: "corridor",
        dirs: new Set<Direction>(["e"]),
        state,
      })),
      { type: "room", roomType: "encounter", dirs: new Set<Direction>(), state: "reachable" },
    ],
  ],
})
const runCols = Array.from({ length: ONE_WAY_RUN_CELLS }, (_, k) => k + 1)
const landingCol = ONE_WAY_RUN_CELLS + 1

describe("a drop that is a run of cells", () => {
  it("has exactly one mouth, the run's last cell, and no other cell on the row is one", () => {
    const grid = runGrid("visible")
    const mouths = grid.cells[0].map((_, c) => isOneWayMouth(grid, 0, c))
    expect(mouths).toEqual(grid.cells[0].map((_, c) => c === ONE_WAY_RUN_CELLS))
  })

  it("names the mouth from the landing alone, and from no cell of the run or the departure", () => {
    const grid = runGrid("visible")
    expect(grid.cells[0].map((_, c) => oneWayMouthDir(grid, 0, c))).toEqual(
      grid.cells[0].map((_, c) => (c === landingCol ? "w" : undefined))
    )
  })

  it("reads back as one drop: its departure, its cells in order from the departure, its landing", () => {
    expect(oneWayRuns(runGrid("visible"))).toEqual([
      { departure: [0, 0], cells: runCols.map(c => [0, c]), landing: [0, landingCol], dir: "e" },
    ])
  })

  it("lets the landing step onto the run's last cell and no further up", () => {
    expect(walkableFrom(runGrid("visible"), [0, landingCol])).toEqual(
      new Set([`0,${landingCol}`, `0,${ONE_WAY_RUN_CELLS}`])
    )
  })

  it("lets the run's last cell step back to the landing and nowhere up the run", () => {
    expect(walkableFrom(runGrid("visible"), [0, ONE_WAY_RUN_CELLS])).toEqual(
      new Set([`0,${ONE_WAY_RUN_CELLS}`, `0,${landingCol}`])
    )
  })

  it("lets the departure walk the whole run to the landing", () => {
    expect(walkableFrom(runGrid("visible"), [0, 0])).toEqual(
      new Set(runGrid("visible").cells[0].map((_, c) => `0,${c}`))
    )
  })

  it("finds no route from the landing to the departure, and the one step to the mouth", () => {
    const grid = runGrid("visible")
    expect(findPath(grid, [0, landingCol], [0, 0])).toEqual([])
    expect(findPath(grid, [0, landingCol], [0, ONE_WAY_RUN_CELLS])).toEqual([
      [0, landingCol],
      [0, ONE_WAY_RUN_CELLS],
    ])
  })

  it("brings the whole run out of the fog from the landing, and nothing behind the departure", () => {
    const after = completeCell(runGrid("fogged"), 0, landingCol)
    expect(after.cells[0].map(cell => (cell.type === "corridor" ? cell.state : "room"))).toEqual([
      "room",
      ...Array(ONE_WAY_RUN_CELLS).fill("visible"),
      "room",
    ])
  })

  it("brings the whole run out of the fog from the departure, straight through to the landing", () => {
    const after = completeCell(runGrid("fogged"), 0, 0)
    expect(after.cells[0].map(cell => (cell.type === "corridor" ? cell.state : "room"))).toEqual([
      "room",
      ...Array(ONE_WAY_RUN_CELLS).fill("visible"),
      "room",
    ])
  })

  it("takes a stub as long as the run, hanging off a node that names it, for no mouth at all", () => {
    const stub: GridCell[] = Array.from({ length: ONE_WAY_RUN_CELLS }, () => ({
      type: "corridor",
      dirs: new Set<Direction>(["w"]),
      state: "visible",
    }))
    const grid: FloorGrid = {
      ...runGrid("visible"),
      cells: [
        [
          { type: "room", roomType: "encounter", dirs: new Set<Direction>(["e"]), state: "reachable" },
          ...stub,
          { type: "room", roomType: "encounter", dirs: new Set<Direction>(), state: "reachable" },
        ],
      ],
    }
    expect(grid.cells[0].map((_, c) => isOneWayMouth(grid, 0, c))).toEqual(grid.cells[0].map(() => false))
  })
})

describe(findPath, () => {
  it("returns single-element path when from === to", () => {
    const grid = makeLinearGrid()
    const path = findPath(grid, [0, 0], [0, 0])
    expect(path).toEqual([[0, 0]])
  })

  it("returns path through corridor cells between two rooms", () => {
    // Same shape as makeLinearGrid, but with states representing already-explored ground —
    // the corridor and destination need to be seen (not "fogged") to be a valid route at all.
    const grid: FloorGrid = {
      ...makeLinearGrid(),
      cells: [
        [
          { type: "room", roomType: "encounter", dirs: new Set<Direction>(["e"]), state: "reachable" },
          { type: "corridor", dirs: new Set<Direction>(["w", "e"]), state: "visible" },
          { type: "room", roomType: "portal", dirs: new Set<Direction>(["w"]), state: "reachable" },
        ],
      ],
    }
    const path = findPath(grid, [0, 0], [0, 2])
    expect(path).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
    ])
  })

  it("never routes through a fogged (unexplored) cell, even when it's the only shortest route", () => {
    // A diamond: (0,1) is a direct, unexplored shortcut between the two rooms; (1,0)-(1,1)-(1,2)
    // is a longer detour the player has actually seen. Real loops mean the graph-shortest path
    // and the "route the player has walked" can now genuinely differ.
    const grid: FloorGrid = {
      siteId: "test",
      rows: 2,
      cols: 3,
      entrancePos: [0, 0],
      exitPos: [0, 2],
      staircases: {},
      cells: [
        [
          { type: "room", roomType: "encounter", dirs: new Set<Direction>(["e", "s"]), state: "reachable" },
          { type: "corridor", dirs: new Set<Direction>(["w", "e"]), state: "fogged" },
          { type: "room", roomType: "portal", dirs: new Set<Direction>(["w", "s"]), state: "reachable" },
        ],
        [
          { type: "corridor", dirs: new Set<Direction>(["n", "e"]), state: "visible" },
          { type: "corridor", dirs: new Set<Direction>(["w", "e"]), state: "visible" },
          { type: "corridor", dirs: new Set<Direction>(["w", "n"]), state: "visible" },
        ],
      ],
    }
    const path = findPath(grid, [0, 0], [0, 2])
    expect(path).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
      [0, 2],
    ])
  })

  // It used to answer `[from, to]` here — a two-point straight line — and every caller took it for a
  // route: the explorer glided across solid stone to a cell it had no way of reaching.
  it("returns no path at all when there is no walkable route", () => {
    const grid: FloorGrid = {
      siteId: "test",
      rows: 1,
      cols: 3,
      entrancePos: [0, 0],
      exitPos: [0, 2],
      staircases: {},
      cells: [
        [
          { type: "room", roomType: "encounter", dirs: new Set<Direction>([]), state: "reachable" },
          { type: "empty" },
          { type: "room", roomType: "portal", dirs: new Set<Direction>([]), state: "reachable" },
        ],
      ],
    }

    expect(findPath(grid, [0, 0], [0, 2])).toEqual([])
  })

  it("returns no path when the only route runs through unexplored ground", () => {
    const grid: FloorGrid = {
      siteId: "test",
      rows: 1,
      cols: 3,
      entrancePos: [0, 0],
      exitPos: [0, 2],
      staircases: {},
      cells: [
        [
          { type: "room", roomType: "encounter", dirs: new Set<Direction>(["e"]), state: "reachable" },
          { type: "corridor", dirs: new Set<Direction>(["w", "e"]), state: "fogged" },
          { type: "room", roomType: "portal", dirs: new Set<Direction>(["w"]), state: "reachable" },
        ],
      ],
    }

    expect(findPath(grid, [0, 0], [0, 2])).toEqual([])
  })

  it("routes onto a one-way mouth from its landing, and refuses to route beyond it", () => {
    const grid = oneWayMouthGrid()
    expect(findPath(grid, [0, 2], [0, 1])).toEqual([
      [0, 2],
      [0, 1],
    ])
    expect(findPath(grid, [0, 1], [0, 0])).toEqual([])
  })
})

describe(revealAll, () => {
  it("sets all non-empty cells to reachable", () => {
    const grid = makeLinearGrid()
    const revealed = revealAll(grid)
    for (const row of revealed.cells) {
      for (const cell of row) {
        if (cell.type !== "empty") {
          expect(cell.state).toBe("reachable")
        }
      }
    }
  })
})

const corridor = (dirs: string[]): GridCell =>
  ({ type: "corridor", dirs: new Set(dirs), state: "visible" }) as unknown as GridCell

const gridOf = (cells: GridCell[][]): FloorGrid =>
  ({ rows: cells.length, cols: cells[0].length, cells, entrancePos: [0, 0], exitPos: [0, 0] }) as unknown as FloorGrid

describe("renderAscii", () => {
  it("draws a cell you may only leave one way as the arrow it is", () => {
    const drawn = renderAscii(gridOf([[corridor(["s"]), corridor(["n"]), corridor(["e"]), corridor(["w"])]]))
    expect(drawn.trim()).toBe("↓↑→←")
  })

  it("draws an arrow only for a cell with exactly one way out", () => {
    // A corridor with no ways out is the only other cell that reaches the arrow's guard: every two-
    // and three-direction set is already claimed by the line and corner branches above it.
    const drawn = renderAscii(gridOf([[corridor([]), corridor(["e", "w"])]]))
    expect(drawn.trim()).toBe("·─")
    expect(drawn).not.toContain("←")
  })
})
