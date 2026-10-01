import { describe, expect, it } from "vitest"
import { adjacencyFaults, dropLandingFaults, gateDoorFaults } from "./carveAgreement"
import { assembleFloor } from "./siteAssembler"
import type { CorridorCell, Direction, FloorConfig, GridCell, RoomCell } from "./siteTypes"

// A FLOOR DRAWN AS TEXT. One token per cell, `-` for nothing, `label` for ground in that region and
// `label*key` for a door in that region asking for `key`. Every pair of neighbouring cells is joined
// both ways, and `.` is the floor's own ground, which names no region. So a fixture says what stands where and nothing about how a maze got there.
const DIRS: Array<[Direction, number, number, Direction]> = [
  ["n", -1, 0, "s"],
  ["s", 1, 0, "n"],
  ["e", 0, 1, "w"],
  ["w", 0, -1, "e"],
]

const draw = (picture: string): GridCell[][] => {
  const tokens = picture
    .trim()
    .split("\n")
    .map(line => line.trim().split(/\s+/))
  const present = (r: number, c: number) => (tokens[r]?.[c] ?? "-") !== "-"
  return tokens.map((row, r) =>
    row.map((token, c): GridCell => {
      if (token === "-") return { type: "empty" }
      const [region, key] = token.split("*")
      const dirs = new Set<Direction>(DIRS.filter(([, dr, dc]) => present(r + dr, c + dc)).map(([d]) => d))
      const base = {
        dirs,
        state: "fogged" as const,
        sectionAddress: "main",
        sectionHash: "h",
        legacySectionHash: "h",
        region: region === "." ? undefined : region,
      }
      if (key === undefined) return { type: "corridor", ...base } satisfies CorridorCell
      return { type: "room", roomType: "encounter", requiredKeyId: key, ...base } satisfies RoomCell
    })
  )
}

const fork = {
  regions: [],
  connections: [
    ["entrance", "leftLower"],
    ["entrance", "rightLower"],
  ] as const,
  in: "entrance",
  out: "leftLower",
}

describe("the carve's adjacency against the layout's connections", () => {
  it("is silent when the regions touch exactly where the layout connects them", () => {
    const cells = draw("leftLower entrance rightLower")

    expect(adjacencyFaults(cells, fork)).toEqual([])
  })

  // The measured failure: a side chain hung off the wrong main-path cell, so the fork became a chain.
  it("names a region attached through another, and what the layout authored instead", () => {
    const cells = draw("entrance leftLower rightLower")

    expect(adjacencyFaults(cells, fork)).toEqual([
      { type: "regionAttachedThrough", region: "rightLower", through: "leftLower", authored: ["entrance"] },
    ])
  })

  it("names a connection no cells cross", () => {
    const triangle = {
      regions: [],
      connections: [
        ["a", "b"],
        ["b", "c"],
        ["a", "c"],
      ] as const,
      in: "a",
      out: "c",
    }

    expect(adjacencyFaults(draw("a b c"), triangle)).toEqual([{ type: "regionsNotJoined", between: ["a", "c"] }])
  })

  it("names regions joined where the layout joins nothing", () => {
    const pair = { regions: [], connections: [["a", "b"]] as const, in: "a", out: "b" }

    expect(adjacencyFaults(draw("a b c"), pair)).toEqual([
      { type: "regionAttachedThrough", region: "c", through: "b", authored: [] },
    ])
  })

  it("reads a drop as no join: ground that does not open back is not a neighbour", () => {
    // entrance opens east onto rightLower, which names no way back — exactly as a drop's last step.
    const cells = draw("leftLower entrance rightLower")
    cells[0][2] = { ...(cells[0][2] as CorridorCell), dirs: new Set<Direction>() }

    expect(adjacencyFaults(cells, { ...fork, connections: [["entrance", "leftLower"]] })).toEqual([])
  })
})

describe("a container placed on part of the floor", () => {
  const container = {
    regions: [],
    connections: [
      ["mouth", "hall"],
      ["hall", "vault"],
    ] as const,
    in: "mouth",
    out: "vault",
  }

  // The floor's ordinary ground before and after names no region, so it can neither be the container's
  // neighbour nor disagree with it: only the container's own graph is asked.
  it("is silent when ordinary ground stands either side of a container joined as authored", () => {
    expect(adjacencyFaults(draw(". . mouth hall vault . ."), container)).toEqual([])
  })

  it("still names a connection of the container no cells cross", () => {
    expect(adjacencyFaults(draw(". mouth . hall vault ."), container)).toEqual([
      { type: "regionsNotJoined", between: ["mouth", "hall"] },
    ])
  })

  it("still names two container regions joined where the container joins nothing", () => {
    expect(adjacencyFaults(draw(". mouth vault hall ."), container)).toEqual([
      { type: "regionAttachedThrough", region: "mouth", through: "vault", authored: ["hall"] },
    ])
  })
})

const gate = (id: string, between: [string, string]) => ({ id, between, key: `key:${id}` })

