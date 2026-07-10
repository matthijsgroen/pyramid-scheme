import type { FamilyMeta } from "@/game/families/familyMeta"
import { ARITHMETIC_REFLEX_META } from "./trap/game/arithmeticReflex/meta"
import { SUMPLETE_META } from "./puzzle/game/sumplete/meta"
import { TABLEAU_META } from "./puzzle/game/tableau/meta"
import { CROCODILE_META } from "./puzzle/game/crocodile/meta"
import { FEZ_SHOP_META } from "./shop/game/fezShop/meta"
import { TREASURE_CHEST_META } from "./core/game/treasureChest/meta"

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
]
