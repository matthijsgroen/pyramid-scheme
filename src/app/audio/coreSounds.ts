export const CORE_SOUNDS = {
  puzzleSolved: "puzzle.solved",
  puzzleTapStone: "puzzle.tap.stone",
  puzzleTapWood: "puzzle.tap.wood",
  levelComplete: "level.complete",
  journeyComplete: "journey.complete",
  pyramidOpens: "pyramid.opens",
  corridorOpens: "corridor.opens",
  footstep: "walk.footstep",
  campfire: "camp.campfire",
  sequenceStep: "sequence.step",
  sequenceWrong: "sequence.wrong",
  platePressed: "plate.pressed",
  lockSolved: "lock.solved",
} as const

/** The name a mod registers its find's sound under. */
export const rewardSound = (rewardType: string): string => `reward:${rewardType}`

/** The name a family that acts on arrival (a lever) registers the sound of being thrown under. */
export const throwSound = (familyId: string): string => `throw:${familyId}`

/** The name a lock's stones register a move's sound under: lift, set, take or post. */
export const stoneMoveSound = (move: string): string => `stone:${move}`

/** The name a one-way or passage realisation registers the sound of taking it under. */
export const traversalSound = (realisation: string): string => `traversal:${realisation}`

/** The name a region barrier realisation registers the sound of opening under. */
export const barrierSound = (realisation: string): string => `barrier:${realisation}`
