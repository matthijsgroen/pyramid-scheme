import { produce } from "immer"
import type { PurchaseTable } from "./purchases"

// The shop's save holds what was bought from Fez, by purchase id. What a purchase opens is read from the
// table on every read, so a table change never strands a save: an id the table no longer knows stays in
// the save, inert.
export type PurchaseSave = {
  version: 1
  purchases: string[]
}

export const emptyPurchaseSave = (): PurchaseSave => ({ version: 1, purchases: [] })

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === "string")

// One branch per save version; a later version adds its migration here. A version this build does not know
// (a save from a newer build) or a damaged save is unreadable, never guessed at.
const readable = (stored: unknown): PurchaseSave | undefined => {
  if (typeof stored !== "object" || stored === null) return undefined
  const save = stored as Record<string, unknown>
  switch (save.version) {
    case 1:
      return isStringArray(save.purchases) ? (stored as PurchaseSave) : undefined
    default:
      return undefined
  }
}

// Whether a change to this stored value would land: nothing stored, or a save this build reads.
export const isWritablePurchaseSave = (stored: unknown): boolean =>
  stored === null || stored === undefined || readable(stored) !== undefined

// An unreadable save shows as nothing bought.
export const readPurchaseSave = (stored: unknown): PurchaseSave => readable(stored) ?? emptyPurchaseSave()

// A change to the stored purchases. Nothing stored starts from the empty save; a stored value this build
// cannot read is handed back untouched, so a newer or damaged save is never overwritten by an empty one.
export const updatePurchaseSave = (stored: unknown, action: (save: PurchaseSave) => PurchaseSave): unknown => {
  if (stored === null || stored === undefined) return action(emptyPurchaseSave())
  const save = readable(stored)
  return save === undefined ? stored : action(save)
}

export const recordPurchase = produce((save: PurchaseSave, id: string) => {
  if (!save.purchases.includes(id)) save.purchases.push(id)
})

// The facts the recorded purchases hold: a gate reads these, never the ids.
export const heldFacts = (save: PurchaseSave, table: PurchaseTable): ReadonlySet<string> =>
  new Set(table.filter(p => save.purchases.includes(p.id)).map(p => p.fact))
