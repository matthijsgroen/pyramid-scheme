import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import type { Direction, FloorConfig, GridCell } from "./siteTypes"
import type { RegionAppetite } from "./regions"

const SEED = 99

const floorWith = (layout: FloorConfig["regionLayout"]): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  regionLayout: layout,
})

const region = (name: string, appetite: RegionAppetite = "free") => ({ name, appetite })

const reasons = (config: FloorConfig) => {
  const result = assembleFloor("test-journey", config, SEED)
  return result.success ? [] : result.reasons
}

describe("a layout the builder refuses by name", () => {
  it("refuses two regions answering to one name", () => {
    const layout = {
      regions: [region("mouth"), region("mouth")],
      connections: [["mouth", "mouth"] as const],
      in: "mouth",
      out: "mouth",
    }

    expect(reasons(floorWith(layout))).toEqual([{ type: "regionNameRepeated", name: "mouth" }])
  })

  it("refuses every name repeated, not just the first, and once per offending name", () => {
    const layout = {
      regions: [region("mouth"), region("mouth"), region("vault"), region("vault")],
      connections: [],
      in: "mouth",
      out: "vault",
    }

    expect(reasons(floorWith(layout))).toEqual([
      { type: "regionNameRepeated", name: "mouth" },
      { type: "regionNameRepeated", name: "vault" },
    ])
  })

  it("refuses a connection naming a region the layout never declares", () => {
    const layout = {
      regions: [region("mouth"), region("vault")],
      connections: [["mouth", "ghost"] as const],
      in: "mouth",
      out: "vault",
    }

    expect(reasons(floorWith(layout))).toEqual([{ type: "connectionNamesNoRegion", name: "ghost" }])
  })

  it("refuses every undeclared name a connection ends on, deduplicated", () => {
    const layout = {
      regions: [region("mouth"), region("vault")],
      connections: [["mouth", "ghost1"] as const, ["vault", "ghost2"] as const, ["mouth", "ghost1"] as const],
      in: "mouth",
      out: "vault",
    }

    expect(reasons(floorWith(layout))).toEqual([
      { type: "connectionNamesNoRegion", name: "ghost1" },
      { type: "connectionNamesNoRegion", name: "ghost2" },
    ])
  })

  it("refuses a port naming a region the layout never declares", () => {
    const layout = {
      regions: [region("mouth")],
      connections: [],
      in: "mouth",
      out: "nowhere",
    }

    expect(reasons(floorWith(layout))).toEqual([{ type: "portNamesNoRegion", port: "out", name: "nowhere" }])
  })

  it("refuses both ports when both name a region the layout never declares, in first", () => {
    const layout = {
      regions: [region("mouth")],
      connections: [],
      in: "nowhereIn",
      out: "nowhereOut",
    }

    expect(reasons(floorWith(layout))).toEqual([
      { type: "portNamesNoRegion", port: "in", name: "nowhereIn" },
      { type: "portNamesNoRegion", port: "out", name: "nowhereOut" },
    ])
  })

  it("refuses a region no walk from the way in arrives at", () => {
    const layout = {
      regions: [region("mouth"), region("vault"), region("orphan")],
      connections: [["mouth", "vault"] as const],
      in: "mouth",
      out: "vault",
    }

    expect(reasons(floorWith(layout))).toEqual([{ type: "regionUnreachable", name: "orphan" }])
  })

  it("refuses every region no walk from the way in arrives at, not just the first", () => {
    const layout = {
      regions: [region("mouth"), region("vault"), region("orphan1"), region("orphan2")],
      connections: [["mouth", "vault"] as const],
      in: "mouth",
      out: "vault",
    }

    expect(reasons(floorWith(layout))).toEqual([
      { type: "regionUnreachable", name: "orphan1" },
      { type: "regionUnreachable", name: "orphan2" },
    ])
  })

  it("refuses a region nothing joins by name, whatever drops join the arms beside it", () => {
    const layout = {
      regions: [region("in"), region("armA"), region("armB"), region("out"), region("orphan")],
      connections: [
        ["in", "armA"],
        ["in", "armB"],
        ["in", "out"],
      ] as Array<readonly [string, string]>,
      in: "in",
      out: "out",
    }
    const config: FloorConfig = {
      ...floorWith(layout),
      sideSections: [
        { pathPuzzles: 0, difficulty: "starter", end: "treasure" },
        { pathPuzzles: 0, difficulty: "starter", end: "treasure" },
      ],
      obstacles: [{ id: "dropAcross", kind: "oneWay", at: { on: "connection", between: ["armA", "armB"] } }],
    }

    expect(reasons(config)).toEqual([{ type: "regionUnreachable", name: "orphan" }])
  })

  describe("a region only a drop leads to", () => {
    const layout = {
      regions: [region("east"), region("mid"), region("in")],
      connections: [["east", "mid"] as const],
      in: "east",
      out: "mid",
    }
    const gated = (drop: readonly [string, string]): FloorConfig => ({
      ...floorWith(layout),
      obstacles: [
        { id: "door", kind: "gate", at: { on: "connection", between: ["east", "mid"] } },
        { id: "fall", kind: "oneWay", at: { on: "connection", between: drop } },
      ],
      controls: [
        {
          id: "lever",
          in: "east",
          states: ["unset", "open"],
          initial: "unset",
          returnsToInitial: false,
          opens: { unset: [], open: ["door"] },
        },
      ],
    })

    it("is not refused as unreachable when the drop runs into it", () => {
      expect(reasons(gated(["mid", "in"])).filter(reason => reason.type === "regionUnreachable")).toEqual([])
    })

    it("is refused as unreachable when the only drop runs out of it", () => {
      expect(reasons(gated(["in", "mid"]))).toEqual([{ type: "regionUnreachable", name: "in" }])
    })

    it("is refused as unreachable when no drop leads to it", () => {
      expect(reasons(floorWith(layout))).toEqual([{ type: "regionUnreachable", name: "in" }])
    })
  })

  it("assembles a layout whose regions are all named once, joined and reachable", () => {
    // `mouth` is `free`, not `nothing`: with `pathPuzzles: 1` the main path's own puzzle starts there,
    // and this test is about the layout's SHAPE (named once, joined, reachable), not what its
    // appetites take — that is regionCarve.spec.ts's job. `vault` stays `reward` because the goal
    // chest that lands there is exactly that.
    const layout = {
      regions: [region("mouth", "free"), region("vault", "reward")],
      connections: [["mouth", "vault"] as const],
      in: "mouth",
      out: "vault",
    }

    expect(assembleFloor("test-journey", floorWith(layout), SEED).success).toBe(true)
  })

  it("assembles a floor that authors no layout at all", () => {
    expect(assembleFloor("test-journey", floorWith(undefined), SEED).success).toBe(true)
  })
})

