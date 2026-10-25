import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import type { HasLine } from "@/app/fez/arrivalConversation"
import { portraitFor } from "@/app/fez/portraits"
import type { OccupantOf, RoomOccupant } from "@/app/SiteMap/roomOccupants"
import { sharedTileFrames } from "@/app/SiteMap/tileAssets"
import { CONVERSATION_META } from "@/mods/story/game/conversation/meta"
import { ghostOf } from "@/mods/story/game/conversation/ghostOf"
import { sceneOfRoom } from "@/mods/story/game/conversation/sceneFor"
import { useGameStorage } from "@/support/useGameStorage"

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

/**
 * The ghost standing in a room once its scene has been heard. Until then nobody stands there: the ghost comes out
 * during the scene itself, which plays the moment the player walks in.
 */
export const heardGhostOccupant = (
  scene: string | undefined,
  heard: Readonly<Record<string, boolean>>,
  hasLine: HasLine,
  figure?: (speaker: string) => string | undefined
): RoomOccupant | undefined => (scene && heard[scene] === true ? ghostOccupant(scene, hasLine, figure) : undefined)

/** The story mod's contribution to the map: every conversation room whose scene was heard shows who is in it.
 * Nobody stands anywhere until the save has loaded, so a heard ghost never flickers out and back. */
export const useGhostOccupants = (journeyId: string): OccupantOf => {
  const { i18n } = useTranslation("fez")
  const language = i18n?.language
  const [heard, , loaded] = useGameStorage<Record<string, boolean>>("conversations", {})
  return useCallback(
    cell =>
      loaded && cell.family === CONVERSATION_META.id
        ? heardGhostOccupant(
            sceneOfRoom(journeyId, cell.encounterArgs),
            heard,
            key => i18n?.exists?.(key, { ns: "fez" }) === true
          )
        : undefined,
    // The language is a dependency because what exists is read through it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [journeyId, i18n, language, heard, loaded]
  )
}
