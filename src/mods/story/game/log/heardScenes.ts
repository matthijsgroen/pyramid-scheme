import { JOURNEYS_WITH_ARRIVAL } from "@/app/fez/arrivalConversation"
import { TOMB_STRUCTURES, type JourneyTier } from "@/data/journeyStructure"
import { sceneFor } from "@/mods/story/game/conversation/sceneFor"

/** A scene in the log: where its lines live, and the journey it happened in. */
export type Scene = {
  /** The conversation id the save records, and the prefix this scene's first lines sit under. */
  id: string
  /** Names the row, through the `journeys` namespace — a beat is remembered as a place. */
  journeyId: string
  /**
   * Every conversation this scene is told in, in order.
   *
   * A scene interrupted by something the player DOES is two conversations — Henut asks for her wall
   * to be put right, the player puts it right, and she carries on. It is still one scene, and the
   * log shows it as one: two rows for one conversation would read as her saying it twice.
   */
  parts: string[]
}

const TIERS: JourneyTier[] = ["starter", "junior", "expert", "master", "wizard"]

/** Scenes that carry on after the player has done something, keyed by the part that opens them. */
const CONTINUES: Record<string, string[]> = { "tomb.junior": ["tomb.juniorFixed"] }

/**
 * Every story scene, in the order the story tells them: a tier's four pyramids, then its tombs.
 *
 * Both halves are read off the world rather than spelled out here — the pyramids from
 * `JOURNEYS_WITH_ARRIVAL`, the tombs from `TOMB_STRUCTURES` — because tiers do not hold the same
 * number of tombs (starter has one, wizard has three) and a list built by hand invents rooms that
 * do not exist.
 *
 * Authored order, not the save's. `conversations` is a plain map whose keys are the order beats were
 * PLAYED, so a player who left the tombs until last would find their log shuffled against the story
 * they actually heard.
 */
export const ALL_SCENES: Scene[] = TIERS.flatMap(tier => [
  ...[1, 2, 3, 4]
    .map(n => `${tier}_${n}`)
    .filter(journeyId => JOURNEYS_WITH_ARRIVAL.has(journeyId))
    .map(journeyId => ({ id: `arrival.${journeyId}`, journeyId, parts: [`arrival.${journeyId}`] })),
  ...TOMB_STRUCTURES.filter(tomb => tomb.tier === tier).flatMap(tomb => {
    const id = sceneFor(tomb.id)
    return id ? [{ id, journeyId: tomb.id, parts: [id, ...(CONTINUES[id] ?? [])] }] : []
  }),
])

/**
 * What the log shows: the story scenes this save has played, and nothing else.
 *
 * Built from the authored list rather than from whatever the save holds, which does two things at
 * once. A tutorial the player sat through is not something they would come back to read, and the
 * shop's greeting is not a memory — neither is in the list, so neither can leak in. And a scene not
 * yet heard is absent rather than greyed out: an empty row with a title on it is a spoiler.
 */
export const heardScenes = (played: Record<string, boolean>): Scene[] =>
  ALL_SCENES.filter(scene => played[scene.id] === true)
