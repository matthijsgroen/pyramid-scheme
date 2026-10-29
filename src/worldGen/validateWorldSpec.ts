import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "./data"
import { catalogueRoom } from "../game/roomCatalogue"
import type { Prefab } from "../game/prefabTypes"
import { TOMB_PERK_IDS } from "../data/treasurePerks"
import { resolvePyramidConstraintWithProvenance } from "./constraintResolver"
import { worldSpec } from "./worldSpec"
import type {
  NodeSelector,
  PyramidConstraint,
  Rule,
  RoomPlacement,
  TombConstraint,
  FloorConstraint,
  SideSectionConstraint,
  TombRewardHint,
} from "./dsl"
import { withRoomDefaults } from "./dsl"
import type { JourneyDef, Tier, TombJourneyDef } from "./types"

export type WorldSpecError = { tombId: string; message: string }

const countTombTreasures = (floors: FloorConstraint<TombRewardHint>[]): number => {
  let count = 0
  for (const floor of floors) {
    if (floor.mainEndReward === "tombTreasure") count++
    if (Array.isArray(floor.sideSections)) {
      for (const section of floor.sideSections as SideSectionConstraint<TombRewardHint>[]) {
        if (section.endReward === "tombTreasure") count++
        if (Array.isArray(section.sideSections)) {
          for (const sub of section.sideSections as SideSectionConstraint<TombRewardHint>[]) {
            if (sub.endReward === "tombTreasure") count++
          }
        }
      }
    }
  }
  return count
}

// What a spec may say about a designed room: it exists and is sound, and its counts and `central` make sense. A
// room's tier is checked where the floor's real difficulty is known (buildSite), wings included.
type Catalogue = Readonly<Record<string, Prefab>> | undefined

const roomFaults = (
  placements: RoomPlacement[] | undefined,
  nodes: NodeSelector[] | undefined,
  catalogue: Catalogue
) => {
  const faults: string[] = []
  const known = (name: string) => {
    try {
      catalogueRoom(name, catalogue)
    } catch (e) {
      faults.push(`unknown room: ${(e as Error).message}`)
    }
  }
  for (const placement of placements ?? []) {
    known(placement.room)
    const { min, max, central } = withRoomDefaults(placement)
    if (min > max) faults.push(`room ${placement.room} wants min ${min} above max ${max}`)
    if (central < 0 || central > 1) faults.push(`room ${placement.room} has central ${central} outside 0 to 1`)
  }
  for (const node of nodes ?? []) if (node.room !== undefined) known(node.room)
  return faults
}

const sectionRoomFaults = (sections: unknown, catalogue: Catalogue): string[] =>
  Array.isArray(sections)
    ? (sections as SideSectionConstraint<TombRewardHint>[]).flatMap(section => [
        ...roomFaults(undefined, section.nodes, catalogue),
        ...sectionRoomFaults(section.sideSections, catalogue),
      ])
    : []

// Every room a site's constraint names, floor by floor. A floor with no list of its own holds the site's.
const siteRoomFaults = (constraint: PyramidConstraint, catalogue: Catalogue): string[] => {
  const floors = constraint.floors as (FloorConstraint | null)[] | undefined
  if (!floors?.length) return roomFaults(constraint.rooms, undefined, catalogue)
  return floors.flatMap(fc => [
    ...roomFaults(fc?.rooms ?? constraint.rooms, fc?.nodes, catalogue),
    ...sectionRoomFaults(fc?.sideSections, catalogue),
  ])
}

export const validateWorldSpec = (
  spec: Rule[] = worldSpec,
  tombs: TombJourneyDef[] = TOMB_JOURNEYS,
  pyramids: JourneyDef[] = PYRAMID_JOURNEYS,
  catalogue?: Readonly<Record<string, Prefab>>
): WorldSpecError[] => {
  const errors: WorldSpecError[] = []

  for (const journey of pyramids) {
    const faults = new Set<string>()
    for (let i = 0; i < journey.levelCount; i++) {
      const { constraint } = resolvePyramidConstraintWithProvenance(
        spec,
        journey.id,
        journey.tier as Tier,
        i,
        journey.levelCount
      )
      siteRoomFaults(constraint, catalogue).forEach(fault => faults.add(fault))
    }
    faults.forEach(message => errors.push({ tombId: journey.id, message }))
  }

  for (const tomb of tombs) {
    const { constraint } = resolvePyramidConstraintWithProvenance(
      spec,
      tomb.id,
      tomb.tier as Tier,
      tomb.levelCount - 1,
      tomb.levelCount
    )
    const tombConstraint = constraint as TombConstraint
    siteRoomFaults(constraint, catalogue).forEach(message => errors.push({ tombId: tomb.id, message }))
    const floors = tombConstraint.floors as FloorConstraint<TombRewardHint>[] | undefined

    if (!floors) continue

    const floorCount = tombConstraint.floorCount ?? tomb.floorCount
    if (floors.length !== floorCount) {
      errors.push({
        tombId: tomb.id,
        message: `floor count mismatch: authored ${floors.length} floors but floorCount is ${floorCount}`,
      })
    }

    const perkCount = (TOMB_PERK_IDS[tomb.id] ?? []).length
    const slotCount = countTombTreasures(floors)
    if (slotCount !== perkCount) {
      errors.push({
        tombId: tomb.id,
        message: `tombTreasure slot count mismatch: authored ${slotCount} slots but ${perkCount} perks defined`,
      })
    }
  }

  return errors
}
