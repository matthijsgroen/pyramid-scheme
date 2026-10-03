import { latestGameValue, primeGameValue, useGameStorage } from "@/support/useGameStorage"

const modStateKey = (modId: string): string => `pyramid-scheme-mod-${modId}`

// Generic, mod-owned persisted state slice — not shop-specific. Any mod's Component can use
// this for arbitrary-shaped data that isn't a ledger currency (src/game/ledger) — including a
// mod's own perk levels (trap/hieroglyph/puzzle store theirs here). Independent of
// ProgressionState entirely, so core's shape never needs to know a mod's state exists.
export const useModState = <T>(modId: string, initialValue: T | (() => T)) =>
  useGameStorage<T>(modStateKey(modId), initialValue)

/**
 * The same slice, read synchronously outside React — for a mod seam core calls while rendering, such as
 * an owned-key source. One store, two readers: this is the value the hook last wrote or read, never a
 * second copy of it.
 */
export const readModState = <T>(modId: string): T | undefined => latestGameValue<T>(modStateKey(modId))

/** Loads the slice so `readModState` can answer before any of the mod's components have mounted. */
export const primeModState = <T>(modId: string): Promise<T | undefined> => primeGameValue<T>(modStateKey(modId))
