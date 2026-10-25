import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import type { Journey } from "@/data/journeys"
import type { JourneyLock } from "./journeyContributions"

// The flat model behind "Alle reizen": every journey the player may see, grouped by tier, with what
// a locked one still needs. Pure; the screen feeds it the player's state.

// A thing that can be locked: a whole tier or one journey.
export type Gate = { tier: Difficulty } | { journeyId: string }

export type JourneyNeed = {
  key: string
  label: string
  progress?: { found: number; required: number }
  symbols?: readonly { symbol: string; held: boolean }[]
}

export type JourneyRowModel = {
  journeyId: string
  status: "current" | "open" | "finished" | "locked"
  levelNr: number
  levelCount: number
  news: boolean
  needs: readonly JourneyNeed[]
}

export type TierGroup = {
  tier: Difficulty
  done: number
  total: number
  finished: boolean
  news: boolean
  collapsed: boolean
  locked: boolean
  needs: readonly JourneyNeed[]
  rows: readonly JourneyRowModel[]
}

export type AllJourneysInput = {
  journeys: readonly Journey[]
  activeJourneyId?: string
  isInProgress: (journeyId: string) => boolean
  completionCount: (journeyId: string) => number
  levelNr: (journeyId: string) => number
  available: ReadonlySet<string>
  hidden: (journeyId: string) => boolean
  lock: (journeyId: string) => JourneyLock | undefined
  news: (journeyId: string) => boolean
  tierOpen: (tier: Difficulty) => boolean
  tierNeeds: (tier: Difficulty) => readonly JourneyNeed[]
  /** Whether the player holds the treasure that opens this tier, whatever else it still waits for. */
  tierKeyHeld: (tier: Difficulty) => boolean
  comingSoon?: Difficulty
  // The one extension point for a gate's other requirements. A registry a mod fills may feed it;
  // nothing does today.
  extraNeeds?: (gate: Gate) => readonly JourneyNeed[]
}

export const allJourneys = (input: AllJourneysInput): { groups: TierGroup[]; comingSoon?: Difficulty } => {
  const extra = (gate: Gate): readonly JourneyNeed[] => input.extraNeeds?.(gate) ?? []
  const shown = (tier: Difficulty) => input.journeys.filter(j => j.difficulty === tier && !input.hidden(j.id))

  const rowFor = (journey: Journey): JourneyRowModel | undefined => {
    const lock = journey.entryLock ? input.lock(journey.id) : undefined
    // A pyramid journey the player cannot pick yet is not a row (it still counts in the tier's total).
    if (!journey.entryLock && !input.available.has(journey.id)) return undefined
    const needs: JourneyNeed[] = []
    // An entry lock not yet met is a need read from the lock's own count.
    if (lock && lock.found < lock.required) {
      needs.push({
        key: `lock:${journey.id}`,
        label: lock.labels.unit,
        progress: { found: lock.found, required: lock.required },
      })
    }
    needs.push(...extra({ journeyId: journey.id }))
    const status: JourneyRowModel["status"] =
      needs.length > 0
        ? "locked"
        : input.activeJourneyId === journey.id && input.isInProgress(journey.id)
          ? "current"
          : input.completionCount(journey.id) > 0
            ? "finished"
            : "open"
    return {
      journeyId: journey.id,
      status,
      levelNr: input.levelNr(journey.id),
      levelCount: journey.levelCount,
      news: input.news(journey.id),
      needs,
    }
  }

  const listed = (tier: Difficulty) =>
    input.tierOpen(tier) || input.journeys.some(j => j.difficulty === tier && input.available.has(j.id))
  const listedIndexes = difficulties.flatMap((tier, index) => (listed(tier) ? [index] : []))
  const highest = listedIndexes.length > 0 ? Math.max(...listedIndexes) : -1
  const lockedTier = difficulties[highest + 1]
  // A listed tier with no journey to show has no progress to speak of, so it is no group.
  const tiersListed = difficulties.filter(tier => listed(tier) && shown(tier).length > 0)
  // The newest tier that is open is the one the player is in, so it never folds away.
  const newestOpen = [...tiersListed].reverse()[0]

  const groups: TierGroup[] = tiersListed.map(tier => {
    const rows = shown(tier).flatMap(j => rowFor(j) ?? [])
    const all = shown(tier)
    const done = all.filter(j => input.completionCount(j.id) > 0).length
    const finished = done === all.length
    return {
      tier,
      done,
      total: all.length,
      finished,
      news: rows.some(r => r.news),
      collapsed: finished && tier !== newestOpen,
      locked: false,
      needs: [],
      rows,
    }
  })

  // The one tier past the highest listed is shown shut, with what opens it and no rows, but only once its
  // treasure is held and something else still keeps it shut: before that the next tier is no tease. The
  // tier that is coming soon has nothing to find yet, so it is only the footer's note.
  if (lockedTier && !input.tierOpen(lockedTier) && input.tierKeyHeld(lockedTier) && lockedTier !== input.comingSoon) {
    groups.push({
      tier: lockedTier,
      done: 0,
      total: shown(lockedTier).length,
      finished: false,
      news: false,
      collapsed: false,
      locked: true,
      needs: [...input.tierNeeds(lockedTier), ...extra({ tier: lockedTier })],
      rows: [],
    })
  }

  // Newest tier first.
  groups.sort((a, b) => difficulties.indexOf(b.tier) - difficulties.indexOf(a.tier))
  return { groups, comingSoon: input.comingSoon }
}
