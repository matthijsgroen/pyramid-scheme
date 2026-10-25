import { difficultyCompare, type Difficulty } from "@/data/difficultyLevels"
import type { Journey } from "@/data/journeys"

type JourneyInfo = Pick<Journey, "id" | "difficulty" | "levelCount" | "entryLock">

export type ContinueInput = {
  journeys: readonly JourneyInfo[]
  activeJourneyId?: string
  isInProgress: (journeyId: string) => boolean
  completionCount: (journeyId: string) => number
  levelNr: (journeyId: string) => number
  /** Pyramid journeys the player may pick (`availablePyramidJourneyIds`). */
  available: ReadonlySet<string>
  /** Whether an entry-locked journey's lock is open. */
  lockOpen: (journeyId: string) => boolean
  hidden: (journeyId: string) => boolean
}

/** An entry lock met (or none) and no unmet need of a mod standing on the journey. */
export const entryOpen = (lock: { found: number; required: number } | undefined, needsMet: boolean): boolean =>
  needsMet && (!lock || lock.found >= lock.required)

export type ContinueOffer = {
  journeyId: string
  mode: "continue" | "start"
  levelNr?: number
  levelCount: number
}

/**
 * The journey in progress is continued; with none, the first open journey in list order of the highest
 * difficulty that has one is started. Open means pickable, not hidden and never completed.
 */
export const continueJourney = (input: ContinueInput): ContinueOffer | undefined => {
  const { journeys, activeJourneyId } = input
  const active = journeys.find(j => j.id === activeJourneyId)
  if (active && input.isInProgress(active.id))
    return {
      journeyId: active.id,
      mode: "continue",
      levelNr: input.levelNr(active.id),
      levelCount: active.levelCount,
    }

  const open = journeys.filter(
    j =>
      (input.available.has(j.id) || (j.entryLock !== undefined && input.lockOpen(j.id))) &&
      !input.hidden(j.id) &&
      input.completionCount(j.id) === 0
  )
  const top = open.reduce<Difficulty | undefined>(
    (best, j) => (best === undefined || difficultyCompare(j.difficulty, best) > 0 ? j.difficulty : best),
    undefined
  )
  const next = open.find(j => j.difficulty === top)
  return next && { journeyId: next.id, mode: "start", levelCount: next.levelCount }
}

export type NewToDiscoverInput = {
  journeys: readonly Pick<JourneyInfo, "id">[]
  completionCount: (journeyId: string) => number
  /** 1-based levels still holding unvisited content (`getUnexploredLevels` with the held keys). */
  unexploredLevels: (journeyId: string) => ReadonlySet<number>
}

/** Finished journeys with at least one reachable unexplored level. */
export const newToDiscoverCount = (input: NewToDiscoverInput): number =>
  input.journeys.filter(j => input.completionCount(j.id) > 0 && input.unexploredLevels(j.id).size > 0).length
