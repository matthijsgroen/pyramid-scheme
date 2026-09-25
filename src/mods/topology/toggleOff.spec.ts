import { describe, it, expect } from "vitest"
import { dropUnownedAuthoring } from "@/worldGen/modOwnedAuthoring"
import { assembleFloor, encounterFromMeta, type ResolveEncounter } from "@/game/siteAssembler"
import { ALL_FAMILY_META, resolveEncounterMeta } from "@/mods/allFamilyMeta"
import type { FloorConfig as GameFloorConfig, RoomCell } from "@/game/siteTypes"

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

const SWITCH_STEM = "witness:toggle-off"
const switchFloor = {
  ...floor,
  sideSections: [
    { pathPuzzles: 1, difficulty: "starter" as const, end: "treasure" as const },
    { pathPuzzles: 1, difficulty: "starter" as const, end: "treasure" as const },
  ],
  switchFork: { encounter: "witnessDoor", keyId: SWITCH_STEM },
}

const stripped = () => dropUnownedAuthoring(switchFloor, new Set(), topologyOff) as GameFloorConfig

// Which junction a carve offers is the seed's choice, so seeds are tried until one carves a fork at
// all — and the throw is the failure, never a silent skip.
const assembledRooms = (config: GameFloorConfig, resolveEncounter: ResolveEncounter) => {
  for (let seed = 0; seed < 60; seed++) {
    const result = assembleFloor("toggle-off", config, seed, resolveEncounter)
    if (!result.success) continue
    const rooms = result.grid.cells.flat().filter((cell): cell is RoomCell => cell.type === "room")
    const forks = rooms.filter(room => room.roomType === "fork")
    if (forks.length > 0) return { rooms, forks }
  }
  throw new Error("no seed carved a fork room")
}

const inhabitedForks = (forks: RoomCell[]) => forks.filter(fork => fork.family !== undefined)
const shutWaysOut = (rooms: RoomCell[]) => rooms.filter(room => room.requiredKeyId?.startsWith(SWITCH_STEM))

describe("a switch fork whose family's mod is toggled off", () => {
  it("stands while topology is registered", () => {
    const kept = dropUnownedAuthoring(switchFloor, new Set(["topology"]), resolveEncounterMeta)
    expect(kept.switchFork).toEqual(switchFloor.switchFork)
  })

  it("is stripped once topology stops contributing the family standing in it", () => {
    expect(stripped().switchFork).toBeUndefined()
  })

  it("assembles, where the floor it was stripped from refuses to", () => {
    expect(assembleFloor("toggle-off", stripped(), 0, topologyOff).success).toBe(true)
    const authored = assembleFloor("toggle-off", switchFloor as GameFloorConfig, 0, topologyOff)
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
    expect(dropped.switchFork).toBeUndefined()
    expect(dropped.sideSections).toEqual(floor.sideSections)
  })
})
