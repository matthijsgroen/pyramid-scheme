# Design — the Distribution primitive (unified encounter + loot placement)

The model: **everything placed into the world is a `Distribution`** — encounters
(traps/puzzles/shops) *and* loot (currencies/junk/consumables/money). Core
allocates the slots (footprint + eligibility + priority); the mod fills them
(owning its variants / rarity / completeness / per-instance config).

This subsumes the old separate items: filler-loot generalization, the Slice-5
`Distribution` primitive / siteAssembler rewrite, shop-stock targeting, and slot
capacity — they were all facets of one model.

## The mental model (the pipeline)

A world is a large authored skeleton of **structure + preferences** (DSL); mods
then **distribute** encounters and loot into it, in a fixed pass order forced by
a few real dependencies:

```
1. structure   — gates, ward paths, chains, key colors        (authored, DSL)
2. encounters  — which rooms are traps / puzzles / shops       (distributions)
3. gating loot — keys, map pieces, hieroglyph fragments        (reachability worklist)
4. capped loot — fixed-total currencies (mosaic)               (distributions)
5. dynamic loot— money, junk, consumables + the empty quota    (distributions)
```

Why this order (the dependency edges — everything else is independent):
- **structure first** — the skeleton every later pass reads.
- **encounters before loot** — because loot both *avoids* rooms (trap rooms are
  loot-ineligible) and *targets* them (shop stock is loot placed into shop
  encounters). Encounters stamp each slot's metadata; loot passes filter on it.
- **gating before filler** — keys/fragments must be placed so the world is
  solvable (reads structure); filler takes what's left.

The order is a **fixed sequence of passes** (like today's phases, generalized),
not a dependency solver — the edges are few and known (YAGNI).

## The primitive — core allocates, the mod fills

**Core is the allocator**: it budgets slots to each distribution (footprint +
eligibility + priority), reserves the empty quota, and hard-fails if a minimum
can't be met. **The mod gets its allocated slots and fills them itself** — core
never rolls a variant, never knows rarity or completeness.

```ts
type Distribution = {
  id: string
  pass: "encounter" | "capped" | "dynamic"   // which pipeline pass it runs in
                                              // (gating currencies stay the reachability worklist)
  footprint: (ctx) => { min: number; max: number }  // slots to hand it; exact for capped
  eligible?: (slot, ctx) => boolean           // the encounter↔loot join (see below)
  rank?: (candidates, ctx) => Slot[]           // priority among eligible when contended
  fill: (allocatedSlots: Slot[], ctx) => void  // MOD bakes rewards / encounter config;
                                               // owns its variants, rarity, completeness
}
```

Core owns one non-distribution concept: the **empty quota** — `emptyFraction`
(authorable, % of the total slot count X), reserved before dynamic fill; yields
to hard minimums if things don't fit (a density knob the author turns).

## Encounters are distributions too (the B move)

An encounter distribution places encounters into eligible rooms and **stamps
per-instance config** as slot metadata while it does. Two capabilities this
unlocks that the current tag mechanism can't do cleanly:

- **Per-instance config** — the shop distribution sets *this* shop's capacity to
  6, *that* one's to 3, as it places them (likewise per-trap difficulty, etc.).
- **The `eligible` join** — a slot's metadata (`slot.encounter`, `slot.capacity`,
  `slot.pathDifficulty`, `slot.tier`) is what later loot passes filter on:
  - shop stock: `eligible = s => s.encounter === "shop"`, footprint = `s.capacity`
  - consumables: `eligible = s => s.pathDifficulty >= "expert"` (settled: no consumables
    in open early areas. Starter/junior do have traps, but only in hidden optional
    corridors, and they're survived on the health you brought rather than on supply)
  - every loot dist: trap rooms `eligible = false`

Because a shop slot's `capacity` can exceed 1, **slot capacity** (a slot holding
several items) folds in here — a multi-capacity slot is just one whose footprint
contribution is >1. **Shop-stock targeting** and **slot capacity** both stop
being separate frozen items.

## Ownership

| Kind | Pass | Owner | Notes |
|------|------|-------|-------|
| trap, puzzle, shop encounters | encounter | trap / puzzle / shop mods | per-instance config |
| keys / map pieces / hieroglyph | gating | core + hieroglyph mod | reachability worklist (unchanged) |
| mosaic | capped | mosaic mod | exact footprint |
| money **+** junk | dynamic | **shop mod** | ONE `shopMoneyEconomy` Distribution — junk is money packaged as a sellable, so they share one value budget (`min` = totalBuyable, `max` ≈ 1.5×) the `fill` divides: per-tier junk (≥1 of each = completeness hard-fail; ≤~20 each) then loose coins. Shop off → not registered → no money/junk, leftover chests empty. |
| consumables | dynamic | **trap mod** | one Distribution; rarity trap-owned; `eligible` = expert+ puzzle slots; count is a mod-owned target |
| empty | — | core | `emptyFraction` — a real knob (see below), % of loot-eligible slots reserved empty |

## Toggle-off gate (settled)

Not byte-identical — that was never the point. The gate is **a valid, solvable
world**: builds + hard-fail invariants hold (footprint minimums, junk
completeness, reachability) + economy solvent (once money/shop own it). A mod
leaving the registry drops its distribution; its slots go to the other dynamic
distributions or to empty. Broader world-stability implications (e.g. adding a
mod shifting existing placements) are a **separate session** — safe pre-release.

## Decisions (settled)

- Model = unified Distribution (encounters + loot).
- Empty quota = % of X (total slots), authorable.
- Money validates by **footprint only**; the economy guard belongs to the **shop
  mod**, not core.
- Junk completeness (≥1 of each collectible) **hard-fails** the build.
- Consumables: trap-owned; **eligible only on expert+ difficulty paths**.
- Toggle-off gate = valid + solvable world (not byte-identical); world-stability
  ripple = a separate session.
- Core allocates slots; the **mod fills** (owns variants/rarity/completeness).

## How placement works (mechanics)

- **Reward priority = fill order, sourced from the encounter family** (not a per-kind ratio).
  `FamilyMeta.rewardPriority` (chest 100, puzzle/sumplete 60, trap/tableau/crocodile/gate/shop 0) is
  stamped on each slot at collect time via an injected `familyPriorityFor`. `allocateDistributions`
  offers slots priority-desc (chests before puzzles); a distribution that can't take everything leaves
  the lowest-priority slots empty. Priority-0 slots are loot-ineligible — so tomb main-path tableau/
  crocodile puzzles bear no loot.
- **`emptyFraction`** skims the lowest-priority loot-eligible slots empty up front, so found loot stays
  meaningful (no 1-coin spam). An authoring dial; default 0.
- **Completeness** — the Collection "junk" category must be finishable (all `ALL_SELLABLES`). The
  shop's `fill` places ≥1 of each item per present material tier (hard-fail if a present tier can't
  cover its set); junk value is tier-fixed.
- **Economy is a value budget, not byte-identical.** The shop's `fill` places money+junk toward
  `[totalBuyable, 1.5× totalBuyable]`; the economy guard counts money AND sellable value across both
  end and puzzle slots. Validated by the guard + the fill's self-check.

## Open design questions

- "area" vocabulary beyond difficulty, if consumable eligibility ever needs more than `tier >= expert`.
- min-first-across-all allocator upgrade — only once a second nonzero-`min` distribution contends for
  the same slot pool.
