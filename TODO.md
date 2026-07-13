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
- [x] 5b. FULL app toggle-off. Descriptor grew to own `currencyMeta` (game-side, no
        React) — `registerCurrencies` registers mod-contributed metas via the list. The
        SCREEN stays in `Base.tsx` (React can't live in the game descriptor that world-gen
        scripts import) but is gated on `isModEnabled("mosaic")`. Single toggle point
        (`REGISTERED_MODS`): removing mosaic drops world-gen placement + currency-meta +
        screen together. VERIFIED (0 mosaic, mosaicPiece unregistered, other currencies
        intact, guard ON). **Slice 1 complete.**

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

## Slice 2 — hieroglyph (first gating currency) — DONE

Plan + decisions: `docs/mods/SLICE-2-PLAN.md`. Handover: `docs/mods/HANDOVER.md`.
Branch `mods/hieroglyph-currency` (7 commits, not pushed).

World-gen half DONE (711 green, world byte-identical):
- [x] move `mods/tableau` → `mods/hieroglyph` (family id stays `tableau`)
- [x] descriptor + registration (currencyDistributions, families, currencyMeta[], showInCollection)
- [x] DSL authors preference not baked currency + unified bucket grammar `<cur>`/`<cur>:<inst>`
- [x] reachability: inject gate threshold + reward→bucket harvest (core names no hieroglyph)
- [x] move HIEROGLYPH_REQUIRED/TOMB_SYMBOLS/FRAGMENT_MATRIX into the mod; serializer injected
- [x] reward-count validation derived from registered currencies (toggle-off safe)
- [x] winnability hard-fail (lock with no owning currency)

App-side half DONE (711 green, world byte-identical, toggle-off proven both ways):
- [x] gate tableau family registration on isModEnabled (plugin.tsx self-gates its registerFamily)
- [x] family-absence fallback (SiteMapScreen effect auto-resolves an unregistered-family room)
- [~] fragments → ledger — DROPPED. `collectedFragments: string[]` kept: it already gives the
      player-facing counter (hieroglyphProgress "Ra 3/5"), lives in src/app (outside the
      worldGen/game grep gate), and empties when the mod's off. The ledger is a flat counter;
      the migration was churn + a forced compass redesign + save migration for no toggle-off gain.
- [x] Collection hieroglyph sections gated on registered CurrencyMeta.showInCollection (meta only
      registered while the mod's on → sections drop with it)
- [x] gate the hieroglyphFragment reward handler on isModEnabled (in-place; moving it would break
      applyReward/rewardDisplay's direct import ordering)
- [x] TOGGLE-OFF PROOF: mod off → generate-world guard ON + winnable + 0/294 frags + app builds;
      re-add → byte-identical. Full suite 711 green.

**Slice 2 complete.**

## Collection redesign (post-Slice-2 follow-on) — DS-1 + MOD-1 DONE

Design: `docs/mods/collection-and-detector-design.md`.
- [x] DS-1 — design-system primitives (`CollectibleSlot`/`CollectionSection`/`CategoryGrid` +
      `difficultyColors` tokens); fixed invisible tile selection (clip-safe drop-shadow outline)
- [x] MOD-1 — mod-owned hieroglyph Collection section (collection-section registry mirroring
      `registerAllFamilies`); core Collection names no mod; toggle-off proven
- [ ] DET-1 — revive the dead compass/detector (shipped with `availableHieroglyphs={[]}`, no way
      to pick a target). Target-picking on Collection, counter-native provider search (looted =
      explored-state, not per-piece), reachability-aware. **AFTER the mod architecture is complete**
      (per user) — deferred until the slices below land. See design doc §3C + Appendix A.

## Slices 3+ (re-planned after hieroglyph)

- [ ] trap — perks (grant/consume split), consumables, HUD
- [ ] shop — money, depends on puzzle/core economy; unblocks the capacity/eagerness slot model
      (shop cap6/eager0 + shop-targeting placement rule) the hieroglyph shop-stock fragments want
- [ ] `siteAssembler` core-loop rewrite (`Distribution` primitive) — last
- [ ] DET-1 detector revival — after the above (see Collection redesign section)

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
