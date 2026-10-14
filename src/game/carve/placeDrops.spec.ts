import { describe, expect, it } from "vitest"
import { freshState, noLabels, plainFloor, prepOf, DIR_MOVE } from "./carveFixtures"
import { placeDrops } from "./placeDrops"
import { assembleFloor } from "./assembleFloor"
import { floorLock } from "../floorLock"
import type { Cell, FloorPrep } from "./state"
import type { FloorConfig, FloorGrid } from "../siteTypes"
import type { RegionGraph } from "../regions"
// A main-path node at 0,0 and a node of s0 one vertical drop below it, at 4,0.
describe("placeDrops", () => {
  const plain = prepOf(plainFloor({ sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure" }] }))
  const prep: FloorPrep = {
    ...plain,
    obstacles: {
      ...plain.obstacles,
      oneWayDemands: [{ id: undefined, from: "main", to: "s0", realisation: "slide", sectioned: true }],
    },
  }
  const dropped = (behindTarget: string[]) => {
    const labels = noLabels()
    labels.address.set("0,0", "main")
    labels.address.set("4,0", "s0")
    const mainPath: Cell[] = [
      [0, 0],
      [0, 2],
      [0, 4],
    ]
    const state = {
      ...freshState(prep),
      lay: null,
      maze: { n: 5, entrance: mainPath[0], exit: mainPath[2], mainPath, passages: new Set<string>() },
      branches: {
        used: new Set(["0,0", "0,2", "0,4", "4,0"]),
        groups: [],
        subChains: [],
        seamDrops: [],
        carved: new Set<string>(),
      },
      labels,
      doors: {
        intended: new Set<string>(),
        gated: new Set<string>(),
        behind: new Map([["4,0", new Set(behindTarget)]]),
        ground: new Map(),
        seamGated: new Set<string>(),
        seamBehind: new Map(),
      },
      switchDoors: new Map(),
    }
    return { refusal: placeDrops(prep, state), drops: state.drops }
  }

  it("drops between the two named sections across the uncarved cells between them", () => {
    expect(dropped([]).drops).toEqual([
      { from: "0,0", to: "4,0", dir: "s", launch: "1,0", run: ["2,0"], landing: "3,0", realisation: "slide" },
    ])
  })

  it("retries where the only landing stands behind a door the launch does not", () => {
    expect(dropped(["s0"]).refusal).toEqual({ retry: [{ type: "oneWayUnsatisfied", from: "main", to: "s0" }] })
  })
})

describe("a one-way drop between two regions", () => {
  // doubleBack's own full shape (lockWalk.spec.ts's doubleBack fixture) — the same six regions and
  // three gates the describe block above proves seat, plus the two drops the design needs to stay
  // sound (lockWalk.spec.ts's "strands the player who drops early" test): s1Chamber → leftLower and
  // leftLower → entrance. Neither is a connection `doubleBackLayout` declares — a drop joins two
  // regions the layout does NOT otherwise join; that is the whole of what one is for
  // (docs/game-design/regions-and-containers.md; obstacles.ts's `OneWayObstacle`).
  const doubleBackLayout = (): RegionGraph => ({
    regions: [
      { name: "entrance", appetite: "free" },
      { name: "rightLower", appetite: "free" },
      { name: "s1Chamber", appetite: "free" },
      { name: "leftLower", appetite: "free" },
      { name: "s2Chamber", appetite: "free" },
      { name: "wayOut", appetite: "free" },
    ],
    connections: [
      ["entrance", "leftLower"],
      ["entrance", "rightLower"],
      ["rightLower", "s1Chamber"],
      ["leftLower", "s2Chamber"],
      ["s2Chamber", "wayOut"],
    ],
    in: "entrance",
    out: "wayOut",
  })

  const doubleBackConfig = (): FloorConfig => ({
    pathPuzzles: 1,
    // Two drops of 2 + x cells each on six regions: a roomy packing is what lets the sweep find a carve.
    packing: 7,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    regionLayout: doubleBackLayout(),
    sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure" }],
    obstacles: [
      { id: "forkRight", kind: "gate", at: { on: "connection", between: ["entrance", "rightLower"] } },
      { id: "greenRight", kind: "gate", at: { on: "connection", between: ["rightLower", "s1Chamber"] } },
      { id: "greenLeft", kind: "gate", at: { on: "connection", between: ["leftLower", "s2Chamber"] } },
      // The two region-addressed drops this task adds — neither owned by a control, same as
      // doubleBack's own (lockWalk.spec.ts): a one-way's direction is fixed at whatever it was
      // authored with, permanently, until a control can reverse one (see Control.opens).
      { id: "dropToLeft", kind: "oneWay", at: { on: "connection", between: ["s1Chamber", "leftLower"] } },
      { id: "dropToEntrance", kind: "oneWay", at: { on: "connection", between: ["leftLower", "entrance"] } },
    ],
    controls: [
      {
        id: "Y",
        in: "entrance",
        states: ["unset", "open"],
        initial: "unset",
        returnsToInitial: false,
        opens: { unset: [], open: ["forkRight", "greenRight", "greenLeft"] },
      },
    ],
  })

  const regionAt = (grid: FloorGrid, [r, c]: [number, number]): string | undefined => {
    const cell = grid.cells[r][c]
    return cell.type !== "empty" ? cell.region : undefined
  }

  // Every drop on the grid as the region its launch stands in and the region its landing stands in,
  // read off the cells carrying the obstacle marker: the cell before the first marked cell is the
  // launch, the cell after the last is the landing. Asking the carve's own bookkeeping would check the
  // code against itself, so the grid is what is read.
  const dropRegions = (grid: FloorGrid): { from?: string; to?: string }[] => {
    const marked = (r: number, c: number) => {
      const cell = grid.cells[r]?.[c]
      return cell?.type === "corridor" ? cell.obstacle : undefined
    }
    const drops: { from?: string; to?: string }[] = []
    for (let r = 0; r < grid.rows; r++)
      for (let c = 0; c < grid.cols; c++) {
        const marker = marked(r, c)
        if (!marker) continue
        const [dr, dc] = DIR_MOVE[marker.dir]
        if (marked(r - dr, c - dc)?.dir === marker.dir) continue
        let [er, ec] = [r, c]
        while (marked(er, ec)?.dir === marker.dir) [er, ec] = [er + dr, ec + dc]
        drops.push({ from: regionAt(grid, [r - dr, c - dc]), to: regionAt(grid, [er, ec]) })
      }
    return drops
  }

  // A carve is a seed's own choice, so seeds are swept until one satisfies both authored drops at
  // once — the same style oneWayCarve.spec.ts's own sweeps use, and the reach into LockSpec.oneWays
  // below is checked against that same carve rather than any carve that happens to succeed.
  const carvedWithBothDrops = (): FloorGrid => {
    for (let seed = 0; seed < 60; seed++) {
      const result = assembleFloor("site-oneway-region", doubleBackConfig(), seed)
      if (!result.success) continue
      const drops = dropRegions(result.grid)
      const crosses = (from: string, to: string) => drops.some(d => d.from === from && d.to === to)
      if (crosses("s1Chamber", "leftLower") && crosses("leftLower", "entrance")) return result.grid
    }
    throw new Error("no seed carved both region-addressed drops")
  }

  it("carves a drop between the two regions each drop names", () => {
    // carvedWithBothDrops throws if no seed satisfies both — reaching the assertion below is itself
    // the proof; the assertions restate what "carves a drop" means for a reader.
    const grid = carvedWithBothDrops()
    const drops = dropRegions(grid)
    expect(drops.some(d => d.from === "s1Chamber" && d.to === "leftLower")).toBe(true)
    expect(drops.some(d => d.from === "leftLower" && d.to === "entrance")).toBe(true)
  })

  it("reaches LockSpec.oneWays, which floorLock derives from the assembled grid unchanged", () => {
    const grid = carvedWithBothDrops()
    const spec = floorLock(grid)
    if (!spec) throw new Error("floorLock found no mechanism on a floor that authors one")
    expect(spec.oneWays ?? []).not.toEqual([])
  })

  // Watched failing (see the task report): the carve constraint this test names — a pair of adjacent
  // cells spanning the two regions is never guaranteed by the authoring, only searched for — has to
  // be refused by name after the whole attempt budget, not silently placed somewhere else. A hidden
  // side section makes the "to" region's every cell ineligible (the same spoiler rule a gate's own
  // landing already respects, oneWayCarve.spec.ts's "refuses a drop into a hidden section"), so no
  // attempt at any seed ever finds a candidate — a genuine, deterministic shortfall rather than an
  // unlucky one.
  it("refuses by name when no attempt finds two adjacent cells spanning the drop's two regions", () => {
    const layout: RegionGraph = {
      regions: [
        { name: "entrance", appetite: "free" },
        { name: "out", appetite: "free" },
        { name: "vault", appetite: "free" },
      ],
      connections: [
        ["entrance", "out"],
        ["entrance", "vault"],
      ],
      in: "entrance",
      out: "out",
    }
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      regionLayout: layout,
      sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure", hidden: true }],
      obstacles: [{ id: "drop1", kind: "oneWay", at: { on: "connection", between: ["entrance", "vault"] } }],
    }
    // Every seed, not the first that refuses: the refusal is a property of the authoring (nothing
    // hidden can ever host a visible drop's landing), so no seed is entitled to satisfy it.
    for (let seed = 0; seed < 20; seed++) {
      const result = assembleFloor("site-oneway-region-hidden", config, seed)
      if (result.success) throw new Error(`seed ${seed} carved a drop into a hidden region`)
      expect(result.reasons).toContainEqual({ type: "oneWayUnsatisfied", from: "entrance", to: "vault" })
    }
  })
})
