import type { FC, ReactNode } from "react"
import fezCocktail from "@/assets/cocktail-fez-250.png"
import { ShopPanel } from "@/ui/molecules/ShopPanel"
import { ShopItemCard } from "@/ui/atoms/ShopItemCard"
import { SellItemCard } from "@/ui/atoms/SellItemCard"

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
}) => (
  <ShopPanel
    isOpen={isOpen}
    title={title}
    balance={balance}
    balanceLabel={balanceLabel}
    dismissLabel={dismissLabel}
    onDismiss={onDismiss}
  >
    <div className="mb-2 flex justify-center">
      <img src={fezCocktail} alt="" className="h-24 w-auto" />
    </div>

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
