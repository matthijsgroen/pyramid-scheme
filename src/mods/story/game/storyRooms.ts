import type { SiteConfig } from "@/game/siteTypes"
import { findEncounterRoom } from "@/game/encounterRoom"
import { CONVERSATION_META } from "./conversation/meta"
import { READING_META } from "./reading/meta"

/** A story room a develop-mode jump lands in, named by what is authored there rather than where the carve put it. */
export type StoryRoom = {
  label: string
  journeyId: string
  encounter: string
  levelNr?: number
  floor?: number
}

export const STORY_ROOMS: readonly StoryRoom[] = [
  // Fez is met on the ground floor of the game's first pyramid (story/review.md, The opening).
  { label: "Jump: Fez meeting", journeyId: "starter_1", encounter: CONVERSATION_META.id, levelNr: 1, floor: 0 },
  // sceneFor plays `tomb.starter` here, which is Ipi's.
  { label: "Jump: Ipi's tomb", journeyId: "starter_treasure_tomb", encounter: CONVERSATION_META.id },
  // wallFor's junior_treasure_tomb wall is Henut's name.
  { label: "Jump: Henut's wall", journeyId: "junior_treasure_tomb", encounter: READING_META.id },
]

/** Where a jump to `room` stands the explorer: the room itself, or — while no such room is authored — the
 * entrance of the site it is meant for, so the jump lands in the room the day it is placed. */
export const storyRoomPlace = (
  room: StoryRoom,
  sites: readonly SiteConfig[]
): { levelNr: number; address: string | null } => {
  const found = findEncounterRoom(sites, room.encounter, { levelNr: room.levelNr, floor: room.floor })
  return found ? { levelNr: found.levelNr, address: found.address } : { levelNr: room.levelNr ?? 1, address: null }
}
