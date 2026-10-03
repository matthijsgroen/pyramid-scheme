import { beforeAll, describe, it, expect } from "vitest"
import { dropUnownedAuthoring } from "@/worldGen/modOwnedAuthoring"
import { assembleFloor, type ResolveEncounter } from "@/game/siteAssembler"
import { resolveEncounterMeta } from "@/mods/allFamilyMeta"
import {
  REALISATION_REFUSALS,
  TOPOLOGY_OFF,
  dirsOf,
  isRealisationRefusal,
  outcomeOf,
  type Outcome,
} from "@/game/testSupport/modOff"
import type { FloorConfig as GameFloorConfig, RoomCell } from "@/game/siteTypes"
import { allFloors, resolveKeyRequirements } from "@/app/SiteMap/worldFloors.testing"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { validateSite } from "@/game/siteValidator"
import type { ValidationReason, ValidationResult } from "@/game/siteTypes"

const validation = (result: ValidationResult): ValidationReason[] => (result.valid ? [] : result.reasons)

const floor = {
  pathPuzzles: 2,
  difficulty: "junior" as const,
  end: "treasure" as const,
  exitOrStaircase: "exit" as const,
  sideSections: [
    {
      pathPuzzles: 1,
      difficulty: "junior" as const,
      end: "treasure" as const,
      gate: { type: "floor-key" as const, keyId: "authored:junior_2#2:east", ownerMod: "topology" },
    },
    {
      pathPuzzles: 1,
      difficulty: "junior" as const,
      end: "treasure" as const,
      gate: { type: "floor-key" as const, color: "red" as const },
    },
  ],
}

describe("dropUnownedAuthoring", () => {
  it("drops a gate whose owning mod is not registered", () => {
    const dropped = dropUnownedAuthoring(floor, new Set(["mosaic"]), undefined)
    expect(dropped.sideSections[0].gate).toBeUndefined()
  })

  it("keeps a gate whose owning mod is registered", () => {
    const kept = dropUnownedAuthoring(floor, new Set(["topology"]), undefined)
    expect(kept.sideSections[0].gate).toEqual(floor.sideSections[0].gate)
  })

  it("never touches untagged authoring, which is core's", () => {
    const dropped = dropUnownedAuthoring(floor, new Set(), undefined)
    expect(dropped.sideSections[1].gate).toEqual(floor.sideSections[1].gate)
  })
})

// A gate on a connection and the control that opens it exist only because the topology mod does —
// unlike a section's gate above, which is core's when it names no owner. Same three-region layout
// regionGates.spec.ts carves, here to prove the drop rather than the carve.
const gatedFloor = {
  pathPuzzles: 2,
  difficulty: "starter" as const,
  end: "treasure" as const,
  exitOrStaircase: "exit" as const,
  sideSections: [{ pathPuzzles: 1, difficulty: "starter" as const, end: "treasure" as const }],
  regionLayout: {
    regions: [
      { name: "mouth", appetite: "free" as const },
      { name: "hall", appetite: "free" as const },
      { name: "vault", appetite: "free" as const },
    ],
    connections: [["mouth", "hall"] as const, ["hall", "vault"] as const],
    in: "mouth",
    out: "vault",
  },
  obstacles: [
    { id: "vaultDoor", kind: "gate" as const, at: { on: "connection" as const, between: ["hall", "vault"] as const } },
  ],
  controls: [
    {
      id: "s1",
      in: "mouth",
      states: ["left", "right"],
      initial: "right",
      returnsToInitial: true,
      opens: { right: ["vaultDoor"] },
    },
  ],
}

// The same three-region layout, gated twice in sequence (gA on mouth—hall, gB on hall—vault) and
// driven by one three-state control — `regionGates.spec.ts`'s `twoGatesFloor` shape, repeated here
// rather than imported so this file's acceptance sweep does not reach across module boundaries for it.
const twoObstacleFloor = {
  ...gatedFloor,
  obstacles: [
    { id: "gA", kind: "gate" as const, at: { on: "connection" as const, between: ["mouth", "hall"] as const } },
    { id: "gB", kind: "gate" as const, at: { on: "connection" as const, between: ["hall", "vault"] as const } },
  ],
  controls: [
    {
      id: "w1",
      in: "mouth",
      states: ["n", "e", "s"],
      initial: "n",
      returnsToInitial: true,
      opens: { n: ["gA"], e: ["gB"], s: ["gA", "gB"] },
    },
  ],
}

