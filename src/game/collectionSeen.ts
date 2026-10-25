// What the collection has shown the player: per section id, the item ids already seen. Only ids are
// stored, never a count or a flag, so what is new is always worked out from what the section holds now.
// A section without a record has nothing new: a save from before this record existed, or a section
// whose mod is switched on later, would otherwise light up everything it holds at once. Only seeding
// opens a record, with what the section shows at that moment; marking a section without one does
// nothing, so a mark that reaches the save before its seed cannot turn everything else into news.
// Records are read and written as own properties only, so a section id such as "constructor" never
// finds an inherited value.
export type CollectionSeen = {
  version: 1
  seen: Record<string, string[]>
}

export const emptyCollectionSeen = (): CollectionSeen => ({ version: 1, seen: {} })

const isIdList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(id => typeof id === "string")

const isCollectionSeenV1 = (save: Record<string, unknown>): boolean =>
  typeof save.seen === "object" &&
  save.seen !== null &&
  !Array.isArray(save.seen) &&
  Object.values(save.seen).every(isIdList)

// One branch per save version; a later version adds its migration here. A version this build does not
// know (a save from a newer build) or a damaged save is unreadable, never guessed at.
const readable = (stored: unknown): CollectionSeen | undefined => {
  if (typeof stored !== "object" || stored === null) return undefined
  const save = stored as Record<string, unknown>
  switch (save.version) {
    case 1:
      return isCollectionSeenV1(save) ? (stored as CollectionSeen) : undefined
    default:
      return undefined
  }
}

// An unreadable save shows as the empty one, so nothing reads as new.
export const readCollectionSeen = (stored: unknown): CollectionSeen => readable(stored) ?? emptyCollectionSeen()

// A change to the stored record. Nothing stored starts from the empty save; a stored value this build
// cannot read is handed back untouched, so a newer or damaged save is never overwritten by an empty one.
export const updateCollectionSeen = (stored: unknown, action: (save: CollectionSeen) => CollectionSeen): unknown => {
  if (stored === null || stored === undefined) return action(emptyCollectionSeen())
  const save = readable(stored)
  return save === undefined ? stored : action(save)
}

export const hasRecord = (save: CollectionSeen, section: string): boolean => Object.hasOwn(save.seen, section)

const withRecord = (save: CollectionSeen, section: string, ids: string[]): CollectionSeen => ({
  ...save,
  seen: { ...save.seen, [section]: ids },
})

export const markSeen = (save: CollectionSeen, section: string, ids: readonly string[]): CollectionSeen => {
  if (!hasRecord(save, section)) return save
  const list = save.seen[section]
  const added = [...new Set(ids)].filter(id => !list.includes(id))
  return added.length === 0 ? save : withRecord(save, section, [...list, ...added])
}

export const seedSection = (save: CollectionSeen, section: string, ids: readonly string[]): CollectionSeen =>
  hasRecord(save, section) ? save : withRecord(save, section, [...new Set(ids)])

export const newIds = (save: CollectionSeen, section: string, ids: readonly string[]): string[] => {
  if (!hasRecord(save, section)) return []
  const seen = new Set(save.seen[section])
  return ids.filter(id => !seen.has(id))
}
