import { beforeAll, describe, it, expect } from "vitest"
import { dropUnownedAuthoring } from "@/worldGen/modOwnedAuthoring"
import { engineFromEnv } from "@/game/carve/engines"
import { assembleFloor, type ResolveEncounter } from "@/game/siteAssembler"
import { TOPOLOGY_OFF, dirsApartFromDrops, dirsOf } from "@/game/testSupport/modOff"
import type { FloorConfig as GameFloorConfig } from "@/game/siteTypes"
import { allFloors, resolveKeyRequirements } from "@/app/SiteMap/worldFloors.testing"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { validateSite } from "@/game/siteValidator"
import type { ValidationReason, ValidationResult } from "@/game/siteTypes"

const validation = (result: ValidationResult): ValidationReason[] => (result.valid ? [] : result.reasons)

const topologyOff: ResolveEncounter = TOPOLOGY_OFF.resolveEncounter

// THE POINT OF SPLITTING THE TWO FIELDS. `forks` is core's, so the floor is carved to it whether or
// not a mod is here to fill what it reserved — and a save written against those walls survives the
// mod leaving the build. Compared by each cell's `dirs`, never its `type`: standing a switch in a
// junction turns the corridor cell it closes into a door, which is a room where a corridor was
// without one wall having moved, and comparing types would call that a difference.
// Asked of the shipped world, one junction added to every authored floor, rather than of a
// floor invented to make the point: what a shipped floor's carve does under an unregistered mod is
// the thing saves depend on.
const FORKS = [{ exits: 2, count: 1 }]
const SWITCHES = { encounter: "lightbeamSwitch", min: 1, max: 1 }

type Carve = {
  label: string
  forksOnly: string | null
  withSwitch: string | null
  modOff: string | null
  /** The walls of the mod-off carve and of the forks-only carve, both blank along the drops the mod on stands. */
  modOffApart: string | null
  forksOnlyApart: string | null
  held: boolean
  unsound: ValidationReason[]
}

describe("the carve a floor authoring forks gets", () => {
  // Assembling every authored floor three times is a few hundred maze carves, well past the default
  // 5s budget — paid once here rather than by whichever test happens to run first. A floor whose lock is laid
  // carves no plain junction, so it refuses the added one only after its whole ladder: minutes, under load.
  const carves: Carve[] = []
  beforeAll(() => {
    for (const floor of allFloors()) {
      const withForks = { ...floor.config, forks: FORKS }
      const authored = { ...withForks, switches: SWITCHES }
      const opts = (resolve: ResolveEncounter, config: GameFloorConfig, off = false) =>
        assembleFloor(
          floor.journeyId,
          config,
          floor.seed,
          resolve,
          {
            resolveKeyRequirements,
            ...(off ? { resolveOneWay: TOPOLOGY_OFF.resolveOneWay, resolvePassage: TOPOLOGY_OFF.resolvePassage } : {}),
            floorRef: { journeyId: floor.journeyId, levelIndex: floor.levelIndex, floorIndex: floor.floorIndex },
          },
          { engine: engineFromEnv() }
        )
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
        modOffApart: modOff.success && forksOnly.success ? dirsApartFromDrops(modOff.grid, forksOnly.grid) : null,
        forksOnlyApart: forksOnly.success ? dirsApartFromDrops(forksOnly.grid, forksOnly.grid) : null,
        held:
          withSwitch.success &&
          withSwitch.grid.cells.flat().some(cell => cell.type === "room" && cell.roomType === "fork" && cell.family),
        unsound: withSwitch.success ? validation(validateSite(withSwitch.grid)) : [],
      })
    }
  }, 600_000)

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

  it("assembles or refuses for the same reason with a switch, and with the mod off refuses nothing the mod on carves", () => {
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

  it("is the same one whether or not the mod standing in it is registered, apart from a drop it leaves a passage", () => {
    const moved = carves.filter(
      carve => carve.forksOnlyApart !== null && carve.modOffApart !== null && carve.forksOnlyApart !== carve.modOffApart
    )
    expect(moved.map(carve => carve.label)).toEqual([])
  })
})