// Five gates in sequence over six ON-ROUTE regions — the same shape as `gatedFloor`/`twoObstacleFloor`
// above, widened to the count `doubleBack` authors (`lockWalk.spec.ts`'s `doubleBack` fixture: six
// regions, five gates). NOT `doubleBack`'s own layout: two of its five gates (`forkRight`, `greenRight`)
// seat on an OFF-ROUTE chain (`siteAssembler.spec.ts`'s "a gate on a connection off the threaded
// route"), which this file's fix does not reach — see this suite's own comment below, and the report,
// for why that residual is real and left open rather than patched here.
const fiveObstacleFloor = {
  pathPuzzles: 2,
  difficulty: "starter" as const,
  end: "treasure" as const,
  exitOrStaircase: "exit" as const,
  sideSections: [{ pathPuzzles: 1, difficulty: "starter" as const, end: "treasure" as const }],
  regionLayout: {
    regions: [
      { name: "r0", appetite: "free" as const },
      { name: "r1", appetite: "free" as const },
      { name: "r2", appetite: "free" as const },
      { name: "r3", appetite: "free" as const },
      { name: "r4", appetite: "free" as const },
      { name: "r5", appetite: "free" as const },
    ],
    connections: [
      ["r0", "r1"] as const,
      ["r1", "r2"] as const,
      ["r2", "r3"] as const,
      ["r3", "r4"] as const,
      ["r4", "r5"] as const,
    ],
    in: "r0",
    out: "r5",
  },
  obstacles: [
    { id: "g0", kind: "gate" as const, at: { on: "connection" as const, between: ["r0", "r1"] as const } },
    { id: "g1", kind: "gate" as const, at: { on: "connection" as const, between: ["r1", "r2"] as const } },
    { id: "g2", kind: "gate" as const, at: { on: "connection" as const, between: ["r2", "r3"] as const } },
    { id: "g3", kind: "gate" as const, at: { on: "connection" as const, between: ["r3", "r4"] as const } },
    { id: "g4", kind: "gate" as const, at: { on: "connection" as const, between: ["r4", "r5"] as const } },
  ],
  controls: [
    {
      id: "w1",
      in: "r0",
      states: ["a", "b"],
      initial: "a",
      returnsToInitial: true,
      opens: { a: [], b: ["g0", "g1", "g2", "g3", "g4"] },
    },
  ],
}

describe("dropUnownedAuthoring — obstacles and controls", () => {
  it("keeps obstacles and controls when the topology mod is not registered: they are core authoring", () => {
    const kept = dropUnownedAuthoring(gatedFloor, new Set(["mosaic"]), undefined)

    expect(kept.obstacles).toEqual(gatedFloor.obstacles)
    expect(kept.controls).toEqual(gatedFloor.controls)
  })

  it("keeps both when it is", () => {
    const kept = dropUnownedAuthoring(gatedFloor, new Set(["topology"]), undefined)

    expect(kept.obstacles).toEqual(gatedFloor.obstacles)
    expect(kept.controls).toEqual(gatedFloor.controls)
  })

  // The acceptance gate: with the mod off the walls are never other walls. The floor is either carved
  // identically (compared by each cell's `dirs`, never its `type`) or refused by name for the realisation
  // that left — here the levers, which name none and so stand as the default control the mod provided.
  // Swept over seeds 0-49 rather than pinned to one: a single seed proves nothing about the other 49.
  const outcomesAt = (floor: GameFloorConfig): Outcome[] =>
    Array.from({ length: 50 }, (_, seed) =>
      outcomeOf(
        assembleFloor("dev", floor, seed, resolveEncounter),
        assembleFloor(
          "dev",
          dropUnownedAuthoring(floor, TOPOLOGY_OFF.modIds, TOPOLOGY_OFF.resolveEncounter) as GameFloorConfig,
          seed,
          TOPOLOGY_OFF.resolveEncounter,
          {
            resolveOneWay: TOPOLOGY_OFF.resolveOneWay,
          }
        )
      )
    ).filter(outcome => outcome.kind !== "notCarvedWithMod")

  const neverMoves = (floor: GameFloorConfig): { carved: number; moved: number; unnamed: number } => {
    const outcomes = outcomesAt(floor)
    return {
      carved: outcomes.length,
      moved: outcomes.filter(outcome => outcome.kind === "moved").length,
      unnamed: outcomes.filter(outcome => outcome.kind === "refused" && !isRealisationRefusal(outcome)).length,
    }
  }

  it("moves no wall with the mod off, across seeds 0-49, one obstacle", () => {
    const result = neverMoves(gatedFloor as GameFloorConfig)
    expect(result.carved).toBeGreaterThan(0)
    expect(result).toEqual({ carved: result.carved, moved: 0, unnamed: 0 })
  })

  it("moves no wall with the mod off, across seeds 0-49, two obstacles", () => {
    const result = neverMoves(twoObstacleFloor as GameFloorConfig)
    expect(result.carved).toBeGreaterThan(0)
    expect(result).toEqual({ carved: result.carved, moved: 0, unnamed: 0 })
  })

  it("moves no wall with the mod off, across seeds 0-49, five obstacles", () => {
    const result = neverMoves(fiveObstacleFloor as GameFloorConfig)
    expect(result.carved).toBeGreaterThan(0)
    expect(result).toEqual({ carved: result.carved, moved: 0, unnamed: 0 })
  })
})

