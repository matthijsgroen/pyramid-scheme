import { describe, expect, it } from "vitest"
import { describeFloorWalkFailure, walkFloorLock } from "../../floorLockWalk"
import { oneWayRuns } from "../../gridNavigation"
import { parseLock } from "../../lockNotation"
import { variantsOf } from "../../prefabChecks"
import { parsePrefab } from "../../prefabNotation"
import { validateSite } from "../../siteValidator"
import type { Direction, FloorConfig, FloorGrid, RoomCell } from "../../siteTypes"
import { BINDING } from "../../testSupport/lockFixtures"
import { assembleFloor } from "../assembleFloor"
import { drawnSketch, plainFloor } from "../carveFixtures"
import { LATTICE_ENGINE, ROOMS_ENGINE } from "../engines"
import { OPPOSITE } from "../grid"
import { seatOf, stampPrefab } from "../placePrefabs"
import type { Cell, FloorPrep } from "../state"
import { embedFloor, type EmbedOptions, type Embedded } from "./embedFloor"
import { MOVES } from "./graph"

const DIRS = Object.keys(MOVES) as Direction[]

const opts = (overrides: Partial<EmbedOptions> = {}): EmbedOptions => ({
  seed: 1,
  spread: 0.5,
  rooms: new Map(),
  ...overrides,
})

const embed = (grid: FloorGrid, options: EmbedOptions): Embedded => {
  const embedded = embedFloor(grid, options)
  if ("refused" in embedded) throw new Error(embedded.refused)
  return embedded
}

/** A drawn sketch's stops: its rooms, every node that is more than plain corridor. */
const latticeNodes = (grid: FloorGrid): Map<string, Cell> => {
  const nodes = new Map<string, Cell>()
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (r % 2 || c % 2 || cell.type !== "room") return
      nodes.set(`${r},${c}`, [r, c])
    })
  )
  return nodes
}

/** Which nodes a walk reaches from each node without passing another, as sorted "a|b" pairs of node names. */
const nodeGraph = (grid: FloorGrid, nodes: ReadonlyMap<string, Cell>): string[] => {
  const nameAt = new Map([...nodes].map(([name, [r, c]]) => [`${r},${c}`, name]))
  const pairs = new Set<string>()
  for (const [name, start] of nodes) {
    const seen = new Set([`${start[0]},${start[1]}`])
    const queue: Cell[] = [start]
    while (queue.length) {
      const [r, c] = queue.shift()!
      const cell = grid.cells[r][c]
      if (cell.type === "empty") continue
      for (const d of cell.dirs) {
        const next: Cell = [r + MOVES[d][0], c + MOVES[d][1]]
        const k = `${next[0]},${next[1]}`
        if (seen.has(k)) continue
        seen.add(k)
        const other = nameAt.get(k)
        if (other !== undefined) pairs.add([name, other].sort().join("|"))
        else queue.push(next)
      }
    }
  }
  return [...pairs].sort()
}

const unmutual = (grid: FloorGrid): string[] =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) =>
      cell.type === "empty"
        ? []
        : [...cell.dirs]
            .filter(d => {
              const next = grid.cells[r + MOVES[d][0]]?.[c + MOVES[d][1]]
              return !next || next.type === "empty" || !next.dirs.has(OPPOSITE[d])
            })
            .map(d => `${r},${c}${d}`)
    )
  )

/** Every two cells side by side that no way joins: a corridor running beside something it does not join. */
const touching = (grid: FloorGrid): string[] =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) =>
      cell.type === "empty"
        ? []
        : (["e", "s"] as const)
            .filter(d => {
              const next = grid.cells[r + MOVES[d][0]]?.[c + MOVES[d][1]]
              return next && next.type !== "empty" && !cell.dirs.has(d)
            })
            .map(d => `${r},${c}${d}`)
    )
  )

