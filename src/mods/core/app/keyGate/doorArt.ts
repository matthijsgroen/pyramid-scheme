import type { Difficulty } from "@/data/difficultyLevels"

// A shut door's painted picture, `<name>.webp` in the doors folder: a ward gate's is `ward-<tier>`, the
// colour door's `colour`. Dropping the file in is what puts it on screen; until then the popup shows none.
const FILES = import.meta.glob("../../../../assets/doors/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>

const ART = new Map(Object.entries(FILES).map(([path, url]) => [path.replace(/^.*\/([^/]+)\.webp$/, "$1"), url]))

/** The painted door for a ward gate of this tier, or for the colour door when there is no tier. */
export const doorArt = (wardTier: Difficulty | undefined): string | undefined =>
  ART.get(wardTier ? `ward-${wardTier}` : "colour")
