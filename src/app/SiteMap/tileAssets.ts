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
 * Every drawing a tier has for one name: `<name>`, `<name>-2`, `<name>-3`, as far as they go.
 *
 * The same convention `sharedTileFrames` uses for animation frames, and for the same reason — adding one
 * is dropping a PNG in, with no manifest to keep by hand. What it buys is a kind with MORE THAN ONE
 * drawing: the brief's §5 asks for it so that a room does not have to mean one picture, and the merchant's
 * trade room is the case that wanted it first. Tomb painting shows goods sold out of big reed baskets set
 * on the floor as often as off a table, and both are the same statement — this is where they sold — so
 * they belong to one KIND rather than to two.
 *
 * A kind, not a pool: adding a variant FILE cannot move anything. `pickDressing` draws from the kind pool
 * and only the pool's LENGTH changes what lands where, so a second drawing of `offeringTable` reshuffles
 * nothing and needs no world regeneration. Which rooms show which drawing is a seeded layer on top, taken
 * from the cell's own position — see `Decoration`.
 *
 * Mixed tiers resolve per NAME and not per variant: a tier that draws none of its own falls back to
 * `default` wholesale, so a half-imported set never shows one rank's table beside another rank's baskets.
 */
export const tileVariants = (tier: Difficulty, name: string): string[] => {
  const forTier = (t: string): string[] => {
    const base = byTier.get(`${t}/${name}`)
    if (!base) return []
    const found = [base]
    for (let n = 2; ; n++) {
      const url = byTier.get(`${t}/${name}-${n}`)
      if (!url) break
      found.push(url)
    }
    return found
  }
  const own = forTier(tier)
  return own.length > 0 ? own : forTier("default")
}

/** The five kinds a god can be depicted on. Everything else ignores the patron entirely — a jar rack does
 * not belong to Anubis, and a patron that changed the rubble would be a theme, not a dedication. */
const PATRON_KINDS = new Set<string>(["statue", "shrine", "wallShrine", "stela", "mask"])

/**
 * The tile for a kind in a site dedicated to a god: `<kind>-<patron>` where that file exists, and the
 * rank's generic drawing where it does not.
 *
 * The OTHER HALF of `tileVariants`, and the difference is worth stating because they look alike. That one
 * picks between drawings by cell position, which buys variety and cannot be aimed; this one is AUTHORED,
 * so a pyramid can say whose tomb it is and have every statue in it agree. Variety and dedication are
 * different things and a site wants both.
 *
 * FALLING BACK IS THE NORMAL CASE, not an error path. No patron art exists yet, so today this returns the
 * generic drawing every time — which means a rank's generic kind is in effect its DEFAULT GOD, and the
 * priest's Anubis statue serves an Anubis pyramid and a Ma'at one alike until a second god is painted.
 * That is the decided behaviour rather than a gap (see the handover's patron note), and it is why
 * authoring a patron today is safe: it cannot make a floor look worse than it already does.
 */
export const patronTileUrl = (tier: Difficulty, name: string, patron?: string): string | undefined =>
  (patron && PATRON_KINDS.has(name) ? byTier.get(`${tier}/${name}-${patron}`) : undefined) ?? tileUrl(tier, name)

/**
 * How the browser scales a tile — the ONE line that follows from whether the art is pixel art or painted.
 *
 * The set is PAINTED, generated well above map size and scaled down (docs/game-design/tile-art-brief.md,
 * "The style"). `"auto"` is what that wants: `"pixelated"` would render a painted tile crunchy, and the art
 * would get blamed for the filter over it. Smooth zoom stays smooth, which is what a painted set prefers
 * anyway.
 */
export const ART_IMAGE_RENDERING = "auto"

/** Art that is the same in every tomb, from `tiles/default/`. The explorer is one person walking down
 * five ranks of tomb, not a fifth of a set — a rank dresses the place, never the player. */
export const sharedTileUrl = (name: string): string | undefined => byTier.get(`default/${name}`)

/**
 * The frames of one animation, in order: `<prefix>-1`, `<prefix>-2`, … as far as they go. A single
 * `<prefix>` with no number is a one-frame animation, which is what the placeholder set is and what any
 * half-imported set is on the way in — so a facing with three frames drawn and a facing with one both work
 * without anything being declared anywhere. Adding a frame is dropping a file in.
 */
export const sharedTileFrames = (prefix: string): string[] => {
  const frames: string[] = []
  for (let n = 1; ; n++) {
    const url = byTier.get(`default/${prefix}-${n}`)
    if (!url) break
    frames.push(url)
  }
  if (frames.length > 0) return frames
  const single = byTier.get(`default/${prefix}`)
  return single ? [single] : []
}
