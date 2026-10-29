import { describe, expect, it } from "vitest"
import type { AssemblerResult, FloorConfig, FloorGrid } from "@/game/siteTypes"
import { assembleFloor, PACKING_CEILING } from "@/game/siteAssembler"
import type { Lock } from "@/game/lockAuthoring"
import { LOCK_ENTRIES } from "@/game/lockCatalogue"
import { drawnFloor } from "@/game/testSupport/lessonOrderFixtures"
import {
  packingAtRung,
  roomlessRouteStubs,
  searchCarvePair,
  seedAtOffset,
  refusal,
  verifyCarvePair,
  STAMPED_SEED_RANGE,
  sidePathStages,
  mergeStageSearches,
  describeLayoutFailure,
  type CarveAssemble,
  type CarvePairOptions,
  type CarveRefusal,
  type LayoutNotFound,
  type SidePathStage,
} from "./carveSeedSearch"

const grid = {} as FloorGrid
const carvedAt = (attempt: number): AssemblerResult => ({ success: true, grid, attempt })
const failed: AssemblerResult = { success: false, reasons: [] }
// The floors these stand-ins carve author no lock.
const judge = (result: AssemblerResult) => refusal(result, {})
const options = (over: Partial<CarvePairOptions> = {}): CarvePairOptions => ({
  authoredPacking: 0.1,
  ceiling: 0.2,
  seedBudget: 5,
  fullLadder: Infinity,
  judge,
  stages: [],
  ...over,
})

describe(packingAtRung, () => {
  it("starts at the authored value and rises by one step a rung, without float drift", () => {
    expect([0, 1, 2, 3, 7].map(rung => packingAtRung(0.1, rung))).toEqual([0.1, 0.12, 0.14, 0.16, 0.24])
  })
})

