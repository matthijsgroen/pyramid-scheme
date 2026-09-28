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

describe("a region no attempt seats", () => {
  // Only a carve knows how long the main path is, so this cannot be caught when the layout is
  // authored — but a floor that seats content in regions the author never named is the builder
  // deciding quietly, which is the one thing it may not do.
  it("refuses a route with more regions than the path has steps, naming the ones left unseated", () => {
    // A route longer than the path must stay unseated across every attempt, not just the first — the
    // carve's own recovery re-attempts at ever-wider packing (see siteAssembler's ASSEMBLY_ATTEMPTS
    // loop), and `floor()`'s main path (pathPuzzles: 2, no lever) was measured climbing from 9 steps at
    // attempt 0 to 31 at this SEED once packing hits its ceiling in recovery. A route of only 12
    // regions is seated in full well before that ceiling, so it no longer proves this refusal — 60
    // regions, comfortably past every packing this carve can reach, does. The first attempt (9 steps)
    // is what the reported names come off, since `unseatedRegions` keeps the first shortfall seen.
    const names = Array.from({ length: 60 }, (_, i) => `r${i}`)
    const tooManyRegions = {
      regions: names.map(name => ({ name, appetite: "free" as const })),
      connections: names.slice(0, -1).map((name, i) => [name, names[i + 1]] as const),
      in: names[0],
      out: names[names.length - 1],
    }
    const result = assembleFloor("test-journey", floor(tooManyRegions), SEED)

    expect(result.success).toBe(false)
    const reason = result.success ? undefined : result.reasons.find(r => r.type === "regionNotSeated")
    expect(reason).toBeDefined()
    // Every unseated region, in route order, not just one of them — an author fixing one at a
    // time is the builder handing back one problem when it can see them all.
    expect(reason && "regions" in reason ? reason.regions : []).toEqual(names.slice(9))
  })

  // A region can be reachable in the region graph — even declared with a connection — and still
  // never lie on the shortest in→out walk, so no step of the main path ever names it. `hall—sideVault`
  // is reachable from `hall` but off the `mouth—hall—vault` route entirely: unlike the fixture above,
  // the main path has steps to spare, so this is not a route outrunning a path — it is a region the
  // route never threads at all.
  it("refuses a region that is reachable but never lies on the route, naming only that region", () => {
    const branchingLayout = {
      regions: [
        { name: "mouth", appetite: "free" as const },
        { name: "hall", appetite: "free" as const },
        { name: "vault", appetite: "free" as const },
        { name: "sideVault", appetite: "free" as const },
      ],
      connections: [["mouth", "hall"] as const, ["hall", "vault"] as const, ["hall", "sideVault"] as const],
      in: "mouth",
      out: "vault",
    }
    const result = assembleFloor("test-journey", floor(branchingLayout), SEED)

    expect(result.success).toBe(false)
    const reason = result.success ? undefined : result.reasons.find(r => r.type === "regionNotSeated")
    expect(reason).toBeDefined()
    expect(reason && "regions" in reason ? reason.regions : []).toEqual(["sideVault"])
  })
})
