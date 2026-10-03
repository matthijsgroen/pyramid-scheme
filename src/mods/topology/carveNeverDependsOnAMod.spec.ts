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
import type { AssemblerResult, FloorConfig } from "@/game/siteTypes"
import { TOPOLOGY_OFF, TOPOLOGY_ON, isRealisationRefusal, outcomeOf, type Outcome } from "@/game/testSupport/modOff"
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
// off, a floor is carved by the same config, so its walls are the walls the mod-on build carves — or the floor
// is refused by name for the realisation no registered mod provides. Never other walls.

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

type Carved = { label: string; dev: boolean; outcome: Outcome }

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
          carved.push({
            label: `${journeyId} level ${siteIdx + 1} floor ${floorIndex}`,
            dev: journeyId === DEV_JOURNEY_ID,
            outcome: outcomeOf(
              assembleReal(journeyId, floor, siteIdx + 1, floorIndex, false),
              assembleReal(journeyId, mirror, siteIdx + 1, floorIndex, true)
            ),
          })
        })
      )
  }, 900_000)

  it("was asked of the whole world, not of a handful of floors", () => {
    expect(carved.length).toBeGreaterThan(200)
    expect(carved.filter(c => c.dev)).toHaveLength(9)
  })

  it("carves other walls with the mod off on no floor", () => {
    expect(carved.filter(c => c.outcome.kind === "moved").map(c => c.label)).toEqual([])
  })

  it("is refused with the mod off only ever for a realisation that left, never for another reason", () => {
    const unnamed = carved.filter(c => c.outcome.kind === "refused" && !isRealisationRefusal(c.outcome))
    expect(unnamed.map(c => `${c.label}: ${JSON.stringify((c.outcome as { reasons: unknown }).reasons)}`)).toEqual([])
  })

  it("carves every shipped floor identically with the mod off: nothing of the shipped world is refused", () => {
    const shipped = carved.filter(c => !c.dev && c.outcome.kind !== "notCarvedWithMod")
    expect(shipped.length).toBeGreaterThan(150)
    expect(shipped.filter(c => c.outcome.kind !== "identical").map(c => c.label)).toEqual([])
  })

  it("refuses by name exactly the dev floors that author a mechanic, and carves the rest identically", () => {
    const refused = carved.filter(c => c.outcome.kind === "refused").map(c => c.label)
    expect(refused).toEqual([
      "dev_topology level 2 floor 0",
      "dev_topology level 3 floor 0",
      "dev_topology level 7 floor 0",
      "dev_topology level 8 floor 0",
    ])
    const rest = carved.filter(c => c.dev && c.outcome.kind !== "refused")
    expect(rest.map(c => c.outcome.kind)).toEqual(Array(rest.length).fill("identical"))
    expect(rest).toHaveLength(5)
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

  it("assembles every floor, since no shipped journey authors a mechanic that needs a realisation", () => {
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

  it.each(Object.keys(FIXTURES))("%s moves no wall with the mod off: identical, or refused by name", name => {
    const list = outcomes.get(name)!
    expect(list.filter(o => o.kind === "moved")).toEqual([])
    expect(list.filter(o => o.kind === "refused" && !isRealisationRefusal(o))).toEqual([])
  })

  it("carves the fork-switch on authored seams, so the claim is made about a floor that carved", () => {
    const list = outcomes.get("forkSwitchFloorConfig")!
    expect(list.filter(o => o.kind === "refused").length).toBeGreaterThan(0)
  })
})

// WITH THE MOD OFF, EACH KIND OF MECHANIC IS REFUSED BY NAME, whole list: the mechanic's authored id, its
// control kind and the realisation nothing answers to. The first seed that carves with every mod is the one
// asked, so what is refused is the mod's absence and not a floor that never carved.
const refusalsOf = (floor: FloorConfig): unknown => {
  const seed = Array.from({ length: 60 }, (_, n) => n + 1).find(
    n => assembleFloor("fixture", floor, n, TOPOLOGY_ON.resolveEncounter).success
  )
  if (seed === undefined) throw new Error("no seed carves this floor with every mod")
  const result = assembleFloor("fixture", floor, seed, TOPOLOGY_OFF.resolveEncounter, {
    resolveOneWay: TOPOLOGY_OFF.resolveOneWay,
  })
  return result.success ? "carved" : result.reasons
}

// Finding a seed that carves with every mod takes several carves, past the default 5s budget.
describe("a floor authoring each kind of mechanic, with the topology mod off", { timeout: 120_000 }, () => {
  it("refuses a toggle for the control role nothing answers to", () => {
    expect(refusalsOf(soloLeverDoorFloor())).toEqual([
      { type: "realisationMissing", mechanic: "beam", kind: "toggle", realisation: "default-control" },
    ])
  })

  it("refuses an activator for the torch that left", () => {
    expect(refusalsOf(soloTorchDoorFloor())).toEqual([
      { type: "realisationMissing", mechanic: "flame", kind: "activator", realisation: "torch" },
    ])
  })

  it("refuses a fork-switch for the board that left, with the one-ways and activators beside it", () => {
    expect(refusalsOf(forkSwitchFloorConfig())).toEqual([
      { type: "oneWayRealisationRefused", from: "s1Chamber", to: "leftLower", realisation: "zipline", why: "unknown" },
      { type: "oneWayRealisationRefused", from: "leftLower", to: "entrance", realisation: "zipline", why: "unknown" },
      { type: "realisationMissing", mechanic: "Y", kind: "fork-switch", realisation: "lightbeamSwitch" },
      { type: "realisationMissing", mechanic: "S1", kind: "activator", realisation: "default-control" },
      { type: "realisationMissing", mechanic: "S2", kind: "activator", realisation: "default-control" },
    ])
  })

  it("refuses a one-way for the realisation that left, and every control of the doubleBack with it", () => {
    expect(refusalsOf(designerDoubleBack())).toEqual([
      { type: "oneWayRealisationRefused", from: "s1Chamber", to: "leftLower", realisation: "zipline", why: "unknown" },
      { type: "oneWayRealisationRefused", from: "leftLower", to: "entrance", realisation: "zipline", why: "unknown" },
      { type: "realisationMissing", mechanic: "Y", kind: "activator", realisation: "default-control" },
      { type: "realisationMissing", mechanic: "S1", kind: "activator", realisation: "default-control" },
      { type: "realisationMissing", mechanic: "S2", kind: "activator", realisation: "default-control" },
    ])
  })

  it("refuses a handle for the lever that left", () => {
    expect(refusalsOf(handleFloorConfig({ in: "lever", left: ["vault"], right: ["pocket"] }))).toEqual([
      { type: "realisationMissing", mechanic: "lever", kind: "toggle", realisation: "default-control" },
    ])
  })

  it("refuses a sequence for the door face that reads it, naming the door", () => {
    expect(refusalsOf(hallAnnexSequenceFloor())).toEqual([
      {
        type: "realisationMissing",
        mechanic: "obstacle:fixture#0#0:vaultDoor",
        kind: "door-face",
        realisation: "door-face",
      },
    ])
  })

  it("refuses a door waiting on several owners for its face, besides the owners it cannot dress", () => {
    const reasons = refusalsOf(andDoorFloor()) as { kind: string }[]
    expect(reasons.map(reason => reason.kind)).toEqual(["activator", "toggle"])
  })

  it("carves a floor that authors no mechanic, with nothing missing", () => {
    expect(refusalsOf({ ...handleFloorConfig(), handles: undefined })).toBe("carved")
  })
})
