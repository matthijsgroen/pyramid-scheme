# World-Builder Unification — Handover

Status: done · all 6 phases complete 2026-07-08
Branch: `refactor/world-builder` (off `feat/pyramid-content-scaling`)
Companion to: `docs/game-design/worldgen-dsl-redesign.md`, `docs/game-design/loot-distribution.md`, `docs/game-design/pyramid-interior-design.md`

---

## TL;DR for the next session

Collapse the two forked site emitters in `src/worldGen/configBuilder.ts` —
`buildSiteConfigs` (pyramids) and `buildTombConfigs` (tombs) — into **one
`buildSite` engine** over shared mechanics (floors, side sections, gates,
staircases) plus **capability-based reward economies** (chests, fragments,
mosaics, map pieces, perk stream). Pyramid and tomb become DSL presets that
opt into capabilities. The end goal: **a tomb is designed exactly like a
pyramid — from the DSL and from features — differing only in which reward
capabilities it turns on.**

Work in phases. Phases 0–4 are pure refactor and MUST keep world output
byte-identical (there is a golden guard). Phase 5 is the deliberate behavior
change: tombs gain chests/fragments/mosaics.

---

## Current state of the branch

- **Already done on this branch (uncommitted at handover time):** global
  defaults centralized. `src/worldGen/spec/global.ts` now exports
  `GLOBAL_DEFAULTS` (floorDepth, mainFloors, wardWings, windyStraightness,
  packingWhenHit, consumableRates); the `global()` DSL rule is built from it,
  and `configBuilder.ts` reads its fallbacks from `GLOBAL_DEFAULTS` instead of
  scattered magic numbers. Verified: typecheck clean, 95 worldGen tests pass,
  regenerated world byte-identical. **Commit this first** so the phase plan
  starts from a clean tree.
- `configBuilder.ts` is ~1107 lines and holds nearly everything.

## Key facts discovered (don't re-investigate)

1. **DSL + resolver are already unified.** `tomb(id, c)` returns a
   `journey`-scoped rule (`{ scope: { level: "journey", journey: id } }`) —
   identical scope to `journey()`. `TombConstraint = Omit<PyramidConstraint,
   "floors"> & { floors?: FloorConstraint<"tombTreasure">[] }` — same shape,
   one extra reward hint. Tombs resolve through the **same**
   `resolvePyramidConstraintWithProvenance(worldSpec, tomb.id, …)` with the
   same global→tier→journey→pyramid cascade. The fork is ONLY in the builder.

2. **Hint rewards already work on tombs.** `resolveTombReward` (inside
   `buildTombConfigs`) falls through to `hintToReward(reward, tier)`, so
   `mosaicPiece` / `mapPiece` / `hieroglyphs` are already valid tomb
   side-section `endReward`s today. Only two reward kinds are actually blocked
   for tombs:
   - **chests** — `buildTombConfigs` hardcodes `chestEvery: 0`, emits no
     `chestRewards`.
   - **fragmentSlots** — tombs never emit the sentinel, AND `collectSlots`
     skips them (`PYRAMID_JOURNEYS.find(...); if (!journey) continue`).

3. **World-level economy passes are already site-agnostic.**
   `assignFragments` runs over `{ ...pyramidConfigs, ...tombConfigs }`;
   `validateRewardCounts` counts across all sites including tombs. They'd
   already handle tomb rewards if the local emit + `collectSlots` gate allowed
   it.

4. **There are TWO side-section builders** — the module-level
   `buildSideSections` (pyramids) and a local closure of the same name inside
   `buildTombConfigs`. Same gate/endReward/sub-section/decoration mapping;
   differ only in reward resolver. This is the primary duplication to kill.

5. **`fragmentAssigner.ts` + `fragmentAssigner.spec.ts` are DEAD CODE**
   (~324 lines). Only referenced by their own spec. Legacy assigner superseded
   by `configBuilder.assignFragments`. Delete in Phase 0.

6. **The perk / tombKey stream is a stateful ordered allocator** (sequential
   `perkIndex` over `TOMB_PERK_IDS`, tied to run-gating in
   `buildPlacementInfos`). Do NOT try to parameterize this into a per-slot
   resolver — keep it as its own reward strategy.

---

## Locked design decisions

1. **`WORLD_TARGETS` stays hardcoded.** Bump the numbers by hand in Phase 5;
   do not compute targets from the spec.
2. **Tombs opt into rewards by authoring `endReward`s in the DSL** (no new
   preset flag where avoidable — the hint vocabulary already resolves). Tomb
   ward keys (`tombKey` / perks) are released by authoring the proper reward on
   the proper floor/section. **The validator must verify the world stays
   solvable and that discovery order is maintained** — you can never require a
   ward key (or map piece) before a reachable site can hand it out. This
   extends `validateDiscovery` beyond today's mapPiece-reachability check to
   cover ward-key ordering across tombs.
3. **Split into multiple small files** (≈6 new modules). Testing clarity over
   fewer imports.

---

## Guardrail — the golden test (non-negotiable)

`buildConfigs()` must regenerate `src/data/generatedWorld.ts` **byte-identical**
through Phases 0–4. Only Phase 5 changes it, on purpose.

Verify after every change:

```
yarn check-types
yarn vitest run src/worldGen
yarn generate-world && git status --short src/data/generatedWorld.ts
#   clean = byte-identical = behavior preserved
```

Phase 0a adds an automated version of this guard so you don't rely on manual
regeneration alone.

Each phase = its own commit.

---

## Phased plan

