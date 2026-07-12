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
- [x] 4. File moves: `mosaicRevealOrder.ts` → `mods/mosaic/game/`, `MosaicPage.tsx`
        → `mods/mosaic/app/`; `useMosaicProgress` (via `useModState`) replaces
        `mosaicSeenCount`/`markMosaicViewed` on `ProgressionState`; dropped the dead
        `mosaicPieces.ts`.
- [x] 5. Toggle-off proof (world-gen): mosaic out of `registeredMods` → generate-world
        builds with the economy guard ON, 0 mosaic, 31 map / 294 hieroglyph unchanged,
        worldGen core names no `mosaic`. VERIFIED.
- [ ] 5b. Full APP toggle-off (grow the descriptor): the mosaic SCREEN (`Base.tsx`
        hardcodes it) and the `mosaicPiece` currency-meta (`registerCurrencies.ts`) are
        still wired outside the descriptor — the descriptor owns only `cappedCurrencies`
        today. Full app toggle-off needs the descriptor to own `screen` + `currencyMeta`.
        Minimal-descriptor-grows-later, per TARGET.md.

## World-authoring exercise (surfaced mid-slice — see project memory doom-loop)

Deleting the auto-distributor exposed the real world size: it was auto-expanding
loot without authorship, so the world needs authored growth to stay solvent
(economy guard). Grow each tier with authored ward content, then balance.

- [x] engine primitives: `wardChest`, floor-level `sidePaths`/`hiddenPaths`,
      varied `wardWings` (`WardWingSpec[]`), key chains (nested floor-key,
      2 levels max — assembler flattens deeper)
- [x] starter — +1 pyramid, per-pyramid ward-chest teasers (varied difficulty),
      extra corridors on the last pyramid
- [x] junior — varied ward WINGS (bonus floors, harder-tier difficulty)
- [x] expert — ward content everywhere, first open traps, consumable bump,
      first floor keys on the open main path, broad packing
- [x] master — deeper locks (multi-color keys + key chains), trapped returns
      (`wardPathTrapped`), open junk income
- [x] wizard — saturated: open traps + key chains at the ceiling
- [x] economy balances with the guard ON (no `SKIP_ECONOMY_GUARD` needed for a
      real build; the env gate stays as a dev/iteration affordance)

Escalation ladder: starter (see locked content) → junior (bonus floors) →
expert (intro traps + floor keys) → master (deepen: multi-color + chains,
hazardous returns) → wizard (saturate all).

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
