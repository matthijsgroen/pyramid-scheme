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
- [ ] DET-1 — detector revival — folded into the Perk & detector system item below (detectors
      ARE perks). See design doc §3C + Appendix A.

## Perk & detector system — DESIGN then BUILD, AFTER the mod refactor (parked)

One combined work item (per user). Detectors are perks (compass / consumable-detector / detection
live in `corePerks`), and trap owns 4 perks (armor, max-health, trap-insight, pack-mule) — so "how
a mod contributes perks" and "revive the detector" are the same design problem. Deliberately parked
until the other slices land, so the perk system is designed once, cleanly, with all its stakeholders
known.

Scope when picked up:
- A perk-contribution mechanism mods use (the open fork: does `applyTreasurePerk`'s grant path
  write through the registry to mod-owned slice state, so `PerkSlice`/defaults go dynamic? vs a
  gated side-effect leaving slices in core `ProgressionState`). See the trap notes.
- DET-1 detector revival on top of that (target-picking on Collection, counter-native provider
  search, reachability-aware).

## Slices 3+ (re-planned after hieroglyph)

Perk UPGRADES are parked (above); the trap slice excludes them but is otherwise NOT blocked.

- [ ] Slice 3a — the Distribution primitive (DESIGNED — `docs/mods/filler-loot-generalization-design.md`).
      Unfreezing filler-loot became the unified loot model + MERGED Slice 5. Every loot kind is a
      `Distribution` with a footprint (min/max slots) + eligibility + rank; **core allocates slots,
      the mod fills them itself** (owns its variants/rarity/completeness — core never rolls a
      variant). Capped currencies = exact footprint; money/junk/consumables = flexible; gating =
      worklist. Plus an authorable **empty** quota (% of X). Settled: unify with Distribution; empty
      = % of X, authorable; money = footprint-only validation; junk completeness (≥1 each) hard-fail.
      Gate is no longer byte-identical (OQ1) — it's builds + hard-fail invariants + economy solvent.
      Implementation is large (see design doc §sequencing) — a fresh multi-step effort.
- [ ] Slice 3b — trap. Scope: trap encounter family + health (trap-owned currency, value stays in
      shared ledger, methods → `useTrapProgress`) + consumables (trap-owned Distribution, on 3a)
      + HUD (HealthDisplay/ConsumableBar gated). **Excludes the 4 trap perk upgrades** — parked with
      the perk system; trap logic READS those perk values from the still-core slice (documented
      seam). Decisions settled: health trap-owned; consumables trap-owned.
- [ ] shop — money Distribution moves here from core (Slice 4), Fez shop family.
- [ ] ~~`siteAssembler` core-loop rewrite~~ — MERGED into 3a's Distribution primitive (topology/
      encounter distribution may still be a follow-on step; see design doc OQ4).
- [ ] Perk & detector system (see above) — unblocks the trap perk upgrades + revives DET-1. Last.

## Frozen until modules land (do not extend)

- [ ] phase-4 uncapped loot (max-% occupancy + drop rate) — likely folds into Slice 3a's provider
      model (a provider can be uncapped w/ a drop rate); revisit during the 3a design.
- [ ] slot capacity (`Slot` holding several items)

Unfrozen: filler-loot fill-the-rest generalization → Slice 3a (driven by the trap slice).

## Prior work still standing (carried into core, not undone)

- [x] generic ledger + currency registry (`src/game/ledger`)
- [x] worklist-driven `placeFragments` (2 currencies: hieroglyph, mapPiece)
- [x] `CurrencyDistribution` injection pattern
- [x] reachability graph, distribution primitives, slot discovery
- [x] tomb/pyramid unified construction (`buildSite`)
