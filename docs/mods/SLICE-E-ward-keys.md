# Slice plan — §E: generic reachability + ward/tomb keys as mod data

Prep for the §E gap in `docs/mods/FIDELITY-AUDIT.md`. Explored + designed 2026-07-14 on branch
`mods/hieroglyph-currency` (after the tomb-treasure mod landed), in discussion with the user. Read
this, then FIDELITY-AUDIT §E and `docs/game-design/keys-and-locks-solver.md`.

## What §E really is (reframed in discussion — bigger than the audit's one-liner)

The audit says "make ward keys a currency distribution + retire validateDiscovery." Exploration
showed that framing partly misreads the mechanic. §E is **direction 3** from the discussion: core
owns a **generic two-layer reachability primitive that names no currency**; the tomb-treasure mod
supplies the specific progression (map-piece tomb entry, the tier ladder, tomb-key harvest) as
**data**. The overworld stays **emergent** (thresholds + placement, not an authored graph).

### The two layers (as built, `reachability.ts`)

- **Fine** (`reachableFloorsInSite`) — within one site, per-floor BFS over held keys. Already fully
  generic (every room check is threshold-1 possession). Unchanged.
- **Coarse** (`computeReachability`) — whole world, a fixed-point over possessed currency counts:
  a journey is enterable if its tier is unlocked and (tombs) its map-piece threshold is met;
  harvest keys from reachable sites; recompute. NOT an authored journey→journey graph — the ladder
  emerges from *where currencies are placed* + thresholds.

### The 3 core-vocabulary leaks to lift (this is the heart of §E)

`reachability.ts` still hardcodes tomb-treasure vocabulary. Lift each through injected,
mod-supplied data (the `CurrencySupport` seam already exists for `bucketForReward`/`thresholdFor`;
extend it):

| Leak | Line | Fix |
|---|---|---|
| Journey entry threshold = `mapPiece:` + `piecesRequired` | :45-52, :251-255 | inject a journey-entry lock `(journeyId) → {bucket, threshold} \| null`; mod supplies "tomb J needs N of my map-piece currency" |
| Tier-unlock ladder = `TIER_UNLOCK_PERK_ID` | :7, :190-195 | inject a global tier-unlock lock `(tier) → bucket \| null`; mod supplies the ladder keys |
| Direct `tombKey`/`mapPiece` harvest | :165-166 | route ALL rewards through injected `bucketForReward`; move tombKey+mapPiece into the mod's support |

Core keeps the *concept* of tiers (the difficulty ladder is core structure) and that journeys/tombs
exist — it just stops naming which currency gates them.

## Tomb keys are positional content, NOT a demand-spread currency (settled)

Verified against the generated world: **210 tomb-key gates reference only 32 distinct keys** — a few
tier-unlock/ward "hub" keys gate 12-24 floors each (own it once → all open; demand is threshold-1,
not per-gate). Placement is **positional**: "the treasure IS the key", each `keyId` lives at its own
tomb floor and self-gates that tomb. A demand-driven currency (one instance per lock) is the wrong
shape — it can't express many:1, and can't place a key at a fixed slot.

So: tomb keys stay **positional tomb content** (one treasure per floor), **harvested** by
reachability. De-core-name their *placement* (Option B): `resolveTombReward`'s tombKey mapping
(`perkIds → {type:"tombKey",keyId}`) is injected from the tomb-treasure mod via
`scripts/generateWorld.ts`, so core `configBuilder.ts` names no reward type. Placement stays exact
(the tomb floor); the mod owns the vocabulary.

This gives the clean split: **spread currencies** (map pieces, hieroglyph fragments, mosaic —
demand/distribution-placed) vs **positional keys** (tomb treasures — content-placed, harvested).

## Every treasure gates an (optional) loot pocket (decided — fold into §E)

Today 8 of 40 treasures gate nothing — each tomb's **last-floor** key. It's an allocation artifact:
`freeWardIndices` (buildSite.ts:71-78) takes the *first* N free indices, per-pyramid ward counts are
small, so the highest index (last floor) is never drawn. Not deliberate.

**Fix `freeWardIndices` to cover the tail** so every treasure opens a ward pocket. Rationale (user):
ward paths/gates are **optional loot pockets**, not mandatory progression — extra reachable slots the
loot pass fills. A last-treasure pocket is safe because:
- Ward wings/paths end in `fragmentSlot` sentinels (buildSite.ts:331,346) → ordinary loot slots;
  reachable once the key is harvested (its tomb cleared) → filled by phase-3/4 loot.