### Phase 0 — Safety net + dead-code cleanup *(no behavior change)*
- **0a.** Add `src/worldGen/configBuilder.integration.spec.ts`: assert
  `buildConfigs()` hits `WORLD_TARGETS` exactly (298 mosaic, 36 map pieces) and
  that two runs are deep-equal (determinism). This is the automated golden.
- **0b.** Delete `src/worldGen/fragmentAssigner.ts` +
  `src/worldGen/fragmentAssigner.spec.ts`. Confirm green.
- **0c.** Commit the pending `GLOBAL_DEFAULTS` change if not already committed.

### Phase 1 — Shared reward/gate vocabulary → `rewards.ts`
- Move pure helpers out of `configBuilder`: `hintToReward`, `specToReward`,
  `specToGate`, `pathEndToReward`, `hashStr`, the consumable-roll helper.
- I/O: `(RewardSpec, tier) → TreasureReward`; `(GateSpec) → GateConfig |
  undefined`. Unit-test.
- Golden identical.

### Phase 2 — One generic `buildSideSections(resolveReward)` → `sideSections.ts` *(the big dedup)*
- Merge the module-level pyramid builder AND the tomb-local one into a single
  function parameterized by:
  - `resolveReward: (spec) => TreasureReward | undefined` — pyramid passes
    `specToReward` (+ fragmentSlot sentinel); tomb passes the perk-stream
    allocator.
  - flags for pyramid-only extras: mapPiece branch, tier-unlock ward gate,
    auto-mosaic count, declared side/hidden paths.
- Unit-test both reward modes + gating / color-cycling / sub-sections.
- Golden identical.

### Phase 3 — Extract engine + hot functions into own files
- `buildSite.ts`: `buildFloor(...)`, `wireStaircases(floors)`, and
  `buildSite(constraint, ctx) → FloorConfig[]` (the 3 floor-shape branches:
  authored `floors[]`, auto multi-floor `mainFloors`+`wardWings`, single).
  Tomb path reuses `buildFloor` / `wireStaircases`.
- `mosaics.ts`: `computeMosaicPaths` + unit tests.
- `fragments.ts`: `collectSlots`, `buildPlacementInfos`, `assignFragments` +
  unit tests.
- `validate.ts`: `validateRewardCounts`, `validateDiscovery` + unit tests.
- `configBuilder.ts` shrinks to orchestration: `buildPlan`,
  `assertChestCapacity`, `buildConfigs`.
- Golden identical.
- (This also delivers the earlier standalone ask — testable hot functions —
  as a side effect of the unification.)

### Phase 4 — Capability-based economies *(structural, still byte-identical)*
- Reframe reward placement as capabilities: `placeChests`,
  `emitFragmentSlots`, `emitMosaics`, `emitMapPiece`, `emitPerkStream`. A
  site's preset selects which apply.
- Replace the "is it a pyramid?" gates with "does this site's preset include
  the capability?": the `collectSlots` journey filter, tomb `chestEvery: 0`,
  and the mosaic pyramid-only loop. **Tomb preset still opts into nothing new**,
  so output stays identical.
- Perk/tombKey stream stays a stateful allocator (see key fact #6).
- Golden identical.

### Phase 5 — Enable tomb rewards *(deliberate behavior change)*
- Turn on chests / fragments / mosaics for tombs via DSL-authored `endReward`s
  + preset capability flags. Tomb ward keys released by authored rewards
  (decision #2).
- Include tomb sites in `collectSlots`, `computeMosaicPaths`,
  `assertChestCapacity`.
- **Extend `validateDiscovery`** to check ward-key discovery ordering, not just
  mapPiece reachability: BFS/topological check that no gate (floor-key,
  tomb-key/ward, map piece) is required before a reachable site can grant its
  key. Fail loud with the offending site + missing key.
- Update `WORLD_TARGETS` to the new counts (hardcoded — decision #1).
- Regenerate; **review the diff intentionally**; commit new
  `generatedWorld.ts`.
- Add DSL examples: a tomb with a chest side path and a mosaic side path.

---

## Scope notes / non-goals (ponytail)

- Do NOT touch the resolver / DSL cascade — already unified.
- Do NOT merge the perk stream into a generic resolver — legitimately
  different.
- Phases 0–3 are pure refactor and independently valuable. Safe stopping point
  if priorities change: you get the dedup + tests with zero behavior change.
- Prefer authoring over new DSL fields (decision #2): reach for a new preset
  flag only when authored `endReward`s can't express the intent.

## Reference — files in play

| File | Role |
| --- | --- |
| `src/worldGen/configBuilder.ts` | the fork to dismantle; orchestration stays |
| `src/worldGen/dsl.ts` | `tomb()`/`journey()`/`tier()`/`global()`, constraint types |
| `src/worldGen/constraintResolver.ts` | cascade + provenance (leave alone) |
| `src/worldGen/data.ts` | `PYRAMID_JOURNEYS`, `TOMB_JOURNEYS`, `TOMB_SYMBOLS`, `HIEROGLYPH_REQUIRED`, `chestEveryFor`/`chestCountFor` |
| `src/worldGen/worldSpec.ts` | `WORLD_TARGETS`, assembled rule list |
| `src/worldGen/spec/*.ts` | authored rules (global + per-tier + tombs) |
| `src/worldGen/serializer.ts` | emits `generatedWorld.ts` |
| `scripts/generateWorld.ts` | entry: validate → build → serialize |
| `src/worldGen/fragmentAssigner.ts` | DEAD — delete (Phase 0) |
