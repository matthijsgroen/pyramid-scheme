import { describe, expect, it } from "vitest"
import { oneWayRuns } from "../../gridNavigation"
import { variantsOf } from "../../prefabChecks"
import { parsePrefab } from "../../prefabNotation"
import { validateSite } from "../../siteValidator"
import type { Direction, FloorGrid, GridCell, RoomCell } from "../../siteTypes"
import { assembleFloor } from "../assembleFloor"
import { plainFloor } from "../carveFixtures"
import { LATTICE_ENGINE } from "../engines"
import { OPPOSITE } from "../grid"
import { seatOf, stampPrefab } from "../placePrefabs"
import type { Cell, FloorPrep } from "../state"
import { embedFloor, type EmbedOptions } from "./embedFloor"

const MOVES: Record<Direction, Cell> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const DIRS = Object.keys(MOVES) as Direction[]

/** What each letter of a drawn lattice stands for; `.` is a corridor. */
const ROOMS: Record<string, Partial<RoomCell>> = {
  E: { roomType: "portal" },
  R: { roomType: "encounter", family: "sumplete" },
  P: { roomType: "encounter", family: "sumplete" },
  F: { roomType: "fork" },
  T: { roomType: "encounter", family: "treasure-chest", tags: ["treasure"] },
  S: { roomType: "encounter", family: "sumplete", sectionAddress: "main" },
}
const RUNS: Record<string, Direction> = { ">": "e", v: "s" }

/**
 * A lattice drawn as text, each cell open toward every drawn neighbour and filed under its own section and ordinal.
 * A drop is `L`, run cells (`>` east, `v` south) and `D`: the launch opens back to its node only, the landing on to
 * its node only, and the run cells open nowhere.
 */
const lattice = (rows: string[]): FloorGrid => {
  const cols = Math.max(...rows.map(row => row.length))
  const ch = (r: number, c: number) => rows[r]?.[c] ?? " "
  let entrance: Cell = [0, 0]
  const runDir = (r: number, c: number) =>
    DIRS.find(d => RUNS[ch(r + MOVES[d][0], c + MOVES[d][1])] !== undefined) as Direction
  const cells = rows.map((_, r) =>
    Array.from({ length: cols }, (_, c): GridCell => {
      const at = ch(r, c)
      if (at === " ") return { type: "empty" }
      const label = { state: "fogged" as const, ordinal: `${r},${c}`, sectionAddress: `s${r},${c}` }
      const drawn = DIRS.filter(d => ch(r + MOVES[d][0], c + MOVES[d][1]) !== " ")
      if (RUNS[at]) return { type: "corridor", dirs: new Set(), obstacle: { dir: RUNS[at], kind: "zipline" }, ...label }
      if (at === "L") return { type: "corridor", dirs: new Set([OPPOSITE[runDir(r, c)]]), ...label }
      if (at === "D") {
        const from = runDir(r, c)
        return { type: "corridor", dirs: new Set([OPPOSITE[from]]), ...label }
      }
      if (at === "E") entrance = [r, c]
      const dirs = new Set(drawn.filter(d => RUNS[ch(r + MOVES[d][0], c + MOVES[d][1])] === undefined))
      if (at === ".") return { type: "corridor", dirs, ...label }
      return { type: "room", dirs, ...label, ...ROOMS[at] } as RoomCell
    })
  )
  return { siteId: "site", rows: rows.length, cols, entrancePos: entrance, exitPos: entrance, staircases: {}, cells }
}

const opts = (overrides: Partial<EmbedOptions> = {}): EmbedOptions => ({
  seed: 1,
  spread: 0.5,
  straightness: 0.3,
  rooms: new Map(),
  ...overrides,
})

