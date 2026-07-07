# World-Gen DSL Redesign

Status: design doc · in progress, not yet fully implemented · started 2026-07-05  
Companion to: `docs/game-design/loot-distribution.md` (current, shipped fragment-assignment algorithm), `docs/game-design/pyramid-interior-design.md`

---

## Why this exists

The world-gen DSL (`src/worldGen/dsl.ts`, `src/worldGen/configBuilder.ts`, `src/worldGen/data.ts`) grew one field at a time, and several fields ended up with **implicit magic**: a value the author writes gets silently transformed, scaled, or ignored by a hardcoded formula, rather than being taken literally or requiring explicit opt-in.

The trigger case: `pathPuzzles` used to always auto-scale ±1 across a journey's pyramids via a hardcoded `scalePP` formula — even overriding an explicit single-pyramid value, and even refusing to let an author set `0`. Fixed by making a bare number always literal, and introducing an explicit `PathPuzzlesRange {start, end}` that only interpolates when authored.

Guiding principle for everything below: **as little magic as possible, unless specifically authored.** Enums/presets are fine as named shorthand for common cases, but there must always be a literal escape hatch, and the enum's meaning must be defined once, not duplicated with diverging values in multiple places.

This doc tracks the _design_, layer by layer. Implementation happens afterward, in small passes, once a layer's design is settled — see [Implementation status](#implementation-status) at the bottom.

---

## The four layers

The DSL's authorable surface splits into four layers, each with its own kind of "how much should the author have to say" question:

| Layer          | Concerns                                                                                      | Status                                                                               |
| -------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Structure**  | puzzle/path/chest/gate counts and shapes                                                      | Designed, mostly shipped                                                             |
| **Loot**       | which reward goes where — hieroglyphs, map pieces, consumables, mosaic pieces, tomb treasures | Designed for the fragment/rank mechanism; one known bug and one dead type still open |
| **Population** | which puzzle/trap family fills a room, and at what difficulty                                 | Designed, not implemented                                                            |
| **Decoration** | tile/decoration/effect visual pools                                                           | Designed, not implemented                                                            |

A field can straddle layers — e.g. a mosaic side path's puzzle _count_ is Structure, but _which reward_ it delivers and _how many world-wide_ is Loot. When that happens, keep the mechanical shape matching whichever layer's convention governs the field's unit (see "the shared value model" below), and place the field in code/types next to whichever layer it's conceptually about.

---

## The shared value model

Every "how much / how many" field in the DSL should resolve to one of these, chosen by what unit the field actually is — not forced into one universal shape:

| Unit kind                                                                    | Literal escape hatch                                                                                                                      | Named-shorthand form                                                                       | Notes                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A count spread across an ordered sequence** (e.g. pyramids in a journey)   | bare `number` (applies identically to every position)                                                                                     | `PathPuzzlesRange {start, end}` — linear interpolation from the first position to the last | Position-dependent. Shipped for `pathPuzzles`; the same `{start, end}` shape is reused as-is (not renamed, not reimplemented) for any journey-interpolated numeric puzzle-tuning knob — see Population. Only valid at `PyramidConstraint` scope, where "position in the journey" exists; not on `FloorConstraint`/`SideSectionConstraint` fields of the same unit kind. |
| **A single sampled count** (e.g. how many side paths on this one pyramid)    | bare `number` or a literal `SampleRange {min, max}`                                                                                       | `SideIntensity` enum (`none`/`low`/`medium`/`dense`) as presets for `SampleRange`          | Position-independent, seeded-random within the band when a range. One definition, used everywhere `SideIntensity` appears — no more diverging enum→number mappings per call site.                                                                                                                                                                                       |
| **A fraction/proportion** (e.g. what % of paths get key-gated)               | bare `number` (0–1)                                                                                                                       | an intensity enum mapping to a fixed fraction, if useful                                   | Never a range — a fraction doesn't need sampling, it's deterministic once chosen.                                                                                                                                                                                                                                                                                       |
| **A solver allocation constraint** (Loot only — see below)                   | `SampleRange {min, max}` reinterpreted as _"the allocator may satisfy this slot with between min and max of its capacity from this pool"_ | omitting the field = fully unconstrained band                                              | Same shape as the sampling range, different consumer: a deterministic constraint the assignment algorithm must satisfy, not a random draw.                                                                                                                                                                                                                              |
| **A weighted categorical selection** (e.g. which puzzle family fills a room) | bare enum value (literal, every position in scope)                                                                                        | a weight map `Partial<Record<TEnum, number>>` (e.g. `{sumplete: 3, tableau: 1}`)           | Population only, see below. Position-independent, seeded-random per room. No preset enum — with only a couple of categories the weight map itself is already the shorthand.                                                                                                                                                                                             |

