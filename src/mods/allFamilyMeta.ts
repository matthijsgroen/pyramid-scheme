import type { FamilyMeta } from "@/game/families/familyMeta"
import type { ResolveKeyRequirements } from "@/game/siteAssembler"
import { ARITHMETIC_REFLEX_META } from "./trap/game/arithmeticReflex/meta"
import { SUMPLETE_META } from "./puzzle/game/sumplete/meta"
import { TABLEAU_META } from "./tableau/game/meta"
import { CROCODILE_META } from "./puzzle/game/crocodile/meta"
import { FEZ_SHOP_META } from "./shop/game/fezShop/meta"
import { TREASURE_CHEST_META } from "./core/game/treasureChest/meta"
import { KEY_GATE_META } from "./core/game/keyGate/meta"

// Every registered family's metadata, domain-layer only (no Component/generate) — the one
// place world-gen (which can't import the app-layer family registry) can read tags/
// rewardWeight. Kept in sync with app/registerAllFamilies.ts's plugin registrations by each
// plugin importing its meta from here rather than declaring its own copy.
export const ALL_FAMILY_META: FamilyMeta[] = [
  ARITHMETIC_REFLEX_META,
  SUMPLETE_META,
  TABLEAU_META,
  CROCODILE_META,
  FEZ_SHOP_META,
  TREASURE_CHEST_META,
  KEY_GATE_META,
]

// Dispatches to whichever family declares its own resolveKeyRequirements (most provide
// none) — lives on FamilyMeta itself, not a separate registry, so there's exactly one place
// to touch when registering a new family, key-requirement-bearing or not.
export const resolveKeyRequirements: ResolveKeyRequirements = (familyId, ctx) =>
  ALL_FAMILY_META.find(m => m.id === familyId)?.resolveKeyRequirements?.(ctx)
