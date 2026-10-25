import { produce } from "immer"
import { difficultyCompare, type Difficulty } from "@/data/difficultyLevels"
import type { TreasureReward } from "./siteTypes"

// The home save: what the player brought home since the last unpacking, and the chapter last shown.
// The haul is the reward objects exactly as the popup offered them, never an index or a count, so
// whichever mod owns a reward type can draw it later, and a reward of a type no mod knows any more
// stays in the save, inert.
export type HomeSave = {
  version: 1
  haul: TreasureReward[]
  chapter?: Difficulty
}

export const emptyHomeSave = (): HomeSave => ({ version: 1, haul: [] })

const isReward = (value: unknown): value is TreasureReward =>
  typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string"

const isHomeSaveV1 = (save: Record<string, unknown>): boolean =>
  Array.isArray(save.haul) &&
  save.haul.every(isReward) &&
  (save.chapter === undefined || typeof save.chapter === "string")

// One branch per save version; a later version adds its migration here. A version this build does not
// know (a save from a newer build) or a damaged save is unreadable, never guessed at.
const readable = (stored: unknown): HomeSave | undefined => {
  if (typeof stored !== "object" || stored === null) return undefined
  const save = stored as Record<string, unknown>
  switch (save.version) {
    case 1:
      return isHomeSaveV1(save) ? (stored as HomeSave) : undefined
    default:
      return undefined
  }
}

// An unreadable save shows as the empty home.
export const readHomeSave = (stored: unknown): HomeSave => readable(stored) ?? emptyHomeSave()

// A change to the stored home. Nothing stored starts from the empty home; a stored value this build
// cannot read is handed back untouched, so a newer or damaged save is never overwritten by an empty one
// and its haul is not lost.
export const updateHomeSave = (stored: unknown, action: (save: HomeSave) => HomeSave): unknown => {
  if (stored === null || stored === undefined) return action(emptyHomeSave())
  const save = readable(stored)
  return save === undefined ? stored : action(save)
}

export const addToHaul = produce((save: HomeSave, reward: TreasureReward) => {
  save.haul.push(structuredClone(reward))
})

export const clearHaul = produce((save: HomeSave) => {
  save.haul = []
})

export const markChapter = produce((save: HomeSave, tier: Difficulty) => {
  save.chapter = tier
})

// A save without a record takes the current chapter silently, so only a tier reached after the record
// is announced.
export const chapterToAnnounce = (save: HomeSave, current: Difficulty): Difficulty | undefined =>
  save.chapter !== undefined && difficultyCompare(current, save.chapter) > 0 ? current : undefined

export const needsChapterRecord = (save: HomeSave): boolean => save.chapter === undefined