describe(searchCarvePair, () => {
  it("keeps the authored pair when the base seed carves on the first attempt", () => {
    const found = searchCarvePair(100, () => carvedAt(0), options())
    expect(found).toMatchObject({ kind: "found", seed: 100, packing: 0.1, offset: 0, laddered: false })
  })

  it("moves the seed before it raises the packing", () => {
    const found = searchCarvePair(100, seed => (seed < 103 ? failed : carvedAt(0)), options())
    expect(found).toMatchObject({ kind: "found", seed: 103, packing: 0.1, offset: 3, laddered: false })
  })

  it("raises the packing one step only after every seed at the lower one is spent, then tries the ladder", () => {
    const asked: [number, number, number][] = []
    searchCarvePair(
      10,
      (seed, packing, attempts) => {
        asked.push([seed, packing, attempts])
        return failed
      },
      options({ seedBudget: 2, ceiling: 0.14, fullLadder: 60 })
    )
    expect(asked).toEqual([
      [10, 0.1, 1],
      [11, 0.1, 1],
      [10, 0.12, 1],
      [11, 0.12, 1],
      [10, 0.14, 1],
      [11, 0.14, 1],
      [10, 0.1, 60],
    ])
  })

  it("the pair closest to the authored packing wins", () => {
    const passesAt = new Set([0.12, 0.16])
    const found = searchCarvePair(
      50,
      (seed, packing) => (passesAt.has(packing) && seed === 52 ? carvedAt(0) : failed),
      options({ ceiling: 0.5 })
    )
    expect(found).toMatchObject({ kind: "found", seed: 52, packing: 0.12, offset: 2, laddered: false })
  })

  it("never asks for a packing past the ceiling, and asks one authored above it at its own value only", () => {
    const asked = (authoredPacking: number) => {
      const packings: number[] = []
      searchCarvePair(
        1,
        (_seed, packing, attempts) => {
          if (attempts === 1) packings.push(packing)
          return failed
        },
        options({ authoredPacking, seedBudget: 1, ceiling: 0.16 })
      )
      return packings
    }
    expect(asked(0.1)).toEqual([0.1, 0.12, 0.14, 0.16])
    expect(asked(2)).toEqual([2])
  })

  it("a hard criterion no candidate meets is not found", () => {
    let carves = 0
    const missing = searchCarvePair(
      1,
      () => {
        carves++
        return carvedAt(0)
      },
      options({
        seedBudget: 3,
        ceiling: 0.12,
        judge: () => ({ criterion: "no dead region", detail: "at 3,3" }),
      })
    )
    expect(carves).toBe(7)
    expect(missing).toMatchObject({
      kind: "notFound",
      hardest: "no dead region",
      detail: "at 3,3",
      counts: { "no dead region": 7 },
      seeds: 3,
      packings: 2,
    })
  })

  it("names the furthest criterion any candidate reached as the hardest, and counts each", () => {
    const missing = searchCarvePair(
      1,
      (_seed, packing) => (packing === 0.1 ? failed : carvedAt(0)),
      options({
        seedBudget: 2,
        ceiling: 0.12,
        judge: result => (result.success ? { criterion: "lock holds an encounter", detail: "lever" } : judge(result)),
      })
    )
    expect(missing).toMatchObject({
      kind: "notFound",
      hardest: "lock holds an encounter",
      counts: { carves: 3, "lock holds an encounter": 2 },
    })
  })

  it("packing never fails a floor", () => {
    const found = searchCarvePair(
      100,
      (_seed, _packing, attempts) => (attempts > 1 ? carvedAt(7) : failed),
      options({ fullLadder: 60 })
    )
    expect(found).toMatchObject({ kind: "found", seed: 100, packing: 0.1, offset: 0, laddered: true })
  })

  it("the ladder carve must meet the hard criteria", () => {
    const missing = searchCarvePair(
      100,
      (_seed, _packing, attempts) => (attempts > 1 ? carvedAt(7) : failed),
      options({
        fullLadder: 60,
        judge: result =>
          !result.success
            ? judge(result)
            : result.attempt > 0
              ? { criterion: "lock walks sound", detail: "strands" }
              : null,
      })
    )
    expect(missing).toMatchObject({ kind: "notFound", hardest: "lock walks sound" })
  })

  it("asks no attempt 0 of a carve: a late carve meeting every hard criterion is accepted", () => {
    expect(
      refusal({ success: true, grid: { cells: [], entrancePos: [0, 0] } as unknown as FloorGrid, attempt: 9 }, {})
    ).toBeNull()
  })

  it("names a floor that never carves as such", () => {
    expect(searchCarvePair(1, () => failed, options({ seedBudget: 2 }))).toMatchObject({
      kind: "notFound",
      hardest: "carves",
    })
  })

  it("carves a real floor on its first attempt at the pair it finds", () => {
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [],
    }
    const found = searchCarvePair(
      42,
      (seed, packing, maxAttempts) =>
        assembleFloor("site", { ...config, seed, packing }, 0, undefined, { maxAttempts }),
      options({ seedBudget: 10, ceiling: PACKING_CEILING })
    )
    if (found.kind !== "found") throw new Error("no pair")
    const again = assembleFloor("site", { ...config, seed: found.seed, packing: found.packing }, 0)
    expect(again).toMatchObject({ success: true, attempt: 0 })
  })

  describe("a base seed past Number.MAX_SAFE_INTEGER", () => {
    const unsafeBase = 9109538588672898
    const budget = 100

    it("is really unsafe, and plain addition off it collides", () => {
      expect(Number.isSafeInteger(unsafeBase)).toBe(false)
      const plain = Array.from({ length: budget + 1 }, (_, offset) => unsafeBase + offset)
      expect(new Set(plain).size).toBeLessThan(plain.length)
    })

    it("asks every try at a distinct, safe seed in the stamped range, the base itself untouched", () => {
      const asked: number[] = []
      searchCarvePair(
        unsafeBase,
        (seed, _packing, attempts) => {
          if (attempts === 1) asked.push(seed)
          return failed
        },
        options({ seedBudget: budget + 1, ceiling: 0.1, fullLadder: 2 })
      )
      expect(asked).toHaveLength(budget + 1)
      expect(asked[0]).toBe(unsafeBase)
      expect(new Set(asked).size).toBe(asked.length)
      for (const seed of asked.slice(1)) {
        expect(Number.isSafeInteger(seed)).toBe(true)
        expect(seed).toBeGreaterThanOrEqual(0)
        expect(seed).toBeLessThan(STAMPED_SEED_RANGE)
      }
    })

    it("reduces before adding, so the offset is never lost to rounding", () => {
      for (let offset = 1; offset <= budget; offset++)
        expect(seedAtOffset(unsafeBase, offset)).toBe(((unsafeBase % STAMPED_SEED_RANGE) + offset) % STAMPED_SEED_RANGE)
    })

    it("pins a seed that reproduces its own carve when written as a literal and read back", () => {
      const config: FloorConfig = {
        pathPuzzles: 1,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [],
      }
      const dirsOf = (result: AssemblerResult) => {
        if (!result.success) throw new Error("did not carve")
        return result.grid.cells.map(row => row.map(cell => ("dirs" in cell ? [...cell.dirs].sort().join("") : "")))
      }
      const carve = (seed: number, maxAttempts: number) =>
        assembleFloor("site", { ...config, seed }, unsafeBase, undefined, { maxAttempts })
      // Offset 0 (the unsafe base) is refused by this stand-in, so the search is forced onto a stamped seed.
      const found = searchCarvePair(
        unsafeBase,
        (seed, _packing, maxAttempts) => (seed === unsafeBase ? failed : carve(seed, maxAttempts)),
        options({ seedBudget: budget, ceiling: 0.1 })
      )
      if (found.kind !== "found") throw new Error("no seed")
      expect(found.offset).toBeGreaterThan(0)
      expect(Number.isSafeInteger(found.seed)).toBe(true)
      const literal = Number(String(found.seed))
      expect(literal).toBe(found.seed)
      expect(dirsOf(carve(literal, Infinity))).toEqual(dirsOf({ success: true, grid: found.grid, attempt: 0 }))
    })
  })
})

