import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildConfigs } from "@/worldGen/configBuilder"
import { DEV_JOURNEY_ID } from "@/worldGen/data"
import type { FloorConfig as WorldFloor, SiteConfig } from "@/worldGen/types"
import { ALL_CURRENCY_DISTRIBUTIONS } from "@/mods/allCurrencyDistributions"
import {
  CAPPED_CURRENCIES,
  DYNAMIC_DISTRIBUTIONS,
  MOD_REACHABILITY_SUPPORT,
  MOD_RESERVED_TREASURE_INDICES,
  MOD_SHOP_STOCK,
  MOD_TOMB_TREASURE_RESOLVER,
  MOD_WORLD_VALIDATORS,
} from "@/mods/registeredMods"
import {
  allocateEncounterSpread,
  familyCapacityFor,
  familyIsTrap,
  familyPriorityFor,
  resolveKeyRequirements,
} from "@/mods/allFamilyMeta"
import { assembleFloor } from "@/game/siteAssembler"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import type { AssemblerResult, FloorConfig, FloorGrid } from "@/game/siteTypes"
import {
  TOPOLOGY_OFF,
  TOPOLOGY_ON,
  dirsApartFromDrops,
  gateKeysOwned,
  mechanicsLeft,
  outcomeOf,
  type Outcome,
} from "@/game/testSupport/modOff"
import { reachableFloorsInSite } from "@/worldGen/reachability"
import { walkFloorLock } from "@/game/floorLockWalk"
import { oneWayRuns } from "@/game/gridNavigation"

// THE CARVE NEVER DEPENDS ON A MOD (docs/mods/topology-tasks.md). Mechanics are core's: with the topology mod
// off, a floor is carved by the same config, so its walls are the walls the mod-on build carves, and what no
// registered mod realises is taken off the finished carve: bare nodes and open corridors, never other walls.

const build = (modIds: ReadonlySet<string>, resolveEncounter: typeof TOPOLOGY_ON.resolveEncounter) =>
  buildConfigs(
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
    modIds,
    resolveEncounter
  )

const OPPOSITE = { n: "s", s: "n", e: "w", w: "e" } as const

// The floors of the real world that stand a mechanic with every mod, whole sets: the shipped junior_2 switch, every
// floor a lesson or a lock stands on, and every dev floor.
const FLOORS_WITH_MECHANICS = [
  "junior_1 level 1 floor 0",
  "junior_2 level 2 floor 0",
  "junior_2 level 3 floor 0",
  "junior_3 level 1 floor 0",
  "junior_3 level 3 floor 0",
  "junior_4 level 2 floor 0",
  "junior_4 level 4 floor 0",
  "junior_4 level 5 floor 0",
  "expert_1 level 1 floor 0",
  "expert_1 level 4 floor 0",
  "expert_2 level 1 floor 0",
  "expert_3 level 1 floor 0",
  "expert_4 level 1 floor 0",
  "expert_4 level 5 floor 0",
  ...Array.from({ length: 12 }, (_, n) => `dev_topology level ${n + 1} floor 0`),
]
// The floors holding a one-way drop with every mod.
const FLOORS_WITH_DROPS = [
  "expert_1 level 4 floor 0",
  "dev_topology level 2 floor 0",
  "dev_topology level 3 floor 0",
  "dev_topology level 10 floor 0",
]

type Carved = {
  label: string
  dev: boolean
  outcome: Outcome
  withMod: AssemblerResult
  without: AssemblerResult
}

const assembleReal = (
  journeyId: string,
  floor: WorldFloor,
  levelNr: number,
  floorIndex: number,
  off: boolean
): AssemblerResult => {
  const world = off ? TOPOLOGY_OFF : TOPOLOGY_ON
  return assembleFloor(
    journeyId,
    floor as unknown as FloorConfig,
    floorAssemblySeed(persistentInteriorSeed(journeyId), levelNr, floorIndex),
    world.resolveEncounter,
    {
      resolveKeyRequirements,
      floorRef: { journeyId, floorIndex },
      ...(off ? { resolveOneWay: TOPOLOGY_OFF.resolveOneWay, resolvePassage: TOPOLOGY_OFF.resolvePassage } : {}),
    }
  )
}

let on: Record<string, SiteConfig[]>
let off: Record<string, SiteConfig[]>
let offShipped: Record<string, SiteConfig[]>

