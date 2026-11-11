/**
 * What a ghost says when the player walks back into a room whose scene has already played.
 *
 * One line rather than the scene again: a quest giver, pointing at where their scene sent the player, then
 * asking how it went, then — once the story has moved on — a word in passing. Which state is read off the
 * save's heard conversations, so nothing here keeps state of its own.
 *
 * Keyed by the scene a room plays. Each list runs latest first and the first state whose `after` has been
 * heard wins; the last state has no condition. Every line is the ghost's alone (revisits.spec), so the
 * Fez-before-meeting gate never drops one.
 *
 * A gift owed comes before any of it (`giftDue`): a ghost whose formula wall the player has seen gives the
 * sign on the next visit, whatever state the story is in, and only then goes back to its lines. Each giver
 * has a state for after the gift, placed in the order the story reaches it.
 */
import { FORMULA, formulaGift, formulaHint, type FormulaRow } from "@/mods/story/game/reading/formula"

export type RevisitState = {
  /** A conversation id that must have been heard for this state to apply. */
  after?: string
  /** Conversation ids, each one line long; one is played. */
  lines: readonly string[]
}

export const REVISITS: Readonly<Record<string, readonly RevisitState[]>> = {
  "tomb.starter": [
    { after: "tomb.expert", lines: ["revisit.starter.later1", "revisit.starter.later2"] },
    { after: "formula.junior.gift", lines: ["revisit.starter.gave1"] },
    { after: "tomb.junior", lines: ["revisit.starter.paid1", "revisit.starter.paid2"] },
    { lines: ["revisit.starter.north1", "revisit.starter.north2"] },
  ],
  "tomb.junior": [
    { after: "tomb.master", lines: ["revisit.junior.later1"] },
    { after: "formula.expert.gift", lines: ["revisit.junior.gave1"] },
    { after: "tomb.expert", lines: ["revisit.junior.met1"] },
    { after: "tomb.juniorFixed", lines: ["revisit.junior.priest1", "revisit.junior.priest2"] },
    { lines: ["revisit.junior.wall1", "revisit.junior.wall2"] },
  ],
  "tomb.expert": [
    { after: "tomb.wizard", lines: ["revisit.expert.later1"] },
    { after: "formula.master.gift", lines: ["revisit.expert.gave1"] },
    { after: "tomb.master", lines: ["revisit.expert.king1"] },
    { lines: ["revisit.expert.seal1", "revisit.expert.seal2"] },
  ],
  "tomb.master": [
    { after: "reading.sphinx", lines: ["revisit.master.later1"] },
    { after: "formula.wizard.gift", lines: ["revisit.master.gave1"] },
    { after: "tomb.wizard", lines: ["revisit.master.rite1"] },
    { lines: ["revisit.master.priest1", "revisit.master.priest2"] },
  ],
  "tomb.wizard": [{ lines: ["revisit.wizard.later1", "revisit.wizard.later2"] }],
}

/** The lines a heard scene's ghost has for this moment in the story; none when nothing is written. */
export const revisitLines = (scene: string, heard: Readonly<Record<string, boolean>>): readonly string[] =>
  REVISITS[scene]?.find(state => state.after === undefined || heard[state.after] === true)?.lines ?? []

/** The gift a ghost owes on this visit: its scene heard, its wall seen (the hint heard), the gift not yet given. */
export const giftDue = (scene: string, heard: Readonly<Record<string, boolean>>): FormulaRow | undefined =>
  FORMULA.find(
    row => row.giver === scene && heard[scene] === true && heard[formulaHint(row)] === true && !heard[formulaGift(row)]
  )

/**
 * What a conversation room plays on this visit: the whole scene until it has been heard, then a gift owed,
 * then one line.
 * `pick` is a number in [0, 1) choosing among the state's lines.
 */
export const sceneOnVisit = (
  scene: string,
  heard: Readonly<Record<string, boolean>>,
  pick: () => number = Math.random
): string => {
  if (heard[scene] !== true) return scene
  const gift = giftDue(scene, heard)
  if (gift) return formulaGift(gift)
  const lines = revisitLines(scene, heard)
  return lines.length === 0 ? scene : lines[Math.floor(pick() * lines.length)]
}

/** A heard scene with no line written for coming back plays whole again: the room offers it as a replay. */
export const playsAgain = (scene: string, heard: Readonly<Record<string, boolean>>): boolean =>
  heard[scene] === true && revisitLines(scene, heard).length === 0