// prettier-ignore
const BRANCHING = [
  "E.F.R.R",
  "  .   .",
  "  T.R.F.R",
  "      .",
  "  R.R.T",
]
const STOPS = ["E.S.S.F.S", "      .", "      T"]
// prettier-ignore
const LOOPED = [
  "E.F.S.S.F.T",
  "  .     .",
  "  S.....S",
]
// prettier-ignore
const FOUR_SIDES = [
  "    S   S",
  "    .   .",
  "E.S.F.S.F.S.T",
  "    .   .",
  "    S.S S",
]
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8]

/** A lever with two ways to the hall: straight through one door, or round by the side room through the other. */
const ROUND_THE_SIDE =
  "in -[L]- hall\nhall -- out\nin -- side\nside -[L:a]- hall\nL toggle @in\nin ?\nhall ?\nout ?\nside ?"

/** Two stones in a hall the route crosses, with a nook off it: the hall holds ground off the route as well as on it. */
const NOOK_STONES =
  "in -- hall\nhall -[p]- out\nhall -- nook\np plate @hall\nshelf plate @hall stone\nin ?\nhall ?\nnook ?\nout ?"

/** The cells of the shortest walk from the entrance to the exit, gates and all. */
const routeOf = (grid: FloorGrid): Set<string> => {
  const from = new Map<string, string | undefined>([[`${grid.entrancePos[0]},${grid.entrancePos[1]}`, undefined]])
  const queue: Cell[] = [[...grid.entrancePos]]
  while (queue.length) {
    const [r, c] = queue.shift()!
    for (const [dr, dc] of Object.values(MOVES)) {
      const next = grid.cells[r + dr]?.[c + dc]
      if (!next || next.type === "empty" || from.has(`${r + dr},${c + dc}`)) continue
      from.set(`${r + dr},${c + dc}`, `${r},${c}`)
      queue.push([r + dr, c + dc])
    }
  }
  const route = new Set<string>()
  for (let at: string | undefined = `${grid.exitPos[0]},${grid.exitPos[1]}`; at; at = from.get(at)) route.add(at)
  return route
}

const lockFloor = (text: string, name: string): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  locks: [{ lock: parseLock(text, name).lock }],
  realisations: BINDING,
})

