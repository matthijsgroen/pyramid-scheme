import { useGameStorage } from "@/support/useGameStorage"

// Generic, mod-owned persisted state slice — not shop-specific. Any mod's Component can use
// this for arbitrary-shaped data that isn't a ledger currency (src/game/ledger) — including a
// mod's own perk levels (trap/hieroglyph/puzzle store theirs here). Independent of
// ProgressionState entirely, so core's shape never needs to know a mod's state exists.
export const useModState = <T>(modId: string, initialValue: T | (() => T)) =>
  useGameStorage<T>(`pyramid-scheme-mod-${modId}`, initialValue)