// The designer's doubleBack with its fork named by region: the junction holds from `regionLayout` and
// `forks` (both core), so dropping every obstacle and control moves no wall. Carries only the gate on
// the route and the controls that open it — the off-route gates of the full doubleBack diverge between
// builds for a reason of their own (the "five obstacles" case above), which would hide what this proves.
const forkedDoubleBack: GameFloorConfig = {
  pathPuzzles: 0,
  packing: 7,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 0, difficulty: "expert", end: "treasure" },
    { pathPuzzles: 0, difficulty: "expert", end: "treasure" },
  ],
  forks: [{ in: "entrance" }],
  regionLayout: {
    regions: [
      { name: "entrance", appetite: "free" },
      { name: "rightLower", appetite: "free" },
      { name: "s1Chamber", appetite: "free" },
      { name: "leftLower", appetite: "free" },
      { name: "s2Chamber", appetite: "free" },
      { name: "wayOut", appetite: "free" },
    ],
    connections: [
      ["entrance", "leftLower"],
      ["entrance", "rightLower"],
      ["rightLower", "s1Chamber"],
      ["leftLower", "s2Chamber"],
      ["entrance", "wayOut"],
    ],
    in: "entrance",
    out: "wayOut",
  },
  obstacles: [{ id: "endDoor", kind: "gate", at: { on: "connection", between: ["entrance", "wayOut"] } }],
  controls: [
    {
      id: "Y",
      in: "entrance",
      states: ["unset", "set"],
      initial: "unset",
      returnsToInitial: false,
      opens: { unset: [], set: ["endDoor"] },
    },
    {
      id: "S2",
      in: "s2Chamber",
      states: ["start", "thrown"],
      initial: "start",
      returnsToInitial: false,
      opens: { start: [], thrown: ["endDoor"] },
    },
  ],
}

// With no mechanic authored, a fork named by region leaves a bare junction in core's own carve: nothing
// stands in it and nothing needs a realisation, so the mod being off changes neither it nor the walls.
describe("a fork named by region, authoring no mechanic", () => {
  const bare: GameFloorConfig = { ...forkedDoubleBack, obstacles: undefined, controls: undefined }

  it("is not refused with the topology mod off, and carves the walls the mod on carves", () => {
    const outcomes = Array.from({ length: 40 }, (_, i) =>
      outcomeOf(
        assembleFloor("dev", bare, i + 1, resolveEncounter),
        assembleFloor("dev", bare, i + 1, TOPOLOGY_OFF.resolveEncounter, { resolveOneWay: TOPOLOGY_OFF.resolveOneWay })
      )
    ).filter(outcome => outcome.kind !== "notCarvedWithMod")
    expect(outcomes.length).toBeGreaterThan(0)
    expect(outcomes.filter(outcome => outcome.kind !== "identical")).toEqual([])
  }, 60_000)

  it("leaves a bare junction in the region whose side exits are still the two chains", () => {
    const step = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] } as const
    let carved = 0
    for (let seed = 1; seed <= 40; seed++) {
      const result = assembleFloor("dev", bare, seed)
      if (!result.success) continue
      carved++
      const { cells } = result.grid
      const junctions = cells.flatMap((row, r) =>
        row.flatMap((cell, c) => {
          if (cell.type !== "room" || cell.roomType !== "fork" || cell.region !== "entrance") return []
          const led = (cell.exits ?? [])
            .filter(exit => exit.kind === "side")
            .map(({ dir }) => {
              const next = cells[r + step[dir][0] * 2]?.[c + step[dir][1] * 2]
              return next && next.type !== "empty" ? next.region : undefined
            })
            .sort()
          return [{ family: cell.family, led }]
        })
      )
      expect(junctions).toEqual([{ family: undefined, led: ["leftLower", "rightLower"] }])
    }
    expect(carved).toBeGreaterThan(0)
  }, 60_000)
})

