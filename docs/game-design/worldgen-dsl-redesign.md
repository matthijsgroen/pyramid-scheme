# World-Gen DSL Redesign

Status: design doc · in progress, not yet fully implemented · started 2026-07-05  
Companion to: `docs/game-design/loot-distribution.md` (current, shipped fragment-assignment algorithm), `docs/game-design/pyramid-interior-design.md`

---

## Why this exists

The world-gen DSL (`src/worldGen/dsl.ts`, `src/worldGen/configBuilder.ts`, `src/worldGen/data.ts`) grew one field at a time, and several fields ended up with **implicit magic**: a value the author writes gets silently transformed, scaled, or ignored by a hardcoded formula, rather than being taken literally or requiring explicit opt-in.

The trigger case: `pathPuzzles` used to always auto-scale ±1 across a journey's pyramids via a hardcoded `scalePP` formula — even overriding an explicit single-pyramid value, and even refusing to let an author set `0`. Fixed by making a bare number always literal, and introducing an explicit `PathPuzzlesRange {start, end}` that only interpolates when authored.

Guiding principle for everything below: **as little magic as possible, unless specifically authored.** Enums/presets are fine as named shorthand for common cases, but there must always be a literal escape hatch, and the enum's meaning must be defined once, not duplicated with diverging values in multiple places.

This doc tracks the *design*, layer by layer. Implementation happens afterward, in small passes, once a layer's design is settled — see [Implementation status](#implementation-status) at the bottom.

---

## The four layers

The DSL's authorable surface splits into four layers, each with its own kind of "how much should the author have to say" question:

| Layer | Concerns | Status |
|---|---|---|
| **Structure** | puzzle/path/chest/gate counts and shapes | Designed, mostly shipped |
| **Loot** | which reward goes where — hieroglyphs, map pieces, consumables, mosaic pieces, tomb treasures | Designed for the fragment/rank mechanism; one known bug and one dead type still open |
| **Population** | which puzzle/trap family fills a room, and at what difficulty | Not yet started |
| **Decoration** | tile/decoration/effect visual pools | Not yet started |

A field can straddle layers — e.g. a mosaic side path's puzzle *count* is Structure, but *which reward* it delivers and *how many world-wide* is Loot. When that happens, keep the mechanical shape matching whichever layer's convention governs the field's unit (see "the shared value model" below), and place the field in code/types next to whichever layer it's conceptually about.

---

## The shared value model

Every "how much / how many" field in the DSL should resolve to one of these, chosen by what unit the field actually is — not forced into one universal shape:

| Unit kind | Literal escape hatch | Named-shorthand form | Notes |
|---|---|---|---|
| **A count spread across an ordered sequence** (e.g. pyramids in a journey) | bare `number` (applies identically to every position) | `PathPuzzlesRange {start, end}` — linear interpolation from the first position to the last | Position-dependent. Only used for `pathPuzzles` today. |
| **A single sampled count** (e.g. how many side paths on this one pyramid) | bare `number` or a literal `SampleRange {min, max}` | `SideIntensity` enum (`none`/`low`/`medium`/`dense`) as presets for `SampleRange` | Position-independent, seeded-random within the band when a range. One definition, used everywhere `SideIntensity` appears — no more diverging enum→number mappings per call site. |
| **A fraction/proportion** (e.g. what % of paths get key-gated) | bare `number` (0–1) | an intensity enum mapping to a fixed fraction, if useful | Never a range — a fraction doesn't need sampling, it's deterministic once chosen. |
| **A solver allocation constraint** (Loot only — see below) | `SampleRange {min, max}` reinterpreted as *"the allocator may satisfy this slot with between min and max of its capacity from this pool"* | omitting the field = fully unconstrained band | Same shape as the sampling range, different consumer: a deterministic constraint the assignment algorithm must satisfy, not a random draw. |