`PathPuzzlesPreset` (`"tiny"|"small"|"medium"|"large"|"huge"`) is **dead** — accepted by the type system on `pathPuzzles` fields but never resolved by any code path (silently drops to `0`/the journey default wherever it's used). To be deleted once literal-number + `PathPuzzlesRange` fully cover pathPuzzles (they do).

---

## Structure layer — decisions

1. **`pathPuzzles`** _(shipped)_. Bare number = literal, everywhere it resolves (tier, journey, or a specific pyramid selector) — no auto-scaling ever happens to an explicit value. `PathPuzzlesRange {start, end}` interpolates linearly from the journey's first pyramid to its last, only when authored. Journey-default data (`PYRAMID_PATH_PUZZLES` in `data.ts`) is itself expressed as ranges now, replacing the old `scalePP(basePP±1)` formula.

2. **`SideIntensity` unification** _(designed, not yet shipped)_. Today there are two different, disagreeing mappings for the same enum:
   - `INTENSITY_PATHS` (`configBuilder.ts`): fixed `{none:0, low:1, medium:2, dense:4}`, used when `sideSections` is a bare `SideIntensity` string.
   - `pathCountForDensity` (`configBuilder.ts`): seeded-random `medium→2-or-3`, `dense→4-or-5`, used for `sidePaths`/`hiddenPaths` entries.

   These collapse into one definition: `SampleRange` presets (`none:{0,0}, low:{1,1}, medium:{2,3}, dense:{4,5}`), sampled the same way everywhere the enum is used — including the previously-fixed `sideSections` bare-enum case, which will start sampling instead of always taking the fixed value. This is an accepted, deliberate behavior change (minor balance drift) in exchange for "dense" meaning the same thing everywhere. A literal `SampleRange` is also directly authorable in place of the enum.

3. **`keyDensity`** _(designed, not yet shipped)_. Stays an enum-to-fraction mapping (`DENSITY_FRACTION`), but gets a literal number (0–1) escape hatch alongside it. No `SampleRange` involved — it's a fraction, not a count, so sampling doesn't apply.

4. **`mosaicPathPuzzles`** _(designed, not yet shipped)_. Today's mosaic side-path puzzle count is `Math.round(mainPathPuzzles / 3)` with zero override — the last remaining count in the DSL with no opt-in at all. Gets a plain literal-number override, same mechanical shape as every other `pathPuzzles` field, defaulting to the `/3` formula when unset. Placed conceptually next to `consumableDensity`/`consumableRates` in the type (it's Loot-adjacent — governs a side path that exists to deliver mosaic-piece loot — but mechanically it's just another literal count, not a new abstraction).

5. **`packing`** _(shipped)_. There was no author knob for overall map tightness at all — only `corridorStraightness`, which governs corridor _shape_ (windy vs. straight), not how long the walk is. History: an earlier "packed" layout clustered main-path content right after the entrance, leaving a long unused corridor tail to the exit (fixed in `d7d6644`, refined in `7d7aa4d`/#94 by spreading content evenly across the whole path). That fix is kept as-is — it's a placement-order concern, distinct from what `packing` addresses.

   `packing` went through two designs before landing on the right one:
   - **First cut**: a multiplier on `siteAssembler.ts`'s grid-size (`N`) growth formula. Barely moved `N` in practice — the formula's dominant term (`minCells * 4`) stayed fixed, so `packing` only nudged a small additive slack term.
   - **Second cut**: fixed the formula so `packing` scaled everything beyond the bare content minimum, not just the slack. `N` now responded strongly — but in-Storybook testing showed the _visible_ corridor still didn't shorten the way authors would expect at low `packing`. Root cause: `buildMaze`'s exit selection always picked the spanning tree's true farthest node — which is, by definition, the longest possible route the maze can offer, almost regardless of grid size. Shrinking the grid just drew that same "as long as physically possible" path in a smaller arena; it never made the path _short relative to its content_.
   - **Final design**: `packing` now targets the main path's actual length directly. `buildMaze` picks the node closest to a target distance (`mainPathCells` hops at `packing=0`, scaling up to `mainPathCells * 6` at `packing=1` — today's rough default feel — and beyond above that), falling back to the true farthest node only if the grid is too small to reach the target. Grid size (`N`) is sized to comfortably contain whichever is bigger: the content itself, or enough room for a path of the targeted length to exist; it's a derived consequence now, not the primary lever. Target distance deliberately scales off `mainPathCells` (entrance + the main path's own content + goal + exit) rather than the fuller `minCells` (which also folds in every side-section's cost) — caught via more in-Storybook testing, since a floor with two chunky gated sections was getting a visibly longer main path than one with none at the same `packing`, even though side-section content branches _off_ the main path rather than extending it.
   - **Extended to side/gated sections.** A gated section's chain was always _exactly_ `pathPuzzles + gate + end` cells — deaf to both `packing` and `corridorStraightness`, no matter how spacious or winding the rest of the floor got. Fixed by reusing the identical `paddedChainLength` formula (not a separate, lighter-touch one — one mental model for "how long is a walk," main path or side path alike) to pad every section's and sub-section's chain, and a new shared `spreadContentIndices` helper (also now used by the main path, replacing its own duplicate inline version) to interleave puzzles/chests across that padded length instead of packing them all at the front with the padding trailing behind. Surfaced and fixed a real, previously-uncovered indexing bug along the way: sub-section content was indexed as `cells[(contentStart + pi) * 2]` instead of `cells[contentStart + pi]` — harmless for a single-puzzle sub-section (index 0 either way), silently wrong or out-of-bounds for anything larger, and invisible until this pass added the first test exercising a multi-puzzle sub-section.

   Chain-resolved the same way `corridorStraightness` already is (tier → journey → pyramid → floor), living next to it in `FloorConstraint`/`PyramidConstraint`. Two independent dials, same shape, no interaction between them.

---

## Loot layer — decisions

### Placement modes

Every reward type uses one of three placement modes:

- **No global target** — pure local proportion or fallback, no world-wide count to hit. E.g. consumables (`consumableDensity`/`consumableRates`), the generic "hieroglyphs" filler reward.
- **Fixed total, explicit + validated** — the author places every instance by hand (because the reward carries an identity only the author can supply, e.g. a map piece's `tombId`); a validator throws if the world-wide sum doesn't match the target (`validateRewardCounts`, `WORLD_TARGETS.mapPieceRewards`).
- **Fixed total, engine-assigned** — the reward is anonymous at authoring time (which specific piece/symbol it resolves to is decided downstream); the engine auto-fills placement to hit the target, optionally around some explicit declarations (mosaic pieces via `computeMosaicPaths`, hieroglyph fragments via `assignFragments`).

The rule of thumb: **identity-bearing rewards must be explicit; anonymous rewards can be auto-filled; proportions need neither.**

### Rank — a new tomb-local ordering concept

**Problem this solves:** the world is generated statically (all loot placed ahead of time, not reactively per the old pre-redesign system where the game looked up what you needed and handed it to you on chest-open). That means hieroglyph fragments can end up placed somewhere the player reaches long before — or long after — the tableau that actually needs them, either wasting the pickup or soft-locking progress. `tableauLevels` (`src/data/tableaus.ts`) already assigns each tomb floor/run a `runNumber` and the specific hieroglyph `inventoryIds` it requires; `FRAGMENT_MATRIX`/`HIEROGLYPH_REQUIRED` already derive fragment counts from it. What's missing is a way for the _pyramid_ side of the world (where fragments actually get placed) to declare its relationship to that tomb-side sequencing.

**`rank`** is a tomb-local ordinal, authorable on **any gated path** — a tomb floor's main path, or a gated side-section within a floor (not floor-only, to support future ward-gated branches carrying their own rank independent of which floor they live on). It references an existing `tableauLevels` `runNumber` directly rather than inventing a second numbering scheme to keep in sync.

Tagging a path with a rank derives, automatically:

- every puzzle on that path becomes a tableau testing that rank's required `inventoryIds`
- the path's terminal treasure becomes that rank's designated reward

This replaces separately authoring `puzzleFamily: "tableau"` and `mainEndReward: "tombTreasure"` per floor and trusting floor-array order to line them up with the right `runNumber` — rank _is_ the runNumber reference, so there's nothing left to fall out of sync. It also sidesteps the ward-gate-branching ordering problem entirely (see below) — rank isn't computed from a reachability graph, it's already sitting there as hand-authored data in `tableauLevels`.

**Rank and host-location are independent axes.** A tomb's own rank sequence is entirely internal to that tomb. Where in the wide world a rank's required hieroglyphs are _hosted_ (which tier/pyramids can drop them) is a separate, deliberately-decoupled concern — a rank's fragments can legitimately be hosted much later than the rank's own tier, as an intentional "full completion requires backtracking after reaching further content" design (formalizing what today's `FRAGMENT_MATRIX`'s `revisit` bucket only gestures at, tier-wide and implicitly).

### Pyramid-side fragment declarations

A pyramid-side path declares which rank-pool(s) it may supply, via an extension of the existing `end: "fragment"` path-entry mechanism (not a new parallel field — a ranked fragment is still just a `TreasureReward` of the same shape):

```ts
{ density: "medium", pathPuzzles: 1, end: "fragment", rankPools: {
  "junior-rank-3": { min: 0.6, max: 1.0 },
  "expert-rank-4": { min: 0, max: 0.4 },
}}
```

- Bare `end: "fragment"` (no `rankPools`) = fully unconstrained — the allocator may satisfy any rank from this slot. This is the loosest possible band, not "no preference resolved to a default."
- A declared `rankPools` map reuses the `SampleRange {min, max}` shape from the Structure layer, but **reinterpreted as a solver constraint band**, not a random sample: _"this slot may satisfy between min and max of its capacity toward this rank-pool."_ A narrow band (or a single pool pinned to `{1,1}`) gives the allocator little room to redistribute; a wide/omitted band gives it freedom to guarantee a solution.

### Fragment assignment becomes a deterministic solver

Today's algorithm (documented in `docs/game-design/loot-distribution.md`) already has the right _intent_ — `preferredWardKeys` derived from `runNumber`, three priority pools tried in order, ward-aware placement — but it's a **soft preference with silent fallback**, not a guarantee: if pool 0 (ward-preferred) comes up empty, it quietly falls through to pool 1, then pool 2, with no author control over how far it's allowed to drift and no error if the drift means a rank's requirement lands somewhere unreachable.

The redesign replaces this with a constraint solver: for every rank, every required hieroglyph count must be satisfiable by slots that are (a) gate-reachable before that rank's gate, and (b) within the `rankPools` bands authored on those slots. **If no valid assignment exists, world generation fails at build time with a specific, named error** — same pattern as today's `assertChestCapacity` message (names the tomb, the rank, and what's insufficient) — rather than silently shipping a world where a tableau's fragments can't all be collected in time.

### Deferred (identified, not solved by this design)

- **`consumableRates` inconsistency** — it's honored by `buildChestRewards` but silently ignored by `pathEndToReward`'s consumable branch and `assignFragments`'s fallback fill, which both hardcode their own split. This is a bug to fix (make it consistent everywhere), not a design question — no redesign needed, just wiring.
- **Dead `PathPuzzlesPreset` type** — delete once the pathPuzzles literal/range shipped work is confirmed stable; nothing currently resolves it and it's misleading to leave in the type.

---

## Population layer — decisions

### Family selection is a weighted pool, not a magic array

**Problem:** `puzzleFamily?: PuzzleFamily | PuzzleFamily[]` accepts an array today, but nothing anywhere samples from it — it's dead syntax. Meanwhile `consumableRates: {bandage, oil, trapTool}` already establishes the right shape for "mix of categorical options" elsewhere in this same DSL.

**Decision:** reuse that shape instead of inventing a new one. `puzzleFamily` becomes:

```ts
puzzleFamily?: PuzzleFamily | Partial<Record<PuzzleFamily, number>>
```

- Bare `PuzzleFamily` (unchanged) = literal, every puzzle room in scope uses that family.
- A weight map = each puzzle room in scope independently samples (seeded random, weighted) from the pool. `{sumplete: 3, tableau: 1}` → roughly 3-in-4 rooms sumplete.
- No enum shorthand (no `"dense"`/`"mixed"` presets) — with only two-to-three families, the weight map _is_ the shorthand; a named preset would just be duplicating a map that's already this short.
- Sampling is per-room (finest available granularity), not once-per-scope — consistent with how side-path auto-distribution already treats individual paths independently rather than picking one family for a whole section.

This is a **new unit kind** for the shared value model — "weighted categorical selection" — distinct from `SampleRange` (which samples a magnitude) and fraction (a single deterministic proportion). Add it as a fifth row: literal escape hatch = bare value, named-shorthand = a weight map (not a preset enum), consumer = per-position independent seeded sample.

**Trap families**: no trap family type exists yet (`PathEntry.trapped` is a bare boolean). Nothing to design until a second trap type ships — when it does, it should reuse this exact same weight-map mechanism, not a parallel one.

### Rank forces tableau — and that's not the magic-override anti-pattern

A `rank`-tagged path's puzzles are _definitionally_ tableau (they test that rank's `inventoryIds` — no other family could satisfy the requirement). This looks like the same "silent override" shape this whole redesign exists to kill, but it isn't: `pathPuzzles`'s old bug silently discarded an author's stylistic choice with a formula; here, `rank` is a Loot-layer content requirement that makes any other family choice _incoherent_, not just unwanted.

To keep this from being ambiguous in practice: authoring `puzzleFamily`/a weight map on the same scope as `rank` is a **build-time error** (named, same pattern as `assertChestCapacity`) — not a silent ignore. If you meant rank's forced tableau, don't also author a family; if you authored a family, you can't also author rank on that scope.

### Family tags — sugar over the weight map, not a new selection engine

**Use case:** "this pyramid only has time puzzles" — picking a _curated named group_ of families, not hand-listing each one with a weight.

**Decision:** each family in the `PUZZLE_FAMILIES.md` catalogue gets a `tags` field (fixed enum, defined once next to the catalogue — not a free-form string like `Theme`, so `"time"` can't silently fork into `"Time"`/`"clock"` variants). The DSL gains one more literal form for `puzzleFamily`:

```ts
puzzleFamily?: PuzzleFamily | Partial<Record<PuzzleFamily, number>> | { tag: FamilyTag }
```

`{ tag: "time" }` expands to a uniform weight map over every family carrying that tag, _at build time, before sampling runs_ — it's sugar for the weight map, not a second sampling mechanism. If you need to weight within a tag (e.g. favor sundial over water-clock among "time" families), just write the weight map by hand; the tag form is for the common case of "any of these, no preference."

### Puzzle skin — widen `theme`'s reach, not a new field

**Use case:** "a subset of this pyramid's puzzles render in a night theme."

**Decision:** `theme` (`Theme = string`, currently `PyramidConstraint`-only) is promoted into the same chain-resolution pattern `difficulty`/`puzzleFamily` already use — authorable at pyramid, floor, or side-section scope, most-specific wins. A family's `Component` renderer looks up a skin registered for the resolved theme; if none is registered for that theme, it falls back to the family's default skin. No new field, no new authoring concept — `theme` was just missing the override depth every other Population field already has.

### Per-family difficulty knobs (`puzzleTuning`)

**Use case:** the old `journeys.ts`/`PyramidLevelSettings` system lets an author tune concrete generation knobs (floor count, open/blocked block count, number range, `useMultiplesOf`) per journey for the pyramid-exterior puzzle. `journeys.ts` stays exactly as-is — it manages pyramid _exteriors_; world-gen manages _interiors_ — but the interior puzzle plugins (`Tableau`, `Sumplete`, `Crocodile`, and whatever's added later) have no equivalent: each plugin's `generate(seed, {difficulty, theme})` looks up a hardcoded `Record<Difficulty, Config>` table internal to that plugin, invisible to the DSL. worldGen picks _which_ family and _which_ difficulty tier; it has no way to touch what's inside that tier's config.

**Decision:** a generic, per-family, patch-only override, chain-resolved like every other Population field:

```ts
type NumericKnob = number | SampleRange | PathPuzzlesRange   // literal | single sample | interpolate across journey (pyramid scope only)

// each family's plugin file owns and exports its own knob type — no shared god-object
type FamilyKnobs = {
  sumplete:  { gridSize?: NumericKnob; duplicatesPerRow?: NumericKnob; numberRange?: [number, number] }
  tableau:   { floorCount?: NumericKnob; openBlockCount?: NumericKnob; blockedBlockCount?: NumericKnob; numberRange?: [number, number]; useMultiplesOf?: number }
  crocodile: { /* its own knobs, same convention */ }
}

puzzleTuning?: { [F in PuzzleFamily]?: Partial<FamilyKnobs[F]> }
```

- Lives on `PyramidConstraint`, `FloorConstraint`, and `SideSectionConstraint` — same three types `difficulty`/`puzzleFamily` already live on, so it inherits the identical resolution reach (global → tier → journey → pyramid → floor → side-section, including nested sub-sections).
- **Patch, not replace**: an authored key overrides just that key in the plugin's own difficulty-table entry for the resolved tier; every unset key still comes from the plugin's existing default table. Same "explicit always wins, nothing else silently changes" rule as everywhere else in this doc.
- **Folds in the "featured number" use case** — `numberRange`/`useMultiplesOf` on `tableau`'s knobs _is_ that use case, not a separate mechanism. No generic opaque "flavor" bag needed; a family that has no notion of a featured number (e.g. a future Latin-square family) simply has no such key in its `FamilyKnobs` entry — nothing to ignore, nothing to error on.
- `NumericKnob`'s range form reuses `PathPuzzlesRange`'s exact shape and its exact scope restriction (pyramid-level only; floor/side-section knobs collapse to `number | SampleRange`) — no third range type invented for this.

### Difficulty — no change needed

Difficulty is already enum-only, chain-resolved (global → tier → journey → pyramid → floor), and correctly wired everywhere it's read — no bug, no dead syntax. It's a discrete tier selector into difficulty-tuned content elsewhere (which `puzzleTuning` now lets an author patch directly), not a continuous magnitude itself, so it doesn't need its own numeric escape hatch. Leaving as-is; revisit only if a concrete need for finer-than-5-tiers granularity shows up.

### Difficulty _shaping_ across a path — deferred, not designed

A separate idea surfaced during this design pass: controlling how difficulty _varies room-to-room_ within one path (e.g. "one hard puzzle, three easy ones"), possibly via a point-budget model (each tier costs points; a path gets a budget; the allocator fills the path's already-fixed room count with tiers whose costs sum near the budget). This is explicitly **parked**, not designed: it requires inventing a per-tier cost curve that doesn't exist anywhere in the game today (game-balance work, not DSL plumbing), and the concrete example is already covered without it by combining existing per-scope `difficulty` overrides (author a harder difficulty at one specific room-scope, easier at the rest). Revisit only if hand-authoring per-scope difficulty proves too tedious in practice.

## Decoration layer — decisions

### Superseded: the per-theme pool idea below is replaced by dressing rules

An earlier pass at this layer (kept below crossed out for history) proposed a per-theme default for the existing `DecorationKind[]` pool. Once ambient sprite-sheet dressing entered the picture, `DecorationKind`'s whole model — a pool consumed round-robin by fork/endpoint rooms only — turned out to be the wrong shape for "x% chance of a wall rack in any corridor, dusty fog everywhere in this pyramid." Decision: **replace `DecorationKind`/`decorations[]` entirely** with the dressing-rule system below, rather than run two decoration mechanisms side by side.

### Dressing rules — independent, stacking, probabilistic sprite placement

**Use cases:** a starter-tier merchant pyramid wants a rack-with-jars on some corridor walls (x% chance each), a flour bag in some corners (a different x%), and dusty fog everywhere/in-rooms-only/nowhere — all applying _simultaneously_, each independently tunable, not one field resolving to one winning value like `difficulty`/`theme` do.

**Shape:**

```ts
type AnchorKind = "corridor-wall" | "corner" | "room" | "everywhere"
type SpriteId = string        // opaque reference into a future sprite-sheet registry — same "free-form string resolved by renderer" convention as Theme; no sprite-sheet asset structure assumed yet
type RoomSelector =
  | number | "first" | "last" | "middle"   // ordinal — same vocabulary as PyramidSelector, narrowed: no ranges
  | { role: RoomType }                     // structural — by the room's existing RoomType ("entrance"|"puzzle"|"trap"|"fork"|"gate"|"treasure"|"stairhead"|"exit")
  | { role: "fork"; hasHiddenBranch: true } // structural predicate — the fork room leading to a hidden path

type DressingRule = {
  id: string          // stable key, used only for scope-merge override matching — never read by the renderer
  anchor: AnchorKind
  sprite: SpriteId
} & (
  | { /** 0–1, independently rolled at every eligible anchor point. Omitted = 1 (always). */ chance?: number }
  | { /** Deterministic — no roll, applies to every room matching the selector. */ at: RoomSelector }
)

// on PyramidConstraint / FloorConstraint / SideSectionConstraint:
dressing?: DressingRule[]
```

Two targeting modes on the same rule shape, not two mechanisms:

- **`chance`** — probabilistic, independently rolled at every anchor-matching position (the rack/flour-bag/fog use cases).
- **`at`** — deterministic. Two flavors of `RoomSelector`, not two more mechanisms: **ordinal** (`"first"`/`"last"`/`"middle"`/a bare index — e.g. `{id: "entry-statue", anchor: "room", sprite: "sobek-statue", at: "first"}`, this statue always in the first room) and **structural** (`{role: ...}`, matching by the room's existing `RoomType` or a predicate on it — e.g. `{id: "hidden-passage-marker", anchor: "room", sprite: "cracked-wall", at: {role: "fork", hasHiddenBranch: true}}`, the room with a secret passageway). `RoomSelector` reuses `RoomType` — the type `RoomCell` already carries in `siteTypes.ts` — rather than inventing a parallel room-classification vocabulary. If more than one room matches a structural selector, the rule applies to _every_ match, not just one; for the ordinal forms that's moot since they only ever match one room. Mutually exclusive with `chance` on one rule; `at` only makes sense for anchors that address individually-ordered/identifiable positions (`room`) — not meaningful for `everywhere`/`corridor-wall`/`corner`, which apply per matching-cell-type indiscriminately across the whole grid. No extra validation added for that now; it falls out of what `at` can sensibly combine with.

- **`chance` is the existing fraction/proportion unit kind** (shared value model, row 3) — no new unit kind needed, just applied per-eligible-position instead of per-whole-scope. `0` is a fully legitimate, respected value (same lesson as the `pathPuzzles` fix: an explicit "none" must never be silently dropped or treated as "unset").
- **Merge is by `id`, across the whole resolution chain, not whole-list-replace.** A tier-wide default (`{id: "fog", anchor: "everywhere", chance: 1}` on `starter`) and a pyramid-level addition (`{id: "wall-rack", anchor: "corridor-wall", chance: 0.3}`) both apply to that pyramid — the pyramid didn't have to repeat the tier's fog rule to keep it. To turn fog off for one specific pyramid, author `{id: "fog", anchor: "everywhere", chance: 0}` at that scope — same `id`, so it replaces the inherited rule rather than stacking with it. This is the one deliberate departure from every other Population/Structure field in this doc (which resolve "most specific scope wins, whole value"): dressing rules need _both_ independent stacking _and_ per-rule override, so the merge key has to be the rule's `id`, not the field as a whole.
- **Per-theme defaults still exist, expressed the same way as everything else** — a theme's default dressing rules are just rules authored at whatever scope naturally corresponds to that theme (e.g. a `tier(...)` or `journey(...)` rule block for the merchant-themed tier), not a separate mechanism bolted on beside the DSL. No special "theme → dressing" lookup table is needed the way it briefly was for the (now-superseded) `DecorationKind` pool.
- **Behavior change, accepted deliberately:** today's `DecorationKind` guarantees visual variety via round-robin cycling through an authored pool. Independent probabilistic rules don't guarantee that — a run of bad luck could place zero racks in a merchant pyramid that has one authored at 30%. This is the same category of accepted drift as the `SideIntensity` unification (Structure layer, item 2): consistent mechanism everywhere outweighs a guarantee nothing else in this DSL provides anyway (chest/path counts are already seeded-random, not round-robin-guaranteed).
- **`anchor` kinds are intentionally minimal for now** (`corridor-wall`, `corner`, `room`, `everywhere`) — covers every example given. It's a plain enum, so finer anchors (e.g. distinguishing fork rooms from plain corridor rooms, the one distinction `DecorationKind` actually had) can be added later without restructuring anything; no need to reverse-engineer that distinction speculatively now.
- **Depends on a sprite-sheet asset pipeline that doesn't exist yet.** This section documents the DSL-facing shape; nothing here should be implemented before that pipeline exists to give `SpriteId` something real to resolve against.

<details>
<summary>Superseded: original per-theme <code>DecorationKind</code> pool design (kept for history)</summary>

Unlike every other layer, there was no existing magic to excise here: `decorations?: DecorationKind[]` was already 100% author-supplied per section, consumed deterministically round-robin by fork/endpoint rooms (`siteAssembler.ts`), with no hardcoded default and no silent override. The one gap: an author who set nothing got no decoration at all. Proposed fix was a per-`theme` default pool, used only when `decorations` was unauthored, composing with the `theme` chain-resolution widening from the Population layer. Superseded by the dressing-rule system above, which folds "theme's default look" into the same rule-authoring mechanism instead of a parallel pool-lookup table.

</details>

---

## DSL/builder syntax — decisions

**Starting principle:** `dsl.ts` already has two idioms in play — most fields (`difficulty`, `puzzleFamily`, `gate`, `keyDensity`, ...) are just typed object-literal properties on a constraint; only `sidePaths`/`hiddenPaths` get a fluent chain (`.sidePaths(density).settings({...})`), because authoring a growing array of path entries one at a time was a genuine repeated pattern worth curried sugar for. That fluent form is sugar _on top of_ the plain literal — `sidePaths: [{density, pathPuzzles, end}]` still works standalone. The question for every new field below is the same ladder question as everywhere else in this doc: **does this specific field have a real repeated-authoring pain point, or does a plain object literal already read fine?** Default to "plain literal, no new builder" and only add sugar where the answer is genuinely no.

Going through the new surface from this design pass:

- **`rank`, `rankPools`, `puzzleFamily` (weight map / tag), chain-resolved `theme`, `puzzleTuning`** — all stay plain object-literal properties, unchanged idiom. None of these involve a growing array an author builds up incrementally; they're each a single value or a small literal object, exactly like `difficulty`/`keyDensity` today. No builder needed. E.g.:

  ```ts
  tier("junior").pyramid("first", {
    theme: "night-market",
    puzzleFamily: { tag: "time" },
    puzzleTuning: { sumplete: { gridSize: { start: 4, end: 7 } } },
  })
  ```

- **Consistency fix needed, not a new feature:** `rankPools` was designed as a field on `PathEntry` (the pyramid-side fragment declaration), but `PathSettingsBuilder.settings()` — the type behind the fluent `.sidePaths(density).settings({...})` chain — only accepts `{pathPuzzles, end, trapped?}` today. Left as-is, authoring a ranked fragment path through the fluent chain would silently be unable to carry `rankPools`, forcing a drop back to a raw `sidePaths: [...]` literal for that one entry. Fix: widen `settings()`'s parameter type to also accept `rankPools?: Record<string, SampleRange>`, so both authoring paths stay interchangeable — this is a gap the _syntax_ design surfaced, not a new mechanism.

- **`dressing` gets small factory functions — not a chain builder, just plain functions returning `DressingRule` objects.** A raw array of `DressingRule` literals is noisy (`id`, `anchor`, and the `chance`-vs-`at` union repeated per entry), and unlike `sidePaths` there's no accumulation pattern to curry — every rule is independent and complete on construction, so a fluent chain would just be object-literal authoring with extra ceremony. A flat helper module fits better:

  ```ts
  export const dress = {
    wall: (sprite: SpriteId, chance?: number, id = sprite): DressingRule => ({
      id,
      anchor: "corridor-wall",
      sprite,
      chance,
    }),
    corner: (sprite: SpriteId, chance?: number, id = sprite): DressingRule => ({
      id,
      anchor: "corner",
      sprite,
      chance,
    }),
    room: (sprite: SpriteId, chance?: number, id = sprite): DressingRule => ({ id, anchor: "room", sprite, chance }),
    everywhere: (sprite: SpriteId, chance?: number, id = sprite): DressingRule => ({
      id,
      anchor: "everywhere",
      sprite,
      chance,
    }),
    at: (selector: RoomSelector, sprite: SpriteId, id = sprite): DressingRule => ({
      id,
      anchor: "room",
      sprite,
      at: selector,
    }),
  }

  // usage:
  dressing: [
    dress.wall("merchant-rack", 0.3),
    dress.corner("flour-bag", 0.2),
    dress.everywhere("dusty-fog"),
    dress.at("first", "sobek-statue"),
  ]
  ```

  Also promotes `id` from required to optional, defaulting to the `sprite` value — the common case is one rule per sprite, so inventing a separate stable key by hand is pure boilerplate; `id` only needs to be spelled out explicitly when two rules in the same scope intentionally share a sprite (rare enough not to optimize the default case around). The raw literal form (`{id: "...", anchor: "room", sprite: "...", at: "first"}`) still works directly wherever `DressingRule[]` is expected — `dress.*` is sugar, not a replacement.

No other new builder machinery is needed anywhere in this pass — every other field from Population/Loot/Decoration reads fine as a plain typed literal, which is the existing DSL's dominant idiom already.

---

## Next steps (in order)

All four layers and the builder syntax are now designed. Implement in small passes, each independently shippable:

- `SideIntensity` → `SampleRange` unification
- `keyDensity` literal override
- `mosaicPathPuzzles` literal override
- `consumableRates` consistency fix
- delete dead `PathPuzzlesPreset`
- `rank` concept + tomb-side authoring
- pyramid-side `rankPools` declarations + solver-based fragment assignment + build-time validator error; widen `PathSettingsBuilder.settings()` to accept `rankPools` so the fluent `sidePaths` chain stays interchangeable with raw literals
- `puzzleFamily` weight-map + tag-form selection + wire it into non-tomb pyramid building (fixes the current always-`sumplete` bug as a side effect) + build-time error when `rank` and `puzzleFamily` are both authored on the same scope
- family `tags` field on the `PUZZLE_FAMILIES.md` catalogue
- widen `theme` into the pyramid → floor → side-section resolution chain; wire family `Component` skin lookup to it
- `puzzleTuning`/`FamilyKnobs` per-family generic knob patch, chain-resolved, wired into each plugin's `generate()`
- `dressing`/`DressingRule[]` engine + `dress.*` helper functions (id-keyed chain merge, `chance` and `at`/`RoomSelector` targeting modes) — replaces `DecorationKind` entirely; depends on a sprite-sheet asset pipeline that doesn't exist yet, so this is the one item blocked on non-DSL work

---

## Implementation status

| Item                                                            | Status                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------ |
| `pathPuzzles` literal + `PathPuzzlesRange`                      | Shipped                                                      |
| `packing` main-path-length multiplier + Storybook demo          | Shipped                                                      |
| `SideIntensity` → `SampleRange` unification                     | Designed, not implemented                                    |
| `keyDensity` literal override                                   | Designed, not implemented                                    |
| `mosaicPathPuzzles` literal override                            | Designed, not implemented                                    |
| `consumableRates` consistency fix                               | Identified, not implemented                                  |
| Dead `PathPuzzlesPreset` removal                                | Identified, not implemented                                  |
| `rank` / `rankPools` / solver-based fragment assignment         | Designed, not implemented                                    |
| `puzzleFamily` weight-map + tag selection + non-tomb wiring fix | Designed, not implemented                                    |
| Chain-resolved `theme` (puzzle skin)                            | Designed, not implemented                                    |
| `puzzleTuning` / `FamilyKnobs` per-family knob patch            | Designed, not implemented                                    |
| Difficulty-shaping-across-a-path (point budget)                 | Parked, not designed                                         |
| `dressing` / `DressingRule[]` (replaces `DecorationKind`)       | Designed, not implemented (blocked on sprite-sheet pipeline) |
| DSL/builder syntax (`dress.*` helpers, `settings()` widening)   | Designed, not implemented                                    |
