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
