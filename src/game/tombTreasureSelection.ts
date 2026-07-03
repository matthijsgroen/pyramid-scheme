import { generateNewSeed, mulberry32 } from "./random"
import { hashString } from "@/support/hashString"
import type { TreasureTombJourney } from "@/data/journeys"

export type TombTreasure = TreasureTombJourney["treasures"][number]

/** Treasures not yet collected, falling back to all treasures if all are done. */
export const eligibleTreasures = (journey: TreasureTombJourney, collectedIds: string[]): TombTreasure[] => {
  const eligible = journey.treasures.filter(t => !collectedIds.includes(t.id))
  return eligible.length > 0 ? eligible : journey.treasures
}

/** Seed used for treasure selection on a given run. */
export const treasureSelectionSeed = (journey: TreasureTombJourney, runNr: number): number =>
  generateNewSeed(hashString(journey.id), runNr) + 12345

/** Select the treasure awarded on a specific run, given what was collected before it. */
export const treasureForRun = (
  journey: TreasureTombJourney,
  runNr: number,
  collectedIds: string[]
): TombTreasure | undefined => {
  const pool = eligibleTreasures(journey, collectedIds)
  if (pool.length === 0) return undefined
  const random = mulberry32(treasureSelectionSeed(journey, runNr))
  return pool[Math.floor(random() * pool.length)]
}

/** Simulate collection history: returns the treasure IDs collected on runs 1..(upToRun-1). */
export const collectedTreasureIds = (journey: TreasureTombJourney, upToRun: number): string[] => {
  const collected: string[] = []
  for (let run = 1; run < upToRun; run++) {
    const t = treasureForRun(journey, run, collected)
    if (t && !collected.includes(t.id)) collected.push(t.id)
  }
  return collected
}