beforeAll(() => {
  process.env.INCLUDE_DEV = "1"
  on = build(TOPOLOGY_ON.modIds, TOPOLOGY_ON.resolveEncounter)
  off = build(TOPOLOGY_OFF.modIds, TOPOLOGY_OFF.resolveEncounter)
  delete process.env.INCLUDE_DEV
  offShipped = build(TOPOLOGY_OFF.modIds, TOPOLOGY_OFF.resolveEncounter)
}, 300_000)

afterAll(() => {
  delete process.env.INCLUDE_DEV
})

describe("every floor of the real world, the dev journey included", () => {
  let carved: Carved[] = []
  beforeAll(() => {
    carved = []
    for (const [journeyId, sites] of Object.entries(on))
      sites.forEach((site, siteIdx) =>
        site.forEach((floor, floorIndex) => {
          const mirror = off[journeyId][siteIdx][floorIndex]
          const withMod = assembleReal(journeyId, floor, siteIdx + 1, floorIndex, false)
          const without = assembleReal(journeyId, mirror, siteIdx + 1, floorIndex, true)
          carved.push({
            label: `${journeyId} level ${siteIdx + 1} floor ${floorIndex}`,
            dev: journeyId === DEV_JOURNEY_ID,
            outcome: outcomeOf(withMod, without),
            withMod,
            without,
          })
        })
      )
  }, 900_000)

  it("was asked of the whole world, not of a handful of floors", () => {
    expect(carved.length).toBeGreaterThan(200)
    expect(carved.filter(c => c.dev)).toHaveLength(12)
  })

  it("carves other walls with the mod off on no floor", () => {
    expect(carved.filter(c => c.outcome.kind === "moved").map(c => c.label)).toEqual([])
  })

  it("refuses no floor with the mod off: a missing realisation is never a reason", () => {
    const refused = carved.filter(c => c.outcome.kind === "refused")
    expect(refused.map(c => `${c.label}: ${JSON.stringify((c.outcome as { reasons: unknown }).reasons)}`)).toEqual([])
  })

  it("carves every shipped floor identically with the mod off: nothing of the shipped world is refused", () => {
    const shipped = carved.filter(c => !c.dev && c.outcome.kind !== "notCarvedWithMod")
    expect(shipped.length).toBeGreaterThan(150)
    expect(shipped.filter(c => c.outcome.kind !== "identical").map(c => c.label)).toEqual([])
  })

  it("carves every dev floor identically with the mod off, the floors that author a mechanic included", () => {
    const dev = carved.filter(c => c.dev)
    expect(dev).toHaveLength(12)
    expect(dev.map(c => c.outcome.kind)).toEqual(Array(dev.length).fill("identical"))
  })

  it("leaves no mechanism, tile, cover, door face, way out or shut door standing on any floor with the mod off", () => {
    const left = carved.flatMap(c =>
      c.withMod.success && c.without.success
        ? [{ label: c.label, left: mechanicsLeft(c.without.grid, gateKeysOwned(c.withMod.grid)) }]
        : []
    )
    expect(left.length).toBeGreaterThan(200)
    expect(left.filter(floor => floor.left.length > 0)).toEqual([])
  })

  it("takes the mechanics off every floor that stands one, which is exactly these floors", () => {
    const stripped = carved
      .filter(c => c.withMod.success && c.without.success)
      .filter(c => mechanicsLeft((c.withMod as { grid: FloorGrid }).grid).length > 0)
      .map(c => c.label)
    expect(stripped).toEqual(FLOORS_WITH_MECHANICS)
  })

  it("keeps every wall of a drop too, joining its ends and span into a passage where the mod on leaves it apart", () => {
    const withDrops = carved.filter(c => c.withMod.success && oneWayRuns(c.withMod.grid).length > 0)
    expect(withDrops.map(c => c.label)).toEqual(FLOORS_WITH_DROPS)
    for (const { withMod, without } of withDrops) {
      if (!withMod.success || !without.success) throw new Error("a floor with a drop did not carve")
      expect(oneWayRuns(without.grid)).toEqual([])
      expect(dirsApartFromDrops(without.grid, withMod.grid)).toBe(dirsApartFromDrops(withMod.grid, withMod.grid))
      for (const run of oneWayRuns(withMod.grid)) {
        const back = OPPOSITE[run.dir]
        const named = ([r, c]: readonly [number, number]) => {
          const cell = without.grid.cells[r][c]
          return cell.type === "corridor" ? [...cell.dirs].sort().join("") : cell.type
        }
        const both = [run.dir, back].sort().join("")
        expect(named(run.launch), `launch ${run.launch}`).toBe(both)
        for (const at of run.cells) expect(named(at), `span ${at}`).toBe(both)
        expect(named(run.landing), `landing ${run.landing}`).toBe(both)
      }
    }
  })

  it("finds no lock to walk on a floor with the mod off, where the mod on walks one on exactly these floors", () => {
    const walked = (pick: "withMod" | "without") =>
      carved
        .filter(c => {
          const result = c[pick]
          return result.success && walkFloorLock(result.grid) !== undefined
        })
        .map(c => c.label)
    expect(walked("withMod")).toEqual(FLOORS_WITH_MECHANICS)
    expect(walked("without")).toEqual([])
  })
})

