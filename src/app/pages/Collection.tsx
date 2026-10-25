import type { FC } from "react"
import { use, useEffect, useId, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { HieroglyphTile } from "@/ui/molecules/HieroglyphTile"
import { useInventory } from "@/app/Inventory/useInventory"
import { FezContext } from "../fez/context"
import { DevelopContext } from "@/contexts/DevelopMode"
import { DeveloperButton } from "@/ui/atoms/DeveloperButton"
import { DifficultyPill } from "@/ui/atoms/DifficultyPill"
import { CollectionTabs } from "@/ui/molecules/CollectionTabs"
import { collectionSections, type CollectionItem } from "./collectionSectionRegistry"
import { useCollectionNews } from "./useCollectionNews"
// Side-effect: registers every enabled mod's Collection section into the registry
import "@/mods/registerModApps"

const DetailPanel: FC<{
  item: CollectionItem | null
  debug?: boolean
  onAdd?: () => void
}> = ({ item, debug = false, onAdd }) => {
  const { t } = useTranslation("common")
  // The difficulty comes from the section that owns the item; core resolves no mod content itself.
  const difficulty = item?.difficulty ?? null

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
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null)
  const { t } = useTranslation("common")
  const { inventory, addItem } = useInventory()
  const { isDevelopMode } = use(DevelopContext)
  const panelId = useId()
  const { tabs, markTabSeen } = useCollectionNews()
  const [picked, setPicked] = useState<string | undefined>()
  // What was new in the open tab when it opened: its badges stay while the player looks.
  const [opened, setOpened] = useState<{ tab: string; ids: readonly string[] }>({ tab: "", ids: [] })

  const { showConversation } = use(FezContext)

  useEffect(() => {
    if (inventory && Object.keys(inventory).length > 0) {
      showConversation("collectionIntro")
    }
  }, [inventory, showConversation])

  const shown = tabs.filter(tab => tab.shown)
  const current = shown.find(tab => tab.id === picked) ?? shown.find(tab => tab.newIds.length > 0) ?? shown[0]
  // Once every tab has read its save the first tab with news is the one that opens; until then nothing
  // is new yet, and what is chosen first must not stay chosen.
  if (!picked && current && shown.every(tab => tab.ready)) setPicked(current.id)
  if (current?.ready && opened.tab !== current.id) setOpened({ tab: current.id, ids: current.newIds })

  // Leaving a tab, and closing the page, marks what the open tab showed as seen. The latest values are
  // kept in a ref for the unmount, which strict mode simulates once: only a real unmount marks.
  const latest = useRef({ current: current?.id, markTabSeen })
  const closing = useRef(false)
  useEffect(() => {
    latest.current = { current: current?.id, markTabSeen }
  })
  useEffect(() => {
    closing.current = false
    return () => {
      closing.current = true
      queueMicrotask(() => {
        const { current: open, markTabSeen: mark } = latest.current
        if (closing.current && open) mark(open)
      })
    }
  }, [])

  const selectTab = (id: string) => {
    if (current && id !== current.id) {
      markTabSeen(current.id)
      setSelectedItem(null)
    }
    setPicked(id)
  }

  const section = collectionSections().find(entry => entry.id === current?.id)
  const newInTab = current?.id === opened.tab ? opened.ids : []

  return (
    <div className="flex size-full flex-col gap-3">
      {section && current && (
        <CollectionTabs
          tabs={shown.map(tab => ({
            id: tab.id,
            label:
              tab.newIds.length > 0
                ? t("collection.tabNew", { label: tab.label, count: tab.newIds.length })
                : tab.label,
          }))}
          selected={current.id}
          onSelect={selectTab}
          label={t("collection.tabsLabel")}
          panelId={panelId}
        />
      )}
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {section && current ? (
          <div className="pb-safe-bottom">
            {/* The open tab's section from a mod: it registers itself gated on its mod, so a tab drops
                out with its mod — core names none. */}
            <div role="tabpanel" id={panelId} aria-labelledby={`${panelId}-tab-${current.id}`} tabIndex={0}>
              <section.Component
                selectedItem={selectedItem}
                onSelect={setSelectedItem}
                isNew={id => newInTab.includes(id)}
                newLabel={t("collection.newLabel")}
              />
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-gray-700">{t("collection.empty")}</p>
        )}
        {/* Under a section whose tiles open details, whether or not the player holds the item: a finished
            hieroglyph is fragments and a tomb treasure is a held key, so gating this panel on the inventory
            left those tapping into silence. A section that shows everything itself, or no tab at all, has none. */}
        {section?.details && (
          <DetailPanel
            item={selectedItem}
            debug={isDevelopMode}
            onAdd={() => selectedItem && addItem(selectedItem?.id, 1)}
          />
        )}
      </div>
    </div>
  )
}
