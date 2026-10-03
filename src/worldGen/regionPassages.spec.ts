import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildConfigs } from "./configBuilder"
import { DEV_JOURNEY_ID } from "./data"
import type { FloorConfig, SiteConfig } from "./types"
import { assembleFloor } from "../game/siteAssembler"
import type { FloorConfig as GameFloorConfig, FloorGrid, GridCell, MechanismRecord } from "../game/siteTypes"
import { floorAssemblySeed, persistentInteriorSeed } from "../game/siteSeed"
import { floorLock, regionsOf } from "../game/floorLock"
import { reachableStates, walkLock, type LockSpec } from "../game/lockWalk"
import { offRouteSluiceFloor, onRouteSluiceFloor } from "../game/testSupport/regionBarrierFixtures"
import { ALL_CURRENCY_DISTRIBUTIONS } from "../mods/allCurrencyDistributions"
import {
  CAPPED_CURRENCIES,
  DYNAMIC_DISTRIBUTIONS,
  MOD_WORLD_VALIDATORS,
  MOD_REACHABILITY_SUPPORT,
  MOD_TOMB_TREASURE_RESOLVER,
  MOD_SHOP_STOCK,
  MOD_RESERVED_TREASURE_INDICES,
  REGISTERED_MOD_IDS,
} from "../mods/registeredMods"
import {
  resolveKeyRequirements,
  familyPriorityFor,
  familyCapacityFor,
  familyIsTrap,
  allocateEncounterSpread,
  resolveEncounterMeta,
} from "../mods/allFamilyMeta"

let dev: SiteConfig[]

beforeAll(() => {
  process.env.INCLUDE_DEV = "1"
  dev = buildConfigs(
    resolveKeyRequirements,
    ALL_CURRENCY_DISTRIBUTIONS,
    CAPPED_CURRENCIES,
    DYNAMIC_DISTRIBUTIONS,
    MOD_WORLD_VALIDATORS,
    familyPriorityFor,
    0,
    allocateEncounterSpread,
    MOD_REACHABILITY_SUPPORT,
    MOD_TOMB_TREASURE_RESOLVER,
    familyCapacityFor,
    MOD_SHOP_STOCK,
    MOD_RESERVED_TREASURE_INDICES,
    familyIsTrap,
    REGISTERED_MOD_IDS,
    resolveEncounterMeta
  )[DEV_JOURNEY_ID]
}, 180_000)

afterAll(() => {
  delete process.env.INCLUDE_DEV
})

const SEEDS = Array.from({ length: 12 }, (_, n) => (n + 1) * 7919)

const carved = (config: () => GameFloorConfig): FloorGrid[] =>
  SEEDS.flatMap(seed => {
    const result = assembleFloor("test", config(), seed)
    return result.success ? [result.grid] : []
  })

const assembleDevAt = (floor: FloorConfig, levelNr: number, floorIndex: number): FloorGrid | null => {
  const seed = floorAssemblySeed(persistentInteriorSeed(DEV_JOURNEY_ID), levelNr, floorIndex)
  const result = assembleFloor(DEV_JOURNEY_ID, floor as GameFloorConfig, seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    floorRef: { journeyId: DEV_JOURNEY_ID, floorIndex },
  })
  return result.success ? result.grid : null
}

const authoredRegionOf = (cell: GridCell | undefined): string | undefined =>
  cell && (cell.type === "room" || cell.type === "corridor") ? cell.region : undefined

// The authored regions each compiled region holds ground of, door regions left out: a door is a gate's
// own region and stands on a boundary rather than inside a region.
const authoredByCompiled = (grid: FloorGrid): Map<string, Set<string>> => {
  const { of } = regionsOf(grid)
  const held = new Map<string, Set<string>>()
  for (const [key, id] of of) {
    if (id.startsWith("door ")) continue
    const [r, c] = key.split(",").map(Number)
    const region = authoredRegionOf(grid.cells[r][c])
    if (region === undefined) continue
    held.set(id, (held.get(id) ?? new Set()).add(region))
  }
  return held
}

