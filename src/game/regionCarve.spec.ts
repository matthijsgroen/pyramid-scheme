import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import type { CorridorCell, FloorConfig, RoomCell } from "./siteTypes"

const SEED = 99

// `free` on mouth and vault, not `nothing`/`reward`: with `pathPuzzles: 2` the main path starts a
// puzzle in mouth and ends its goal chest in whichever region the route hands the tail, so the two
// ends have to take whatever actually lands there. `hall` is the one region this fixture pins down —
// puzzles land there and only there.
const threeRegions = {
  regions: [
    { name: "mouth", appetite: "free" as const },
    { name: "hall", appetite: "puzzles" as const },
    { name: "vault", appetite: "free" as const },
  ],
  connections: [["mouth", "hall"] as const, ["hall", "vault"] as const],
  in: "mouth",
  out: "vault",
}

const floor = (regionLayout?: FloorConfig["regionLayout"]): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
  regionLayout,
})

const carvedCells = (config: FloorConfig): Array<RoomCell | CorridorCell> => {
  const result = assembleFloor("test-journey", config, SEED)
  if (!result.success) throw new Error(`did not carve: ${JSON.stringify(result.reasons)}`)
  return result.grid.cells
    .flat()
    .filter((cell): cell is RoomCell | CorridorCell => cell.type === "room" || cell.type === "corridor")
}

describe("a carved cell knows its region", () => {
  it("labels every carved cell when the floor authors a layout", () => {
    const unlabelled = carvedCells(floor(threeRegions)).filter(cell => cell.region === undefined)

    expect(unlabelled).toEqual([])
  })

  // Depends on the main path having at least as many steps as the route has regions — with
  // `pathPuzzles: 2` it does. If this fails counting 2 regions rather than 3, the path is shorter than
  // the route and `regionOfStep` has correctly dealt only what there was; say so rather than widening
  // the assertion, because a route longer than its path is a fault a later slice reports.
  it("uses every region of the route and none that is not on it", () => {
    const used = new Set(carvedCells(floor(threeRegions)).map(cell => cell.region))

    expect([...used].sort()).toEqual(["hall", "mouth", "vault"])
  })

  it("labels nothing at all when the floor authors no layout", () => {
    const labelled = carvedCells(floor(undefined)).filter(cell => cell.region !== undefined)

    expect(labelled).toEqual([])
  })
})

describe("content a region will not take", () => {
  // `nothing` is a promise the region stays empty, so a puzzle standing in one is the floor and its
  // layout disagreeing — and the builder says so rather than quietly moving the puzzle.
  it("refuses a puzzle standing where the layout promised nothing", () => {
    const everywhereEmpty = {
      regions: [
        { name: "mouth", appetite: "nothing" as const },
        { name: "vault", appetite: "nothing" as const },
      ],
      connections: [["mouth", "vault"] as const],
      in: "mouth",
      out: "vault",
    }
    const result = assembleFloor("test-journey", floor(everywhereEmpty), SEED)

    expect(result.success).toBe(false)
    expect(result.success ? [] : result.reasons).toContainEqual({
      type: "regionWillNotTake",
      region: expect.any(String),
      kind: "puzzle",
    })
  })

  it("carves a floor whose puzzles stand where the layout takes puzzles", () => {
    expect(assembleFloor("test-journey", floor(threeRegions), SEED).success).toBe(true)
  })

  // An appetite says what a region WILL take, never what it must hold.
  it("does not mind a region that takes puzzles standing empty", () => {
    // Bare (`pathPuzzles: 0`, no side sections) still carves the main path's own goal chest — `end:
    // "treasure"` is unconditional — and at this seed it lands in `hall`, which is why `hall` alone
    // takes anything: a `puzzles` region there would rightly refuse a chest, which would prove the
    // wrong thing. `mouth` and `vault` stay `puzzles` and carry no puzzle at all, which is the point.
    const roomyLayout = {
      regions: [
        { name: "mouth", appetite: "puzzles" as const },
        { name: "hall", appetite: "free" as const },
        { name: "vault", appetite: "puzzles" as const },
      ],
      connections: [["mouth", "hall"] as const, ["hall", "vault"] as const],
      in: "mouth",
      out: "vault",
    }
    const bare: FloorConfig = { ...floor(roomyLayout), pathPuzzles: 0, sideSections: [] }

    expect(assembleFloor("test-journey", bare, SEED).success).toBe(true)
  })
})

describe("a route the main path cannot seat", () => {
  // Only a carve knows how long the main path is, so this cannot be caught when the layout is
  // authored — but a floor that seats content in regions the author never named is the builder
  // deciding quietly, which is the one thing it may not do.
  it("refuses a route with more regions than the path has steps, naming the ones left unseated", () => {
    // `floor()`'s own main path (pathPuzzles: 2, no lever) carves to 9 steps at this SEED and
    // every other seed measured — a chain nine long lands exactly on it rather than past it, so
    // the chain runs one region longer, to ten, to actually outrun the path rather than fit it.
    const tooManyRegions = {
      regions: [
        { name: "a", appetite: "free" as const },
        { name: "b", appetite: "free" as const },
        { name: "c", appetite: "free" as const },
        { name: "d", appetite: "free" as const },
        { name: "e", appetite: "free" as const },
        { name: "f", appetite: "free" as const },
        { name: "g", appetite: "free" as const },
        { name: "h", appetite: "free" as const },
        { name: "i", appetite: "free" as const },
        { name: "j", appetite: "free" as const },
      ],
      connections: [
        ["a", "b"] as const,
        ["b", "c"] as const,
        ["c", "d"] as const,
        ["d", "e"] as const,
        ["e", "f"] as const,
        ["f", "g"] as const,
        ["g", "h"] as const,
        ["h", "i"] as const,
        ["i", "j"] as const,
      ],
      in: "a",
      out: "j",
    }
    const result = assembleFloor("test-journey", floor(tooManyRegions), SEED)

    expect(result.success).toBe(false)
    const reason = result.success ? undefined : result.reasons.find(r => r.type === "routeOutrunsPath")
    expect(reason).toBeDefined()
    // Every unseated region, not just the first — an author fixing one at a time is the builder
    // handing back one problem when it can see them all.
    expect(reason && "regions" in reason ? reason.regions.length : 0).toBeGreaterThan(0)
  })

  it("carves a route the path can seat", () => {
    expect(assembleFloor("test-journey", floor(threeRegions), SEED).success).toBe(true)
  })
})