// The same floor with the fork's two gates owned by a fork-switch standing in its junction. The
// junction and its seams are core's (`forks`, `regionLayout`), so stripping the mod's obstacles and
// controls must leave every wall where it was, and the fork-switch is what the mod adds on top.
const forkSwitchedDoubleBack: GameFloorConfig = {
  ...forkedDoubleBack,
  obstacles: [
    { id: "forkLeft", kind: "gate", at: { on: "connection", between: ["entrance", "leftLower"] }, owners: ["Y"] },
    { id: "forkRight", kind: "gate", at: { on: "connection", between: ["entrance", "rightLower"] }, owners: ["Y"] },
    ...forkedDoubleBack.obstacles!,
  ],
  controls: [
    { id: "Y", in: "entrance", control: "fork-switch", encounter: "lightbeamSwitch" },
    forkedDoubleBack.controls![1],
  ],
}

describe("a fork-switch, with the topology mod off", () => {
  const assembleOff = (seed: number) =>
    assembleFloor(
      "dev",
      dropUnownedAuthoring(
        forkSwitchedDoubleBack,
        TOPOLOGY_OFF.modIds,
        TOPOLOGY_OFF.resolveEncounter
      ) as GameFloorConfig,
      seed,
      TOPOLOGY_OFF.resolveEncounter,
      { resolveOneWay: TOPOLOGY_OFF.resolveOneWay }
    )

  it("keeps the fork-switch and every gate: they are core authoring", () => {
    const kept = dropUnownedAuthoring(forkSwitchedDoubleBack, TOPOLOGY_OFF.modIds, TOPOLOGY_OFF.resolveEncounter)
    expect(kept.obstacles).toEqual(forkSwitchedDoubleBack.obstacles)
    expect(kept.controls).toEqual(forkSwitchedDoubleBack.controls)
  })

  it("is refused by name for the switch board and the lever, never carved with a bare junction", () => {
    const result = assembleOff(1)
    expect(result.success).toBe(false)
    expect(!result.success && result.reasons).toEqual([
      { type: "realisationMissing", mechanic: "Y", kind: "fork-switch", realisation: "lightbeamSwitch" },
      { type: "realisationMissing", mechanic: "S2", kind: "activator", realisation: "default-control" },
    ])
  })

  it("stands the switch in the junction with the mod on, where the mod off refuses the floor", () => {
    let compared = 0
    for (let seed = 1; seed <= 60; seed++) {
      const withMod = assembleFloor("dev", forkSwitchedDoubleBack, seed, resolveEncounter)
      if (!withMod.success) continue
      compared++
      const junctions = withMod.grid.cells
        .flat()
        .flatMap(cell =>
          cell.type === "room" && cell.roomType === "fork" && cell.region === "entrance" ? [cell.family] : []
        )
      expect(junctions, `seed ${seed}`).toEqual(["lightbeamSwitch"])
      expect(assembleOff(seed).success, `seed ${seed}`).toBe(false)
    }
    expect(compared).toBeGreaterThan(0)
  }, 120_000)
})

// With topology out of the registered list its families are simply not in the catalogue: this is that same
// id-then-tag lookup over a catalogue topology has left — the resolver the generator would inject.
const topologyOff: ResolveEncounter = TOPOLOGY_OFF.resolveEncounter

const SWITCH_STEM = "switch:toggle-off#0#0#0"
const switchFloor = {
  ...floor,
  sideSections: [
    { pathPuzzles: 1, difficulty: "starter" as const, end: "treasure" as const },
    { pathPuzzles: 1, difficulty: "starter" as const, end: "treasure" as const },
  ],
  forks: [{ exits: 2, count: 1 }],
  switches: { encounter: "lightbeamSwitch", min: 1, max: 1 },
}

