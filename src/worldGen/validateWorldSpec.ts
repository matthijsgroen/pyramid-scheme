import { TOMB_JOURNEYS } from "./data"
import { TOMB_PERK_IDS } from "../data/treasurePerks"
import { resolvePyramidConstraintWithProvenance } from "./constraintResolver"
import { worldSpec } from "./worldSpec"
import type { Rule, TombConstraint, FloorConstraint, SideSectionConstraint, TombRewardHint } from "./dsl"
import type { Tier, TombJourneyDef } from "./types"

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

export const validateWorldSpec = (
  spec: Rule[] = worldSpec,
  tombs: TombJourneyDef[] = TOMB_JOURNEYS
): WorldSpecError[] => {
  const errors: WorldSpecError[] = []

  for (const tomb of tombs) {
    const { constraint } = resolvePyramidConstraintWithProvenance(
      spec,
      tomb.id,
      tomb.tier as Tier,
      tomb.levelCount - 1,
      tomb.levelCount
    )
    const tombConstraint = constraint as TombConstraint
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
