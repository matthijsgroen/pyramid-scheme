/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { use, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { FEZ_SHOP_META } from "@/mods/shop/game/fezShop/meta"
import { useMergedRewardContributions } from "@/app/SiteMap/rewardContributions"
import { FezContext } from "@/app/fez/context"
import { FezShop, type ShopBuyItem } from "@/ui/organisms/FezShop"
import { rewardText } from "@/app/SiteMap/rewardDisplay"
import { priceFor } from "@/mods/shop/game/pricing"
import { getSellableById, sellValueForItemId } from "@/data/sellables"

// Fez's shop encounter — browsing/buying, never a solve/fail challenge, so it always
// closes via onCancel and never onSolved (which would auto-grant the node's rewards for free).
// Stock is the node's baked `rewards[]` (currency pieces + finite consumables), reached as
// ctx.stock. Each slot is bought once, tracked per-(edgeId, index) in journeys — sold-out stays
// sold-out (no per-visit refresh). The shop prices every slot via priceFor; the currency mods
// stay money-blind.
const ShopComponent: FamilyPlugin["Component"] = ({ ctx, progression, journeys, inventory, applyReward, onCancel }) => {
  const { t } = useTranslation(["common", "sellables"])
  const contributions = useMergedRewardContributions()
  const fez = use(FezContext)
  const [greeted, setGreeted] = useState(false)

  const stock = ctx.stock ?? []
  const claimed = journeys.getPurchasedShopSlots(ctx.journeyId)
  const balance = progression.ledger.get("money")
  const tier = ctx.difficulty ?? "starter"

  // Fez's greeting plays before the shop UI itself ever appears. The very first stall the player
  // reaches gets the longer one, where he owns up to the counter being his; every stall after that
  // gets the short greeting. No extra flag for "first ever" — a conversation already remembers
  // whether it has been told, and reports "seen-earlier" when it has.
  useEffect(() => {
    fez.showConversation("shopFirstVisit", result => {
      if (result === "complete" || result === "skipped") return setGreeted(true)
      fez.showConversation("shopArrival", () => setGreeted(true))
    })
  }, [fez])

  // Always explored on arrival, regardless of whether anything gets bought — a shop room
  // is a claim point, not a challenge; reaching it is enough to unlock corridors past it.
  useEffect(() => {
    journeys.markCellExplored(ctx.sectionHash, ctx.edgeId)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per room instance
  }, [ctx.edgeId])

  if (!greeted) return null

  // One buy path for every stock slot (currency piece or consumable alike): pay, apply, claim.
  const buySlot = (j: number) => {
    const item = stock[j]
    if (!item || claimed.has(`${ctx.edgeId}#${j}`)) return
    // canAccept before spend — a full consumable pack refuses now, so nothing is charged then lost.
    if (!contributions.canAccept(item)) return
    if (!progression.ledger.spend("money", priceFor(item, tier))) return
    applyReward(item)
    journeys.markShopSlotPurchased(ctx.edgeId, j)
  }

  // A slot renders once, split into the shop's two buy sections by reward type: consumables are
  // "supplies", everything else (fragments/mosaic/map pieces) is "rare". Sold-out = already bought
  // OR already owned (skip = nothing to grant) — mirrors the compass dropping an owned fragment.
  const rareItems: ShopBuyItem[] = []
  const consumables: ShopBuyItem[] = []
  stock.forEach((item, j) => {
    if (!item) return
    const price = priceFor(item, tier)
    const buyItem: ShopBuyItem = {
      id: String(j),
      ...rewardText(item, t),
      price,
      affordable: balance >= price,
      soldOut: claimed.has(`${ctx.edgeId}#${j}`) || contributions.skip(item),
    }
    if (item.type === "consumable") consumables.push(buyItem)
    else rareItems.push({ ...buyItem, featured: true })
  })

  const handleSell = (id: string) => {
    const value = sellValueForItemId(id)
    if (value <= 0) return
    inventory.removeItem(id, 1)
    progression.ledger.grant("money", value)
  }

  return (
    <FezShop
      isOpen
      title={t("shop.title")}
      balance={balance}
      balanceLabel={t("money.label")}
      dismissLabel={t("shop.dismiss")}
      buyLabel={t("shop.buy")}
      soldOutLabel={t("shop.soldOut")}
      sellLabel={t("shop.sell")}
      rareItemsLabel={t("shop.rareItems")}
      suppliesLabel={t("shop.supplies")}
      sellSectionLabel={t("shop.sellSection")}
      rareItems={rareItems}
      consumables={consumables}
      sellables={Object.entries(inventory.inventory).flatMap(([id, count]) => {
        const item = getSellableById(id)
        if (!item || !count) return []
        return [
          {
            id,
            itemName: t(`${id}.name`, { ns: "sellables" }),
            itemDescription: t(`${id}.description`, { ns: "sellables" }),
            icon: item.symbol,
            sellValue: sellValueForItemId(id),
            ownedCount: count,
          },
        ]
      })}
      onBuy={id => buySlot(Number(id))}
      onSell={handleSell}
      onDismiss={onCancel}
    />
  )
}

// Gated on the mod: registerModApps imports this file unconditionally (static side-effect), so
// the enablement check lives here — shop off → no plugin in the registry → a shop-tagged room
// resolves via the family-absence pass-through (SiteMapScreen) instead of rendering the shop.
if (isModEnabled("shop"))
  registerFamily({
    meta: FEZ_SHOP_META,
    generate: () => ({}),
    Component: ShopComponent,
  })
