import { describe, expect, it } from "vitest"
import {
  completeCell,
  findPath,
  getOwnedKeys,
  isOneWayMouth,
  renderAscii,
  revealAll,
  walkableFrom,
} from "./gridNavigation"
import { assembleFloor } from "./siteAssembler"
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
    // pointing back — the asymmetry the feature is for. At seed 0 that lands the connector at
    // (3,6) with dirs of just "n", the source at (4,6), and the landing at (2,6).
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

    const connector = grid.cells[3][6]
    const source = grid.cells[4][6]
    const landing = grid.cells[2][6]
    if (connector.type !== "corridor" || source.type !== "room" || landing.type !== "room")
      throw new Error("the carve at seed 0 moved — re-read the coordinates before trusting this test")
    expect([...connector.dirs]).toEqual(["n"])

    // Completing the source is the whole player action: nobody taps the connector on its own, because
    // it offers no branch to look around. Its own state comes out lit for free, the same as any other
    // straight corridor, and the room past it is reachable in the same pass.
    const updated = completeCell(grid, 4, 6)
    const updatedConnector = updated.cells[3][6]
    const updatedLanding = updated.cells[2][6]
    expect(updatedConnector.type).toBe("corridor")
    if (updatedConnector.type === "corridor") expect(updatedConnector.state).toBe("visible")
    expect(updatedLanding.type).toBe("room")
    if (updatedLanding.type === "room") expect(updatedLanding.state).toBe("reachable")
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

    const connector = grid.cells[3][6]
    const source = grid.cells[4][6]
    const landing = grid.cells[2][6]
    if (connector.type !== "corridor" || source.type !== "room" || landing.type !== "room")
      throw new Error("the carve at seed 0 moved — re-read the coordinates before trusting this test")
    expect([...connector.dirs]).toEqual(["n"])

    const updated = completeCell(grid, 2, 6)
    const updatedConnector = updated.cells[3][6]
    expect(updatedConnector.type).toBe("corridor")
    if (updatedConnector.type === "corridor") expect(updatedConnector.state).toBe("visible")

    // Past the mouth, still dark: the source is two cells from the landing, geometrically and on
    // the graph both, so nothing reaches it from this side.
    const updatedSource = updated.cells[4][6]
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

  it("finds exactly the drop's connector as a mouth on a carved floor, for every seed that carves it", () => {
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
      // A connector is a corridor whose one direction leads into a cell that names no way back into it.
      const mouths: string[] = []
      const connectors: string[] = []
      for (let r = 0; r < grid.rows; r++)
        for (let c = 0; c < grid.cols; c++) {
          const cell = grid.cells[r][c]
          if (cell.type !== "corridor" || cell.dirs.size !== 1) continue
          const [dir] = cell.dirs
          const step = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }[dir]
          const onward = grid.cells[r + step[0]][c + step[1]]
          const back = { n: "s", s: "n", e: "w", w: "e" }[dir] as Direction
          if (onward.type !== "empty" && !onward.dirs.has(back)) connectors.push(`${r},${c}`)
          if (isOneWayMouth(grid, r, c)) mouths.push(`${r},${c}`)
        }
      expect(connectors).toHaveLength(1)
      expect(mouths).toEqual(connectors)
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
