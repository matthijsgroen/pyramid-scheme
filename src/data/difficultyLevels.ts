export const difficulties = ["starter", "junior", "expert", "master", "wizard"] as const

export type Difficulty = (typeof difficulties)[number]

export const difficultyCompare = (a: Difficulty, b: Difficulty): number =>
  difficulties.indexOf(a) - difficulties.indexOf(b)

/** The tier development builds open up to: every authored tier, for the work in progress. */
const DEVELOPMENT_DIFFICULTY: Difficulty = "expert"

/**
 * The hardest tier a build ships playable content for, from the build's own environment. The release
 * workflow names it (`VITE_LAST_RELEASED_DIFFICULTY`), so what a release opens is decided where the release
 * is made; development and preview builds name nothing and open every authored tier. A name that is not a
 * tier fails the build rather than ship the wrong world.
 */
export const releasedDifficulty = (fromBuild: string | undefined): Difficulty => {
  if (fromBuild === undefined || fromBuild === "") return DEVELOPMENT_DIFFICULTY
  if (!(difficulties as readonly string[]).includes(fromBuild))
    throw new Error(`VITE_LAST_RELEASED_DIFFICULTY is "${fromBuild}", which is not a tier`)
  return fromBuild as Difficulty
}

// Tiers past it stay shut even when the player holds their unlock key; the world itself is generated in
// full, so ward gates those keys open in earlier tiers still work.
export const LAST_RELEASED_DIFFICULTY: Difficulty = releasedDifficulty(
  import.meta.env?.VITE_LAST_RELEASED_DIFFICULTY as string | undefined
)

export const isDifficultyReleased = (difficulty: Difficulty): boolean =>
  difficultyCompare(difficulty, LAST_RELEASED_DIFFICULTY) <= 0

// A ward key id is `<difficulty>_<wing>_<n>` (e.g. "junior_a_2"), so its prefix is the tier the
// gate it opens belongs to. Used to tint/describe a ward gate by its key's difficulty. Returns
// undefined for anything that isn't a tier-prefixed key (e.g. a floor-key color id).
export const wardKeyDifficulty = (keyId: string | undefined): Difficulty | undefined => {
  const prefix = keyId?.split("_")[0] as Difficulty | undefined
  return prefix && (difficulties as readonly string[]).includes(prefix) ? prefix : undefined
}