describe("where the side paths stand", () => {
  const on = (section: number, corridor: string) => ({ section, corridor })

  it("sections past the corridors hang outside from the first stage, then move outside last authored first, one per stage", () => {
    expect(sidePathStages([0, 2, 5, 6], [on(0, "a"), on(2, "b"), on(5, "c")], [])).toEqual([
      { outsideLock: [6] },
      { outsideLock: [5, 6] },
      { outsideLock: [2, 5, 6] },
      { outsideLock: [0, 2, 5, 6] },
    ])
  })

  it("a corridor takes a second section only after every stage of one to a corridor, and only while one holds two", () => {
    const single = [on(0, "a"), on(1, "b")]
    const double = [on(0, "a"), on(1, "b"), on(2, "a"), on(3, "b")]
    expect(sidePathStages([0, 1, 2, 3], single, double)).toEqual([
      { outsideLock: [2, 3] },
      { outsideLock: [1, 2, 3] },
      { outsideLock: [0, 1, 2, 3] },
      { outsideLock: [], corridorsTakeTwo: true },
      { outsideLock: [3], corridorsTakeTwo: true },
    ])
  })

  it("a floor with no section offered a corridor asks one stage", () => {
    expect(sidePathStages([], [], [])).toEqual([{ outsideLock: [] }])
  })

  // A stand-in floor whose carve holds only while no more than `fits` of its side paths stand in the lock.
  const lockHolding = (offered: number, fits: number) => {
    const asked: SidePathStage[] = []
    const assemble = (_seed: number, _packing: number, _attempts: number, sidePaths: SidePathStage) => {
      asked.push(sidePaths)
      return offered - sidePaths.outsideLock.length <= fits ? carvedAt(0) : failed
    }
    return { asked, assemble }
  }
  const stageOptions = (stages: SidePathStage[]) => options({ seedBudget: 3, ceiling: 0.12, stages })
  const twoInside = sidePathStages([1, 3], [on(1, "a"), on(3, "b")], [])

  it("a floor that carves with every side path inside is pinned so, and no later stage is carved", () => {
    const { asked, assemble } = lockHolding(2, 2)
    const found = searchCarvePair(100, assemble, stageOptions(twoInside))
    expect(found).toMatchObject({ kind: "found", seed: 100, sidePaths: { outsideLock: [] } })
    expect(asked).toEqual([{ outsideLock: [] }])
  })

  it("a floor that carves only with its last side path outside is found at stage 1, outsideLock naming that section", () => {
    const { asked, assemble } = lockHolding(2, 1)
    const found = searchCarvePair(100, assemble, stageOptions(twoInside))
    expect(found).toMatchObject({ kind: "found", seed: 100, packing: 0.1, offset: 0, sidePaths: { outsideLock: [3] } })
    // Stage 0 is spent whole first: 3 seeds × 2 packings and the ladder.
    expect(asked.filter(stage => stage.outsideLock.length === 0)).toHaveLength(7)
    expect(asked).toHaveLength(8)
  })

  it("asks the stages in the order given", () => {
    const seen: SidePathStage[] = []
    const stages = sidePathStages([0, 2, 5], [on(0, "a"), on(2, "b"), on(5, "c")], [])
    searchCarvePair(
      100,
      (_seed, _packing, _attempts, sidePaths) => {
        if (seen.at(-1) !== sidePaths) seen.push(sidePaths)
        return failed
      },
      stageOptions(stages)
    )
    expect(seen).toEqual(stages)
  })

  it("a floor that meets no hard criterion even with every side path outside is notFound, counting every stage", () => {
    let carves = 0
    const missing = searchCarvePair(
      1,
      () => {
        carves++
        return carvedAt(0)
      },
      options({
        seedBudget: 3,
        ceiling: 0.12,
        stages: sidePathStages([0, 4], [on(0, "a"), on(4, "b")], []),
        judge: () => ({ criterion: "no dead region", detail: "at 3,3" }),
      })
    )
    // Three stages of 3 seeds × 2 packings and the ladder.
    expect(carves).toBe(21)
    expect(missing).toMatchObject({
      kind: "notFound",
      hardest: "no dead region",
      counts: { "no dead region": 21 },
      stages: 3,
    })
  })
})

