/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { use, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { FEZ_SHOP_META } from "@/mods/shop/game/fezShop/meta"
import { useMergedRewardContributions } from "@/app/SiteMap/rewardContributions"
import { FezContext } from "@/app/fez/context"
import { useReportOnce } from "@/app/reactions/useReport"
import { FezShop, type ShopBuyItem } from "@/ui/organisms/FezShop"
import { rewardText } from "@/app/SiteMap/rewardDisplay"
import { priceFor } from "@/mods/shop/game/pricing"
import { buyStockSlot } from "./buyStockSlot"
import { getSellableById, sellValueForItemId } from "@/data/sellables"

// Fez's shop encounter — browsing/buying, never a solve/fail challenge, so it always
// closes via onCancel and never onSolved (which would auto-grant the node's rewards for free).
// Stock is the node's baked `rewards[]` (finite currency pieces), reached as ctx.stock. Each slot is
// bought once, tracked per-(edgeId, index) in journeys — sold-out stays sold-out
// (no per-visit refresh). The shop prices every slot via priceFor; the currency mods stay money-blind.
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
    journeys.markCellExplored(ctx.sectionHash, ctx.edgeId, ctx.address)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per room instance
  }, [ctx.edgeId])

  // Sold out = already bought OR skipped by its owning mod (an owned fragment, a recorded purchase, a
  // purchase the shop's save cannot keep).
  const soldOut = (j: number) => {
    const item = stock[j]
    return !item || claimed.has(`${ctx.address}!${j}`) || contributions.skip(item)
  }

  // The stall is open once Fez has greeted; what it shows for sale is told to whoever listens, once per room.
  useReportOnce(greeted ? ctx.address : undefined, {
    kind: "stockShown",
    journeyId: ctx.journeyId,
    rewards: stock.flatMap((item, j) => (item && !soldOut(j) ? [item] : [])),
  })

  if (!greeted) return null

  // One buy path for every stock slot: apply, pay, claim.
  const buySlot = (j: number) => {
    const item = stock[j]
    if (!item) return
    const price = priceFor(item, tier)
    buyStockSlot({
      price,
      balance,
      soldOut: soldOut(j),
      apply: () => applyReward(item),
      spend: () => progression.ledger.spend("money", price),
      claim: () => journeys.markShopSlotPurchased(ctx.address, j),
    })
  }

  // Every stock slot (fragments/mosaic/map pieces/purchases) renders once, in the shop's one buy list,
  // sold out by the same rule the buy path checks.
  const rareItems: ShopBuyItem[] = stock.flatMap((item, j) => {
    if (!item) return []
    const price = priceFor(item, tier)
    return [
      {
        id: String(j),
        ...rewardText(item, t),
        price,
        affordable: balance >= price,
        soldOut: soldOut(j),
        featured: true,
      },
    ]
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
      sellSectionLabel={t("shop.sellSection")}
      rareItems={rareItems}
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
