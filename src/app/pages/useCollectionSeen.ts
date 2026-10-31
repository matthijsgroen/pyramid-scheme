import { useMemo } from "react"
import {
  emptyCollectionSeen,
  hasRecord,
  markSeen,
  newIds,
  readCollectionSeen,
  seedSection,
  updateCollectionSeen,
} from "@/game/collectionSeen"
import { useGameStorage } from "@/support/useGameStorage"

export type CollectionSeenActions = {
  markSeen: (section: string, ids: readonly string[]) => Promise<unknown>
  seedSection: (section: string, ids: readonly string[]) => Promise<unknown>
}

export type CollectionSeenAPI = CollectionSeenActions & {
  loaded: boolean
  hasRecord: (section: string) => boolean
  newIds: (section: string, ids: readonly string[]) => string[]
}

// Core's record of what the collection has shown. Every read goes through readCollectionSeen, so a
// stored value of another shape shows nothing as new; every change goes through updateCollectionSeen
// from the latest stored value, which leaves such a value untouched. The actions keep their identity
// across writes.
export const useCollectionSeen = (): CollectionSeenAPI => {
  const [stored, setStored, loaded] = useGameStorage<unknown>("collectionSeen", emptyCollectionSeen)

  const actions = useMemo<CollectionSeenActions>(
    () => ({
      markSeen: (section, ids) =>
        setStored((prev: unknown) => updateCollectionSeen(prev, save => markSeen(save, section, ids))),
      seedSection: (section, ids) =>
        setStored((prev: unknown) => updateCollectionSeen(prev, save => seedSection(save, section, ids))),
    }),
    [setStored]
  )

  return useMemo(() => {
    const save = readCollectionSeen(stored)
    return {
      loaded,
      hasRecord: (section: string) => hasRecord(save, section),
      newIds: (section: string, ids: readonly string[]) => newIds(save, section, ids),
      ...actions,
    }
  }, [stored, loaded, actions])
}
