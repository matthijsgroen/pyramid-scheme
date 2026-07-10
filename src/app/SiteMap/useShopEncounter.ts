import { use, useCallback, useState } from "react"
import type { TreasureReward } from "@/game/siteTypes"
import type { ProgressionAPI } from "@/app/state/useProgression"
import type { JourneyAPI } from "@/app/state/useJourneys"
import type { useInventory } from "@/app/Inventory/useInventory"
import { FezContext } from "@/app/fez/context"
import { CONSUMABLE_PRICES, CONSUMABLE_STOCK_PER_VISIT } from "@/data/shopPricing"
import { sellValueForItemId } from "@/data/sellables"

const freshStock = () => ({
  bandage: CONSUMABLE_STOCK_PER_VISIT,
  oil: CONSUMABLE_STOCK_PER_VISIT,
  trapTool: CONSUMABLE_STOCK_PER_VISIT,
})

// Everything a shop-priced room in SiteMapScreen needs — state, purchase/sell logic, and the
// Fez-greeting-then-open flow — pulled out of the click-handling switch so shop is one hook
// call instead of five entangled pieces of state/handlers living directly in the screen.
export const useShopEncounter = (
  journeyId: string,
  progression: ProgressionAPI,
  inventory: ReturnType<typeof useInventory>,
  journeys: JourneyAPI,
  applyReward: (reward: TreasureReward) => void
) => {
  const fez = use(FezContext)
  const [activeShop, setActiveShop] = useState<{
    edgeId: string
    reward: TreasureReward
    price: number
    purchased: boolean
  } | null>(null)
  const [shopStock, setShopStock] = useState(freshStock)

  const openShop = useCallback(
    (edgeId: string, reward: TreasureReward, price: number, resetStock: boolean) => {
      if (resetStock) setShopStock(freshStock())
      const purchased = journeys.hasPurchasedShop(journeyId, edgeId)
      fez.showConversation("shopArrival", () => setActiveShop({ edgeId, reward, price, purchased }))
    },
    [fez, journeys, journeyId]
  )

  const handleShopBuyRare = useCallback(() => {
    setActiveShop(current => {
      if (!current || current.purchased) return current
      if (!progression.spendMoney(current.price)) return current
      applyReward(current.reward)
      journeys.markShopPurchased(current.edgeId)
      return { ...current, purchased: true }
    })
  }, [progression, applyReward, journeys])

  const handleShopBuyConsumable = useCallback(
    (type: keyof typeof CONSUMABLE_PRICES) => {
      if (shopStock[type] <= 0) return
      if (!progression.spendMoney(CONSUMABLE_PRICES[type])) return
      const added = progression.addConsumable(type)
      if (!added) {
        progression.addMoney(CONSUMABLE_PRICES[type]) // pack was full — refund
        return
      }
      setShopStock(prev => ({ ...prev, [type]: prev[type] - 1 }))
    },
    [progression, shopStock]
  )

  const handleShopBuy = useCallback(
    (id: string) => {
      if (id === "rare") handleShopBuyRare()
      else if (id === "bandage" || id === "oil" || id === "trapTool") handleShopBuyConsumable(id)
    },
    [handleShopBuyRare, handleShopBuyConsumable]
  )

  const handleShopSell = useCallback(
    (id: string) => {
      const value = sellValueForItemId(id)
      if (value <= 0) return
      inventory.removeItem(id, 1)
      progression.addMoney(value)
    },
    [inventory, progression]
  )

  const closeShop = useCallback(() => setActiveShop(null), [])

  return { activeShop, shopStock, openShop, handleShopBuy, handleShopSell, closeShop }
}
