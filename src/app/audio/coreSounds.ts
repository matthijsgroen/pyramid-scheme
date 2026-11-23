import { registerSound } from "./soundRegistry"
import { JOURNEY_COMPLETE, LEVEL_COMPLETE, SOLVED } from "./tones"

export const CORE_SOUNDS = {
  puzzleSolved: "puzzle.solved",
  levelComplete: "level.complete",
  journeyComplete: "journey.complete",
  sequenceStep: "sequence.step",
  sequenceWrong: "sequence.wrong",
  lockSolved: "lock.solved",
} as const

/** The name a mod registers its find's sound under. */
export const rewardSound = (rewardType: string): string => `reward:${rewardType}`

registerSound(CORE_SOUNDS.puzzleSolved, SOLVED)
registerSound(CORE_SOUNDS.levelComplete, LEVEL_COMPLETE)
registerSound(CORE_SOUNDS.journeyComplete, JOURNEY_COMPLETE)
