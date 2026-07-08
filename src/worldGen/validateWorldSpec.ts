import { TOMB_JOURNEYS } from "./data"
import { TOMB_PERK_IDS } from "../data/treasurePerks"
import { resolvePyramidConstraintWithProvenance } from "./constraintResolver"
import { worldSpec } from "./worldSpec"
import type { TombConstraint, FloorConstraint, SideSectionConstraint, TombRewardHint } from "./dsl"
import type { Tier } from "./types"

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

export const validateWorldSpec = (): WorldSpecError[] => {
  const errors: WorldSpecError[] = []

  for (const tomb of TOMB_JOURNEYS) {
    const { constraint } = resolvePyramidConstraintWithProvenance(worldSpec, tomb.id, tomb.tier as Tier, 0, 1)
    const tombConstraint = constraint as TombConstraint
    const floors = tombConstraint.floors as FloorConstraint<TombRewardHint>[] | undefined

    if (!floors) continue

    const levelCount = tombConstraint.levelCount ?? tomb.levelCount
    if (floors.length !== levelCount) {
      errors.push({
        tombId: tomb.id,
        message: `floor count mismatch: authored ${floors.length} floors but levelCount is ${levelCount}`,
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
