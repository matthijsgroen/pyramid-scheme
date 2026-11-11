import { use, useEffect, useState } from "react"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { READING_META } from "@/mods/story/game/reading/meta"
import { canRepair, legible, wallFor, type Wall } from "@/mods/story/game/reading/walls"
import { useHieroglyphProgress } from "@/mods/hieroglyph/app/useHieroglyphProgress"
import { FezContext } from "@/app/fez/context"
import { WallScreen } from "./WallScreen"

/** Long enough to see the sign put right before the scene covers it: the panel's crossfade. */
const SWAP_MS = 800

const reducedMotion = () =>
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

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
  const fez = use(FezContext)
  const { completedHieroglyphKeys } = useHieroglyphProgress()
  const [picked, setPicked] = useState<string | null>(null)

  const wall: Wall | undefined = wallFor(ctx.journeyId)

  useEffect(() => {
    journeys.markCellExplored(ctx.address)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per room instance
  }, [ctx.edgeId])

  useEffect(() => {
    if (!wall) onCancel()
  }, [wall, onCancel])

  const fixed = wall !== undefined && picked === wall.answer
  useEffect(() => {
    if (!wall || !fixed) return
    const play = () => fez.showConversation(wall.after, () => onCancel(), { story: true, forceReplay: true })
    if (reducedMotion()) return play()
    const timer = setTimeout(play, SWAP_MS)
    return () => clearTimeout(timer)
  }, [fixed, wall, fez, onCancel])

  if (!wall) return null

  // Only signs the player has finished are offered — the tray IS what they can read.
  const owned = [...completedHieroglyphKeys].map(key => key.replace("hieroglyph:", ""))

  return (
    <WallScreen
      wall={wall}
      known={legible(wall, completedHieroglyphKeys)}
      repairable={canRepair(wall, completedHieroglyphKeys)}
      owned={owned}
      picked={picked}
      onPut={setPicked}
      onBack={onCancel}
    />
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
