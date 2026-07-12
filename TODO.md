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

- [ ] 1. Delete `computeMosaicPaths` + auto-loop + `emitMosaics`. Mosaic
        pieces ride the general loot-node pool (chest with soft
        `prefers: mosaic`; any loot node can hold one). Move the target count
        into the mosaic mod (`totalRequired`); core holds no
        `mosaicPieceRewards`.
- [ ] 2. Generic phase-3 capped placement reads the registered currency,
        spreads its total across all loot nodes (preferring tagged); hard-fail
        if mod demand > total loot-node capacity.
- [ ] 3. `src/mods/mosaic/index.ts` descriptor + `registeredMods` list.
- [ ] 4. File moves; `useMosaicProgress` via `useModState`; drop
        `mosaicSeenCount` from `ProgressionState`.
- [ ] 5. Toggle-off proof: remove mosaic → build clean, 0 mosaic pieces,
        hieroglyph/mapPiece counts unchanged, core names no `mosaic`.

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
