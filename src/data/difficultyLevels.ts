export const difficulties = ["starter", "junior", "expert", "master", "wizard"] as const

export type Difficulty = (typeof difficulties)[number]

export const difficultyCompare = (a: Difficulty, b: Difficulty): number =>
  difficulties.indexOf(a) - difficulties.indexOf(b)

// The hardest tier this release ships playable content for. Tiers past it stay shut even when the
// player holds their unlock key; the world itself is generated in full, so ward gates those keys
// open in earlier tiers still work. Raise it when the next tier's content is authored.
export const LAST_RELEASED_DIFFICULTY: Difficulty = "expert"

export const isDifficultyReleased = (difficulty: Difficulty): boolean =>
  difficultyCompare(difficulty, LAST_RELEASED_DIFFICULTY) <= 0

// A ward key id is `<difficulty>_<wing>_<n>` (e.g. "junior_a_2"), so its prefix is the tier the
// gate it opens belongs to. Used to tint/describe a ward gate by its key's difficulty. Returns
// undefined for anything that isn't a tier-prefixed key (e.g. a floor-key color id).
export const wardKeyDifficulty = (keyId: string | undefined): Difficulty | undefined => {
  const prefix = keyId?.split("_")[0] as Difficulty | undefined
  return prefix && (difficulties as readonly string[]).includes(prefix) ? prefix : undefined
}
