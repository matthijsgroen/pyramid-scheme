import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "./data"
import { ROOM_CATALOGUE, catalogueRoom } from "../game/roomCatalogue"
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
import type { Difficulty, JourneyDef, Tier, TombJourneyDef } from "./types"

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

// What a spec may say about a designed room: it exists and is sound, its tier is the difficulty of the floor (or
// section) that names it, and its counts and `central` make sense.
const roomFaults = (
  placements: RoomPlacement[] | undefined,
  nodes: NodeSelector[] | undefined,
  difficulty: Difficulty,
  catalogue: Readonly<Record<string, Prefab>>
): string[] => {
  const faults: string[] = []
  const known = (name: string) => {
    try {
      return catalogueRoom(name, catalogue).tier
    } catch (e) {
      faults.push(`unknown room: ${(e as Error).message}`)
    }
  }
  const tierFault = (name: string) => {
    const tier = known(name)
    if (tier !== undefined && tier !== difficulty)
      faults.push(`room ${name} is tier ${tier} but is named where the difficulty is ${difficulty}`)
  }
  for (const placement of placements ?? []) {
    tierFault(placement.room)
    const { min, max, central } = withRoomDefaults(placement)
    if (min > max) faults.push(`room ${placement.room} wants min ${min} above max ${max}`)
    if (central < 0 || central > 1) faults.push(`room ${placement.room} has central ${central} outside 0 to 1`)
  }
  for (const node of nodes ?? []) if (node.room !== undefined) tierFault(node.room)
  return [...new Set(faults)]
}

const sectionRoomFaults = (
  sections: unknown,
  difficulty: Difficulty,
  catalogue: Readonly<Record<string, Prefab>>
): string[] =>
  Array.isArray(sections)
    ? (sections as SideSectionConstraint<TombRewardHint>[]).flatMap(section => {
        const own = section.difficulty ?? difficulty
        return [
          ...roomFaults(undefined, section.nodes, own, catalogue),
          ...sectionRoomFaults(section.sideSections, own, catalogue),
        ]
      })
    : []

// Every room a site's constraint names, floor by floor. A floor with no list of its own holds the site's.
const siteRoomFaults = (
  constraint: PyramidConstraint,
  fallback: Difficulty,
  catalogue: Readonly<Record<string, Prefab>>
): string[] => {
  const base = constraint.difficulty ?? fallback
  const floors = constraint.floors as (FloorConstraint | null)[] | undefined
  if (!floors?.length) return roomFaults(constraint.rooms, undefined, base, catalogue)
  return floors.flatMap(fc => {
    const difficulty = fc?.difficulty ?? base
    return [
      ...roomFaults(fc?.rooms ?? constraint.rooms, fc?.nodes, difficulty, catalogue),
      ...sectionRoomFaults(fc?.sideSections, difficulty, catalogue),
    ]
  })
}

export const validateWorldSpec = (
  spec: Rule[] = worldSpec,
  tombs: TombJourneyDef[] = TOMB_JOURNEYS,
  pyramids: JourneyDef[] = PYRAMID_JOURNEYS,
  catalogue: Readonly<Record<string, Prefab>> = ROOM_CATALOGUE
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
      siteRoomFaults(constraint, "expert", catalogue).forEach(fault => faults.add(fault))
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
    siteRoomFaults(constraint, "starter", catalogue).forEach(message => errors.push({ tombId: tomb.id, message }))
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
