import { useTranslation } from "react-i18next"
import clsx from "clsx"
import type { Wall } from "@/mods/story/game/reading/walls"
import { getInventoryItemById } from "@/mods/hieroglyph/game/symbolCatalogue"
import { WallPanel } from "./WallPanel"

type Props = {
  wall: Wall
  known: boolean[]
  repairable: boolean
  /** The signs the player has finished collecting: the tray. */
  owned: string[]
  picked: string | null
  onPut: (id: string) => void
  onBack: () => void
}

/** The copy line, the painted wall, and below it the tray of signs the player holds. */
export const WallScreen = ({ wall, known, repairable, owned, picked, onPut, onBack }: Props) => {
  const { t } = useTranslation("common")
  const fixed = picked === wall.answer

  return (
    <div className="flex h-full flex-col items-center gap-4 overflow-hidden bg-stone-900 px-4 pt-6 pb-4 text-amber-100">
      {/* Three lines held for the copy, so the panel does not jump when the shorter "fixed" line replaces it. */}
      <p className="min-h-[3lh] max-w-sm text-center text-sm">{t(`${wall.copy}.${fixed ? "fixed" : "wrong"}`)}</p>

      <WallPanel
        wall={wall}
        known={known}
        fixed={fixed}
        gapLabel={t(`${wall.copy}.gap`)}
        onGap={() => repairable && onPut(wall.answer)}
      />

      {!fixed && (
        <>
          <p className="text-center text-xs opacity-80">{t(`${wall.copy}.${repairable ? "pick" : "cannot"}`)}</p>
          {/* A scoured slot takes the sign the player holds, so there is nothing to choose between
              and no tray to show — see Wall.missing. */}
          {!wall.missing && (
            <div className="flex min-h-0 max-w-sm flex-1 flex-wrap content-start justify-center gap-2 overflow-y-auto">
              {owned.map(id => (
                <button
                  key={id}
                  onClick={() => onPut(id)}
                  className={clsx(
                    "size-12 rounded border-2 border-[#8a3a2a]/40 bg-[#e3cfa5] font-mono text-2xl text-[#24508f]",
                    picked === id && "border-rose-500"
                  )}
                >
                  {getInventoryItemById(id)?.symbol ?? "?"}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <button onClick={onBack} className="mt-auto shrink-0 rounded bg-amber-800 px-5 py-2 text-sm font-bold">
        {t("ui.back")}
      </button>
    </div>
  )
}
