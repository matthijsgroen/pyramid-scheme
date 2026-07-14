import type { FamilyMeta } from "@/game/families/familyMeta"
import type { ResolveKeyRequirements } from "@/game/siteAssembler"
import { SUMPLETE_META } from "./puzzle/game/sumplete/meta"
import { CROCODILE_META } from "./puzzle/game/crocodile/meta"
import { FEZ_SHOP_META } from "./shop/game/fezShop/meta"
import { TREASURE_CHEST_META } from "./core/game/treasureChest/meta"
import { KEY_GATE_META } from "./core/game/keyGate/meta"
import { MOD_FAMILY_META } from "./registeredMods"

// Every registered family's metadata, domain-layer only (no Component/generate) — the one
// place world-gen (which can't import the app-layer family registry) can read tags/
// rewardWeight. Kept in sync with app/registerModApps.ts's plugin registrations by each
// plugin importing its meta from here rather than declaring its own copy. The still-legacy
// families are listed directly; descriptor-migrated mods (e.g. hieroglyph's tableau) contribute
// via MOD_FAMILY_META and drop out when the mod leaves REGISTERED_MODS.
export const ALL_FAMILY_META: FamilyMeta[] = [
  SUMPLETE_META,
  CROCODILE_META,
  FEZ_SHOP_META,
  TREASURE_CHEST_META,
  KEY_GATE_META,
  ...MOD_FAMILY_META,
]

// Dispatches to whichever family declares its own resolveKeyRequirements (most provide
// none) — lives on FamilyMeta itself, not a separate registry, so there's exactly one place
// to touch when registering a new family, key-requirement-bearing or not.
export const resolveKeyRequirements: ResolveKeyRequirements = (familyId, ctx) =>
  ALL_FAMILY_META.find(m => m.id === familyId)?.resolveKeyRequirements?.(ctx)

// The reward-weight (eagerness) of the family an authored `encounter` resolves to — the one
// place world-gen reads FamilyMeta.rewardWeight to rank loot slots (chest 100 > puzzle 60 >
// trap/tableau/crocodile/gate/shop 0). `encounter` may be a family id ("sumplete") or a tag
// ("puzzle"); `defaultTag` fills in when unset (e.g. "treasure" for a chest end, "puzzle" for a
// plain puzzle chain). Resolves id-first then tag, mirroring familyRegistry's resolveEncounter,
// but domain-only so it rides the same injection seam as resolveKeyRequirements. Returns 0 for an
// unknown encounter (loot-ineligible) — a mod's family drops from ALL_FAMILY_META with the mod.
export const familyWeightFor = (encounter: string | string[] | undefined, defaultTag: string): number => {
  const value = (Array.isArray(encounter) ? encounter[0] : encounter) ?? defaultTag
  const meta = ALL_FAMILY_META.find(m => m.id === value) ?? ALL_FAMILY_META.find(m => m.tags.includes(value))
  return meta?.rewardWeight ?? 0
}