describe("a region only drops join seats on a side path", () => {
  const carvesAtOnce = (config: FloorConfig, seeds = 40): number => {
    let carved = 0
    for (let seed = 0; seed < seeds; seed++) if (assembleFloor("test-journey", config, seed).success) carved++
    return carved
  }
  const roomy = (layout: FloorConfig["regionLayout"], obstacles: FloorConfig["obstacles"] = []): FloorConfig => ({
    ...floorWith(layout),
    pathPuzzles: 6,
    sideSections: [
      { pathPuzzles: 2, difficulty: "starter", end: "treasure" },
      { pathPuzzles: 2, difficulty: "starter", end: "treasure" },
    ],
    obstacles,
  })
  const names = (...n: string[]) => n.map(name => region(name))

  const cellar = (orphan: boolean): FloorConfig =>
    roomy(
      {
        regions: names("start", "kelder", "verder", ...(orphan ? ["lost"] : [])),
        connections: [["verder", "start"] as const],
        in: "start",
        out: "verder",
      },
      [
        { id: "dropIn", kind: "oneWay", at: { on: "connection", between: ["start", "kelder"] } },
        { id: "dropOut", kind: "oneWay", at: { on: "connection", between: ["kelder", "verder"] } },
      ]
    )

  it("seats a cellar entered and left only by drops: no seed reports it not seated", () => {
    const failures = Array.from({ length: 40 }, (_, seed) =>
      assembleFloor("test-journey", cellar(false), seed)
    ).flatMap(r => (r.success ? [] : r.reasons))
    expect(failures.filter(reason => reason.type === "regionNotSeated")).toEqual([])
  })

  it("carves a cellar entered and left only by drops on at least one of 40 seeds", () => {
    expect(carvesAtOnce(cellar(false))).toBeGreaterThan(0)
  })

  const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
  const OPPOSITE: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }
  type Cells = ReadonlyArray<ReadonlyArray<GridCell>>
  const regionOf = (cells: Cells, r: number, c: number) => (cells[r]?.[c] as { region?: string } | undefined)?.region

  /** What a carved floor's drops join, read off the cells: the region the launch stands in, then the
   * region the landing stands in, along the way the obstacle cells fall. */
  const dropsRead = (cells: Cells) => {
    const isRun = (r: number, c: number) => {
      const cell = cells[r]?.[c]
      return cell?.type === "corridor" && cell.obstacle !== undefined
    }
    const found: string[] = []
    cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell.type !== "corridor" || !cell.obstacle) return
        const [dr, dc] = MOVES[cell.obstacle.dir]
        if (isRun(r - dr, c - dc)) return
        let [er, ec] = [r, c]
        while (isRun(er + dr, ec + dc)) [er, ec] = [er + dr, ec + dc]
        found.push(`${regionOf(cells, r - dr, c - dc)}->${regionOf(cells, er + dr, ec + dc)}`)
      })
    )
    return found.sort()
  }

  /** The regions the player reaches from `from` across cells that open onto each other BOTH ways. */
  const walkedBothWays = (cells: Cells, from: string) => {
    const seen = new Set<string>()
    const queue: Array<[number, number]> = []
    cells.forEach((row, r) =>
      row.forEach((_, c) => {
        if (regionOf(cells, r, c) !== from) return
        seen.add(`${r},${c}`)
        queue.push([r, c])
      })
    )
    for (let at = 0; at < queue.length; at++) {
      const [r, c] = queue[at]
      const here = cells[r][c]
      if (here.type !== "room" && here.type !== "corridor") continue
      for (const dir of here.dirs) {
        const [nr, nc] = [r + MOVES[dir][0], c + MOVES[dir][1]]
        const next = cells[nr]?.[nc]
        if ((next?.type !== "room" && next?.type !== "corridor") || !next.dirs.has(OPPOSITE[dir])) continue
        if (seen.has(`${nr},${nc}`)) continue
        seen.add(`${nr},${nc}`)
        queue.push([nr, nc])
      }
    }
    return [...new Set([...seen].map(key => key.split(",").map(Number)).map(([r, c]) => regionOf(cells, r, c)))].sort()
  }

  it("carves the seam to a cellar as the drop itself, never a corridor beside it", () => {
    const carved = Array.from({ length: 40 }, (_, seed) => assembleFloor("test-journey", cellar(false), seed)).flatMap(
      result => (result.success ? [result.grid.cells] : [])
    )
    expect(carved.length).toBeGreaterThan(0)
    // Whole result sets: every carved floor carries exactly the two authored falls, each the way it
    // was written, and ground walked both ways from the cellar never leaves the cellar.
    expect(carved.map(dropsRead)).toEqual(carved.map(() => ["kelder->verder", "start->kelder"]))
    expect(carved.map(cells => walkedBothWays(cells, "kelder"))).toEqual(carved.map(() => ["kelder"]))
  })

  it("still refuses a region nothing joins, drop or connection", () => {
    expect(reasons(cellar(true))).toEqual([{ type: "regionUnreachable", name: "lost" }])
  })

  it("still carves a straight chain, a tree and a ring on at least one of 40 seeds each", () => {
    const chain = roomy({
      regions: names("a", "b", "c"),
      connections: [["a", "b"] as const, ["b", "c"] as const],
      in: "a",
      out: "c",
    })
    const tree = roomy({
      regions: names("a", "b", "c"),
      connections: [["a", "b"] as const, ["a", "c"] as const],
      in: "a",
      out: "b",
    })
    const ring = roomy({
      regions: names("a", "b", "c", "d"),
      connections: [["a", "b"] as const, ["b", "c"] as const, ["c", "d"] as const, ["d", "a"] as const],
      in: "a",
      out: "c",
    })
    expect([chain, tree, ring].map(config => carvesAtOnce(config) > 0)).toEqual([true, true, true])
  })
})
