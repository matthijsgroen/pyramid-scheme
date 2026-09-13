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

/**
 * THE ART OF A RANK, or the art every rank shares — and nothing else.
 *
 * `default/` is deliberately shared: one explorer walks all five tombs, one beetle scurries in them, one
 * flight of stairs is drawn for every rank. That is the only fallback a rank gets. A kind this rank has
 * not been painted has NO url here, and the caller decides what to do about it.
 *
 * `placeholder/` is not in that chain on purpose. A stand-in lives there rather than in a rank's folder
 * so it cannot pass as that rank's art to anything that asks "is this drawn yet" — which is what let
 * `companionProps` place crystals it was written never to place (its rule 3), on ranks where every
 * crystal is a dummy. Ask `tileOrPlaceholder` when you mean "draw something"; ask this when you mean
 * "is it painted".
 */
export const tileUrl = (tier: Difficulty, name: string): string | undefined =>
  byTier.get(`${tier}/${name}`) ?? byTier.get(`default/${name}`)

/** The stand-in for a kind nobody has painted yet: flat shapes from `yarn generate-dummy-tiles`, one set
 * for every rank, so a layer can be built and judged before its art exists. */
export const placeholderUrl = (name: string): string | undefined => byTier.get(`placeholder/${name}`)

/** What to DRAW for a kind: this rank's art, the shared art, or the stand-in — in that order. The map
 * draws what a floor was authored to hold whether or not it is painted yet; what it must not do is add
 * MORE of a kind because a dummy exists (see `tileUrl`). */
export const tileOrPlaceholder = (tier: Difficulty, name: string): string | undefined =>
  tileUrl(tier, name) ?? placeholderUrl(name)

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
  if (own.length > 0) return own
  const shared = forTier("default")
  if (shared.length > 0) return shared
  const stand = placeholderUrl(name)
  return stand ? [stand] : []
}

/** The five kinds a god can be depicted on. Everything else ignores the patron entirely — a jar rack does
 * not belong to Anubis, and a patron that changed the rubble would be a theme, not a dedication. */
/** The five kinds a god can be DEPICTED on. Exported because `SiteMapView` reads it to recognise a
 * dedicated site's shrine room — a room whose prop AND wall item are both patron kinds, which the
 * assembler dresses that way and nothing else does. */
export const PATRON_KINDS = new Set<string>(["statue", "shrine", "wallShrine", "stela", "mask"])

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
  (patron && PATRON_KINDS.has(name) ? byTier.get(`${tier}/${name}-${patron}`) : undefined) ??
  tileOrPlaceholder(tier, name)

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
export const sharedTileUrl = (name: string): string | undefined => byTier.get(`default/${name}`) ?? placeholderUrl(name)

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
