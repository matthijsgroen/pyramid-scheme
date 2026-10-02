import { beforeAll, describe, it, expect } from "vitest"
import { dropUnownedAuthoring } from "@/worldGen/modOwnedAuthoring"
import { assembleFloor, encounterFromMeta, type ResolveEncounter } from "@/game/siteAssembler"
import { ALL_FAMILY_META, resolveEncounterMeta } from "@/mods/allFamilyMeta"
import type { FloorConfig as GameFloorConfig, FloorGrid, RoomCell } from "@/game/siteTypes"
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
  it("drops obstacles and controls when the topology mod is not registered", () => {
    const dropped = dropUnownedAuthoring(gatedFloor, new Set(["mosaic"]), undefined)

    expect(dropped.obstacles).toBeUndefined()
    expect(dropped.controls).toBeUndefined()
  })

  it("keeps both when it is", () => {
    const kept = dropUnownedAuthoring(gatedFloor, new Set(["topology"]), undefined)

    expect(kept.obstacles).toEqual(gatedFloor.obstacles)
    expect(kept.controls).toEqual(gatedFloor.controls)
  })

  // The acceptance gate for the whole slice: the gate room disappears and nothing else moves. Compared
  // by each cell's `dirs`, never its `type` (`dirsOf`, defined below) — a gate room is a corridor cell
  // turned into a room without a wall having moved, and comparing types would call that a difference.
  //
  // Swept rather than pinned to one seed, over a one-, two- and five-obstacle shape: a single seed
  // proves nothing about the other 49, and `mainZoneCandidates`' own former comment (siteAssembler.ts)
  // only ever claimed what a handful of seeds measured, never a guarantee by construction. Where this
  // sweep finds a seed that diverges, `divergentSeeds` names it and the assertion holds the CURRENT
  // count rather than 0 — a red diff here would be a finding to keep visible, not something to narrow
  // the range to avoid.
  const divergesAt = (floor: GameFloorConfig): number[] => {
    const seeds: number[] = []
    for (let seed = 0; seed < 50; seed++) {
      const withMod = assembleFloor("dev", floor, seed)
      const without = assembleFloor("dev", dropUnownedAuthoring(floor, new Set(), undefined) as GameFloorConfig, seed)
      if (!withMod.success || !without.success) continue // a seed neither build carves proves nothing either way
      if (dirsOf(without.grid) !== dirsOf(withMod.grid)) seeds.push(seed)
    }
    return seeds
  }

  it("carves the identical walls with the mod off, across seeds 0-49, one obstacle", () => {
    expect(divergesAt(gatedFloor as GameFloorConfig)).toEqual([])
  })

  // Was RED (measured 24 of 50 seeds 0-49 diverging) while `mainZoneCandidates` reserved by COUNT —
  // excluding a gate's own cell but not the seam a mainzone stretch is sliced from, so which physical
  // cells landed in which hub-attachment slice still differed between the two builds even though the
  // same NUMBER left the loop. Fixed by reserving `regionSeamIndices` — every main-path region
  // boundary `regionLayout` (core, never dropped by `dropUnownedAuthoring`) declares, whether or not an
  // obstacle happens to gate it — so the excluded set is the identical set by construction, not merely
  // the identical size.
  it("carves the identical walls with the mod off, across seeds 0-49, two obstacles", () => {
    expect(divergesAt(twoObstacleFloor as GameFloorConfig)).toEqual([])
  })

  // Proves the fix scales past two ON-ROUTE gates. NOT a proof that `doubleBack` itself is
  // identity-stable — its two OFF-ROUTE gates (`forkRight`, `greenRight`) hit a SEPARATE mechanism,
  // `chainGateCrowdsEnd` (siteAssembler.ts), which retries only when an actual obstacle crowds a
  // chain's own end room. Mod off never authors that obstacle, so it never retries, and the two builds
  // can carve at different grid sizes entirely — measured 50 of 50 seeds diverging (seed 0: N=11 with
  // the mod, N=9 without). A structural fix analogous to `regionSeamIndices` (reserve every hosted-
  // region seam regardless of gating) was tried and reverted: it made `siteAssembler.spec.ts`'s "still
  // refuses by name when no chain node is ever free for the control" retry forever instead of refusing
  // by name, because that fixture's chain is structurally always end-crowded with NO gate ever
  // authored there — the same reservation that fixes a genuinely gated chain breaks an ungated one, and
  // `dropUnownedAuthoring`'s stripped config gives the mod-off build no way to tell the two apart. Left
  // open; see the report.
  it("carves the identical walls with the mod off, across seeds 0-49, five obstacles", () => {
    expect(divergesAt(fiveObstacleFloor as GameFloorConfig)).toEqual([])
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

describe("a fork named by region, with the topology mod off", () => {
  const stripped = dropUnownedAuthoring(forkedDoubleBack, new Set(), undefined) as GameFloorConfig

  it("carves the identical walls with every obstacle and control stripped, on every seed both builds carve", () => {
    const diverged: number[] = []
    let compared = 0
    for (let seed = 1; seed <= 40; seed++) {
      const withMod = assembleFloor("dev", forkedDoubleBack, seed)
      const without = assembleFloor("dev", stripped, seed)
      if (!withMod.success || !without.success) continue
      compared++
      if (dirsOf(without.grid) !== dirsOf(withMod.grid)) diverged.push(seed)
    }
    expect(compared).toBeGreaterThan(0)
    expect(diverged).toEqual([])
  }, 60_000)

  it("leaves a bare junction in the region whose side exits are still the two chains", () => {
    const step = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] } as const
    let carved = 0
    for (let seed = 1; seed <= 40; seed++) {
      const result = assembleFloor("dev", stripped, seed)
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

// allFamilyMeta's resolveEncounterMeta answers out of the families the REGISTERED mods contribute, so
// with topology out of that list its two families are simply not in the catalogue. This is that same
// id-then-tag lookup over a catalogue topology has left — the resolver the generator would inject.
const WITHOUT_TOPOLOGY = ALL_FAMILY_META.filter(meta => meta.ownerMod !== "topology")
const topologyOff: ResolveEncounter = (encounter, defaultTag) => {
  const value = (Array.isArray(encounter) ? encounter[0] : encounter) ?? defaultTag
  const meta = WITHOUT_TOPOLOGY.find(m => m.id === value) ?? WITHOUT_TOPOLOGY.find(m => m.tags.includes(value))
  return encounterFromMeta(meta, value)
}

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
const dirsOf = (grid: FloorGrid) =>
  grid.cells
    .map(row => row.map(cell => (cell.type === "empty" ? "" : [...cell.dirs].sort().join(""))).join("|"))
    .join("\n")

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
      const opts = (resolve: ResolveEncounter, config: GameFloorConfig) =>
        assembleFloor(floor.journeyId, config, floor.seed, resolve, {
          resolveKeyRequirements,
          floorRef: { journeyId: floor.journeyId, levelIndex: floor.levelIndex, floorIndex: floor.floorIndex },
        })
      const forksOnly = opts(resolveEncounter, withForks)
      const withSwitch = opts(resolveEncounter, authored)
      // What the build looks like once topology has left it: `dropUnownedAuthoring` strips `switches`
      // and leaves `forks` (proven above), and the resolver answers out of a catalogue without
      // topology's families in it.
      const modOff = opts(
        topologyOff,
        dropUnownedAuthoring(authored, new Set(["topology"]), topologyOff) as GameFloorConfig
      )
      carves.push({
        label: floor.label,
        forksOnly: forksOnly.success ? dirsOf(forksOnly.grid) : null,
        withSwitch: withSwitch.success ? dirsOf(withSwitch.grid) : null,
        modOff: modOff.success ? dirsOf(modOff.grid) : null,
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

  it("assembles or refuses for the same reason in all three builds", () => {
    const disagreed = carves.filter(
      carve =>
        (carve.forksOnly === null) !== (carve.withSwitch === null) ||
        (carve.forksOnly === null) !== (carve.modOff === null)
    )
    expect(disagreed.map(carve => carve.label)).toEqual([])
  })

  it("is the same one whether or not a switch stands in what it reserved", () => {
    const moved = carves.filter(carve => carve.forksOnly !== null && carve.forksOnly !== carve.withSwitch)
    expect(moved.map(carve => carve.label)).toEqual([])
  })

  it("is the same one whether or not the mod standing in it is registered at all", () => {
    const moved = carves.filter(carve => carve.forksOnly !== null && carve.forksOnly !== carve.modOff)
    expect(moved.map(carve => carve.label)).toEqual([])
  })
})