describe("embedFloor", () => {
  it("every stop keeps its neighbours", () => {
    for (const rows of [BRANCHING, STOPS, LOOPED, FOUR_SIDES])
      for (const seed of SEEDS) {
        const grid = drawnSketch(rows)
        const { grid: embedded, nodes } = embed(grid, opts({ seed }))
        expect(nodeGraph(embedded, nodes)).toEqual(nodeGraph(grid, latticeNodes(grid)))
      }
  })

  it("a plain corridor node melts into its string, its section label stays on the corridor", () => {
    const sketch = drawnSketch(["E.F.....S.T"])
    // The stretch from the fork to the stop is a side section of its own; the rest of the floor is the main path.
    const cells = sketch.cells.map(row =>
      row.map((cell, c) => (cell.type === "empty" ? cell : { ...cell, sectionAddress: c > 2 && c < 8 ? "s0" : "main" }))
    )
    const { grid, nodes } = embed({ ...sketch, cells }, opts({ spread: 0 }))
    expect(nodes.has("0,4") || nodes.has("0,6")).toBe(false)
    const corridor = grid.cells.flat().filter(cell => cell.type === "corridor")
    expect(corridor.every(cell => cell.sectionAddress !== undefined)).toBe(true)
    expect(corridor.filter(cell => cell.sectionAddress === "s0").length).toBeGreaterThan(0)
  })

  it("every dirs is mutual", () => {
    for (const rows of [BRANCHING, STOPS, LOOPED, ["E.RL>>>DR.R"], ["E", ".", "R", "L", "v", "D", "R"]])
      for (const seed of SEEDS) expect(unmutual(embed(drawnSketch(rows), opts({ seed })).grid)).toEqual([])
  })

  it("no string runs beside another string or a block it does not join", () => {
    for (let seed = 1; seed <= 200; seed++)
      expect(touching(embed(drawnSketch(FOUR_SIDES), opts({ seed })).grid)).toEqual([])
  })

  it("a claiming room keeps an empty ring", () => {
    for (const seed of SEEDS) {
      const { grid, nodes } = embed(drawnSketch(BRANCHING), opts({ seed }))
      const [fr, fc] = nodes.get("0,2")!
      const fork = grid.cells[fr][fc]
      expect(fork).toMatchObject({ roomType: "fork" })
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue
          const cell = grid.cells[fr + dr][fc + dc]
          const exit = DIRS.find(
            d => MOVES[d][0] === dr && MOVES[d][1] === dc && fork.type !== "empty" && fork.dirs.has(d)
          )
          if (exit) expect(cell).toMatchObject({ type: "corridor", dirs: new Set([exit, OPPOSITE[exit]]) })
          else expect(cell).toEqual({ type: "empty" })
        }
    }
  })

  it("a room's exits name the ways it leaves by on the floor", () => {
    const sketch = drawnSketch(BRANCHING)
    const cells = sketch.cells.map(row => [...row])
    const fork = cells[0][2] as RoomCell
    cells[0][2] = {
      ...fork,
      exits: [
        { dir: "e", kind: "main" },
        { dir: "s", kind: "side" },
      ],
    }
    for (const seed of SEEDS) {
      const { grid, nodes } = embed({ ...sketch, cells }, opts({ seed }))
      const [r, c] = nodes.get("0,2")!
      const laid = grid.cells[r][c] as RoomCell
      const reached = (dir: Direction) => {
        let at: Cell = [r + MOVES[dir][0], c + MOVES[dir][1]]
        let heading = dir
        for (;;) {
          const node = [...nodes].find(([, [nr, nc]]) => nr === at[0] && nc === at[1])
          if (node) return node[0]
          const cell = grid.cells[at[0]][at[1]]
          if (cell.type === "empty") return undefined
          heading = cell.dirs.has(heading) ? heading : [...cell.dirs].find(d => d !== OPPOSITE[heading])!
          at = [at[0] + MOVES[heading][0], at[1] + MOVES[heading][1]]
        }
      }
      expect(laid.exits!.map(exit => reached(exit.dir))).toEqual(["0,4", "2,2"])
    }
  })

  it("a prefab node gets its rect and its corridors meet its door places", () => {
    const den = parsePrefab(
      `tier junior
room den
layout
# # d # # #
# . . . . #
d . . . . #
# . . s . #
# # # # d #
s stop`,
      "den"
    )
    const variant = variantsOf(den)[0]
    const grid = drawnSketch(["E.P", "  .", "  R"])
    const seat = seatOf(variant, new Set<Direction>(["w", "s"]))!
    expect(seat).toEqual({ rows: 5, cols: 6, node: [2, 4], doors: { w: [2, 0], s: [4, 4] } })
    const prep = { input: { siteId: "site" }, config: { config: { sideSections: [], prefabs: { den } } } }
    for (const seed of SEEDS) {
      const { grid: embedded, nodes, prefabRects } = embed(grid, opts({ seed, rooms: new Map([["0,2", seat]]) }))
      const rect = prefabRects.get("0,2")!
      const [nr, nc] = nodes.get("0,2")!
      expect([rect.rows, rect.cols, nr - rect.top + 1, nc - rect.left + 1]).toEqual([3, 4, 2, 4])
      const stamped = stampPrefab(
        embedded,
        { cell: [nr, nc], name: "den", layout: 0, mirrored: false, pick: {} },
        rect,
        prep as unknown as FloorPrep
      )
      const room = stamped.cells[nr][nc]
      const doors = room.type === "room" ? room.prefabRoom?.doors : undefined
      expect(doors).toEqual({ w: [nr, rect.left - 1], s: [rect.top + rect.rows, nc] })
      for (const [side, [dr, dc]] of Object.entries(doors ?? {}) as [Direction, Cell][]) {
        const door = embedded.cells[dr][dc]
        expect(door.type).toBe("corridor")
        expect(door.type !== "empty" && [...door.dirs].sort()).toEqual([side, OPPOSITE[side]].sort())
      }
    }
  })

  it("a drop keeps its exact straight run", () => {
    for (const [rows, dir] of [
      [["E.RL>>>DR.R"], "e"],
      [["E", ".", "R", "L", "v", "D", "R"], "s"],
      [["E.RL>>>DR", "  .     .", "  R.R.R.R"], "e"],
      [["E.FL>>>DF.R", "  .     .", "  R     R"], "e"],
    ] as const)
      for (const seed of SEEDS) {
        const sketch = drawnSketch([...rows])
        const { grid } = embed(sketch, opts({ seed, spread: 1 }))
        const runs = oneWayRuns(grid)
        expect(runs).toHaveLength(1)
        const [{ launch, cells, landing, dir: runDir }] = runs
        expect(runDir).toBe(dir)
        expect(cells).toHaveLength(sketch.cells.flat().filter(c => c.type === "corridor" && c.obstacle).length)
        const axis = dir === "e" ? 0 : 1
        expect(new Set([launch, ...cells, landing].map(cell => cell[axis])).size).toBe(1)
        expect(grid.cells[launch[0]][launch[1]]).toMatchObject({ dirs: new Set([OPPOSITE[dir]]) })
        expect(grid.cells[landing[0]][landing[1]]).toMatchObject({ dirs: new Set([dir]) })
      }
  })

  it("a node two drops leave at right angles lines up with both, each run exact", () => {
    const sketch = drawnSketch(["E.F.SL>>>DR", "    L", "    v", "    D", "    R"])
    for (const seed of SEEDS) {
      const { grid, nodes } = embed(sketch, opts({ seed, spread: 1 }))
      expect(oneWayRuns(grid).map(run => run.cells.length)).toEqual([3, 1])
      expect(nodes.get("0,4")![0]).toBe(nodes.get("0,10")![0])
      expect(nodes.get("0,4")![1]).toBe(nodes.get("4,4")![1])
    }
  })

  it("a mechanism worked at another node is worked where that node stands", () => {
    const sketch = drawnSketch(["E.R.R"])
    const cells = sketch.cells.map(row => [...row])
    const lever = cells[0][2] as RoomCell
    cells[0][2] = {
      ...lever,
      mechanism: {
        states: ["a", "b"],
        initial: "a",
        returnsToInitial: true,
        positions: [],
        transitions: [{ to: "b", at: [0, 4] }],
      },
    }
    const { grid, nodes } = embed({ ...sketch, cells }, opts({ spread: 1 }))
    const [r, c] = nodes.get("0,2")!
    const worked = grid.cells[r][c]
    expect(worked.type === "room" && worked.mechanism?.transitions?.[0].at).toEqual(nodes.get("0,4"))
  })

  it("the same seed embeds the same; another seed moves only cells, not the node graph", () => {
    const grid = drawnSketch(BRANCHING)
    expect(embed(grid, opts({ seed: 7 }))).toEqual(embed(grid, opts({ seed: 7 })))
    const one = embed(grid, opts({ seed: 7 }))
    const other = embed(grid, opts({ seed: 8 }))
    expect(other.grid).not.toEqual(one.grid)
    expect(nodeGraph(other.grid, other.nodes)).toEqual(nodeGraph(one.grid, one.nodes))
  })

  it("a floor that cannot be laid out is refused as an attempt's retry, naming the node", () => {
    const room = { rows: 4, cols: 4, node: [1, 1] as Cell, doors: { w: [0, 0] as Cell } }
    expect(embedFloor(drawnSketch(["E.R"]), opts({ rooms: new Map([["0,2", room]]) }))).toEqual({
      retry: [],
      refused: "no room for the piece at 0,2",
    })
  })

  it("the report names size and longest room-to-room corridor", () => {
    const { grid, report } = embed(drawnSketch(BRANCHING), opts({ spread: 1 }))
    expect([report.rows, report.cols]).toEqual([grid.rows, grid.cols])
    expect(report.longestRoomToRoom).toBeGreaterThan(0)
  })

  it("the smallest floor embeds", () => {
    for (const seed of [1, 2, 3]) {
      const carved = assembleFloor(
        "site",
        plainFloor({ pathPuzzles: 1 }),
        seed,
        undefined,
        {},
        { engine: LATTICE_ENGINE }
      )
      if (!carved.success) throw new Error(JSON.stringify(carved.reasons))
      const { grid } = embed(carved.grid, opts({ seed }))
      expect(unmutual(grid)).toEqual([])
      expect(validateSite(grid)).toEqual({ valid: true })
      const rooms = (g: FloorGrid) => g.cells.flat().filter(cell => cell.type === "room").length
      expect(rooms(grid)).toBe(rooms(carved.grid))
      const [er, ec] = grid.entrancePos
      expect(grid.cells[er][ec]).toMatchObject({ type: "room", roomType: "portal" })
      const [xr, xc] = grid.exitPos
      expect(grid.cells[xr][xc]).toMatchObject({ type: "room" })
    }
  })

  it("on the rooms engine a plate stands on the route only where its region holds no ground off it", () => {
    const config = {
      ...lockFloor(NOOK_STONES, "nookStones"),
      spread: 1,
      realisations: { ...BINDING, weights: "stonePlate", pipe: "stonePipe" },
    }
    let plates = 0
    for (let seed = 1; seed <= 12; seed++) {
      const result = assembleFloor("test", config, seed, undefined, {}, { engine: ROOMS_ENGINE })
      if (!result.success) continue
      const { grid } = result
      const route = routeOf(grid)
      // Ground a plate could take: corridor of the region, no fork, touching no room but another plate.
      const free = (region: string | undefined) =>
        grid.cells.flatMap((row, r) =>
          row.flatMap((cell, c) => {
            if (cell.type !== "corridor" || cell.region !== region || cell.dirs.size > 2 || cell.obstacle) return []
            const touches = Object.values(MOVES).some(([dr, dc]) => {
              const next = grid.cells[r + dr]?.[c + dc]
              return next && ((next.type === "room" && !next.plate) || (next.type === "corridor" && next.obstacle))
            })
            return touches ? [] : [`${r},${c}`]
          })
        )
      grid.cells.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (cell.type !== "room" || !cell.plate) return
          plates++
          if (route.has(`${r},${c}`)) expect(free(cell.region).filter(at => !route.has(at))).toEqual([])
        })
      )
    }
    expect(plates).toBeGreaterThan(0)
  })

  it("a lock's rooms and stops are laid out freely and its walk still passes", () => {
    const shapes = new Set<string>()
    for (let n = 1; n <= 12; n++) {
      const result = assembleFloor(
        "test",
        lockFloor(ROUND_THE_SIDE, "roundTheSide"),
        n * 7919,
        undefined,
        {},
        {
          engine: ROOMS_ENGINE,
        }
      )
      if (!result.success) continue
      const walk = walkFloorLock(result.grid)!
      if (!walk.sound) throw new Error(describeFloorWalkFailure(walk.failure))
      const lockRooms = result.grid.cells.flatMap((row, r) =>
        row.flatMap((cell, c) => (cell.type === "room" && (cell.mechanism || cell.requiredKeyId) ? [[r, c]] : []))
      )
      const [r0, c0] = lockRooms[0]
      shapes.add(lockRooms.map(([r, c]) => `${r - r0},${c - c0}`).join(" "))
    }
    expect(shapes.size).toBeGreaterThan(1)
  })
})
