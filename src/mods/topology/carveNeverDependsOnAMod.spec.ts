import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildConfigs } from "@/worldGen/configBuilder"
import { DEV_JOURNEY_ID } from "@/worldGen/data"
import type { FloorConfig as WorldFloor, SiteConfig } from "@/worldGen/types"
import { dropUnownedAuthoring } from "@/worldGen/modOwnedAuthoring"
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
import { resolveOneWayRealisation } from "@/mods/allOneWayRealisations"
import { reachableFloorsInSite } from "@/worldGen/reachability"
import { walkFloorLock } from "@/game/floorLockWalk"
import { oneWayRuns } from "@/game/gridNavigation"
import {
  anyOuterDoorFloor,
  forkSeamWithSecondGateFloor,
  twoGatesOffRouteFloor,
  twoGatesOnRouteFloor,
  twoGatesOnRouteWrittenBackwardsFloor,
} from "@/game/testSupport/barrierOrderFixtures"
import { designerDoubleBack, forkSwitchFloorConfig } from "@/game/testSupport/forkSwitchFixtures"
import {
  andDoorFloor,
  anyDoorFloor,
  floorKeyDoorFloor,
  soloLeverDoorFloor,
  soloTorchDoorFloor,
  threeOwnerDoorFloor,
} from "@/game/testSupport/gateFaceFixtures"
import { handleFloorConfig, nestedHandleFloorConfig } from "@/game/testSupport/handleFixtures"
import { leverLock } from "@/game/testSupport/floorLockFixtures"
import { BINDING } from "@/game/testSupport/lockFixtures"
import { torchAndFloorKeyDoorFloor } from "@/game/testSupport/mixedDoorFixtures"
import {
  offRouteSluiceFloor,
  onRouteSluiceFloor,
  strandingSluiceFloor,
  unwinnableSluiceFloor,
} from "@/game/testSupport/regionBarrierFixtures"
import {
  contractExampleFloor,
  hallAnnexSequenceFloor,
  hiddenAnnexSequenceFloor,
  offRouteSequenceFloor,
  oneRegionSequenceFloor,
  tooManyTilesSequenceFloor,
} from "@/game/testSupport/sequenceFixtures"

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

// The floors of the real world that stand a mechanic with every mod, whole sets: the shipped junior_2 switch, the
// expert_1 pyramid whose first floor opens on the doubleBack, and every dev floor.
const FLOORS_WITH_MECHANICS = [
  "junior_2 level 2 floor 0",
  "expert_1 level 4 floor 0",
  ...Array.from({ length: 10 }, (_, n) => `dev_topology level ${n + 1} floor 0`),
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
      ...(off ? { resolveOneWay: TOPOLOGY_OFF.resolveOneWay } : {}),
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
    expect(carved.filter(c => c.dev)).toHaveLength(10)
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
    expect(dev).toHaveLength(10)
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
    expect(sites).toHaveLength(10)
    const failed = sites.flatMap((site, siteIdx) =>
      site.flatMap((floor, floorIndex) =>
        assembleReal(DEV_JOURNEY_ID, floor, siteIdx + 1, floorIndex, true).success ? [] : [`level ${siteIdx + 1}`]
      )
    )
    expect(failed).toEqual([])
  }, 300_000)

  it("walks reachability over every site of the shipped world and the dev journey with the mod off, throwing on none", () => {
    const support = { ...MOD_REACHABILITY_SUPPORT, resolveOneWay: TOPOLOGY_OFF.resolveOneWay }
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

// The fixtures stand every kind of mechanic the engine builds, each at 20 seeds, so the sweep above is not the
// only floor of each shape that carves. Each is built twice: with every mod, and with the topology mod's
// families, realisations and registration removed.
// A lever a lock placed on an ordinary floor: its realisation arrives through the floor's binding.
const lockedLeverFloor = (): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  realisations: BINDING,
  locks: [{ lock: leverLock() }],
})

const FIXTURES: Record<string, () => FloorConfig> = {
  twoGatesOnRouteFloor,
  twoGatesOnRouteWrittenBackwardsFloor,
  twoGatesOffRouteFloor,
  forkSeamWithSecondGateFloor,
  anyOuterDoorFloor,
  designerDoubleBack,
  forkSwitchFloorConfig,
  andDoorFloor,
  threeOwnerDoorFloor,
  anyDoorFloor,
  soloTorchDoorFloor,
  soloLeverDoorFloor,
  floorKeyDoorFloor,
  torchAndFloorKeyDoorFloor: () => torchAndFloorKeyDoorFloor(),
  offRouteSluiceFloor,
  onRouteSluiceFloor,
  unwinnableSluiceFloor,
  strandingSluiceFloor,
  contractExampleFloor,
  hallAnnexSequenceFloor,
  oneRegionSequenceFloor,
  offRouteSequenceFloor,
  hiddenAnnexSequenceFloor,
  tooManyTilesSequenceFloor,
  lockedLeverFloor,
  handleFloor: () => handleFloorConfig({ in: "lever", left: ["vault"], right: ["pocket"] }),
  nestedHandleFloor: () => nestedHandleFloorConfig({ in: "branch", left: ["s0.0"], right: ["s0.1"] }),
}

