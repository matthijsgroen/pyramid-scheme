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

/**
 * How the browser scales a tile — the ONE line that follows from whether the art is pixel art or painted,
 * and that question is not settled (docs/game-design/tile-art-brief.md, "The style is not decided").
 *
 * `"pixelated"` is right for art drawn at 1 tile = 1 cell = 56px: it keeps the pixels crisp instead of
 * blurring them as the map zooms. It is WRONG for a painted set drawn at 2x and scaled down — that comes
 * out crunchy, and worse, it would be crunchy while being judged. Flip this to `"auto"` the moment a
 * painted set goes in the folder, or the art gets blamed for the filter over it.
 */
export const ART_IMAGE_RENDERING = "pixelated"

/** Art that is the same in every tomb, from `tiles/default/`. The explorer is one person walking down
 * five ranks of tomb, not a fifth of a set — a rank dresses the place, never the player. */
export const sharedTileUrl = (name: string): string | undefined => byTier.get(`default/${name}`)
