import { describe, expect, it } from "vitest"
import {
  completeCell,
  findPath,
  getOwnedKeys,
  isObstacleCell,
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

const MOVE: Record<Direction, readonly [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const stateOf = (cell: GridCell): string => (cell.type === "empty" ? "empty" : cell.state)

// A floor that authors one drop between two side sections, which the carve lays as launch, obstacle,
// landing between two nodes.
const dropFloor: FloorConfig = {
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

  it("brings the zipline out of the fog from the launch's node, and nothing past it, on every carved floor", () => {
    let checked = 0
    for (let seed = 0; seed < 30; seed++) {
      const result = assembleFloor("spike:1", dropFloor, seed, undefined, {
        floorRef: { journeyId: "spike", levelIndex: 0, floorIndex: 0 },
      })
      if (!result.success) continue
      for (const run of oneWayRuns(result.grid)) {
        checked++
        const [fr, fc] = [run.launch[0] - MOVE[run.dir][0], run.launch[1] - MOVE[run.dir][1]]
        const after = completeCell(result.grid, fr, fc)
        expect(run.cells.map(([r, c]) => stateOf(after.cells[r][c]))).toEqual(Array(ONE_WAY_RUN_CELLS).fill("visible"))
        expect(stateOf(after.cells[run.landing[0]][run.landing[1]])).toBe("fogged")
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it("brings the zipline out of the fog from the landing's node, and nothing past it, on every carved floor", () => {
    let checked = 0
    for (let seed = 0; seed < 30; seed++) {
      const result = assembleFloor("spike:1", dropFloor, seed, undefined, {
        floorRef: { journeyId: "spike", levelIndex: 0, floorIndex: 0 },
      })
      if (!result.success) continue
      for (const run of oneWayRuns(result.grid)) {
        checked++
        const [tr, tc] = [run.landing[0] + MOVE[run.dir][0], run.landing[1] + MOVE[run.dir][1]]
        const after = completeCell(result.grid, tr, tc)
        expect(run.cells.map(([r, c]) => stateOf(after.cells[r][c]))).toEqual(Array(ONE_WAY_RUN_CELLS).fill("visible"))
        expect(stateOf(after.cells[run.launch[0]][run.launch[1]])).toBe("fogged")
      }
    }
    expect(checked).toBeGreaterThan(0)
  })
})

// A drop on one row, east-going, as the carve lays it: from-node, launch, ONE_WAY_RUN_CELLS obstacle
// cells, landing, to-node. Every cell starts as `state`, so what a walk or a reveal does to it is the
// only thing under test.
const LAUNCH = 1
const OBSTACLE = Array.from({ length: ONE_WAY_RUN_CELLS }, (_, k) => k + 2)
const LANDING = ONE_WAY_RUN_CELLS + 2
const TO_NODE = ONE_WAY_RUN_CELLS + 3
const runGrid = (state: "visible" | "fogged"): FloorGrid => ({
  siteId: "test",
  rows: 1,
  cols: ONE_WAY_RUN_CELLS + 4,
  entrancePos: [0, 0],
  exitPos: [0, TO_NODE],
  staircases: {},
  cells: [
    [
      { type: "room", roomType: "encounter", dirs: new Set<Direction>(["e"]), state },
      { type: "corridor", dirs: new Set<Direction>(["w"]), state },
      ...OBSTACLE.map((): GridCell => ({
        type: "corridor",
        dirs: new Set<Direction>(),
        state,
        obstacle: { dir: "e", kind: "zipline" },
      })),
      { type: "corridor", dirs: new Set<Direction>(["e"]), state },
      { type: "room", roomType: "encounter", dirs: new Set<Direction>(["w"]), state },
    ],
  ],
})
const keysOf = (...cols: number[]) => new Set(cols.map(c => `0,${c}`))

describe(oneWayRuns, () => {
  it("reads back as one drop: its launch, its obstacle cells in order from the launch, its landing", () => {
    expect(oneWayRuns(runGrid("visible"))).toEqual([
      { launch: [0, LAUNCH], cells: OBSTACLE.map(c => [0, c]), landing: [0, LANDING], dir: "e", kind: "zipline" },
    ])
  })

  it("reads each of two drops back whole, running opposite ways on one floor", () => {
    const east = runGrid("visible").cells[0]
    const mirror = (cell: GridCell): GridCell => {
      if (cell.type === "empty") return cell
      const dirs = new Set<Direction>([...cell.dirs].map(d => (d === "e" ? "w" : "e")))
      return cell.type === "corridor" && cell.obstacle
        ? { ...cell, dirs, obstacle: { dir: "w", kind: "zipline" } }
        : { ...cell, dirs }
    }
    const west = [...east].reverse().map(mirror)
    // Column `c` of the east row is column `last - c` of its mirror.
    const last = TO_NODE
    const both: FloorGrid = {
      ...runGrid("visible"),
      rows: 3,
      cells: [east, [...east].map(() => ({ type: "empty" }) as GridCell), west],
    }
    expect(oneWayRuns(both)).toEqual([
      { launch: [0, LAUNCH], cells: OBSTACLE.map(c => [0, c]), landing: [0, LANDING], dir: "e", kind: "zipline" },
      {
        launch: [2, last - LAUNCH],
        cells: OBSTACLE.map(col => [2, last - col]),
        landing: [2, last - LANDING],
        dir: "w",
        kind: "zipline",
      },
    ])
  })

  it("finds no drop in a floor that carries no marker, however a corridor is shaped", () => {
    const unmarked: FloorGrid = {
      ...runGrid("visible"),
      cells: [
        runGrid("visible").cells[0].map((cell): GridCell =>
          cell.type === "corridor" ? { ...cell, obstacle: undefined } : cell
        ),
      ],
    }
    expect(oneWayRuns(unmarked)).toEqual([])
  })
})

describe(isObstacleCell, () => {
  it("is true for exactly the obstacle's cells, and false for the launch, the landing and both nodes", () => {
    const grid = runGrid("visible")
    expect(grid.cells[0].map(cell => isObstacleCell(cell))).toEqual(grid.cells[0].map((_, c) => OBSTACLE.includes(c)))
  })

  it("is false for an unmarked corridor that names no direction, and for no cell at all", () => {
    expect(isObstacleCell({ type: "corridor", dirs: new Set(), state: "visible" })).toBe(false)
    expect(isObstacleCell(undefined)).toBe(false)
  })
})

describe(walkableFrom, () => {
  const grid = runGrid("visible")

  it("from the launch, walks to its own node and nothing across the obstacle", () => {
    expect(walkableFrom(grid, [0, LAUNCH])).toEqual(keysOf(0, LAUNCH))
  })

  it("from the landing, walks to its own node and nothing toward the obstacle", () => {
    expect(walkableFrom(grid, [0, LANDING])).toEqual(keysOf(LANDING, TO_NODE))
  })

  it.each(OBSTACLE)("from obstacle cell %i, walks nowhere but the cell itself", col => {
    expect(walkableFrom(grid, [0, col])).toEqual(keysOf(col))
  })

  it("from either node, walks its own side's ground and none of the obstacle", () => {
    expect(walkableFrom(grid, [0, 0])).toEqual(keysOf(0, LAUNCH))
    expect(walkableFrom(grid, [0, TO_NODE])).toEqual(keysOf(LANDING, TO_NODE))
  })
})

describe("a drop is a span of cells", () => {
  it("finds no route from the launch to the landing, nor from the landing to the launch", () => {
    const grid = runGrid("visible")
    expect(findPath(grid, [0, LAUNCH], [0, LANDING])).toEqual([])
    expect(findPath(grid, [0, LANDING], [0, LAUNCH])).toEqual([])
  })

  it("finds the one step from each end to its own node, and none onto any obstacle cell", () => {
    const grid = runGrid("visible")
    expect(findPath(grid, [0, LAUNCH], [0, 0])).toEqual([
      [0, LAUNCH],
      [0, 0],
    ])
    expect(findPath(grid, [0, LANDING], [0, TO_NODE])).toEqual([
      [0, LANDING],
      [0, TO_NODE],
    ])
    for (const col of OBSTACLE) {
      expect(findPath(grid, [0, LAUNCH], [0, col])).toEqual([])
      expect(findPath(grid, [0, LANDING], [0, col])).toEqual([])
    }
  })

  it("brings the whole obstacle out of the fog from the landing, and nothing behind the launch", () => {
    const after = completeCell(runGrid("fogged"), 0, LANDING)
    expect(after.cells[0].map(stateOf)).toEqual([
      "fogged",
      "fogged",
      ...Array(ONE_WAY_RUN_CELLS).fill("visible"),
      "completed",
      "reachable",
    ])
  })

  it("brings the whole obstacle out of the fog from the launch, and nothing past the landing", () => {
    const after = completeCell(runGrid("fogged"), 0, LAUNCH)
    expect(after.cells[0].map(stateOf)).toEqual([
      "reachable",
      "completed",
      ...Array(ONE_WAY_RUN_CELLS).fill("visible"),
      "fogged",
      "fogged",
    ])
  })

  it("brings the obstacle out of the fog from the node beside the launch, with the landing still dark", () => {
    const after = completeCell(runGrid("fogged"), 0, 0)
    expect(after.cells[0].map(stateOf)).toEqual([
      "completed",
      "reachable",
      ...Array(ONE_WAY_RUN_CELLS).fill("visible"),
      "fogged",
      "fogged",
    ])
  })

  it("takes an unmarked dead end as long as the obstacle for no drop at all, its cells left in the fog", () => {
    const stub: GridCell[] = OBSTACLE.map(() => ({
      type: "corridor",
      dirs: new Set<Direction>(["w"]),
      state: "fogged",
    }))
    const grid: FloorGrid = {
      ...runGrid("fogged"),
      cells: [
        [
          runGrid("fogged").cells[0][0],
          runGrid("fogged").cells[0][1],
          ...stub,
          ...runGrid("fogged").cells[0].slice(-2),
        ],
      ],
    }
    expect(oneWayRuns(grid)).toEqual([])
    expect(
      completeCell(grid, 0, LAUNCH)
        .cells[0].slice(2, 2 + ONE_WAY_RUN_CELLS)
        .map(stateOf)
    ).toEqual(Array(ONE_WAY_RUN_CELLS).fill("fogged"))
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
