import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import type { HasLine } from "@/app/fez/arrivalConversation"
import { portraitFor } from "@/app/fez/portraits"
import type { OccupantOf, RoomOccupant } from "@/app/SiteMap/roomOccupants"
import { sharedTileFrames } from "@/app/SiteMap/tileAssets"
import { CONVERSATION_META } from "@/mods/story/game/conversation/meta"
import { ghostOf } from "@/mods/story/game/conversation/ghostOf"
import { sceneOfRoom } from "@/mods/story/game/conversation/sceneFor"

/** A ghost's map figure, `default/ghost-<speaker>` — queued in docs/instructions/repaint-queue.md. */
const figureOf = (speaker: string): string | undefined => sharedTileFrames(`ghost-${speaker}`)[0]

/**
 * Who stands in a conversation room: the ghost who speaks in its scene, if one does.
 *
 * Drawn as their map figure once one is painted; until then, as their conversation portrait's face frame —
 * the same person the player will hear, and plainly not map art.
 */
export const ghostOccupant = (
  scene: string | undefined,
  hasLine: HasLine,
  figure: (speaker: string) => string | undefined = figureOf
): RoomOccupant | undefined => {
  const ghost = scene && ghostOf(scene, hasLine)
  if (!ghost) return undefined
  const painted = figure(ghost)
  if (painted) return { id: ghost, src: painted, kind: "sprite", translucent: true }
  const portrait = portraitFor(ghost, "default")
  return portrait ? { id: ghost, src: portrait.src, kind: "bust", wide: portrait.wide, translucent: true } : undefined
}

/** The story mod's contribution to the map: every conversation room shows who is in it. */
export const useGhostOccupants = (journeyId: string): OccupantOf => {
  const { i18n } = useTranslation("fez")
  const language = i18n?.language
  return useCallback(
    cell =>
      cell.family === CONVERSATION_META.id
        ? ghostOccupant(sceneOfRoom(journeyId, cell.encounterArgs), key => i18n?.exists?.(key, { ns: "fez" }) === true)
        : undefined,
    // The language is a dependency because what exists is read through it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [journeyId, i18n, language]
  )
}