const latticeNodes = (grid: FloorGrid): Map<string, Cell> => {
  const nodes = new Map<string, Cell>()
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (r % 2 || c % 2 || cell.type === "empty" || (cell.type === "corridor" && cell.obstacle)) return
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

/** For each lattice edge whose two nodes line up after the embed, how often its corridor turns. */
const alignedTurns = (sketch: FloorGrid, grid: FloorGrid, nodes: ReadonlyMap<string, Cell>): number[] => {
  const nodeAt = new Set([...nodes.values()].map(([r, c]) => `${r},${c}`))
  return [...nodes].flatMap(([key, start]) => {
    const [r, c] = key.split(",").map(Number)
    const node = sketch.cells[r][c]
    if (node.type === "empty") return []
    return (["e", "s"] as const)
      .filter(d => node.dirs.has(d))
      .flatMap(d => {
        const end = nodes.get(`${r + MOVES[d][0] * 2},${c + MOVES[d][1] * 2}`)!
        if (end[d === "e" ? 0 : 1] !== start[d === "e" ? 0 : 1]) return []
        let [at, dir, turns] = [step(start, d), d as Direction, 0]
        while (!nodeAt.has(`${at[0]},${at[1]}`)) {
          const cell = grid.cells[at[0]][at[1]]
          const next = cell.type === "empty" ? dir : [...cell.dirs].find(way => way !== OPPOSITE[dir])!
          if (next !== dir) turns++
          dir = next
          at = step(at, dir)
        }
        return [turns]
      })
  })
}
const step = ([r, c]: Cell, d: Direction): Cell => [r + MOVES[d][0], c + MOVES[d][1]]

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

// prettier-ignore
const BRANCHING = [
  "E.F.R.R",
  "  .   .",
  "  T.R.F.R",
  "      .",
  "  R.R.T",
]
const STOPS = ["E.S.S.F.S", "      .", "      T"]
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8]

