export const difficulties = ["starter", "junior", "expert", "master", "wizard"] as const

export type Difficulty = (typeof difficulties)[number]

export const difficultyCompare = (a: Difficulty, b: Difficulty): number =>
  difficulties.indexOf(a) - difficulties.indexOf(b)