- Fill is **normal tier-matched** (no special higher-difficulty authoring — decided). The pocket's
  own difficulty decides its loot; leftover capacity takes mosaic/junk.
- The one true terminal (last wizard treasure's gate) has nothing higher, but **mosaic is
  tier-agnostic capped loot**, so it's still valid content, not a dead pocket.

Safety invariant: because every tomb treasure is always placed as positional content, every ward key
is harvestable → every ward gate (optional or load-bearing) resolves in reachability → no hard-fail.
A pocket holding a **required** currency (secondary-tomb map piece on a deep floor) is load-bearing;
the worklist already sequences that (place ward key → pocket reachable → place the required piece).

This changes the generated world's gate/loot layout (accepted — it's a §E deliverable, decided).

## Retire validateDiscovery (safe — reachability already subsumes it)

`reachability.ts` subsumes and strengthens both of `validateDiscovery`'s checks: secondary-tomb
discovery is count-aware there (`piecesRequired`) vs existence-only in the validator; ward-key
ordering is enforced structurally by the fine BFS + `settleHarvest` + the winnability sweep
(`placeFragments.ts:226-233`, which we watched fire in the tomb-treasure toggle-off test). Delete
`validateDiscovery` + its exclusive helpers (`SECONDARY_TOMBS`, `collectDiscoveredBy`,
`findWardKeyGrants`, `findWardKeyRequirements`) and the call at `configBuilder.ts:282`. Keep
`validateRewardCounts`/`WorldValidator`. Update `validate.spec.ts`. (Note: `location-key` perks and
the "auto-inject locationKey" comment in `validate.ts:68-70` are dead — location-keys do nothing at
runtime or in reachability; secondary-tomb discovery is entirely map-piece-count-driven. Clean up
the dead comment; the perk-type stays for §F.)

## Suggested staging (one theme, de-riskable in order)

1. **Retire `validateDiscovery`** — independently safe + verifiable. Delete + regen + confirm the
   worklist still hard-fails a deliberately-broken world. Smallest, lowest risk; do first.
2. **Genericize `reachability.ts`** — lift the 3 vocab leaks via injected mod-supplied locks
   (journey-entry, tier-unlock, harvest). Core world-gen names no currency. World byte-identical
   (same thresholds, just injected not hardcoded).
3. **Inject tombKey placement from the mod** (Option B) — `resolveTombReward` mapping → mod export
   via generateWorld.ts. Core `configBuilder.ts` names no reward type. World byte-identical target.
4. **Fix `freeWardIndices` tail** — every treasure gates an optional pocket. World gate/loot layout
   changes (reviewable diff, counts: tombKey still 40, more gates + loot slots).

## Verification

- Each stage: `yarn tsc -b`, `yarn build`, `yarn test --run`, `yarn lint`, `yarn generate-world`.
- Stages 1-3 target world byte-identity (`git diff --stat src/data/generatedWorld.ts` empty, or a
  reviewable representation-only diff). Stage 4 intentionally changes the world — review the gate/
  loot diff; tombKey count stays 40, mapPiece 31.
- Retire-validateDiscovery check: temporarily mis-author a ward gate, confirm the worklist sweep
  throws (reachability catches what validateDiscovery did).
- Doc-fidelity review agent; then commit + push per stage.

## Doc reconciliation (fold in, don't batch)

- `keys-and-locks-solver.md`: correct the "ward keys are a currency distribution" framing to
  as-built (tomb treasures are positional content harvested by reachability; the *gating currency*
  the solver spreads is the map piece, not the ward key). `WARD_MIX` already buried
  (`pyramid-interior-design.md` §6). Rename the fictional rankers `weightedTierTarget`/`lootPriority`
  to the real `byPoolScore`. Note validateDiscovery retired.
- FIDELITY-AUDIT §E → ✅ when landed.

## Not in scope

- Clean toggle-off of tomb-treasure (ward gates + tombs are core-authored structure; making the mod
  own tomb topology is a separate, larger question). §E keeps toggle-off an isolation test.
- §F perks (location-key/perk treasures doing nothing is the §F redesign).
