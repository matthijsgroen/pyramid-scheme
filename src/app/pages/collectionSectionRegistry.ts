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
}

// A Collection section contributed by a mod (app-side). Mirrors the family plugin registry:
// registration is a side-effect gated on the mod being enabled, so a section drops out with its
// mod. `order` sorts sections among themselves; the core screen decides where the whole block sits.
export type CollectionSectionEntry = {
  id: string
  order: number
  Component: FC<CollectionSectionProps>
}

const registry = new Map<string, CollectionSectionEntry>()

export const registerCollectionSection = (entry: CollectionSectionEntry) => registry.set(entry.id, entry)

export const collectionSections = (): CollectionSectionEntry[] =>
  [...registry.values()].sort((a, b) => a.order - b.order)
