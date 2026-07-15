/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { use, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { FEZ_SHOP_META } from "@/mods/shop/game/fezShop/meta"
import { useModState } from "@/app/state/useModState"
import { useTrapProgress } from "@/mods/trap/app/useTrapProgress"
import { FezContext } from "@/app/fez/context"
import { FezShop } from "@/ui/organisms/FezShop"
import { rewardText } from "@/app/SiteMap/rewardDisplay"
import { CONSUMABLE_EMOJI } from "@/mods/trap/app/consumableEmoji"
import { CONSUMABLE_PRICES, CONSUMABLE_STOCK_PER_VISIT } from "@/data/shopPricing"
import { getSellableById, sellValueForItemId } from "@/data/sellables"

type ShopStock = { bandage: number; oil: number; trapTool: number }
type ShopModState = { stockByEdge: Record<string, ShopStock> }

const freshStock = (): ShopStock => ({
  bandage: CONSUMABLE_STOCK_PER_VISIT,
  oil: CONSUMABLE_STOCK_PER_VISIT,
  trapTool: CONSUMABLE_STOCK_PER_VISIT,
})

// Fez's shop encounter — browsing/buying, never a solve/fail challenge, so it always
// closes via onCancel and never onSolved (which would auto-grant ctx.reward for free).
const ShopComponent: FamilyPlugin["Component"] = ({ ctx, progression, journeys, inventory, applyReward, onCancel }) => {
  const { t } = useTranslation(["common", "sellables"])
  const trap = useTrapProgress() // consumables are trap-owned
  const fez = use(FezContext)
  const [greeted, setGreeted] = useState(false)
  const [modState, setModState] = useModState<ShopModState>("shop", { stockByEdge: {} })
  const stock = modState.stockByEdge[ctx.edgeId] ?? freshStock()
  const purchased = journeys.hasPurchasedShop(ctx.journeyId, ctx.edgeId)
  const reward = ctx.reward
  const price = ctx.price ?? 0

  // Fez's greeting conversation plays once, before the shop UI itself ever appears.
  useEffect(() => {
    fez.showConversation("shopArrival", () => setGreeted(true))
  }, [fez])

  // Always explored on arrival, regardless of whether anything gets bought — a shop room
  // is a claim point, not a challenge; reaching it is enough to unlock corridors past it.
  useEffect(() => {
    journeys.markCellExplored(ctx.sectionHash, ctx.edgeId)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per room instance
  }, [ctx.edgeId])

  // Stock refreshes only on a genuine re-entry — reopening while still standing here must
  // not refill it for free.
  useEffect(() => {
    if (ctx.freshArrival) {
      setModState(prev => ({ stockByEdge: { ...prev.stockByEdge, [ctx.edgeId]: freshStock() } }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per room instance
  }, [ctx.edgeId])

  // Boundary A: a shop's buyable pieces now arrive as ctx.stock (a rewards[] array), not a single
  // ctx.reward. Until the stock render + per-slot buy lands (step 6), stock is unpriced/empty, so the
  // rare list is empty and the shop shows only consumables + sellables. Render regardless of reward.
  if (!greeted) return null

  const buyRare = () => {
    if (!reward || purchased) return
    if (!progression.ledger.spend("money", price)) return
    applyReward(reward)
    journeys.markShopPurchased(ctx.edgeId)
  }

  const buyConsumable = (type: keyof typeof CONSUMABLE_PRICES) => {
    if (stock[type] <= 0) return
    if (!progression.ledger.spend("money", CONSUMABLE_PRICES[type])) return
    const added = trap.addConsumable(type)
    if (!added) {
      progression.ledger.grant("money", CONSUMABLE_PRICES[type]) // pack was full — refund
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
    progression.ledger.grant("money", value)
  }

  return (
    <FezShop
      isOpen
      title={t("shop.title")}
      balance={progression.ledger.get("money")}
      balanceLabel={t("money.label")}
      dismissLabel={t("shop.dismiss")}
      buyLabel={t("shop.buy")}
      soldOutLabel={t("shop.soldOut")}
      sellLabel={t("shop.sell")}
      rareItemsLabel={t("shop.rareItems")}
      suppliesLabel={t("shop.supplies")}
      sellSectionLabel={t("shop.sellSection")}
      rareItems={
        reward
          ? [
              {
                id: "rare",
                ...rewardText(reward, t),
                price,
                affordable: progression.ledger.get("money") >= price,
                soldOut: purchased,
                featured: true,
              },
            ]
          : []
      }
      consumables={(Object.keys(CONSUMABLE_PRICES) as (keyof typeof CONSUMABLE_PRICES)[]).map(type => ({
        id: type,
        itemName: t(`chest.consumable.${type}`),
        icon: CONSUMABLE_EMOJI[type],
        price: CONSUMABLE_PRICES[type],
        affordable: progression.ledger.get("money") >= CONSUMABLE_PRICES[type],
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

// Gated on the mod: registerModApps imports this file unconditionally (static side-effect), so
// the enablement check lives here — shop off → no plugin in the registry → a shop-tagged room
// resolves via the family-absence pass-through (SiteMapScreen) instead of rendering the shop.
if (isModEnabled("shop"))
  registerFamily({
    meta: FEZ_SHOP_META,
    generate: (_seed, ctx) => ({ reward: ctx.reward, price: ctx.price }),
    Component: ShopComponent,
  })