const stripped = () => dropUnownedAuthoring(switchFloor, new Set(), topologyOff) as GameFloorConfig

const assembleAt = (config: GameFloorConfig, seed: number, resolveEncounter: ResolveEncounter) =>
  assembleFloor("toggle-off", config, seed, resolveEncounter, { floorRef: { journeyId: "toggle-off", floorIndex: 0 } })

// Which junction a carve offers is the seed's choice, so seeds are tried until one carves a fork at
// all — and the throw is the failure, never a silent skip.
const assembledRooms = (config: GameFloorConfig, resolveEncounter: ResolveEncounter) => {
  for (let seed = 0; seed < 60; seed++) {
    const result = assembleAt(config, seed, resolveEncounter)
    if (!result.success) continue
    const rooms = result.grid.cells.flat().filter((cell): cell is RoomCell => cell.type === "room")
    const forks = rooms.filter(room => room.roomType === "fork")
    if (forks.length > 0) return { rooms, forks }
  }
  throw new Error("no seed carved a fork room")
}

const inhabitedForks = (forks: RoomCell[]) => forks.filter(fork => fork.family !== undefined)
const shutWaysOut = (rooms: RoomCell[]) => rooms.filter(room => room.requiredKeyId?.startsWith(SWITCH_STEM))

describe("a switch whose family's mod is toggled off", () => {
  it("stands while topology is registered", () => {
    const kept = dropUnownedAuthoring(switchFloor, new Set(["topology"]), resolveEncounterMeta)
    expect(kept.switches).toEqual(switchFloor.switches)
  })

  it("is stripped once topology stops contributing the family standing in it", () => {
    expect(stripped().switches).toBeUndefined()
  })

  it("leaves the junctions the floor asks core to carve exactly where they were", () => {
    expect(stripped().forks).toEqual(switchFloor.forks)
  })

  it("assembles, where the floor it was stripped from refuses to", () => {
    expect(assembleAt(stripped(), 0, topologyOff).success).toBe(true)
    const authored = assembleAt(switchFloor as GameFloorConfig, 0, topologyOff)
    expect(authored.success === false && authored.reasons.map(r => r.type)).toEqual(["switchFamilyNotReEnterable"])
  })

  it("carves a bare junction: nothing stands in the fork and no way out is shut", () => {
    const { rooms, forks } = assembledRooms(stripped(), topologyOff)
    expect(inhabitedForks(forks)).toEqual([])
    expect(shutWaysOut(rooms)).toEqual([])
  })

  // The two counts above find both a family and shut ways out on this very floor while topology is
  // here, so finding neither above says the room is bare, not that the check looks in the wrong place.
  it("is the only reason that junction was ever anything else", () => {
    const { rooms, forks } = assembledRooms(switchFloor as GameFloorConfig, resolveEncounterMeta)
    expect(inhabitedForks(forks).map(fork => fork.family)).toEqual(["lightbeamSwitch"])
    expect(shutWaysOut(rooms).length).toBeGreaterThanOrEqual(2)
  })

  it("is not invented on a floor that authors none", () => {
    const dropped = dropUnownedAuthoring(floor, new Set(["topology"]), resolveEncounterMeta)
    expect(dropped.switches).toBeUndefined()
    expect(dropped.sideSections).toEqual(floor.sideSections)
  })
})

// THE POINT OF SPLITTING THE TWO FIELDS. `forks` is core's, so the floor is carved to it whether or
// not a mod is here to fill what it reserved — and a save written against those walls survives the
// mod leaving the build. Compared by each cell's `dirs`, never its `type`: standing a switch in a
// junction turns the corridor cell it closes into a door, which is a room where a corridor was
// without one wall having moved, and comparing types would call that a difference.
// Asked of the world as it is baked, one junction added to every authored floor, rather than of a
// floor invented to make the point: what a shipped floor's carve does under an unregistered mod is
// the thing saves depend on.
const FORKS = [{ exits: 2, count: 1 }]
const SWITCHES = { encounter: "lightbeamSwitch", min: 1, max: 1 }

type Carve = {
  label: string
  forksOnly: string | null
  withSwitch: string | null
  modOff: string | null
  /** Refused with the mod off, and wholly for a realisation that left. */
  modOffRefused: boolean
  held: boolean
  unsound: ValidationReason[]
}