const SEEDS = 20
// The floors whose carve is rare keep trying seeds until this many carved with every mod, up to the ceiling,
// so the claim about them is made over floors that exist.
const RARE: Record<string, { carved: number; ceiling: number }> = {
  designerDoubleBack: { carved: 2, ceiling: 60 },
  forkSwitchFloorConfig: { carved: 2, ceiling: 60 },
}

const sweep = (name: string): Outcome[] => {
  const floor = FIXTURES[name]()
  const mirror = dropUnownedAuthoring(
    floor as unknown as WorldFloor,
    TOPOLOGY_OFF.modIds,
    TOPOLOGY_OFF.resolveEncounter
  ) as unknown as FloorConfig
  const rare = RARE[name]
  const outcomes: Outcome[] = []
  for (let seed = 1; seed <= (rare?.ceiling ?? SEEDS); seed++) {
    const outcome = outcomeOf(
      assembleFloor("fixture", floor, seed, TOPOLOGY_ON.resolveEncounter),
      assembleFloor("fixture", mirror, seed, TOPOLOGY_OFF.resolveEncounter, {
        resolveOneWay: TOPOLOGY_OFF.resolveOneWay,
      })
    )
    outcomes.push(outcome)
    const carved = outcomes.filter(o => o.kind !== "notCarvedWithMod").length
    if (seed >= SEEDS && carved >= (rare?.carved ?? 0)) break
  }
  return outcomes
}

describe("every fixture floor, at 20 seeds", () => {
  const outcomes = new Map<string, Outcome[]>()
  beforeAll(() => {
    for (const name of Object.keys(FIXTURES)) outcomes.set(name, sweep(name))
  }, 600_000)

  it.each(Object.keys(FIXTURES))("%s moves no wall and refuses nothing with the mod off", name => {
    const list = outcomes.get(name)!
    expect(list.filter(o => o.kind === "moved")).toEqual([])
    expect(list.filter(o => o.kind === "refused")).toEqual([])
  })

  it("carves the fork-switch on authored seams, so the claim is made about floors that carved", () => {
    const list = outcomes.get("forkSwitchFloorConfig")!
    expect(list.filter(o => o.kind === "identical").length).toBeGreaterThan(0)
  })
})

// WITH THE MOD OFF, EACH KIND OF MECHANIC IS TAKEN OFF THE SAME CARVE: the first seed that carves with every mod
// is the one asked, so what is bare is the mod's absence and not a floor that never carved. What the mod on
// stands (asked first, so the check is known to look in the right place) is gone, whole list.
const bareWithout = (floor: FloorConfig): { on: string[]; off: string[]; opened: number } => {
  const seed = Array.from({ length: 60 }, (_, n) => n + 1).find(
    n => assembleFloor("fixture", floor, n, TOPOLOGY_ON.resolveEncounter).success
  )
  if (seed === undefined) throw new Error("no seed carves this floor with every mod")
  const withMod = assembleFloor("fixture", floor, seed, TOPOLOGY_ON.resolveEncounter)
  const without = assembleFloor("fixture", floor, seed, TOPOLOGY_OFF.resolveEncounter, {
    resolveOneWay: TOPOLOGY_OFF.resolveOneWay,
  })
  if (!withMod.success) throw new Error("unreachable: the seed carved")
  if (!without.success) throw new Error(`refused with the mod off: ${JSON.stringify(without.reasons)}`)
  const owned = gateKeysOwned(withMod.grid)
  // The doors that stood shut with the mod on and are plain ground with it off.
  const doors = withMod.grid.cells.flat().flatMap((cell, i) => {
    const bare = without.grid.cells.flat()[i]
    return cell.type === "room" &&
      cell.requiredKeyId !== undefined &&
      owned.has(cell.requiredKeyId) &&
      bare.type === "corridor"
      ? [i]
      : []
  })
  return { on: mechanicsLeft(withMod.grid, owned), off: mechanicsLeft(without.grid, owned), opened: doors.length }
}

