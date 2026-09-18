// What a mod knows about a journey that core cannot: whether it is on the map yet, what still locks
// it and how far along that is, and whether it holds something of the mod's the player already
// found. A contribution is a HOOK, so it reads the mod's own state and its own translations; every
// member is optional and answers undefined/false for a journey the mod has nothing to say about.
// Same seam shape as keyProviders/perkContributions — see docs/mods/app-plugins-design.md.

export type JourneyLock = {
  found: number
  required: number
  // Translated by the mod that owns the lock, so the card can say what kind of place this is, what
  // it wants, what one of those is called, and what to go and do about it.
  labels: { title: string; requires: string; unit: string; howToUnlock: string }
}

export type JourneyContribution = {
  lock?: (journeyId: string) => JourneyLock | undefined
  hidden?: (journeyId: string) => boolean
  // The glyph to mark the card with, for a journey holding something of this mod's already found.
  mark?: (journeyId: string) => string | undefined
}

export type UseJourneyContribution = () => JourneyContribution

const registry: UseJourneyContribution[] = []

export const registerJourneyContribution = (useContribution: UseJourneyContribution) => registry.push(useContribution)

export type MergedJourneyContributions = {
  lock: (journeyId: string) => JourneyLock | undefined
  hidden: (journeyId: string) => boolean
  mark: (journeyId: string) => string | undefined
}

// Calls each contribution hook in a fixed order (the registry is populated once at module load —
// each mod's app entrypoint pushes exactly once — so the hooks run in the same order every render,
// rules-of-hooks safe). A lock takes the first owner's answer; hidden and mark take any owner's.
export const useMergedJourneyContributions = (): MergedJourneyContributions => {
  const resolved: JourneyContribution[] = []
  for (const useContribution of registry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable registry order; see above
    resolved.push(useContribution())
  }
  return {
    lock: journeyId => {
      for (const c of resolved) {
        const lock = c.lock?.(journeyId)
        if (lock) return lock
      }
      return undefined
    },
    hidden: journeyId => resolved.some(c => c.hidden?.(journeyId)),
    mark: journeyId => {
      for (const c of resolved) {
        const mark = c.mark?.(journeyId)
        if (mark) return mark
      }
      return undefined
    },
  }
}
