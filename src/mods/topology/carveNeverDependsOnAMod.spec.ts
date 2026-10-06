import { beforeAll, describe, expect, it } from "vitest"
import type { FloorConfig as WorldFloor } from "@/worldGen/types"
import { dropUnownedAuthoring } from "@/worldGen/modOwnedAuthoring"
import { assembleFloor } from "@/game/siteAssembler"
import type { FloorConfig } from "@/game/siteTypes"
import {
  TOPOLOGY_OFF,
  TOPOLOGY_ON,
  gateKeysOwned,
  mechanicsLeft,
  outcomeOf,
  type Outcome,
} from "@/game/testSupport/modOff"
import { resolveOneWayRealisation } from "@/mods/allOneWayRealisations"
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

// The fixtures stand every kind of mechanic the engine builds, each at 20 seeds, so the claim is made of every
// shape without the authored world. Each is built twice: with every mod, and with the topology mod's
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
