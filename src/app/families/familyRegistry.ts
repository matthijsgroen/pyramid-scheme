import type { FC } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import type { TreasureReward } from "@/game/siteTypes"
import type { ProgressionAPI } from "@/app/state/useProgression"
import type { JourneyAPI } from "@/app/state/useJourneys"
import type { useInventory } from "@/app/Inventory/useInventory"

// Replaces trapRegistry.ts + puzzleRegistry.ts — trap is a puzzle with a nonzero fail cost,
// see docs/mods-architecture.md. Lives in src/app/ (not src/game/) because Component needs
// ProgressionAPI/JourneyAPI, which domain code can't import.
export type FamilyMeta = { id: string; ownerMod: string; tags: string[]; icon: string; color: string }

export type FamilyContext = {
  // This room's own identity — needed by any family that acts on journeys/progression itself
  // (e.g. trap's disable bypass calling markTrapDisabled, shop's purchase tracking calling
  // hasPurchasedShop), not just by core's generic dispatch.
  journeyId: string
  edgeId: string
  sectionHash: string
  // False when the player re-clicks this room while already standing on it (vs. having
  // traveled away and back) — shop uses this to decide whether its own stock resets.
  freshArrival: boolean
  difficulty?: Difficulty
  theme?: string
  tags?: string[]
  reward?: TreasureReward
  price?: number
}

type InventoryAPI = ReturnType<typeof useInventory>

export type FamilyPlugin<T = unknown> = {
  meta: FamilyMeta
  generate: (seed: number, ctx: FamilyContext) => T
  Component: FC<{
    puzzle: T
    ctx: FamilyContext
    progression: ProgressionAPI
    journeys: JourneyAPI
    inventory: InventoryAPI
    applyReward: (reward: TreasureReward) => void
    onSolved: () => void
    onCancel: () => void
  }>
}

const registry = new Map<string, FamilyPlugin>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const registerFamily = (plugin: FamilyPlugin<any>) =>
  registry.set(plugin.meta.id, plugin as FamilyPlugin<unknown>)

export const getFamilyPlugin = (id: string): FamilyPlugin | undefined => registry.get(id)

export const allFamilies = (): FamilyPlugin[] => [...registry.values()]

// Deterministic first-registered-family-wins — NOT weighted/random selection. Real
// multi-candidate tag-weighted picking (e.g. "any trap" when several share a tag) is
// docs/mods-architecture.md step 5's Distribution primitive, not built here.
export const resolveFamilyByIdOrTag = (idOrTag: string): FamilyPlugin | undefined => {
  const exact = registry.get(idOrTag)
  if (exact) return exact
  return [...registry.values()].find(p => p.meta.tags.includes(idOrTag))
}
