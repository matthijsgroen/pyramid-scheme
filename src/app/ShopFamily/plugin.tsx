/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { use, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { useModState } from "@/app/state/useModState"
import { FezContext } from "@/app/fez/context"
import { FezShop } from "@/ui/organisms/FezShop"
import { rewardEmoji, rewardText } from "@/app/SiteMap/rewardDisplay"
import { CONSUMABLE_PRICES, CONSUMABLE_STOCK_PER_VISIT } from "@/data/shopPricing"
import { getSellableById, sellValueForItemId } from "@/data/sellables"

type ShopStock = { bandage: number; oil: number; trapTool: number }
type ShopModState = { stockByEdge: Record<string, ShopStock> }

const freshStock = (): ShopStock => ({
  bandage: CONSUMABLE_STOCK_PER_VISIT,
  oil: CONSUMABLE_STOCK_PER_VISIT,
  trapTool: CONSUMABLE_STOCK_PER_VISIT,
})

// Shop is presentational-and-transactional, not solve/fail — it never calls onSolved (that
// would auto-grant ctx.reward generically via core, which would give the rare item away for
// free instead of requiring payment). It marks its own room explored on arrival (matching
// treasure rooms' "always explored, regardless of what's inside" rule) and always closes via
// onCancel — same "self-handle, then onCancel" pattern as trap's disable bypass.
const ShopComponent: FamilyPlugin["Component"] = ({ ctx, progression, journeys, inventory, applyReward, onCancel }) => {
  const { t } = useTranslation(["common", "sellables"])
  const fez = use(FezContext)
  const [greeted, setGreeted] = useState(false)
  const [modState, setModState] = useModState<ShopModState>("shop", { stockByEdge: {} })
  const stock = modState.stockByEdge[ctx.edgeId] ?? freshStock()
  const purchased = journeys.hasPurchasedShop(ctx.journeyId, ctx.edgeId)
  const reward = ctx.reward
  const price = ctx.price ?? 0

  // Fez's greeting conversation plays once, before the shop UI itself ever appears —
  // matches today's openShop(...) sequencing exactly.
  useEffect(() => {
    fez.showConversation("shopArrival", () => setGreeted(true))
  }, [fez])

  // Always explored on arrival, regardless of whether anything gets bought — matches how
  // treasure rooms mark themselves explored the moment they're reached, independent of
  // their contents (SiteMapScreen.tsx's old "treasure" branch).
  useEffect(() => {
    journeys.markCellExplored(ctx.sectionHash, ctx.edgeId)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per room instance
  }, [ctx.edgeId])

  // Stock only refreshes on a genuine re-entry (the player traveled away and came back) —
  // otherwise closing and reopening the same shop while still standing in it would refill
  // consumable stock for free, indefinitely.
  useEffect(() => {
    if (ctx.freshArrival) {
      setModState(prev => ({ stockByEdge: { ...prev.stockByEdge, [ctx.edgeId]: freshStock() } }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per room instance
  }, [ctx.edgeId])

  if (!greeted || !reward) return null

  const buyRare = () => {
    if (purchased) return
    if (!progression.spendMoney(price)) return
    applyReward(reward)
    journeys.markShopPurchased(ctx.edgeId)
  }

  const buyConsumable = (type: keyof typeof CONSUMABLE_PRICES) => {
    if (stock[type] <= 0) return
    if (!progression.spendMoney(CONSUMABLE_PRICES[type])) return
    const added = progression.addConsumable(type)
    if (!added) {
      progression.addMoney(CONSUMABLE_PRICES[type]) // pack was full — refund
      return
    }
    setModState(prev => ({
      stockByEdge: { ...prev.stockByEdge, [ctx.edgeId]: { ...stock, [type]: stock[type] - 1 } },
    }))
  }

  const handleBuy = (id: string) => {
    if (id === "rare") buyRare()
    else if (id === "bandage" || id === "oil" || id === "trapTool") buyConsumable(id)
  }

  const handleSell = (id: string) => {
    const value = sellValueForItemId(id)
    if (value <= 0) return
    inventory.removeItem(id, 1)
    progression.addMoney(value)
  }

  return (
    <FezShop
      isOpen
      title={t("shop.title")}
      balance={progression.money}
      balanceLabel={t("money.label")}
      dismissLabel={t("shop.dismiss")}
      buyLabel={t("shop.buy")}
      soldOutLabel={t("shop.soldOut")}
      sellLabel={t("shop.sell")}
      rareItemsLabel={t("shop.rareItems")}
      suppliesLabel={t("shop.supplies")}
      sellSectionLabel={t("shop.sellSection")}
      rareItems={[
        {
          id: "rare",
          ...rewardText(reward, t),
          price,
          affordable: progression.money >= price,
          soldOut: purchased,
          featured: true,
        },
      ]}
      consumables={(Object.keys(CONSUMABLE_PRICES) as (keyof typeof CONSUMABLE_PRICES)[]).map(type => ({
        id: type,
        itemName: t(`chest.consumable.${type}`),
        icon: rewardEmoji(type),
        price: CONSUMABLE_PRICES[type],
        affordable: progression.money >= CONSUMABLE_PRICES[type],
        soldOut: stock[type] <= 0,
      }))}
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
      onBuy={handleBuy}
      onSell={handleSell}
      onDismiss={onCancel}
    />
  )
}

registerFamily({
  meta: { id: "fez-shop", ownerMod: "shop", tags: ["shop"], icon: "🛒", color: "amber" },
  generate: (_seed, ctx) => ({ reward: ctx.reward, price: ctx.price }),
  Component: ShopComponent,
})
