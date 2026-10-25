import { useEffect } from "react"
import { collectionSections } from "./collectionSectionRegistry"
import { useCollectionSeen } from "./useCollectionSeen"

export type CollectionNewsTab = { id: string; label: string; shown: boolean; newIds: readonly string[] }

// What is new in each registered section's tab. Every section's useTab runs each render in registry
// order (fixed at module load); an entry without one is no tab. A section without a record is seeded
// with what it holds, but only once its own save is read, so a list still on its way never seeds
// "nothing held" and turns everything that arrives into news.
export const useCollectionNews = (): {
  tabs: CollectionNewsTab[]
  total: number
  markTabSeen: (id: string) => void
} => {
  const seen = useCollectionSeen()
  const entries = collectionSections()
  const tabs = entries.flatMap(entry => {
    if (!entry.useTab) return []
    const tab = entry.useTab()
    return [{ id: entry.id, tab }]
  })

  const { loaded: seenLoaded, hasRecord, seedSection, newIds, markSeen } = seen
  const unseeded = tabs.filter(({ id, tab }) => seenLoaded && tab.loaded && !hasRecord(id))
  const seedKey = unseeded.map(({ id }) => id).join("\u0000")
  const idsKey = unseeded.map(({ tab }) => tab.ids.join("\u0001")).join("\u0000")
  useEffect(() => {
    for (const { id, tab } of unseeded) void seedSection(id, tab.ids)
    // The key stands for the unseeded sections and what they hold now.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey, idsKey, seedSection])

  const result = tabs.map(({ id, tab }) => ({
    id,
    label: tab.label,
    shown: tab.shown,
    newIds: tab.loaded ? newIds(id, tab.ids) : [],
  }))
  const total = result.filter(tab => tab.shown).reduce((sum, tab) => sum + tab.newIds.length, 0)

  const markTabSeen = (id: string) => {
    const found = tabs.find(tab => tab.id === id)
    if (found) void markSeen(id, found.tab.ids)
  }

  return { tabs: result, total, markTabSeen }
}
