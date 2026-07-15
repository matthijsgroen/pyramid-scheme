import type { FC } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import type { GateVariant, KeyColor, TreasureReward } from "@/game/siteTypes"
import type { ResolveEncounter } from "@/game/siteAssembler"
import type { FamilyMeta } from "@/game/families/familyMeta"
import type { ProgressionAPI } from "@/app/state/useProgression"
import type { JourneyAPI } from "@/app/state/useJourneys"
import type { useInventory } from "@/app/Inventory/useInventory"

// The one registry for every encounter family (puzzle, trap, shop, treasure). Lives in
// src/app/ (not src/game/) because Component needs ProgressionAPI/JourneyAPI — FamilyMeta
// itself is plain data, defined in src/game/families/familyMeta.ts so world-gen can read it.
export type { FamilyMeta }

export type FamilyContext = {
  // This room's own identity, for families that act on journeys/progression directly.
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
  // A shop node's stock: the reward slots the mods placed into this node's `rewards[]` (currency
  // pieces + consumables). The fez-shop family renders these as its buyable list. Entries may be
  // undefined (unfilled slots). Distinct from the single `reward` a plain chest/puzzle-solve grants.
  stock?: (TreasureReward | undefined)[]
  // key-gate's own precondition: which key this room needs, and whether the player
  // already holds it (local-floor tomb keys ∪ ward keys owned entering the site).
  requiredKeyId?: string
  gateVariant?: GateVariant
  keyColor?: KeyColor
  ownedKeys?: ReadonlySet<string>
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

// A single string is an exact id or a single tag. An array requires every listed tag
// present at once (authoring "AND": the time puzzles AND the sun puzzles AND the water
// traps). First-registered-family-wins among matches — not weighted selection (that's
// docs/mods/ARCHITECTURE.md's Distribution primitive).
export const resolveFamilyByIdOrTag = (idOrTag: string | string[]): FamilyPlugin | undefined => {
  if (typeof idOrTag === "string") {
    const exact = registry.get(idOrTag)
    if (exact) return exact
    return [...registry.values()].find(p => p.meta.tags.includes(idOrTag))
  }
  return [...registry.values()].find(p => idOrTag.every(tag => p.meta.tags.includes(tag)))
}

// Bridges siteAssembler.ts's domain-layer resolution to the real registry — the one place
// an authored `encounter` id/tag actually reaches a family's real id and tags.
export const resolveEncounter: ResolveEncounter = (encounter, defaultTag) => {
  const query = encounter ?? defaultTag
  const plugin = resolveFamilyByIdOrTag(query)
  if (plugin) return { familyId: plugin.meta.id, tags: plugin.meta.tags }
  return { familyId: Array.isArray(query) ? query.join("+") : query, tags: [] }
}
