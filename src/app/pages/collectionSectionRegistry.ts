import type { FC } from "react"
import type { Difficulty } from "@/data/difficultyLevels"

// A collectible shown in the Collection screen's shared detail panel — the common shape every
// section (core or mod) hands back on click.
export type CollectionItem = {
  id: string
  symbol: string
  name: string
  description: string
  effectDescription?: string
  // The item's difficulty, when the section knows it directly (e.g. a mod-owned treasure). The
  // detail panel prefers this over deriving one from the id, so core needn't resolve mod content.
  difficulty?: Difficulty
}

// What a registered section receives from the screen: the shared selection state (one detail
// panel is shared across all sections) and the select callback. A section sources its own data
// (inventory, progression, translations) via hooks — the screen passes nothing mod-specific, so
// core names no mod.
export type CollectionSectionProps = {
  selectedItem: CollectionItem | null
  onSelect: (item: CollectionItem) => void
  // Whether an item of this section is new to the player, and the label its badge carries.
  isNew: (id: string) => boolean
  newLabel: string
}

// What a section declares to be a tab: its label in the mod's own words, whether it has anything to
// show, the ids it can mark new (only things the player holds, never what is still locked or unknown)
// and whether its own save has been read. A section is only seeded once it is loaded, so an empty list
// from a save still on its way never counts as "nothing held".
export type CollectionTab = {
  label: string
  shown: boolean
  ids: readonly string[]
  loaded: boolean
}

// A Collection section contributed by a mod (app-side). Mirrors the family plugin registry:
// registration is a side-effect gated on the mod being enabled, so a section drops out with its
// mod. `order` sorts sections among themselves; the core screen decides where the whole block sits.
export type CollectionSectionEntry = {
  id: string
  order: number
  Component: FC<CollectionSectionProps>
  // A hook, called every render in registry order (fixed at module load).
  useTab?: () => CollectionTab
}

const registry = new Map<string, CollectionSectionEntry>()

export const registerCollectionSection = (entry: CollectionSectionEntry) => registry.set(entry.id, entry)

export const collectionSections = (): CollectionSectionEntry[] =>
  [...registry.values()].sort((a, b) => a.order - b.order)

export const clearCollectionSections = () => registry.clear()
