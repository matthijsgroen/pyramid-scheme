import { useEffect, useState, type FC, type ReactNode } from "react"
import fezCocktail from "@/assets/cocktail-fez-250.png"
import { ShopPanel } from "@/ui/molecules/ShopPanel"
import { ShopItemCard } from "@/ui/atoms/ShopItemCard"
import { SellItemCard } from "@/ui/atoms/SellItemCard"

// ponytail: scroll distance (px) over which the portrait fully shrinks into the header thumbnail
const SHRINK_DISTANCE = 72

export type ShopBuyItem = {
  id: string
  itemName: string
  itemDescription?: string
  icon: ReactNode
  price: number
  affordable: boolean
  soldOut?: boolean
  featured?: boolean
}

export type ShopSellItem = {
  id: string
  itemName: string
  itemDescription?: string
  icon: ReactNode
  sellValue: number
  ownedCount: number
}

type Props = {
  isOpen: boolean
  title: string
  balance: number
  balanceLabel: string
  dismissLabel: string
  buyLabel: string
  soldOutLabel: string
  sellLabel: string
  rareItemsLabel: string
  suppliesLabel: string
  sellSectionLabel: string
  rareItems: ShopBuyItem[]
  consumables: ShopBuyItem[]
  sellables: ShopSellItem[]
  onBuy: (id: string) => void
  onSell: (id: string) => void
  onDismiss: () => void
}

export const FezShop: FC<Props> = ({
  isOpen,
  title,
  balance,
  balanceLabel,
  dismissLabel,
  buyLabel,
  soldOutLabel,
  sellLabel,
  rareItemsLabel,
  suppliesLabel,
  sellSectionLabel,
  rareItems,
  consumables,
  sellables,
  onBuy,
  onSell,
  onDismiss,
}) => {
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    if (!isOpen) setScrollProgress(0)
  }, [isOpen])

  return (
    <ShopPanel
      isOpen={isOpen}
      title={title}
      balance={balance}
      balanceLabel={balanceLabel}
      dismissLabel={dismissLabel}
      onDismiss={onDismiss}
      onBodyScroll={(scrollTop, maxScroll) => {
        const shrinkOver = Math.max(1, Math.min(SHRINK_DISTANCE, maxScroll))
        setScrollProgress(Math.min(scrollTop / shrinkOver, 1))
      }}
      headerExtra={
        <img
          src={fezCocktail}
          alt=""
          className="w-auto shrink-0 rounded-md transition-all duration-150"
          style={{ height: scrollProgress * 40, opacity: scrollProgress }}
        />
      }
      aboveScroll={
        <div
          className="flex shrink-0 justify-center overflow-hidden transition-all duration-150"
          style={{
            height: 176 * (1 - scrollProgress),
            opacity: 1 - scrollProgress,
            marginBottom: 8 * (1 - scrollProgress),
          }}
        >
          <img src={fezCocktail} alt="" className="h-44 w-auto" />
        </div>
      }
    >
      {rareItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold tracking-wide text-amber-400 uppercase">{rareItemsLabel}</p>
          {rareItems.map(item => (
            <ShopItemCard
              key={item.id}
              itemName={item.itemName}
              itemDescription={item.itemDescription}
              icon={item.icon}
              price={item.price}
              affordable={item.affordable}
              soldOut={item.soldOut}
              featured={item.featured}
              buyLabel={buyLabel}
              soldOutLabel={soldOutLabel}
              onBuy={() => onBuy(item.id)}
            />
          ))}
        </div>
      )}

      {consumables.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-xs font-bold tracking-wide text-amber-400 uppercase">{suppliesLabel}</p>
          {consumables.map(item => (
            <ShopItemCard
              key={item.id}
              itemName={item.itemName}
              itemDescription={item.itemDescription}
              icon={item.icon}
              price={item.price}
              affordable={item.affordable}
              soldOut={item.soldOut}
              buyLabel={buyLabel}
              soldOutLabel={soldOutLabel}
              onBuy={() => onBuy(item.id)}
            />
          ))}
        </div>
      )}

      {sellables.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-xs font-bold tracking-wide text-amber-400 uppercase">{sellSectionLabel}</p>
          {sellables.map(item => (
            <SellItemCard
              key={item.id}
              itemName={item.itemName}
              itemDescription={item.itemDescription}
              icon={item.icon}
              sellValue={item.sellValue}
              ownedCount={item.ownedCount}
              sellLabel={sellLabel}
              onSell={() => onSell(item.id)}
            />
          ))}
        </div>
      )}
    </ShopPanel>
  )
}