const authoredPairOf = (held: Map<string, Set<string>>, a: string, b: string): string =>
  [...(held.get(a) ?? []), ...(held.get(b) ?? [])].sort().join("|")

// The same floor read as if the author had written no regions: the flood is the one it ran before an
// authored region bounded it.
const withoutLayout = (grid: FloorGrid): FloorGrid => ({
  ...grid,
  cells: grid.cells.map(row =>
    row.map(cell => {
      if (cell.type !== "room" && cell.type !== "corridor") return cell
      const { region: _region, ...rest } = cell
      return rest as GridCell
    })
  ),
})

const failureOf = (lock: LockSpec) => {
  const result = walkLock(lock)
  return result.sound ? "sound" : result.failure.type
}

describe("regions the author wrote separately", () => {
  const FLOORS = [
    { name: "an off-route sluice", make: offRouteSluiceFloor },
    { name: "an on-route sluice", make: onRouteSluiceFloor },
  ]

  it.each(FLOORS)(
    "stay separate in the compiled lock of $name, one authored region to a compiled region",
    ({ make }) => {
      const grids = carved(make)
      expect(grids.length).toBeGreaterThan(0)
      for (const grid of grids) {
        const held = authoredByCompiled(grid)
        for (const [id, authored] of held) expect([id, [...authored]]).toEqual([id, [[...authored][0]]])

        const onGrid = new Set(
          grid.cells.flat().flatMap(cell => {
            const region = authoredRegionOf(cell)
            return region === undefined ? [] : [region]
          })
        )
        expect(new Set([...held.values()].flatMap(set => [...set]))).toEqual(onGrid)
        expect(onGrid.size).toBeGreaterThan(1)
      }
    }
  )

  it.each(FLOORS)(
    "are joined by a passage in $name wherever the layout joins them with nothing between",
    ({ make }) => {
      const layout = make().regionLayout!
      const gated = new Set(make().obstacles!.flatMap(o => (o.at.on === "region" ? [o.at.region] : [])))
      const bare = layout.connections
        .filter(([a, b]) => !gated.has(a) && !gated.has(b))
        .map(pair => [...pair].sort().join("|"))
      const allowed = new Set(layout.connections.map(pair => [...pair].sort().join("|")))
      for (const grid of carved(make)) {
        const held = authoredByCompiled(grid)
        const lock = floorLock(grid)!
        const joined = new Set((lock.passages ?? []).map(({ a, b }) => authoredPairOf(held, a, b)))
        for (const pair of joined) expect(allowed.has(pair), pair).toBe(true)
        for (const pair of bare) expect(joined.has(pair), pair).toBe(true)
      }
    }
  )

  it("stay separate on the dev pyramid's bare mouth, hall and vault, joined by a passage each", () => {
    const grid = assembleDevAt(dev[0][0], 1, 0)!
    const held = authoredByCompiled(grid)
    const lock = floorLock(grid)!

    for (const authored of held.values()) expect(authored.size).toBe(1)
    expect([...new Set([...held.values()].map(set => [...set].join()))].sort()).toEqual(["hall", "mouth", "vault"])
    expect([...new Set((lock.passages ?? []).map(({ a, b }) => authoredPairOf(held, a, b)))].sort()).toEqual([
      "hall|mouth",
      "hall|vault",
    ])
  })
})

