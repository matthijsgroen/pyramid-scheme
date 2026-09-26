import { use, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import clsx from "clsx"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { READING_META } from "@/mods/story/game/reading/meta"
import { canRepair, legible, wallFor, type Wall } from "@/mods/story/game/reading/walls"
import { useHieroglyphProgress } from "@/mods/hieroglyph/app/useHieroglyphProgress"
import { getInventoryItemById } from "@/mods/hieroglyph/game/symbolCatalogue"
import { FezContext } from "@/app/fez/context"

const symbolOf = (id: string) => getInventoryItemById(id)?.symbol ?? "?"

/** A sign as cut into the wall: read if the player knows it, a shape if they do not. */
const Sign: FC<{ id: string; known: boolean; wrong: boolean }> = ({ id, known, wrong }) => (
  <span
    className={clsx(
      "flex size-14 items-center justify-center rounded border-2 text-3xl",
      wrong ? "border-rose-500 bg-rose-100 text-rose-900" : "border-amber-900/40 bg-amber-50 text-amber-950",
      !known && "opacity-40"
    )}
  >
    {symbolOf(id)}
  </span>
)

type FC<P> = (props: P) => React.ReactElement | null

/**
 * A wall with a sign cut wrong, and the player putting it right.
 *
 * The signs are the ones they have been collecting all game, so the wall is readable exactly as far
 * as they have got — and repairable only with a sign they hold. **Holding it is the whole gate.** A
 * player who does not have the right hieroglyph can look, and is told plainly that they cannot fix
 * it yet, rather than being refused by a room that says nothing.
 *
 * Never a fail state: the wall stays wrong, the room stays open, and they can come back.
 */
export const ReadingComponent: FamilyPlugin["Component"] = ({ ctx, journeys, onCancel }) => {
  const { t } = useTranslation("common")
  const fez = use(FezContext)
  const { completedHieroglyphKeys } = useHieroglyphProgress()
  const [picked, setPicked] = useState<string | null>(null)

  const wall: Wall | undefined = wallFor(ctx.journeyId)

  useEffect(() => {
    journeys.markCellExplored(ctx.sectionHash, ctx.edgeId, ctx.address)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per room instance
  }, [ctx.edgeId])

  useEffect(() => {
    if (!wall) onCancel()
  }, [wall, onCancel])

  if (!wall) return null

  const known = legible(wall, completedHieroglyphKeys)
  const repairable = canRepair(wall, completedHieroglyphKeys)
  const fixed = picked === wall.answer

  const put = (id: string) => {
    setPicked(id)
    if (id !== wall.answer) return
    fez.showConversation(wall.after, () => onCancel(), { story: true, forceReplay: true })
  }

  // Only signs the player has finished are offered — the tray IS what they can read.
  const owned = [...completedHieroglyphKeys].map(key => key.replace("hieroglyph:", ""))

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-stone-900 p-6 text-amber-100">
      <p className="max-w-sm text-center text-sm">{t(fixed ? "story.wall.fixed" : "story.wall.wrong")}</p>

      <div className="flex gap-2">
        {wall.cut.map((id, at) => (
          <Sign
            key={`${id}-${at}`}
            id={at === wall.wrongAt && fixed ? wall.answer : id}
            known={known[at] || (at === wall.wrongAt && fixed)}
            wrong={at === wall.wrongAt && !fixed}
          />
        ))}
      </div>

      {!fixed && (
        <>
          <p className="text-xs opacity-80">{t(repairable ? "story.wall.pick" : "story.wall.cannot")}</p>
          <div className="flex max-h-48 flex-wrap justify-center gap-2 overflow-y-auto">
            {owned.map(id => (
              <button
                key={id}
                onClick={() => put(id)}
                className={clsx(
                  "size-12 rounded border border-amber-200/40 bg-stone-800 text-2xl",
                  picked === id && "border-rose-400"
                )}
              >
                {symbolOf(id)}
              </button>
            ))}
          </div>
        </>
      )}

      <button onClick={onCancel} className="rounded bg-amber-800 px-5 py-2 text-sm font-bold">
        {t("ui.back")}
      </button>
    </div>
  )
}

// Gated on the mod: story off → no plugin → the room resolves through the family-absence
// pass-through and the floor stays walkable.
if (isModEnabled("story"))
  registerFamily({
    meta: READING_META,
    generate: () => ({}),
    Component: ReadingComponent,
  })
