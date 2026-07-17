import { registerCollectionSection } from "@/app/pages/collectionSectionRegistry"
import { registerRewardContribution } from "@/app/SiteMap/rewardContributions"
import { registerHudWidget } from "@/app/SiteMap/hudRegistry"
import { registerRewardSchema } from "@/app/SiteMap/rewardSchemas"
import { isModEnabled } from "@/mods/registeredMods"
import { useProgression } from "@/app/state/useProgression"
import { useInventory } from "@/app/Inventory/useInventory"
import { moneyRewardSchema, sellableRewardSchema } from "@/mods/shop/game/rewardSchemas"
import { ShopCollectionSection } from "./ShopCollectionSection"
import { ShopHud } from "./ShopHud"
import { registerShopRewardDisplay } from "./rewardDisplay"
import "./fezShop/plugin" // the Fez shop encounter family (self-gated)

// shop's app-side registration (side-effect), self-gated on the mod being enabled:
// - the Collection "junk" section (with shop off it never registers, matching the world-gen side
//   that places no junk when shop is off).
// - the HUD widget: the money balance (order after trap's health/consumables).
// - the reward text/display for money + sellable (synchronous stock text + the loot popup).
// - the reward contribution: money is banked and a sellable is added to the inventory (the
//   effects) — the mod owns the reward ids, core owns the money bucket + inventory it writes to.
if (isModEnabled("shop")) {
  registerCollectionSection({ id: "shop", order: 20, Component: ShopCollectionSection })
  registerHudWidget({ id: "shop", order: 10, Component: ShopHud })
  registerShopRewardDisplay()
  registerRewardSchema("money", moneyRewardSchema)
  registerRewardSchema("sellable", sellableRewardSchema)
  registerRewardContribution(() => {
    const progression = useProgression()
    const inventory = useInventory()
    return {
      effects: {
        money: reward => progression.ledger.grant("money", moneyRewardSchema.parse(reward).amount),
        sellable: reward => inventory.addItem(sellableRewardSchema.parse(reward).itemId, 1),
      },
    }
  })
}