describe("the carve a floor authoring forks gets", () => {
  // Assembling every authored floor three times is a few hundred maze carves, well past the default
  // 5s budget — paid once here rather than by whichever test happens to run first.
  const carves: Carve[] = []
  beforeAll(() => {
    for (const floor of allFloors()) {
      const withForks = { ...floor.config, forks: FORKS }
      const authored = { ...withForks, switches: SWITCHES }
      const opts = (resolve: ResolveEncounter, config: GameFloorConfig, off = false) =>
        assembleFloor(floor.journeyId, config, floor.seed, resolve, {
          resolveKeyRequirements,
          ...(off ? { resolveOneWay: TOPOLOGY_OFF.resolveOneWay } : {}),
          floorRef: { journeyId: floor.journeyId, levelIndex: floor.levelIndex, floorIndex: floor.floorIndex },
        })
      const forksOnly = opts(resolveEncounter, withForks)
      const withSwitch = opts(resolveEncounter, authored)
      // What the build looks like once topology has left it: `dropUnownedAuthoring` drops `switches` and
      // leaves `forks` and every mechanic (proven above), and the resolvers answer out of a catalogue without
      // topology's families and realisations in it.
      const modOff = opts(
        topologyOff,
        dropUnownedAuthoring(authored, TOPOLOGY_OFF.modIds, topologyOff) as GameFloorConfig,
        true
      )
      carves.push({
        label: floor.label,
        forksOnly: forksOnly.success ? dirsOf(forksOnly.grid) : null,
        withSwitch: withSwitch.success ? dirsOf(withSwitch.grid) : null,
        modOff: modOff.success ? dirsOf(modOff.grid) : null,
        modOffRefused: !modOff.success && modOff.reasons.every(reason => REALISATION_REFUSALS.has(reason.type)),
        held:
          withSwitch.success &&
          withSwitch.grid.cells.flat().some(cell => cell.type === "room" && cell.roomType === "fork" && cell.family),
        unsound: withSwitch.success ? validation(validateSite(withSwitch.grid)) : [],
      })
    }
  }, 180_000)

  it("was asked of the whole baked world, not of a handful of floors", () => {
    expect(carves.length).toBeGreaterThan(100)
  })

  it("stood a switch in every floor that carved the junction, or nothing below compares a switch", () => {
    const assembled = carves.filter(carve => carve.withSwitch !== null)
    expect(assembled.length).toBeGreaterThan(50)
    expect(carves.filter(carve => carve.held).length).toBe(assembled.length)
  })

  // A junction reserved by `forks` is one whose ways out can be SHUT without spoiling the floor —
  // shutting them away from the chest holding a section's own key is the way that goes wrong, and it
  // is a property of the carve, so the carve is what has to answer for it.
  it("leaves a floor that stands its switch still walkable end to end", () => {
    const unsound = carves.filter(carve => carve.unsound.length > 0)
    expect(unsound.map(carve => `${carve.label}: ${JSON.stringify(carve.unsound)}`)).toEqual([])
  })

  it("assembles or refuses for the same reason with a switch, and with the mod off only ever refuses by name", () => {
    const disagreed = carves.filter(
      carve =>
        (carve.forksOnly === null) !== (carve.withSwitch === null) ||
        ((carve.forksOnly === null) !== (carve.modOff === null) && !carve.modOffRefused)
    )
    expect(disagreed.map(carve => carve.label)).toEqual([])
  })

  it("refuses with the mod off only floors that author a mechanic, which in the baked world is the dev journey", () => {
    const refused = carves.filter(carve => carve.modOffRefused && carve.forksOnly !== null)
    expect(refused.length).toBeGreaterThan(0)
    expect(refused.filter(carve => !carve.label.startsWith("dev_topology")).map(carve => carve.label)).toEqual([])
  })

  it("is the same one whether or not a switch stands in what it reserved", () => {
    const moved = carves.filter(carve => carve.forksOnly !== null && carve.forksOnly !== carve.withSwitch)
    expect(moved.map(carve => carve.label)).toEqual([])
  })

  it("is the same one whether or not the mod standing in it is registered at all, where it is carved", () => {
    const moved = carves.filter(
      carve => carve.forksOnly !== null && carve.modOff !== null && carve.forksOnly !== carve.modOff
    )
    expect(moved.map(carve => carve.label)).toEqual([])
  })
})
