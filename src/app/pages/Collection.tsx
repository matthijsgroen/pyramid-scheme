import type { FC } from "react"
import { use, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Page } from "@/ui/atoms/Page"
import { HieroglyphTile } from "@/ui/molecules/HieroglyphTile"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { useInventory } from "@/app/Inventory/useInventory"
import { FezContext } from "../fez/context"
import { DevelopContext } from "@/contexts/DevelopMode"
import { DeveloperButton } from "@/ui/atoms/DeveloperButton"
import { DifficultyPill } from "@/ui/atoms/DifficultyPill"
import { collectionSections, type CollectionItem } from "./collectionSectionRegistry"
// Side-effect: registers every enabled mod's Collection section into the registry
import "@/mods/registerModApps"

const DetailPanel: FC<{
  item: CollectionItem | null
  debug?: boolean
  onAdd?: () => void
}> = ({ item, debug = false, onAdd }) => {
  const { t } = useTranslation("common")
  // A section may hand its item a known difficulty (mod-owned content); otherwise derive from the id.
  const difficulty = item ? (item.difficulty ?? getItemFirstLevel(item.id)) : null

  return (
    <div className="sticky bottom-0 min-h-fit rounded-lg bg-white/70 p-4 shadow-lg backdrop-blur-sm">
      {item ? (
        <div className="flex flex-col items-start gap-4">
          <div className="flex flex-row items-start gap-3">
            {/* A tile needs a difficulty to pick its stone; an item whose section carries none and
                whose id isn't a hieroglyph shows its plain symbol rather than taking the page down
                with it — HieroglyphTile throws on a symbol with no difficulty. */}
            <div className="flex-shrink-0">
              {difficulty ? (
                <HieroglyphTile symbol={item.symbol} difficulty={difficulty} size="lg" disabled={false} />
              ) : (
                <span className="font-mono text-4xl">{item.symbol}</span>
              )}
            </div>
            <div className="flex flex-col">
              <h3 className="font-pyramid text-xl font-bold text-gray-900">{item.name}</h3>
              {difficulty && (
                <p>
                  <DifficultyPill difficulty={difficulty} label={t(`difficulty.${difficulty}`)} />
                </p>
              )}
              <p className="leading-relaxed text-gray-700">{item.description}</p>
              {item.effectDescription && (
                <p className="mt-1 font-serif text-sm text-amber-700 italic">{item.effectDescription}</p>
              )}
              {debug && (
                <div>
                  <DeveloperButton onClick={onAdd} label="Add Item" />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center">
          <span className="mb-2 text-4xl">👆</span>
          <p className="text-gray-600">{t("collection.clickForDetails")}</p>
        </div>
      )}
    </div>
  )
}

export const CollectionPage: FC = () => {
  const { t } = useTranslation("common")
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null)
  const { inventory, addItem } = useInventory()
  const { isDevelopMode } = use(DevelopContext)

  const { showConversation } = use(FezContext)

  useEffect(() => {
    if (inventory && Object.keys(inventory).length > 0) {
      showConversation("collectionIntro")
    }
  }, [inventory, showConversation])

  const handleItemClick = (item: CollectionItem) => {
    setSelectedItem(item)
  }

  return (
    <Page className="flex bg-gradient-to-b from-blue-100 to-blue-300" snap="center">
      <div className="relative flex-1 overflow-y-auto p-6">
        <h1 className="mb-6 text-center font-pyramid text-3xl font-bold text-purple-900">{t("collection.title")}</h1>

        <div className="space-y-6 pb-safe-bottom">
          {/* Mod-contributed sections (shop's junk category, hieroglyph's fragments, tomb treasures,
              …). Each
              registers itself gated on its mod, so a section drops out when its mod is toggled
              off — core names none here. */}
          {collectionSections().map(section => (
            <section.Component key={section.id} selectedItem={selectedItem} onSelect={handleItemClick} />
          ))}
        </div>
        {/* Always present: most of what the Collection shows isn't an inventory item at all — a
            finished hieroglyph is fragments, a tomb treasure is a held key, mosaic glass is a
            ledger count — so gating this panel on the inventory left those tapping into silence. */}
        <DetailPanel
          item={selectedItem}
          debug={isDevelopMode}
          onAdd={() => selectedItem && addItem(selectedItem?.id, 1)}
        />
      </div>
    </Page>
  )
}
