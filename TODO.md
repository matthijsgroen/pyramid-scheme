# Mod architecture — status

Design docs: `docs/mods-architecture.md`, `docs/game-design/keys-and-locks-solver.md`.
Detailed handover: `docs/handover-mods-keys-and-locks.md`.

## Recovery plan — doc-fidelity gap found in hieroglyph placement

Gap analysis (2026-07-11) of `placeFragments.ts`/`hieroglyphCurrency.ts`/`reachability.ts`
against `keys-and-locks-solver.md`'s own stated algorithm. Not cosmetic — 3 structural gaps
share one root cause: there is no real worklist queue.

- [x] 1. Gap analysis — done, see below. Analysis only, no fixes yet.
- [x] 1b. Design corrections, now written into `keys-and-locks-solver.md`:
      "Structure, then loot" phase split (nodes + their wishes are fully built before any
      currency is granted), the soft `prefers: <currency>` slot tag (a ranking boost, not an
      exclusive claim — a leftover preference is inert once that currency's demand hits 0),
      and the map-piece two-level diversity ladder (journey first, relax to pyramid — the doc
      previously conflated these under a single "pyramid" dedup, now fixed).
- [x] 2. Build the real worklist queue — done. `collectReachableKeys`/`reachableFrom`
      (`siteValidator.ts`) now surface unsatisfied `requiredKeyId`/`requiredKeyIds` hit at the
      reachable frontier as `blockedRequirements`, aggregated world-wide in `reachability.ts`
      as `discoveredLocks` (plus a journey-scoped `mapPiece:<tombId>` lock when a tier is
      unlocked but `piecesRequired` isn't met yet). `placeFragments.ts` is a real queue: seeded
      from `discoveredLocks`, grown via `enqueueNewLocks()` after every placement. Verified via
      a live cascade trace (floors 12→31→53→76→124→156 as each hieroglyph's demand resolved,
      cross-tier locks appearing exactly per the doc's worked example).
  - [x] hieroglyph demand now comes from `CurrencyDistribution.demandFor(bucket, allConfigs)`,
        called lazily per discovered bucket — no static `TIERS × TOMB_SYMBOLS` table anymore.
  - [x] `CurrencyDistribution` gained its own `rank(candidates, demand)` — ranking moved out of
        `placeFragments.ts` (which only computes eligibility) into each currency, so map
        pieces' two-level journey→pyramid ladder and hieroglyphs' tier/ward ranking can differ.
  - [ ] filler loot is still a separate ad hoc loop, not the same composable pipeline — open.
  - [ ] no fallback rung for mod-owned slot types (shop disable-ability) — open.
  - [ ] slot capacity — `Slot.assign` still single-capacity only — open (tracked below too).
- [x] 2b. Map pieces migrated onto the queue. `TreasureReward.fragmentSlot` gained `prefers?:
      string` (a bucket id, soft ranking hint only — inert once that currency's demand is
      satisfied, never an exclusive claim); `rewards.ts`'s `hintToReward`/`specToReward` now
      compile both the bare `"mapPiece"` hint and the structured `{type:"mapPiece",tombId}`
      form to a preference-tagged `fragmentSlot` instead of a baked literal; new
      `src/worldGen/mapPieceCurrency.ts` (core, not `src/mods/` — every tomb needs one
      regardless of which mods are registered) implements the journey-then-pyramid diversity
      ladder. `WORLD_TARGETS.mapPieceRewards` corrected 36→31 (the old "20 primary + 16
      secondary" surplus-loot split was redesigned away; 31 = sum of every tomb's
      `piecesRequired`, confirmed by the user).
- [x] 2c. (found during 2/2b) Fixed a real, pre-existing authoring bug in `src/data/tableaus.ts`
      — leftover from the "grind era" (repeated tomb replays) that never got updated when large
      tombs were split into several journeys for the exploration-based world. Two bugs: (a)
      `tableauInventory` generation picked only the FIRST tomb per difficulty
      (`tombJourneys.find`), so a tier's secondary tombs (`_b`/`_c`) silently reused the
      primary's exact symbol allocation instead of getting their own; (b) the generated
      `run × level` grid assumed multiple tableau puzzles per floor, but construction
      (`configBuilder.ts`) only ever builds one per floor (`levelNr` always 1) — ~3/4 of the
      grid was structurally dead, and some hieroglyphs' only allocation fell in a dead cell,
      permanently undiscoverable.
      Fix keeps generation itself untouched (same one-shuffle-per-difficulty call, same
      shared `random` sequence/order — every hand-authored story depends on those exact
      draws) and only changes the REMAP on top: the old grid was `treasureIndex × level`
      (e.g. 4×4=16 cells for wizard's primary tomb) but only the `level 1` row was ever
      read. Remap treats the grid as `levelCount` ROWS and slices a whole row per REAL tomb
      of the tier — row 1 goes to the PRIMARY tomb (the exact original cells, so every
      hand-authored story keeps matching its tableau's symbols byte-for-byte, verified
      against 3 hand-picked stories), row 2/3/... go to each SECONDARY tomb in turn — rows
      the grid always generated but never read, genuinely unused (not the primary's
      duplicated content the old bug produced), correctly sized to each tomb's own
      `symbolCount` even where it differs from the primary's (e.g. `master_treasure_tomb`
      vs `_b`). A small coverage-completion pass patches any symbol that still falls
      through both the primary's row and the secondary rows (found empirically: 3 of 58)
      into a secondary-tomb slot only, never primary. Result: `EXPECTED_HIEROGLYPH_FRAGMENTS`
      273→294 (the corrected total, confirmed by `yarn generate-world`: 294/294 placed).
      `HIEROGLYPH_REQUIRED` in `worldGen/data.ts` also fixed to search every tomb of a tier,
      not just the primary.
      **Resolved, not actually a content gap:** initially assumed secondary tombs needed
      brand-new story content authored — wrong. The user caught it: every `run×level` cell
      the old grid ever generated already had a real hand-authored story in
      `tableaus.json`, just filed under the PRIMARY tomb's id at the level that was never
      read (e.g. `expert_treasure_tomb.run1_level2` — real title + description, sitting
      there unused). Added a `storySource` map recording which (tombId, run, level) triple
      each real tomb's floor actually pulled its symbols from — secondary tombs now look up
      their story under the PRIMARY's id/row, not their own (nonexistent) id. Verified: all
      40 real tableaus (primary + secondary) resolve to a genuine authored story, zero
      fallback-to-generic-text.
- [x] 2d. (found via the same authoring-bug conversation) Validation ownership fix: core's
      `validate.ts` used to import `EXPECTED_HIEROGLYPH_FRAGMENTS` directly from core
      `data.ts` — the same "mod-owned logic sitting in core" pattern already hit 3 times this
      session (rewardWeight, key-requirement resolver, currency placement rule), now a 4th.
      `validateRewardCounts`/`buildConfigs` now take `expectedFragments` as an optional
      injected parameter (skips that check if omitted) instead of hardcoding it; the number
      itself is now exposed from `src/mods/tableau/game/hieroglyphCurrency.ts` (the currency's
      own module), threaded in by `scripts/generateWorld.ts` and the integration spec — the
      same injection pattern `resolveKeyRequirements`/`currencies` already use.
- [ ] 3. Keys-vs-loot distinction (capped-must-complete vs. uncapped-max-%-plus-drop-rate
      loot) — still not written down anywhere. Narrower than it looked in the first pass: the
      "local-first-then-global keys" half is now covered by 2/2b above (a lock's own room is
      always inside the reachable frontier that discovered it, so placement is inherently
      local-first already) — what's left is specifically the uncapped-loot max-%/drop-rate
      model (mosaic tiles, sellables, consumables), not yet touched.
- [ ] 4. Mod-container (`registerMod`) mechanism — own dedicated effort, see root gap section
      below. Do after 3, not interleaved with it.

## Root gap: no real "mod" container yet — do this before any more small fixes

A mod today is just a folder + an `ownerMod: string` tag. There's no actual
registration unit. The real aggregation is flat, global lists that don't
know mods exist as a concept: `allFamilyMeta.ts`'s `ALL_FAMILY_META:
FamilyMeta[]`, `registerAllFamilies.ts`'s side-effect imports. The intended
shape is a mod as a container that registers everything it owns as one
unit — `registerMod({ families, currencies, screens, stateSlices })` —
contributing e.g.:
- **tableau**: a tableau encounter family + its own currency (hieroglyph
  fragment + distribution rule)
- **mosaic**: a currency contribution + a dedicated screen registration
- **trap**: multiple economy contributions (health, bandage, oil,
  trapTool), trap encounters, and health/maxHealth state registration

None of the real container mechanism exists yet. Concretely, right now:
- [x] tableau's currency (hieroglyph fragment + its distribution rule) is now
      mod-owned — `src/mods/tableau/game/hieroglyphCurrency.ts`, registered via
      `src/mods/allCurrencyDistributions.ts`, injected into the now-fully-generic
      `placeFragments.ts` by `scripts/generateWorld.ts`. Still a flat array
      (`CurrencyDistribution[]`), not a real per-mod container — proves the DI
      pattern works, doesn't replace the missing `registerMod` mechanism itself.
- [ ] mosaic isn't a mod — `src/mods/mosaic/` doesn't exist
- [ ] trap's health/maxHealth are still plain fields on the shared
      `ProgressionState` in `useProgression.ts`, not something trap registers

The last several small fixes (rewardWeight values, key-requirement scatter,
tableau mod split) each surfaced another instance of this same missing
piece — they're symptoms, not separate problems, and doing more of them
one at a time costs more than it fixes. Next real step: design and build
the mod-registration container itself, before any more piecemeal per-mod
corrections.

## Mods architecture (`docs/mods-architecture.md`'s 6-step order)

- [x] 1. Generic ledger + currency registry
- [x] 2. Perk grant/consume split (trap / puzzle / core)
- [x] 3. Family registry unification — one registry, one `encounter` room type, gate is a
      registered family, soft-gated everywhere (never a hard block on approach)
- [ ] 4. Reward-weight fill-order
  - [x] groundwork landed: `FamilyMeta.rewardWeight`, `src/mods/*/{game,app}/` folders,
        `allFamilyMeta.ts`
  - superseded — the real consumer isn't being built the original way; folded into the
    keys-and-locks solver below instead
- [ ] 5. `Distribution` primitive — the real `siteAssembler.ts` core-loop rewrite (replaces
      `trapped`/`puzzleFamily`/`lastMainPuzzleFamily` with weight normalization; `sealed` /
      ward-path-trapped / shop map-piece relocation become `CappedPool` site instances).
      Do last, once everything below has proven the model on smaller pieces.
- [ ] 6. Cleanup (can ride alongside any step above)
  - [ ] HUD → generic `showInHud`-metadata loop
  - [ ] i18n split per mod
  - [ ] physical `mods/` folder moves, incremental

## World-gen backlog (`docs/handover-mods-keys-and-locks.md`)

- [x] Node-type collapse — `RoomType` is now `portal | fork | encounter`
- [ ] Tomb interior rebuild — tombs become persistent multi-floor sites, one floor per
      treasure (same pinned-seed/`completionCount` treatment pyramids already get in
      `useJourneys.ts`); kills `TombExpedition.tsx`'s `renderPuzzle` prop
  - [x] world-gen *construction* unified — tombs and pyramids both build through the same
        `buildSite()` (tomb-flavored authoring stays tomb-flavored: `wardPath()`, the
        perk-stream resolver, `"tomb-puzzle"` encounter, crocodile capstone)
  - [ ] runtime persistent-site rebuild itself — not started
- [ ] Keys-and-locks solver
  - [x] coarse reachability graph (`src/worldGen/reachability.ts`) — one `OwnedCounts` model,
        every lock is "held count of bucket X ≥ threshold(X)"
  - [x] composable distribution-rule primitives (`src/worldGen/distribution.ts`)
  - [x] candidate slot discovery (`src/worldGen/slots.ts`)
  - [x] worklist-driven placement, generic over any mod-registered currency
        (`src/worldGen/placeFragments.ts` + `CurrencyDistribution`), wired end-to-end into
        `configBuilder.ts` → `scripts/generateWorld.ts`. Two currencies registered today —
        map pieces (core, `src/worldGen/mapPieceCurrency.ts`) and hieroglyph fragments
        (mod-owned, `src/mods/tableau/game/hieroglyphCurrency.ts`) — both fully reactive,
        discovered via the real worklist queue, not a precomputed list. 31/31 map pieces,
        296/296 hieroglyph fragments (see recovery-plan section above for the 273→296 fix).
    - found + fixed 6 real bugs along the way: a `starter.ts` map-piece deadlock (gated
      behind its own tomb's tier-unlock treasure), a `siteAssembler.ts` key-host
      reward-hijack (both the ungated entry point and the chain-internal relay — confirmed
      silently dropping hieroglyph fragments in real generated data, proven by a regression
      test before the fix), a `mosaics.ts` undercount, an `ownedCounts` regression
      introduced while extracting the currency into the tableau mod (net-remaining vs.
      raw-total conflated — caught via the byte-identical-output check before it shipped),
      a pre-existing `configBuilder.integration.spec.ts` test gap (never actually passed the
      real `resolveKeyRequirements`, so it never exercised real tableau gating), and the
      `tableauInventory` grind-era authoring bug (2c above).
  - [x] generalized beyond one currency — map pieces are now solver-placed too, using the
        two-level journey→pyramid diversity ladder; mosaic would be a further candidate once
        it's its own mod
  - [ ] filler-loot fill-the-rest pass generalized into the same composable pipeline
        (currently a plain fill pass inside `placeFragments.ts`)
  - [ ] slot capacity — a node holding several items (a shop's stock) as a first-class
        `Slot` concept. Not built: `Slot`/`RoomCell` are single-capacity only
        (`assign(reward)`, one call, `reward?: TreasureReward` singular). Today's
        "shop with several items" is several separate single-capacity fez-shop sections
        bundled onto the same hub by `siteAssembler.ts`'s layout code, a maze-layout
        coincidence, not something the solver reasons about as one N-capacity slot
