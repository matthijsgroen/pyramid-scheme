# Mod restructure — slice tracker

Plan: `docs/mods/TARGET.md`. Per-slice steps: `docs/mods/SLICE-CHECKLIST.md`.
Archived reasoning: `docs/mods/_brainstorm.md`, `docs/mods/_handover-keys-and-locks.md`.

Gate for every slice: **toggle the mod off, world + app still build.** Not a
green suite.

## Slice 0 — docs

- [x] `docs/mods/TARGET.md` — layered B + the two rules
- [x] `docs/mods/SLICE-CHECKLIST.md` — per-slice template, toggle-off gate
- [x] archive brainstorm + handover, reframe this file

## Slice 1 — mosaic (reference implementation)

- [x] 1. Deleted `computeMosaicPaths` + auto-loop + `emitMosaics`; mosaic rides
        the general loot pool via `prefers`-tagged slots; target count moved to
        the mosaic mod (`MOSAIC_TOTAL`); core holds no `mosaicPieceRewards`.
- [x] 2. Generic phase-3 capped placement in `placeFragments.ts` — spreads the
        registered currency's total across loot slots (tagged first), hard-fails
        if demand > capacity.
- [x] 3. `src/mods/mosaic/index.ts` descriptor + `src/mods/registeredMods.ts`.
- [ ] 4. File moves; `useMosaicProgress` via `useModState`; drop
        `mosaicSeenCount` from `ProgressionState`.
- [ ] 5. Toggle-off proof: remove mosaic → build clean, 0 mosaic pieces,
        hieroglyph/mapPiece counts unchanged, core names no `mosaic`.

## World-authoring exercise (surfaced mid-slice — see project memory doom-loop)

Deleting the auto-distributor exposed the real world size: it was auto-expanding
loot without authorship, so the world needs authored growth to stay solvent
(economy guard). Grow each tier with authored ward content, then balance.

- [x] engine primitives: `wardChest`, floor-level `sidePaths`/`hiddenPaths`,
      varied `wardWings` (`WardWingSpec[]`)
- [x] starter — +1 pyramid, per-pyramid ward-chest teasers (varied difficulty),
      extra corridors on the last pyramid
- [x] junior — varied ward WINGS (bonus floors, harder-tier difficulty) on
      back-half pyramids
- [ ] expert / master / wizard — grow (next)
- [ ] re-enable economy guard, balance (income ≥ buyable); drop
      `SKIP_ECONOMY_GUARD` usage, final `generate-world`

## Slices 2+ (re-planned after mosaic)

- [ ] tableau / hieroglyph — first gating currency (hard toggle-off)
- [ ] trap — perks (grant/consume split), consumables, HUD
- [ ] shop — money, depends on puzzle/core economy
- [ ] `siteAssembler` core-loop rewrite (`Distribution` primitive) — last

## Frozen until modules land (do not extend)

- [ ] phase-4 uncapped loot (max-% occupancy + drop rate)
- [ ] filler-loot fill-the-rest generalization
- [ ] slot capacity (`Slot` holding several items)

## Prior work still standing (carried into core, not undone)

- [x] generic ledger + currency registry (`src/game/ledger`)
- [x] worklist-driven `placeFragments` (2 currencies: hieroglyph, mapPiece)
- [x] `CurrencyDistribution` injection pattern
- [x] reachability graph, distribution primitives, slot discovery
- [x] tomb/pyramid unified construction (`buildSite`)