describe("a gate's door separates exactly two lock regions", () => {
  it("is silent for a door with ground on each side", () => {
    const cells = draw("a b*key:g c")

    expect(gateDoorFaults(cells, [gate("g", ["b", "c"])], new Set())).toEqual([])
  })

  it("names a door standing in a junction of three", () => {
    const cells = draw(`
      a b*key:g c
      - d      -
    `)

    expect(gateDoorFaults(cells, [gate("g", ["a", "c"])], new Set())).toEqual([
      { type: "gateDoorMisplaced", id: "g", between: ["a", "c"], touches: 3, around: ["a", "b", "c", "d"] },
    ])
  })

  it("names a door with ground on one side only", () => {
    const cells = draw("a b*key:g")

    expect(gateDoorFaults(cells, [gate("g", ["a", "b"])], new Set())).toEqual([
      { type: "gateDoorMisplaced", id: "g", between: ["a", "b"], touches: 1, around: ["a", "b"] },
    ])
  })

  it("names a door whose two sides the carve joined round the back", () => {
    const cells = draw(`
      a b*key:g a
      a a       a
    `)

    expect(gateDoorFaults(cells, [gate("g", ["a", "a"])], new Set())).toEqual([
      { type: "gateDoorMisplaced", id: "g", between: ["a", "a"], touches: 1, around: ["a", "b"] },
    ])
  })
})

describe("a drop lands in ground that reaches every door bounding its region", () => {
  const gates = [gate("forkLeft", ["entrance", "leftLower"]), gate("greenLeft", ["leftLower", "s2"])]
  const between = `
    entrance forkLeft*key:forkLeft leftLower greenLeft*key:greenLeft s2
  `

  it("is silent for a landing between both doors", () => {
    expect(
      dropLandingFaults(draw(between), [{ id: "drop", region: "leftLower", landing: [0, 2] }], gates, new Set())
    ).toEqual([])
  })

  it("names the doors a landing in a gate-less pocket of the region does not reach", () => {
    // The pocket, bottom left, is ground labelled leftLower that no door borders.
    const cells = draw(`
      entrance forkLeft*key:forkLeft leftLower greenLeft*key:greenLeft s2
      -        -                     -         -                       -
      leftLower leftLower            -         -                       -
    `)

    expect(dropLandingFaults(cells, [{ id: "drop", region: "leftLower", landing: [2, 0] }], gates, new Set())).toEqual([
      { type: "dropLandsApart", id: "drop", region: "leftLower", apart: ["forkLeft", "greenLeft"] },
    ])
  })

  it("names only the doors a landing misses when it reaches some", () => {
    // Landing in s2's ground while the drop was authored to leftLower: greenLeft is reached, forkLeft not.
    expect(
      dropLandingFaults(draw(between), [{ id: "drop", region: "leftLower", landing: [0, 4] }], gates, new Set())
    ).toEqual([{ type: "dropLandsApart", id: "drop", region: "leftLower", apart: ["forkLeft"] }])
  })
})

const hub = (connections: Array<[string, string]>, names: string[], inn: string, out: string) => ({
  regions: names.map(name => ({ name, appetite: "free" as const })),
  connections,
  in: inn,
  out,
})
const floorOf = (regionLayout: FloorConfig["regionLayout"]): FloorConfig => ({
  pathPuzzles: 3,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
    { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
  ],
  regionLayout,
})

describe("the builder refuses a carve that is not the layout it was given", () => {
  // Four regions each meeting every other cannot be a tree of corridors, so no attempt can satisfy
  // this layout and the floor is refused — by the connections it could not make, not by "no layout".
  it("refuses a layout no carve can realise, naming every connection it failed to make", () => {
    const names = ["a", "b", "c", "d"]
    const pairs: Array<[string, string]> = names.flatMap((x, i) =>
      names.slice(i + 1).map(y => [x, y] as [string, string])
    )
    const result = assembleFloor("test-journey", floorOf(hub(pairs, names, "a", "d")), 1)

    expect(result.success).toBe(false)
    const joins = result.success ? [] : result.reasons.filter(r => r.type === "regionsNotJoined")
    expect(joins.length).toBeGreaterThan(0)
    for (const reason of joins) expect(pairs).toContainEqual(reason.type === "regionsNotJoined" ? reason.between : [])
  })

  // Re-seeding is what lets a rejected carve be replaced: over these seeds the first carve disagrees
  // with the layout for most, and every floor that comes back agrees with it.
  it("hands back only carves whose regions touch exactly as the layout connects them", () => {
    const layout = hub(
      [
        ["mouth", "hall"],
        ["hall", "vault"],
        ["hall", "annex"],
        ["mouth", "cellar"],
      ],
      ["mouth", "hall", "vault", "annex", "cellar"],
      "mouth",
      "vault"
    )
    const seeds = Array.from({ length: 40 }, (_, i) => i + 1)
    const results = seeds.map(seed => assembleFloor("test-journey", floorOf(layout), seed))

    expect(results.filter(r => r.success).length).toBeGreaterThan(30)
    for (const result of results) if (result.success) expect(adjacencyFaults(result.grid.cells, layout)).toEqual([])
  })
})