`PathPuzzlesPreset` (`"tiny"|"small"|"medium"|"large"|"huge"`) is **dead** — accepted by the type system on `pathPuzzles` fields but never resolved by any code path (silently drops to `0`/the journey default wherever it's used). To be deleted once literal-number + `PathPuzzlesRange` fully cover pathPuzzles (they do).

---

## Structure layer — decisions

1. **`pathPuzzles`** *(shipped)*. Bare number = literal, everywhere it resolves (tier, journey, or a specific pyramid selector) — no auto-scaling ever happens to an explicit value. `PathPuzzlesRange {start, end}` interpolates linearly from the journey's first pyramid to its last, only when authored. Journey-default data (`PYRAMID_PATH_PUZZLES` in `data.ts`) is itself expressed as ranges now, replacing the old `scalePP(basePP±1)` formula.

2. **`SideIntensity` unification** *(designed, not yet shipped)*. Today there are two different, disagreeing mappings for the same enum:
   - `INTENSITY_PATHS` (`configBuilder.ts`): fixed `{none:0, low:1, medium:2, dense:4}`, used when `sideSections` is a bare `SideIntensity` string.
   - `pathCountForDensity` (`configBuilder.ts`): seeded-random `medium→2-or-3`, `dense→4-or-5`, used for `sidePaths`/`hiddenPaths` entries.

   These collapse into one definition: `SampleRange` presets (`none:{0,0}, low:{1,1}, medium:{2,3}, dense:{4,5}`), sampled the same way everywhere the enum is used — including the previously-fixed `sideSections` bare-enum case, which will start sampling instead of always taking the fixed value. This is an accepted, deliberate behavior change (minor balance drift) in exchange for "dense" meaning the same thing everywhere. A literal `SampleRange` is also directly authorable in place of the enum.

3. **`keyDensity`** *(designed, not yet shipped)*. Stays an enum-to-fraction mapping (`DENSITY_FRACTION`), but gets a literal number (0–1) escape hatch alongside it. No `SampleRange` involved — it's a fraction, not a count, so sampling doesn't apply.

4. **`mosaicPathPuzzles`** *(designed, not yet shipped)*. Today's mosaic side-path puzzle count is `Math.round(mainPathPuzzles / 3)` with zero override — the last remaining count in the DSL with no opt-in at all. Gets a plain literal-number override, same mechanical shape as every other `pathPuzzles` field, defaulting to the `/3` formula when unset. Placed conceptually next to `consumableDensity`/`consumableRates` in the type (it's Loot-adjacent — governs a side path that exists to deliver mosaic-piece loot — but mechanically it's just another literal count, not a new abstraction).

---

## Loot layer — decisions

### Placement modes

Every reward type uses one of three placement modes:

- **No global target** — pure local proportion or fallback, no world-wide count to hit. E.g. consumables (`consumableDensity`/`consumableRates`), the generic "hieroglyphs" filler reward.
- **Fixed total, explicit + validated** — the author places every instance by hand (because the reward carries an identity only the author can supply, e.g. a map piece's `tombId`); a validator throws if the world-wide sum doesn't match the target (`validateRewardCounts`, `WORLD_TARGETS.mapPieceRewards`).
- **Fixed total, engine-assigned** — the reward is anonymous at authoring time (which specific piece/symbol it resolves to is decided downstream); the engine auto-fills placement to hit the target, optionally around some explicit declarations (mosaic pieces via `computeMosaicPaths`, hieroglyph fragments via `assignFragments`).

The rule of thumb: **identity-bearing rewards must be explicit; anonymous rewards can be auto-filled; proportions need neither.**

### Rank — a new tomb-local ordering concept

**Problem this solves:** the world is generated statically (all loot placed ahead of time, not reactively per the old pre-redesign system where the game looked up what you needed and handed it to you on chest-open). That means hieroglyph fragments can end up placed somewhere the player reaches long before — or long after — the tableau that actually needs them, either wasting the pickup or soft-locking progress. `tableauLevels` (`src/data/tableaus.ts`) already assigns each tomb floor/run a `runNumber` and the specific hieroglyph `inventoryIds` it requires; `FRAGMENT_MATRIX`/`HIEROGLYPH_REQUIRED` already derive fragment counts from it. What's missing is a way for the *pyramid* side of the world (where fragments actually get placed) to declare its relationship to that tomb-side sequencing.

**`rank`** is a tomb-local ordinal, authorable on **any gated path** — a tomb floor's main path, or a gated side-section within a floor (not floor-only, to support future ward-gated branches carrying their own rank independent of which floor they live on). It references an existing `tableauLevels` `runNumber` directly rather than inventing a second numbering scheme to keep in sync.

Tagging a path with a rank derives, automatically:
- every puzzle on that path becomes a tableau testing that rank's required `inventoryIds`
- the path's terminal treasure becomes that rank's designated reward

This replaces separately authoring `puzzleFamily: "tableau"` and `mainEndReward: "tombTreasure"` per floor and trusting floor-array order to line them up with the right `runNumber` — rank *is* the runNumber reference, so there's nothing left to fall out of sync. It also sidesteps the ward-gate-branching ordering problem entirely (see below) — rank isn't computed from a reachability graph, it's already sitting there as hand-authored data in `tableauLevels`.

**Rank and host-location are independent axes.** A tomb's own rank sequence is entirely internal to that tomb. Where in the wide world a rank's required hieroglyphs are *hosted* (which tier/pyramids can drop them) is a separate, deliberately-decoupled concern — a rank's fragments can legitimately be hosted much later than the rank's own tier, as an intentional "full completion requires backtracking after reaching further content" design (formalizing what today's `FRAGMENT_MATRIX`'s `revisit` bucket only gestures at, tier-wide and implicitly).

### Pyramid-side fragment declarations

A pyramid-side path declares which rank-pool(s) it may supply, via an extension of the existing `end: "fragment"` path-entry mechanism (not a new parallel field — a ranked fragment is still just a `TreasureReward` of the same shape):

```ts
{ density: "medium", pathPuzzles: 1, end: "fragment", rankPools: {
  "junior-rank-3": { min: 0.6, max: 1.0 },
  "expert-rank-4": { min: 0, max: 0.4 },
}}
```

- Bare `end: "fragment"` (no `rankPools`) = fully unconstrained — the allocator may satisfy any rank from this slot. This is the loosest possible band, not "no preference resolved to a default."
- A declared `rankPools` map reuses the `SampleRange {min, max}` shape from the Structure layer, but **reinterpreted as a solver constraint band**, not a random sample: *"this slot may satisfy between min and max of its capacity toward this rank-pool."* A narrow band (or a single pool pinned to `{1,1}`) gives the allocator little room to redistribute; a wide/omitted band gives it freedom to guarantee a solution.

### Fragment assignment becomes a deterministic solver

Today's algorithm (documented in `docs/game-design/loot-distribution.md`) already has the right *intent* — `preferredWardKeys` derived from `runNumber`, three priority pools tried in order, ward-aware placement — but it's a **soft preference with silent fallback**, not a guarantee: if pool 0 (ward-preferred) comes up empty, it quietly falls through to pool 1, then pool 2, with no author control over how far it's allowed to drift and no error if the drift means a rank's requirement lands somewhere unreachable.

The redesign replaces this with a constraint solver: for every rank, every required hieroglyph count must be satisfiable by slots that are (a) gate-reachable before that rank's gate, and (b) within the `rankPools` bands authored on those slots. **If no valid assignment exists, world generation fails at build time with a specific, named error** — same pattern as today's `assertChestCapacity` message (names the tomb, the rank, and what's insufficient) — rather than silently shipping a world where a tableau's fragments can't all be collected in time.

### Deferred (identified, not solved by this design)

- **`consumableRates` inconsistency** — it's honored by `buildChestRewards` but silently ignored by `pathEndToReward`'s consumable branch and `assignFragments`'s fallback fill, which both hardcode their own split. This is a bug to fix (make it consistent everywhere), not a design question — no redesign needed, just wiring.
- **Dead `PathPuzzlesPreset` type** — delete once the pathPuzzles literal/range shipped work is confirmed stable; nothing currently resolves it and it's misleading to leave in the type.

---

## Population layer — not yet designed

Puzzle/trap family selection and difficulty scaling. Revisit next session.

## Decoration layer — not yet designed

Tile/decoration/effect visual pools. Revisit next session.

---

## Next steps (in order)

1. Continue this design for **Population** and **Decoration**.
2. Once all four layers are designed, design how to *express* all of this in a readable DSL/builder syntax (the current builder-chain style in `src/worldGen/dsl.ts` — `tier(...).set(...).sidePaths(...).settings(...)` — needs to accommodate `rank`, `rankPools`, and whatever Population/Decoration need, without becoming unreadable).
3. Implement in small passes, each independently shippable:
   - `SideIntensity` → `SampleRange` unification
   - `keyDensity` literal override
   - `mosaicPathPuzzles` literal override
   - `consumableRates` consistency fix
   - delete dead `PathPuzzlesPreset`
   - `rank` concept + tomb-side authoring
   - pyramid-side `rankPools` declarations + solver-based fragment assignment + build-time validator error

---

## Implementation status

| Item | Status |
|---|---|
| `pathPuzzles` literal + `PathPuzzlesRange` | Shipped |
| `SideIntensity` → `SampleRange` unification | Designed, not implemented |
| `keyDensity` literal override | Designed, not implemented |
| `mosaicPathPuzzles` literal override | Designed, not implemented |
| `consumableRates` consistency fix | Identified, not implemented |
| Dead `PathPuzzlesPreset` removal | Identified, not implemented |
| `rank` / `rankPools` / solver-based fragment assignment | Designed, not implemented |
| Population layer | Not designed |
| Decoration layer | Not designed |
| DSL/builder syntax for all of the above | Not designed |
