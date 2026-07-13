# Handover — Slice 2 (hieroglyph mod), world-gen half done

Branch `mods/hieroglyph-currency`, 7 commits, **not pushed**. Full suite 711 green,
`yarn generate-world` regenerates byte-identical, working tree clean.

## Read first, in this order

1. `docs/mods/SLICE-2-PLAN.md` — the full Slice 2 plan + every decision settled with the
   user (including the REVISED section: mosaic never grep-cleaned core, so the bar is
   "mod owns its number + no load-bearing mod meaning in core," NOT a literal zero-grep).
2. `docs/mods/TARGET.md` — the canonical architecture (layered B, the two rules).
3. `docs/mods/SLICE-CHECKLIST.md` — per-slice steps; the exit criterion is the toggle-off proof.
4. `TODO.md` — live tracker.
5. Auto-memories: `project_mod_restructure_target`, `reference_worldgen_dsl_authoring`,
   `project_keys_and_locks_solver`, `project_world_authorship_doom_loop`.

## What's done this session — the WORLD-GEN half (the hard "first gating currency" part)

Commits (oldest→newest):
- `move` — `src/mods/tableau` → `src/mods/hieroglyph`. Family/puzzle id stays `"tableau"`.
- `descriptor` — `hieroglyphMod` in `REGISTERED_MODS`. Grew `ModDescriptor`
  (`src/mods/modDescriptor.ts` now, not owned by mosaic): `currencyDistributions`, `families`
  (game-side `FamilyMeta`), `currencyMeta` widened to array. `CurrencyMeta` gained
  `showInCollection`. Fragment currency-meta moved off the hardcoded `registerCurrencies` block
  into the descriptor.
- `DSL preference` — hieroglyph DSL now authors `{type:"fragmentSlot", prefers:"hieroglyph"}`
  (like mosaic), NOT a baked `{type:"hieroglyphFragment"}` literal — so it degrades to generic
  loot when the mod's off. **Unified bucket grammar:** `<currencyId>` = any instance,
  `<currencyId>:<instanceId>` = one. `ownsBucket = b===id||b.startsWith(id+":")`; a bare-currency
  slot preference boosts any instance. Applied to hieroglyph + mapPiece. Core no longer maps a
  hint→bucket (DSL carries the exact string).
- `reachability` — dropped `HIEROGLYPH_REQUIRED` import + `hieroglyph:` naming. A `CurrencySupport`
  object (`thresholdFor` + `bucketForReward`) is injected by `placeFragments`, built from the
  registered currencies. Core gates on "held ≥ what the registered currency says." Behavior-
  preserving (world byte-identical).
- `tables→mod` — `TOMB_SYMBOLS`/`FRAGMENT_MATRIX`/`HIEROGLYPH_REQUIRED` moved to
  `src/mods/hieroglyph/game/hieroglyphData.ts`. `FRAGMENT_HOST_TIERS` was dead — dropped.
  Serializer takes the required-map as an injected param (generateWorld passes it).
- `validation` — `validateRewardCounts` takes an injected expected-total + reward predicate,
  both derived by `buildConfigs` from the registered currencies. Toggle-off drops a currency's
  expectation with it — no false "expected 294, got 0". `expectedFragments` param gone.
- `winnability` — after the placement worklist drains, hard-fail if any lock still blocks (no
  owning currency = a gating mod toggled off with its gate still authored). Enforces the
  "reach Wizard" invariant that the pre-existing per-placement throw missed (unclaimed bucket
  slipped past via `continue`). Does NOT fire on the healthy world.

### Decisions settled with the user (all in SLICE-2-PLAN.md)
- Mod named **hieroglyph**; internal family id stays `tableau`.
- **NO reward-type genericization** — `{type:"hieroglyphFragment"}` stays an inert union
  variant, exactly like `{type:"mosaicPiece"}`. Only the mod's worklist produces it.
- **DSL authors preferences, not baked currencies** (the toggle-off-safety principle).
- **Unified bucket/preference grammar** (above).
- Shop-stock fragments: proper home is a shop-targeting placement rule over the
  capacity/eagerness slot model (chest cap1/eager100, puzzle cap1/eager60, gate cap0/eager0,
  shop cap6/eager0 — normal fill never touches a shop; only a mod rule targeting `shop` +
  relax-to-normal fills it). That model is FROZEN. Interim: they're prefer-tagged fragmentSlots.

## What's NEXT — the APP-SIDE half (task 6, not started)

Larger + riskier. The toggle-off proof needs it (removing `hieroglyphMod` must drop the
mechanic app-side, not just world-gen). See TODO task 6:
1. **Gate the tableau family registration** on `isModEnabled` — `src/mods/registerAllFamilies.ts`
   imports `./hieroglyph/app/plugin` UNCONDITIONALLY (side-effect registration), so the puzzle
   still renders even with the mod "off." First mod with a gated *family* (mosaic had none) —
   establish the pattern (conditional registration driven by REGISTERED_MODS).
2. **Family-absence fallback** — a `tableau`-encounter room with no registered family must render
   a pass-through, not throw. (World-gen already tolerates absence: default resolver resolves by
   string, and `resolveKeyRequirements` returns undefined when `TABLEAU_META` leaves
   `ALL_FAMILY_META`, so no `hieroglyph:` locks get baked.)
3. **Fragments → ledger** — migrate `useProgression.hieroglyphFragments` (stored as
   `collectedFragments` `"id:index"` strings) into generic ledger buckets. **USER CONFIRMED:
   do it this slice**, WITH save-data handling. Touches `useProgression`, `useDetector`,
   `SiteMapScreen`, `RewardFlow`, `Collection`, `registerRewardHandlers`. The risky one.
4. **Collection** — hieroglyph section driven by the registered `CurrencyMeta`
   (`showInCollection` flag already added), gated on `isModEnabled("hieroglyph")`. Screen stays
   shared (treasures + junk sections stay hand-coded until their own slices — trap/shop).
5. **Gate/move the reward handler** — `src/app/SiteMap/registerRewardHandlers.ts`'s
   `hieroglyphFragment` handler (calls `progression.addFragment`) into the mod / gated, so an
   orphan reward has no dangling handler when off.

Then **toggle-off proof** (remove `hieroglyphMod` from `REGISTERED_MODS`: world-gen builds guard
ON + winnable + 0 fragments, app builds/runs without the puzzle + section, re-add) + full suite
+ real `generate-world`.

## Gotchas carried forward
- `registeredMods.ts` is imported by world-gen scripts → descriptors stay React-free; app
  contributions (screens, family Components) gate app-side on `isModEnabled`.
- The winnability guard reads `reach.discoveredLocks` after the worklist; it's empty on a
  solvable world. If it ever fires on a healthy build, inspect which buckets remain (ward/tomb
  keys should resolve via `settleHarvest`).
- `SKIP_ECONOMY_GUARD=1 yarn generate-world` for iteration; a real build must pass guard ON.
- Family id `tableau` ≠ mod folder `hieroglyph` — don't "fix" this; the family id is baked into
  saved worlds + specs.
