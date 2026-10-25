import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { registerHaulLines } from "@/app/home/haulLines"
import { registerDevGrants } from "@/app/dev/devActionContributions"
import { registerGateNeeds } from "@/app/pages/gateNeeds"
import { registerHeldKeysProvider } from "@/app/SiteMap/keyProviders"
import { registerCollectionSection } from "@/app/pages/collectionSectionRegistry"
import { registerRewardContribution } from "@/app/SiteMap/rewardContributions"
import { registerHudWidget } from "@/app/SiteMap/hudRegistry"
import { registerRewardSchema } from "@/app/SiteMap/rewardSchemas"
import { isModEnabled } from "@/mods/registeredMods"
import { useProgression } from "@/app/state/useProgression"
import { useInventory } from "@/app/Inventory/useInventory"
import { moneyRewardSchema, purchaseRewardSchema, sellableRewardSchema } from "@/mods/shop/game/rewardSchemas"
import { ShopCollectionSection } from "./ShopCollectionSection"
import { useShopTab } from "./collectionTab"
import { useShopHaulLines } from "./haulLines"
import { ShopHud } from "./ShopHud"
import { registerShopRewardDisplay } from "./rewardDisplay"
import { PURCHASES } from "@/mods/shop/game/purchases"
import { purchaseRewardContribution, usePurchases } from "./usePurchases"
import { usePurchaseGateNeeds } from "./gateNeeds"
import "./fezShop/plugin" // the Fez shop encounter family (self-gated)

// shop's app-side registration (side-effect), self-gated on the mod being enabled:
// - the Collection "junk" section (with shop off it never registers, matching the world-gen side
//   that places no junk when shop is off).
// - the HUD widget: the money balance (order after trap's health).
// - the reward text/display for money, sellable and purchase (synchronous stock text + the loot popup).
// - the purchase reward schema, so a world with an animal in Fez's stock loads.
// - the purchases: recorded in the shop's own save, held as their facts, and asked for by the gates they open.
// - the home haul: coins as one line, sellables one line per item.
// - the reward contribution: money is banked, a sellable is added to the inventory and a purchase is
//   recorded (the effects); a purchase already recorded is skipped, so Fez shows it sold out. The mod
//   owns the reward ids, core owns the money bucket + inventory it writes to.
if (isModEnabled("shop")) {
  registerCollectionSection({
    id: "shop",
    order: 30,
    Component: ShopCollectionSection,
    useTab: useShopTab,
    details: true,
  })
  registerHudWidget({ id: "shop", order: 10, Component: ShopHud })
  registerShopRewardDisplay()
  registerHaulLines(useShopHaulLines)
  registerRewardSchema("money", moneyRewardSchema)
  registerRewardSchema("sellable", sellableRewardSchema)
  registerRewardSchema("purchase", purchaseRewardSchema)
  registerRewardContribution(() => {
    const progression = useProgression()
    const inventory = useInventory()
    const purchases = purchaseRewardContribution(usePurchases())
    return {
      effects: {
        money: reward => progression.ledger.grant("money", moneyRewardSchema.parse(reward).amount),
        sellable: reward => inventory.addItem(sellableRewardSchema.parse(reward).itemId, 1),
        ...purchases.effects,
      },
      skip: purchases.skip,
    }
  })
  registerHeldKeysProvider(
    () => usePurchases().facts,
    () => usePurchases().loaded
  )
  registerGateNeeds(usePurchaseGateNeeds)
  registerDevGrants(() => {
    const { record } = usePurchases()
    const { t } = useTranslation("common")
    return useMemo(
      () => [
        {
          label: t("purchases.devGrant"),
          grant: () => {
            for (const purchase of PURCHASES) void record(purchase.id)
          },
        },
      ],
      [record, t]
    )
  })
}