// Finding a seed that carves with every mod takes several carves, past the default 5s budget.
describe("a floor authoring each kind of mechanic, with the topology mod off", { timeout: 120_000 }, () => {
  const kindsOf = (found: string[]) => [...new Set(found.map(entry => entry.split(" ").slice(1).join(" ")))].sort()

  it("makes a toggle's room a bare node and opens the door it alone owned", () => {
    const { on, off, opened } = bareWithout(soloLeverDoorFloor())
    expect(kindsOf(on)).toEqual(["mechanism", "mechanismId", "shut door"])
    expect(off).toEqual([])
    expect(opened).toBe(1)
  })

  it("makes an activator's room a bare node and opens its door", () => {
    const { on, off, opened } = bareWithout(soloTorchDoorFloor())
    expect(kindsOf(on)).toEqual(["mechanism", "mechanismId", "shut door"])
    expect(off).toEqual([])
    expect(opened).toBe(1)
  })

  it("empties a fork-switch's junction, opens its seams and joins the one-ways into passages", () => {
    const { on, off, opened } = bareWithout(forkSwitchFloorConfig())
    expect(kindsOf(on)).toEqual(expect.arrayContaining(["mechanism", "one-way", "shut door"]))
    expect(off).toEqual([])
    expect(opened).toBeGreaterThan(0)
  })

  it("strips every control and both drops of the doubleBack", () => {
    const { on, off, opened } = bareWithout(designerDoubleBack())
    expect(kindsOf(on)).toEqual(expect.arrayContaining(["mechanism", "one-way", "shut door"]))
    expect(off).toEqual([])
    expect(opened).toBeGreaterThan(1)
  })

  it("makes a handle's room a bare node and opens the section it drove", () => {
    const { on, off, opened } = bareWithout(handleFloorConfig({ in: "lever", left: ["vault"], right: ["pocket"] }))
    expect(kindsOf(on)).toEqual(expect.arrayContaining(["mechanism", "shut door"]))
    expect(off).toEqual([])
    expect(opened).toBe(2)
  })

  it("makes a sequence's tiles plain ground and opens the door it was read at", () => {
    const { on, off, opened } = bareWithout(hallAnnexSequenceFloor())
    expect(kindsOf(on)).toEqual(expect.arrayContaining(["sequenceTile", "worksMechanism", "gateFace"]))
    expect(off).toEqual([])
    expect(opened).toBeGreaterThan(0)
  })

  it("gives a door waiting on several owners no face when none of them is realised", () => {
    const { on, off } = bareWithout(andDoorFloor())
    expect(kindsOf(on)).toEqual(expect.arrayContaining(["gateFace", "shut door"]))
    expect(off).toEqual([])
  })

  it("makes a lock-placed lever bare, the lock's door open and nothing of it left to walk", () => {
    const { on, off, opened } = bareWithout(lockedLeverFloor())
    expect(kindsOf(on)).toEqual(expect.arrayContaining(["mechanism", "shut door"]))
    expect(off).toEqual([])
    expect(opened).toBe(1)
  })

  it("has nothing to take off a floor that authors no mechanic", () => {
    const { on, off } = bareWithout({ ...handleFloorConfig(), handles: undefined })
    expect([on, off]).toEqual([[], []])
  })
})

// A ROLE NOBODY BOUND IS THE AUTHOR'S MISTAKE, NOT A MOD'S ABSENCE: it is refused by name with the mod on and
// off alike, the whole reasons list, and nothing stands in for it.
describe("an unbound role, with the topology mod off", () => {
  const refusedBoth = (floor: FloorConfig, seed = 1): unknown[] => {
    const withMod = assembleFloor("fixture", floor, seed, TOPOLOGY_ON.resolveEncounter, {
      resolveOneWay: resolveOneWayRealisation,
    })
    const without = assembleFloor("fixture", floor, seed, TOPOLOGY_OFF.resolveEncounter, {
      resolveOneWay: TOPOLOGY_OFF.resolveOneWay,
    })
    return [withMod.success ? "carved" : withMod.reasons, without.success ? "carved" : without.reasons]
  }

  it("refuses a one-way bound to no realisation, naming every drop", () => {
    const reasons = [
      { type: "oneWayRealisationRefused", from: "s1Chamber", to: "leftLower", realisation: null, why: "unbound" },
      { type: "oneWayRealisationRefused", from: "leftLower", to: "entrance", realisation: null, why: "unbound" },
    ]
    expect(refusedBoth({ ...designerDoubleBack(), oneWayRealisation: undefined })).toEqual([reasons, reasons])
  })

  it("refuses a lock whose mechanisms bind no role, naming the instance, the kind and every mechanic", () => {
    const reasons = [
      {
        type: "lockRefused",
        instance: "lever",
        fault: { type: "unboundRole", kind: "toggle", mechanics: ["lever"] },
      },
    ]
    expect(refusedBoth({ ...lockedLeverFloor(), realisations: {} })).toEqual([reasons, reasons])
  })
})
