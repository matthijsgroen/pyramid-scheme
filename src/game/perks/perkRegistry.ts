export type PerkSlice = "trapPerks" | "puzzlePerks" | "corePerks"

// Grant (which treasure maps to which perk, at which level) is authored core data
// (data/treasurePerks.ts) — this registry is the consume side: where a perk's value
// lives and how a new grant combines with the current value. See docs/mods/ARCHITECTURE.md.
export type PerkMeta = {
  id: string
  ownerMod: string
  slice: PerkSlice
  field: string
  maxLevel: number
  bump: (current: number, grantedLevel?: number) => number
}

const registry = new Map<string, PerkMeta>()

export const registerPerk = (meta: PerkMeta) => registry.set(meta.id, meta)

export const getPerkMeta = (id: string): PerkMeta | undefined => registry.get(id)

export const allPerks = (): PerkMeta[] => [...registry.values()]