// A move of the sluice made at a cell of `region` as well as at the sluice itself.
const placedAt = (grid: FloorGrid, move: { to: string }, region: string): { grid: FloorGrid; home: string } => {
  const homeCell = grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) => (cell.type === "room" && cell.mechanism ? [{ r, c, cell }] : []))
  )[0]
  const target = grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) =>
      cell.type === "room" && cell.region === region && !cell.requiredKeyId && !cell.mechanism && !cell.regionBarrier
        ? [{ r, c }]
        : []
    )
  )[0]
  if (!target) throw new Error(`no free room in ${region}`)
  const record = homeCell.cell.mechanism as MechanismRecord
  const transitions = [...(record.transitions ?? []), { to: move.to, at: [target.r, target.c] as const }]
  const cells = grid.cells.map((row, r) =>
    row.map((cell, c) => {
      if (cell.type !== "room") return cell
      if (r === homeCell.r && c === homeCell.c) return { ...cell, mechanism: { ...record, transitions } }
      if (r === target.r && c === target.c)
        return {
          ...cell,
          worksMechanism: { mechanismId: homeCell.cell.mechanismId!, transition: transitions.length - 1 },
        }
      return cell
    })
  )
  return { grid: { ...grid, cells }, home: `${homeCell.r},${homeCell.c}` }
}

describe("a transition placed in one of two regions that nothing separates", () => {
  it("is made only from that region, never by standing in the region beside it", () => {
    const grids = carved(offRouteSluiceFloor)
    expect(grids.length).toBeGreaterThan(0)
    for (const base of grids) {
      const { grid } = placedAt(base, { to: "wet" }, "gallery")
      const held = authoredByCompiled(grid)
      const lock = floorLock(grid)!
      const found = reachableStates(lock)
      if (found === "tooLarge") throw new Error("lock too large")
      const sluice = Object.keys(lock.mechanisms).find(name => lock.mechanisms[name].states.includes("wet"))!

      const madeIn = new Set<string>()
      found.edges.forEach((tos, from) =>
        tos.forEach(to => {
          const [a, b] = [found.order[from], found.order[to]]
          if (a.config[sluice] === "dry" && b.config[sluice] === "wet" && a.region === b.region)
            madeIn.add([...(held.get(a.region) ?? [])].join())
        })
      )

      expect([...madeIn]).toEqual(["gallery"])
      expect(found.order.some(state => state.config[sluice] === "wet")).toBe(true)
    }
  })
})

describe("compiling regions apart", () => {
  it("leaves the verdict of every sluice floor as it was with the regions flooded together", () => {
    for (const make of [offRouteSluiceFloor, onRouteSluiceFloor])
      for (const grid of carved(make)) {
        const lock = floorLock(grid)!
        const before = floorLock(withoutLayout(grid))!
        expect(lock.passages?.length).toBeGreaterThan(0)
        expect(failureOf(lock)).toBe(failureOf(before))
      }
  })

  it("leaves the verdict of every dev journey floor as it was with the regions flooded together", () => {
    let walked = 0
    dev.forEach((site, levelIndex) =>
      site.forEach((floor, floorIndex) => {
        const grid = assembleDevAt(floor, levelIndex + 1, floorIndex)
        const lock = grid && floorLock(grid)
        if (!grid || !lock) return
        walked++
        expect(failureOf(lock), `level ${levelIndex + 1} floor ${floorIndex}`).toBe(
          failureOf(floorLock(withoutLayout(grid))!)
        )
      })
    )
    expect(walked).toBeGreaterThanOrEqual(9)
  })

  it("compiles a floor with no layout to exactly the lock it compiled to before, with no passage", () => {
    let walked = 0
    dev.forEach((site, levelIndex) =>
      site.forEach((floor, floorIndex) => {
        // A floor placing locks carries the layout those locks compile into, so it authors one all the same.
        if ((floor as GameFloorConfig).regionLayout || floor.locks?.length) return
        const grid = assembleDevAt(floor, levelIndex + 1, floorIndex)
        const lock = grid && floorLock(grid)
        if (!grid || !lock) return
        walked++
        expect(lock.passages).toBeUndefined()
        expect(lock).toEqual(floorLock(withoutLayout(grid)))
      })
    )
    expect(walked).toBeGreaterThan(0)
  })
})
