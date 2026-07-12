import type { CappedCurrency } from "@/worldGen/placeFragments"

// The mosaic-piece currency — mod-owned capped filler. Mosaic never gates progress, so it's
// not on the reachability worklist (unlike map pieces / hieroglyph fragments); it's placed by
// placeFragments' phase-3 capped pass, spread across whatever loot nodes the gating currencies
// left free. Any loot node can hold a mosaic piece; a slot tagged `prefers: mosaicPiece` is a
// soft ranking boost, not an exclusive claim. See docs/mods/TARGET.md rule 2.

export const MOSAIC_BUCKET = "mosaicPiece"

// How many mosaic pieces exist in the world. Mod-owned — core holds no per-mod target
// (docs/mods/TARGET.md rule 2). Must equal LEVEL_STEPS.length (src/ui/atoms/mosaicRevealOrder.ts):
// the reveal is count-based (MosaicPage clamps to min(collected, LEVEL_STEPS.length)), so any
// piece beyond this reveals nothing.
export const MOSAIC_TOTAL = 298

export const MOSAIC_CURRENCY: CappedCurrency = {
  bucket: MOSAIC_BUCKET,
  toReward: () => ({ type: "mosaicPiece" }),
  totalRequired: () => MOSAIC_TOTAL,
  // Tagged slots first (the DSL's authored `prefers: mosaicPiece` hints), then everything else
  // in natural collection order — deterministic without an explicit sort. Mosaic is pure
  // cosmetic filler, so exact spread doesn't matter; refine here if placement aesthetics ever do.
  // ponytail: natural order is a fine spread for cosmetic loot, upgrade to a real ranker if needed.
  rank: candidates => {
    const tagged = candidates.filter(s => s.preference === MOSAIC_BUCKET)
    const rest = candidates.filter(s => s.preference !== MOSAIC_BUCKET)
    return [...tagged, ...rest]
  },
}