describe("the shipped world, built with the topology mod off", () => {
  it("is built whole: the same journeys with the same number of floors", () => {
    const shape = (world: Record<string, SiteConfig[]>) =>
      Object.fromEntries(Object.entries(world).map(([id, sites]) => [id, sites.map(site => site.length)]))
    expect(offShipped[DEV_JOURNEY_ID]).toBeUndefined()
    expect(shape(offShipped)).toEqual(
      shape(Object.fromEntries(Object.entries(on).filter(([id]) => id !== DEV_JOURNEY_ID)))
    )
  })

  it("assembles every floor, the doubleBack floor of expert_1 included, with its mechanics bare", () => {
    const failed: string[] = []
    let assembled = 0
    for (const [journeyId, sites] of Object.entries(offShipped))
      sites.forEach((site, siteIdx) =>
        site.forEach((floor, floorIndex) => {
          const result = assembleReal(journeyId, floor, siteIdx + 1, floorIndex, true)
          if (result.success) assembled++
          else failed.push(`${journeyId} level ${siteIdx + 1} floor ${floorIndex}`)
        })
      )
    expect(assembled).toBeGreaterThan(150)
    expect(failed).toEqual([])
  }, 300_000)

  it("builds the dev journey whole too, every floor assembling", () => {
    const sites = off[DEV_JOURNEY_ID]
    expect(sites).toHaveLength(12)
    const failed = sites.flatMap((site, siteIdx) =>
      site.flatMap((floor, floorIndex) =>
        assembleReal(DEV_JOURNEY_ID, floor, siteIdx + 1, floorIndex, true).success ? [] : [`level ${siteIdx + 1}`]
      )
    )
    expect(failed).toEqual([])
  }, 300_000)

  it("walks reachability over every site of the shipped world and the dev journey with the mod off, throwing on none", () => {
    const support = {
      ...MOD_REACHABILITY_SUPPORT,
      resolveOneWay: TOPOLOGY_OFF.resolveOneWay,
      resolvePassage: TOPOLOGY_OFF.resolvePassage,
    }
    const refused: string[] = []
    let walked = 0
    for (const [journeyId, sites] of Object.entries(off))
      sites.forEach((site, levelIndex) => {
        try {
          const reachable = reachableFloorsInSite(
            { journeyId, levelIndex },
            site,
            new Set(),
            undefined,
            resolveKeyRequirements,
            undefined,
            support,
            TOPOLOGY_OFF.resolveEncounter
          )
          if (reachable.floors.has(0)) walked++
        } catch (error) {
          refused.push(`${journeyId} level ${levelIndex + 1}: ${String(error).slice(0, 160)}`)
        }
      })
    expect(refused).toEqual([])
    expect(walked).toBeGreaterThan(80)
  }, 300_000)

  it("keeps every mechanic authored on a shipped floor: nothing is stripped", () => {
    const authored = (world: Record<string, SiteConfig[]>) =>
      Object.values(world).flatMap(sites =>
        sites.flatMap(site =>
          site.map(({ obstacles, controls, barrierOrder, oneWays, forks }) => ({
            obstacles,
            controls,
            barrierOrder,
            oneWays,
            forks,
          }))
        )
      )
    const shippedOn = Object.fromEntries(Object.entries(on).filter(([id]) => id !== DEV_JOURNEY_ID))
    expect(authored(offShipped)).toEqual(authored(shippedOn))
  })
})
