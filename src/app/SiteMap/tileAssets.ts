import type { Difficulty } from "@/data/difficultyLevels"

// Every tile is one file, the filename is the key, and a missing one simply resolves to undefined
// so the caller can fall back (docs/game-design/spritesheet-renderer-prep.md, "The art itself").
// The glob means adding art is dropping a PNG in — no manifest to keep by hand.
const urls = import.meta.glob("../../assets/tiles/*/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>

const byTier = new Map<string, string>()
for (const [path, url] of Object.entries(urls)) {
  const match = /\/tiles\/([^/]+)\/([^/]+)\.png$/.exec(path)
  if (match) byTier.set(`${match[1]}/${match[2]}`, url)
}

/** `undefined` when that tier has no art of its own for the name — the caller falls back to
 * `default`, and then to the placeholder glyph. */
export const tileUrl = (tier: Difficulty, name: string): string | undefined =>
  byTier.get(`${tier}/${name}`) ?? byTier.get(`default/${name}`)
