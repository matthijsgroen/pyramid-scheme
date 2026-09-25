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
      gate: { type: "floor-key" as const, keyId: "witness:junior_2#2:east", ownerMod: "topology" },
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
  switches: { encounter: "witnessDoor", min: 1, max: 1 },
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
    expect(inhabitedForks(forks).map(fork => fork.family)).toEqual(["witnessDoor"])
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
const SWITCHES = { encounter: "witnessDoor", min: 1, max: 1 }

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
