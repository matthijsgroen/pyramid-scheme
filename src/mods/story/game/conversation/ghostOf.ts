import { GHOSTS, spokenLines, type HasLine, type Speaker } from "@/app/fez/arrivalConversation"

/**
 * The dead person standing in a conversation room: the first ghost who speaks in its scene.
 *
 * Read off the scene's own lines rather than listed per room, so a scene written for a new ghost puts that
 * ghost on the floor with no code. A scene only the living speak in (`tomb.expertB`, the meeting) has
 * nobody standing in it.
 */
export const ghostOf = (scene: string, hasLine: HasLine): Speaker | undefined =>
  spokenLines(scene, hasLine).find(line => GHOSTS.includes(line.speaker))?.speaker
