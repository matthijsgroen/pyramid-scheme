import { registerSound } from "./soundRegistry"
import { JOURNEY_COMPLETE, LEVEL_COMPLETE, LOCK_SOLVED, scaleFrequency, SOLVED, WRONG_TONE } from "./tones"

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
registerSound(CORE_SOUNDS.sequenceStep, ({ note = 0 }) => [
  { frequency: scaleFrequency(note), start: 0, duration: 0.35, gain: 0.18, wave: "triangle" },
])
registerSound(CORE_SOUNDS.sequenceWrong, WRONG_TONE)
registerSound(CORE_SOUNDS.lockSolved, LOCK_SOLVED)
