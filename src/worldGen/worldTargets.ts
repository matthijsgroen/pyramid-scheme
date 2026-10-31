// Expected reward counts — validated by configBuilder after generation.
// mapPieceRewards: the sum of every tomb's own piecesRequired (the keys-and-locks solver's
// map-piece currency places exactly this many, no surplus) — 31 across the 9 tombs.
//
// Mosaic is NOT here — it's a mod-owned capped currency (src/mods/mosaic/game/mosaicCurrency.ts's
// MOSAIC_TOTAL); core holds no per-mod target (docs/mods/TARGET.md rule 2). It's placed by
// placeFragments' phase-3 pass, which hard-fails if it can't fully place, so no post-hoc count
// check is needed here.
//
// Its own file, apart from worldSpec.ts, because the app reads it (the loot-report rows ride on a
// mod descriptor) and the spec reads the lock catalogue from disk, which the browser cannot.
export const WORLD_TARGETS = {
  mapPieceRewards: 31,
}
