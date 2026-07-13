# Handover — Slice 2 done, Collection redesign done, Distribution primitive DESIGNED

Branch `mods/hieroglyph-currency`, **not pushed**. Full suite green (711),
`yarn generate-world` byte-identical, tree clean at each commit.

## Read first, in this order

1. `docs/mods/distribution-primitive-design.md` — **the locked design for the
   next build** (Slice 3a). The whole conversation converged here.
2. `TODO.md` — live tracker (slice order, parked items, subsumed frozen items).
3. `docs/mods/TARGET.md` — the two rules + layered architecture.
4. `docs/mods/SLICE-CHECKLIST.md` — per-slice steps; toggle-off is the gate.
5. Auto-memories: `project_mod_restructure_target`, `reference_worldgen_dsl_authoring`,
   `project_keys_and_locks_solver`, `project_world_authorship_doom_loop`.

## What's done (this session)

Code:
- **Slice 2 (hieroglyph) COMPLETE** — world-gen half (prior session) + app-side
  half this session: `6e6d81f` gated the mechanic app-side (family registration,
  family-absence pass-through, Collection section gate, reward-handler gate),
  toggle-off proven both ways. Fragments deliberately kept on
  `collectedFragments` (NOT migrated to the ledger — it's already a
  player-facing counter, app-side, empties when the mod's off; the ledger is a
  flat counter that fits the per-piece set poorly).
- **DS-1** `291fc45` — design-system primitives extracted from Collection:
  `src/ui/tokens/difficultyColors.ts` (`difficultyMaterial`/`difficultyMaterialFlat`/
  `difficultyRank` — two distinct color ROLES, not merged), `CategoryGrid`
  (auto-fit tiles, gap-based `density`), `CollectionSection`, `CollectibleSlot`
  (+ stories). `HieroglyphTile` collapsed its 3× inline ternaries onto the
  tokens; `hieroglyphLevelColors.ts` deleted. Fixed the invisible-selection bug
  (ring clipped by the tile's `clip-path` → clip-safe stacked `drop-shadow`
  outline on an un-clipped wrapper).
- **MOD-1** `437d256` — mod-owned Collection section:
  `src/app/pages/collectionSectionRegistry.ts` (mirrors `familyRegistry`),
  `src/mods/hieroglyph/app/HieroglyphCollectionSection.tsx`,
  `collection.ts` (gated registration), `registerAllCollectionSections.ts`
  (aggregator). Core `Collection.tsx` names no mod; toggle-off proven.

Design (no code):
- **Distribution primitive design LOCKED** (`0d8398e`, `2d76a6c`, and the split/
  park commits). See below.

## The plan going forward (TODO has the full list)

**Parked (after the mod refactor): Perk & detector system.** Detectors ARE perks
(compass/consumable-detector/detection). Trap owns 4 perks (armor, max-health,
trap-insight, pack-mule). One combined design problem, deferred. The trap slice
EXCLUDES those 4 perk upgrades (they stay in core; trap logic reads them from the
still-core `trapPerks` slice — a documented seam). DET-1 (revive the dead compass,
`availableHieroglyphs={[]}`) folds in here too.

**NEXT BUILD — Slice 3a: loot distributions (Increment 1 of the Distribution
primitive).** Per the design doc §Sequencing. Then Slice 3b (trap) rides it.

## The Distribution primitive (the locked design — read the doc for detail)

Everything placed into the world — encounters (trap/puzzle/shop) AND loot
(currencies/junk/consumables/money) — is a `Distribution`. **Core allocates slots
(footprint + eligibility + rank); the mod fills them** (owns variants, rarity,
completeness, per-instance encounter config — core never rolls a variant).

Fixed pass order: **structure → encounters → gating → capped → dynamic (+ empty)**.
`eligible` is the encounter↔loot join (shop stock targets `slot.encounter==="shop"`;
consumables gate to `pathDifficulty>=expert`; loot avoids trap rooms).

Target = the full unified model; **built loot-first**. It subsumes/retires four
old roadmap items: filler-loot generalization, the siteAssembler `Distribution`
rewrite (→ Increment 2, encounter distributions), shop-stock targeting, slot
capacity (a >1-footprint slot).

Settled decisions: empty = % of X (authorable); money = footprint-only validation,
economy guard belongs to the shop mod; junk completeness (≥1 each collectible)
hard-fails; consumables trap-owned + eligible expert+ paths; toggle-off gate =
valid + solvable world (NOT byte-identical — that was never the point);
world-stability ripple (adding a mod shifting placements) = a separate session.

## Slice 3a build steps (design doc §Sequencing, Increment 1)

1. **Define `Distribution` + registry/aggregation** (mirror `CAPPED_CURRENCIES`
   in `src/mods/registeredMods.ts`, inject via `scripts/generateWorld.ts`). Wrap
   today's capped currencies (mosaic) as exact-footprint distributions — **no
   behavior change** (golden guard holds). *Pin the concrete `Slot` metadata
   shape here* (tier, pathDifficulty, encounter, capacity, ward gating, seed).
2. Add authorable `emptyFraction` (default 0 → no change until authored).
3. Money + junk as `dynamic` distributions reproducing current output; junk gains
   ≥1-each completeness (world output changes → validate by invariants, not
   byte-identical).
4. **Consumable distribution → trap mod** (hand-off to Slice 3b): `eligible` =
   expert+ paths, rarity trap-owned.
5. Retire `assignPuzzleRewards` quota + the `placeFragments` junk-sink into the
   unified dynamic pass.

Current filler code to generalize: `src/worldGen/puzzleRewards.ts`
(`assignPuzzleRewards`, `CONSUMABLE_FRACTION`/`MONEY_FRACTION`),
`src/worldGen/rewards.ts` (`rollConsumable`/`rollMoney`/`pathEndToReward`),
`src/worldGen/placeFragments.ts:258-265` (junk sink). Pattern to mirror:
`CappedCurrency`/`CurrencyDistribution` in `placeFragments.ts`, aggregated in
`registeredMods.ts`, injected in `scripts/generateWorld.ts`.

## Gotchas carried forward

- `registeredMods.ts` is imported by world-gen scripts → descriptors stay
  React-free; app contributions (screens, families, collection sections) gate
  app-side on `isModEnabled`.
- The toggle-off gate is NO LONGER byte-identical for 3a (junk completeness +
  dynamic redistribution change output). Gate = builds + hard-fail invariants
  (footprint mins, completeness, reachability) + economy solvent.
- `SKIP_ECONOMY_GUARD=1 yarn generate-world` for iteration.
- Family id `tableau` ≠ mod folder `hieroglyph` — don't "fix" it.