describe(mergeStageSearches, () => {
  const stages: SidePathStage[] = [{ outsideLock: [] }, { outsideLock: [2] }, { outsideLock: [1, 2] }]
  // A stand-in floor whose refusal turns on the seed, the packing and where its side paths stand, carving at
  // `carvesAt` only.
  const floor = (carvesAt?: { seed: number; outside: number }) => {
    const criteria = ["carves", "lock walks sound", "no dead region"] as const
    const verdict = new Map<AssemblerResult, CarveRefusal>()
    const assemble = (seed: number, packing: number, _attempts: number, sidePaths: SidePathStage) => {
      const result = carvedAt(0)
      if (carvesAt && seed === carvesAt.seed && sidePaths.outsideLock.length === carvesAt.outside) return result
      const criterion = criteria[(seed + Math.round(packing * 50) + sidePaths.outsideLock.length) % 3]
      verdict.set(result, { criterion, detail: `${criterion} at ${seed} ${packing} ${sidePaths.outsideLock}` })
      return result
    }
    const judge = (result: AssemblerResult) => verdict.get(result) ?? null
    return { assemble, options: options({ seedBudget: 4, ceiling: 0.14, stages, judge }) }
  }
  const withoutGrid = (result: ReturnType<typeof searchCarvePair>) => {
    if (result.kind === "notFound") return result
    const { grid: _grid, ...pin } = result
    return pin
  }
  const inTurn = ({ assemble, options }: ReturnType<typeof floor>) => withoutGrid(searchCarvePair(5, assemble, options))
  const apart = ({ assemble, options }: ReturnType<typeof floor>) =>
    mergeStageSearches(stages.map(stage => withoutGrid(searchCarvePair(5, assemble, { ...options, stages: [stage] }))))

  it("decides the stage searching them in turn finds", () => {
    const found = floor({ seed: 7, outside: 1 })
    expect(apart(found)).toEqual(inTurn(found))
    expect(apart(found)).toMatchObject({ kind: "found", seed: 7, sidePaths: stages[1] })
  })

  it("adds up every stage's refusals and keeps the hardest detail last met, as searching them in turn does", () => {
    const lost = floor()
    expect(JSON.stringify(apart(lost))).toBe(JSON.stringify(inTurn(lost)))
    expect(apart(lost)).toMatchObject({ kind: "notFound", stages: 3 })
  })

  it("passes over a stage left unsearched after an earlier one found", () => {
    const found = floor({ seed: 6, outside: 0 })
    const first = withoutGrid(searchCarvePair(5, found.assemble, { ...found.options, stages: [stages[0]] }))
    expect(mergeStageSearches([first, null, null])).toEqual(inTurn(found))
  })
})