describe("embedFloor", () => {
  it("every lattice node keeps its neighbours", () => {
    for (const rows of [BRANCHING, STOPS])
      for (const seed of SEEDS) {
        const grid = lattice(rows)
        const { grid: embedded, nodes } = embedFloor(grid, opts({ seed }))
        expect(nodeGraph(embedded, nodes)).toEqual(nodeGraph(grid, latticeNodes(grid)))
      }
  })

  it("every dirs is mutual", () => {
    for (const rows of [BRANCHING, STOPS, ["E.RL>>>DR.R"], ["E", ".", "R", "L", "v", "D", "R"]])
      for (const seed of SEEDS) expect(unmutual(embedFloor(lattice(rows), opts({ seed })).grid)).toEqual([])
  })

  it("spread 0 makes every gap one cell", () => {
    const { grid } = embedFloor(lattice(["E.F.R", "  .", "  T"]), opts({ spread: 0 }))
    expect([grid.rows, grid.cols]).toEqual([3 + 1 + 3, 1 + 1 + 3 + 1 + 1])
    const plain = lattice(["E.S.S.S"])
    const flat = embedFloor(plain, opts({ spread: 0 }))
    expect([...flat.nodes.values()]).toEqual([...latticeNodes(plain).values()])
  })

  it("a claiming room keeps an empty ring", () => {
    for (const seed of SEEDS) {
      const { grid, nodes } = embedFloor(lattice(BRANCHING), opts({ seed }))
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
    const grid = lattice(["E.P", "  .", "  R"])
    const seat = seatOf(variant, new Set<Direction>(["w", "s"]))!
    expect(seat).toEqual({ rows: 5, cols: 6, node: [2, 4], doors: { w: [2, 0], s: [4, 4] } })
    const prep = { input: { siteId: "site" }, config: { config: { sideSections: [], prefabs: { den } } } }
    for (const seed of SEEDS) {
      const { grid: embedded, nodes, prefabRects } = embedFloor(grid, opts({ seed, rooms: new Map([["0,2", seat]]) }))
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

  it("a drop edge stays straight with its exact run", () => {
    for (const [rows, dir] of [
      [["E.RL>>>DR.R"], "e"],
      [["E", ".", "R", "L", "v", "D", "R"], "s"],
      [["E.RL>>>DR", "  .     .", "  R.R.R.R"], "e"],
      [["E.FL>>>DF.R", "  .     .", "  R     R"], "e"],
    ] as const)
      for (const seed of SEEDS) {
        const { grid } = embedFloor(lattice([...rows]), opts({ seed, spread: 1 }))
        const runs = oneWayRuns(grid)
        expect(runs).toHaveLength(1)
        const [{ launch, cells, landing, dir: runDir }] = runs
        expect(runDir).toBe(dir)
        expect(cells).toHaveLength(
          lattice([...rows])
            .cells.flat()
            .filter(c => c.type === "corridor" && c.obstacle).length
        )
        const axis = dir === "e" ? 0 : 1
        expect(new Set([launch, ...cells, landing].map(cell => cell[axis])).size).toBe(1)
        expect(grid.cells[launch[0]][launch[1]]).toMatchObject({ dirs: new Set([OPPOSITE[dir]]) })
        expect(grid.cells[landing[0]][landing[1]]).toMatchObject({ dirs: new Set([dir]) })
      }
  })

  it("a drop between two claiming rooms fills their gap with its run alone", () => {
    const { grid, nodes } = embedFloor(lattice(["E.FL>>>DF.R"]), opts({ spread: 1 }))
    const [[fr, from], [, to]] = [nodes.get("0,2")!, nodes.get("0,8")!]
    const between = Array.from({ length: to - from - 1 }, (_, i) => grid.cells[fr][from + 1 + i])
    expect(between.map(cell => (cell.type === "corridor" && cell.obstacle ? "~" : "."))).toEqual([
      ".",
      "~",
      "~",
      "~",
      ".",
    ])
  })

  it("an aligned edge winds when straightness is 0 and runs straight at 1", () => {
    const bent = (straightness: number) =>
      SEEDS.flatMap(seed => {
        const grid = lattice(STOPS)
        const { grid: embedded, nodes } = embedFloor(grid, opts({ seed, straightness }))
        return alignedTurns(grid, embedded, nodes)
      })
    expect(bent(0).some(turns => turns > 0)).toBe(true)
    expect(bent(1).every(turns => turns === 0)).toBe(true)
  })

  it("a run of stops stays one straight corridor at spread 1", () => {
    for (const seed of SEEDS) {
      const { nodes } = embedFloor(lattice(STOPS), opts({ seed, spread: 1, straightness: 1 }))
      const rows = ["0,2", "0,4", "0,8"].map(key => nodes.get(key)![0])
      expect(new Set(rows).size).toBe(1)
    }
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
      const { grid } = embedFloor(carved.grid, opts({ seed }))
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

  it("the same seed embeds the same; another seed moves only cells, not the node graph", () => {
    const grid = lattice(BRANCHING)
    expect(embedFloor(grid, opts({ seed: 7 }))).toEqual(embedFloor(grid, opts({ seed: 7 })))
    const one = embedFloor(grid, opts({ seed: 7 }))
    const other = embedFloor(grid, opts({ seed: 8 }))
    expect(other.grid).not.toEqual(one.grid)
    expect(nodeGraph(other.grid, other.nodes)).toEqual(nodeGraph(one.grid, one.nodes))
  })

  it("the report names size and longest room-to-room corridor", () => {
    const { grid, report } = embedFloor(lattice(["E...R.R"]), opts({ spread: 0 }))
    expect(report).toEqual({ rows: 1, cols: 7, longestRoomToRoom: 4 })
    const wide = embedFloor(lattice(BRANCHING), opts({ spread: 1 }))
    expect([wide.report.rows, wide.report.cols]).toEqual([wide.grid.rows, wide.grid.cols])
    expect(wide.report.longestRoomToRoom).toBeGreaterThan(
      embedFloor(lattice(BRANCHING), opts({ spread: 0 })).report.longestRoomToRoom
    )
    expect(grid.cells[0][0]).toMatchObject({ roomType: "portal" })
  })
})
