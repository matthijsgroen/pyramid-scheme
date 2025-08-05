export const difficulties = [
  "starter",
  "junior",
  "expert",
  "master",
  "wizard",
] as const

export type Difficulty = (typeof difficulties)[number]