describe(verifyCarvePair, () => {
  const ladder = { authoredPacking: 0.1, fullLadder: Infinity, judge }

  it("keeps a pinned pair that carves on the first attempt, in one carve", () => {
    const asked: [number, number, number][] = []
    const found = verifyCarvePair(
      100,
      { seed: 103, packing: 0.14 },
      (seed, packing, attempts) => {
        asked.push([seed, packing, attempts])
        return carvedAt(0)
      },
      ladder
    )
    expect(found).toMatchObject({ kind: "found", seed: 103, packing: 0.14, offset: 3, laddered: false })
    expect(asked).toEqual([[103, 0.14, 1]])
  })

  it("rejects a pinned pair off the base that carves only past the first attempt, or not at all", () => {
    const pin = { seed: 103, packing: 0.14 }
    expect(verifyCarvePair(100, pin, () => carvedAt(2), ladder)).toBeNull()
    expect(verifyCarvePair(100, pin, () => failed, ladder)).toBeNull()
  })

  it("a laddered pin verifies without a search", () => {
    const asked: [number, number, number][] = []
    const found = verifyCarvePair(
      100,
      { seed: 100, packing: 0.1 },
      (seed, packing, attempts) => {
        asked.push([seed, packing, attempts])
        return attempts > 1 ? carvedAt(6) : failed
      },
      ladder
    )
    expect(found).toMatchObject({ kind: "found", seed: 100, packing: 0.1, offset: 0, laddered: true })
    expect(asked).toEqual([[100, 0.1, Infinity]])
  })

  it("rejects a pin whose carve misses a hard criterion", () => {
    const unfed = () => ({ criterion: "lock holds an encounter" as const, detail: "lever" })
    expect(verifyCarvePair(100, { seed: 100, packing: 0.1 }, () => carvedAt(6), { ...ladder, judge: unfed })).toBeNull()
    expect(verifyCarvePair(100, { seed: 103, packing: 0.1 }, () => carvedAt(0), { ...ladder, judge: unfed })).toBeNull()
  })

  it("a pin with outsideLock verifies in one carve with its side paths", () => {
    const asked: SidePathStage[] = []
    const found = verifyCarvePair(
      100,
      { seed: 103, packing: 0.14, sidePaths: { outsideLock: [2, 4], corridorsTakeTwo: true } },
      (_seed, _packing, _attempts, sidePaths) => {
        asked.push(sidePaths)
        return carvedAt(0)
      },
      ladder
    )
    expect(found).toMatchObject({
      kind: "found",
      seed: 103,
      sidePaths: { outsideLock: [2, 4], corridorsTakeTwo: true },
    })
    expect(asked).toEqual([{ outsideLock: [2, 4], corridorsTakeTwo: true }])
  })

  it("measures the offset past the base inside the stamped range", () => {
    const base = STAMPED_SEED_RANGE * 3 + 5
    const seed = seedAtOffset(base, 7)
    expect(verifyCarvePair(base, { seed, packing: 0.1 }, () => carvedAt(0), ladder)).toMatchObject({ offset: 7 })
  })
})

describe(roomlessRouteStubs, () => {
  const corridor = (sectionAddress: string, region: string) => ({ type: "corridor", sectionAddress, region })
  const room = (sectionAddress: string, region: string, pathIndex: number) => ({
    type: "room",
    roomType: "encounter",
    sectionAddress,
    region,
    pathIndex,
  })
  const floor = (...cells: object[]) => ({ cells: [cells], entrancePos: [9, 9] }) as unknown as FloorGrid

  it("names the stub of a route region that holds no room", () => {
    const grid = floor(corridor("main", "l.hall"), corridor("lock:l.hall", "l.hall"), room("lock:l.side", "l.side", 0))
    expect(roomlessRouteStubs(grid)).toEqual(["lock:l.hall"])
  })

  it("passes a stub holding a room, and a roomless region the route never crosses", () => {
    const grid = floor(
      corridor("main", "l.hall"),
      corridor("lock:l.hall", "l.hall"),
      room("lock:l.hall", "l.hall", 0),
      corridor("lock:l.path", "l.path")
    )
    expect(roomlessRouteStubs(grid)).toEqual([])
  })
})

describe("a lesson's order on the carved floor", () => {
  // A made-up lock under the name of whichever lesson the catalogue holds first, and one under a name no lock has.
  const lockNamed = (name: string): Lock => ({
    name,
    regions: {},
    connections: [],
    gates: {},
    mechanics: {},
    in: "in",
    out: "out",
  })
  const lesson = lockNamed(LOCK_ENTRIES.find(entry => entry.lesson)!.name)
  const plain = lockNamed("madeUpLock")
  const carved = (grid: FloorGrid): AssemblerResult => ({ success: true, grid, attempt: 0 })

  it("refuses a lesson floor whose carve breaks the order, and only a lesson floor", () => {
    const leverFirst = carved(drawnFloor(["E-L-D-x"]))
    expect(refusal(leverFirst, { locks: [{ lock: lesson }] })).toMatchObject({
      criterion: "lesson shows its door first",
    })
    expect(refusal(leverFirst, { locks: [{ lock: plain }] })).toBeNull()
    expect(refusal(carved(drawnFloor(["E-+-D-x", "  |", "  L"])), { locks: [{ lock: lesson }] })).toBeNull()
  })
})

describe("prefer", () => {
  // A made-up grid per seed: its `prefer` score is the seed's offset from 100 read off this table.
  const scored = (scores: number[]) => {
    const grids = scores.map(score => ({ score }) as unknown as FloorGrid)
    const assemble: CarveAssemble = (seed): AssemblerResult => ({ success: true, grid: grids[seed - 100], attempt: 0 })
    const prefer = (g: FloorGrid) => (g as unknown as { score: number }).score
    return { assemble, prefer }
  }

  it("pins the first seed with no fallback over an earlier one with fallbacks", () => {
    const { assemble, prefer } = scored([2, 1, 0, 0, 1])
    expect(searchCarvePair(100, assemble, options({ prefer }))).toMatchObject({ kind: "found", seed: 102, offset: 2 })
  })

  it("pins the fewest fallbacks when no seed has none, without raising packing", () => {
    const asked: number[] = []
    const { assemble, prefer } = scored([3, 2, 1, 1, 2])
    const found = searchCarvePair(
      100,
      (seed, packing, attempts, sidePaths) => {
        asked.push(packing)
        return assemble(seed, packing, attempts, sidePaths)
      },
      options({ prefer })
    )
    expect(found).toMatchObject({ kind: "found", seed: 102, packing: 0.1 })
    expect(new Set(asked)).toEqual(new Set([0.1]))
  })

  it("returns the first hard-criteria seed unchanged when prefer is absent or always 0", () => {
    const { assemble } = scored([5, 5, 5, 5, 5])
    const plain = searchCarvePair(100, assemble, options())
    expect(plain).toMatchObject({ kind: "found", seed: 100, offset: 0 })
    expect(searchCarvePair(100, assemble, options({ prefer: () => 0 }))).toEqual(plain)
  })

  it("keeps a pin whose carve has a fallback, with that carve's grid for the report", () => {
    const { assemble, prefer } = scored([1, 0])
    const base = { seed: 100, packing: 0.1 }
    const kept = verifyCarvePair(100, base, assemble, options({ prefer }))
    expect(kept).toMatchObject({ kind: "found", seed: 100 })
    expect(prefer(kept!.grid)).toBe(1)
    expect(verifyCarvePair(100, { ...base, seed: 101 }, assemble, options({ prefer }))).toMatchObject({ seed: 101 })
  })
})

describe("describeLayoutFailure", () => {
  it("names a designed room placed fewer times than its min", () => {
    const detail = JSON.stringify([
      { type: "prefabsNotPlaced", room: "hall", wanted: 2, placed: 1 },
      { type: "layoutNotFound" },
    ])
    const result: LayoutNotFound = {
      kind: "notFound",
      hardest: "carves",
      detail,
      counts: { carves: 3 },
      seeds: 3,
      packings: 1,
      stages: 1,
    }
    expect(describeLayoutFailure("j1 floor 0", result)).toBe("j1 floor 0: room hall placed 1 of min 2")
  })
})
