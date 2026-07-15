# Design — the Distribution primitive (unified encounter + loot placement)

Status: **design locked** (decisions settled with the user). No code yet.
Target model = **B: everything placed into the world is a `Distribution`** —
encounters (traps/puzzles/shops) *and* loot (currencies/junk/consumables/money).
**Build order = loot-first**: land the loot distributions (unblocks trap +
consumables), then convert encounter placement to distributions as the next
increment. Same destination, safer increments.

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
  - consumables: `eligible = s => s.pathDifficulty >= "expert"` (settled: no
    consumables in open early areas until traps arrive at expert)
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
| money **+** junk | dynamic | **shop mod** (as-built §C) | ONE `shopMoneyEconomy` Distribution — junk is money packaged as a sellable, so they share one value budget (`min` = totalBuyable, `max` ≈ 1.5×) the `fill` divides: per-tier junk (≥1 of each = completeness hard-fail; ≤~20 each) then loose coins. Shop off → not registered → no money/junk, leftover chests empty. |
| consumables | dynamic | **trap mod** | one Distribution; rarity trap-owned; `eligible` = expert+ puzzle slots; count is a mod-owned target |
| empty | — | core | `emptyFraction` — a real knob (see below), % of loot-eligible slots reserved empty |

## Toggle-off gate (settled)

Not byte-identical — that was never the point. The gate is **a valid, solvable
world**: builds + hard-fail invariants hold (footprint minimums, junk
completeness, reachability) + economy solvent (once money/shop own it). A mod
leaving the registry drops its distribution; its slots go to the other dynamic
distributions or to empty. Broader world-stability implications (e.g. adding a
mod shifting existing placements) are a **separate session** — safe pre-release.

## Sequencing (loot-first toward the B target)

**Increment 1 — loot distributions (unblocks Slice 3b trap/consumables):**
1. Define `Distribution` + registry/aggregation (mirror `CAPPED_CURRENCIES`),
   injected via `scripts/generateWorld.ts`. Wrap today's capped currencies as
   exact-footprint distributions — no behavior change.
2. Add the authorable `emptyFraction` (default 0 → no change until authored).
3. Money + junk as `dynamic` distributions (junk gains ≥1-each completeness →
   world output changes; validated by the new invariants, not byte-identical).
4. **Consumable distribution → trap mod** (Slice 3b hand-off): `eligible` =
   expert+ paths, rarity trap-owned. Trap off → slots → other dynamic dists /
   empty.
5. Retire the old passes (`assignPuzzleRewards` quota + `placeFragments`
   junk-sink) into the unified dynamic pass.

**Increment 2 — encounter distributions (the B completion, later slice):**
6. Convert encounter placement (the runtime `siteAssembler` `trapped` /
   `puzzleFamily` / `lastMainPuzzleFamily` special-cases + offline tag authoring)
   into `encounter`-pass distributions with per-instance config. Unlocks
   mod-computed shop capacity, and moves shop-stock onto the `eligible` join.

Slice 3b (trap) rides Increment 1. Shop (Slice 4) brings money + the economy
guard + shop encounters (which may pull part of Increment 2 forward for shops
specifically).

## Settled decisions (recap)

- Model = unified Distribution (encounters + loot); build loot-first.
- Empty quota = % of X (total slots), authorable.
- Money validates by **footprint only**; the economy guard belongs to the **shop
  mod**, not core.
- Junk completeness (≥1 of each collectible) **hard-fails** the build.
- Consumables: trap-owned; **eligible only on expert+ difficulty paths**.
- Toggle-off gate = valid + solvable world (not byte-identical); world-stability
  ripple = a separate session.
- Core allocates slots; the **mod fills** (owns variants/rarity/completeness).

## As-built refinements (Increment 1, loot pass — landed; §C brought it onto the primitive)

- **Dynamic loot IS the primitive.** money/junk/consumables are real `Distribution`s run through
  `allocateDistributions`, not a parallel `assignDynamicLoot` pass. The mod's `fill` bakes the
  rewards (owns variants/rarity/completeness); core only allocates + eager-orders + reserves empty.
  (`ConsumableSpec`/`MoneySpec`/`JunkSpec`/`dynamicLoot.ts` are deleted.)
- **Eagerness = `rewardPriority` = fill ORDER, sourced from the encounter family** (NOT a
  `Record<Slot["kind"]>` ratio). `FamilyMeta.rewardPriority` (chest 100, sumplete 60,
  trap/tableau/crocodile/gate/shop 0) is stamped on each slot at collect time via an injected
  `familyPriorityFor` (built from `ALL_FAMILY_META`, riding the `resolveKeyRequirements` seam).
  `allocateDistributions` offers slots weight-desc (chests before puzzles); a distribution that
  can't take everything leaves the least-eager slots empty. Weight-0 slots are loot-ineligible —
  so tomb main-path tableau/crocodile puzzles bear no loot (matches the `familyMeta` intent).
- **`emptyFraction` is a REAL core knob** (un-deferred): the least-eager loot-eligible slots are
  skimmed and left empty up front, so found loot stays meaningful (no 1-coin spam). Default 0
  (`scripts/generateWorld.ts`); dial up on a feel-check. Not YAGNI — it's the meaningfulness dial.
- **Completeness = the Collection "junk" category must be finishable** (`Collection.tsx` renders all
  25 `ALL_SELLABLES`). It lives in the shop's `fill` (≥1 of each item per present tier; hard-fail if
  a present tier can't cover its 5). Junk value is tier-fixed (`SELL_VALUE_BY_TIER`).
- **Economy: value budget, not byte-identical.** The shop's `fill` places money+junk to a budget of
  `[totalBuyable, 1.5×]` — a deliberate rebalance (found income was ~4.3× buyable, now ~1×–1.5×), so
  counts shifted (junk 810→~335, money ~156). The economy guard counts BOTH money and sellable value
  in BOTH end and puzzle slots (junk now sits in either). Output is validated by the guard + the
  fill's self-check, not by byte-identity.

## Still open (for the build, not blocking the design)

- Increment 2 — encounters as distributions ✅ (shop-stock slice, `SLICE-shop-stock.md`):
  `Slot.encounter` + `FamilyMeta.rewardCapacity` metadata landed; a shop node expands into 6
  reward slots (priority 0) written into the node's `rewards[]`; the currency mods place stock on
  the `slot.encounter === "fez-shop"` join (`placeShopStock`), and trap fills the leftovers with
  finite consumables. `rewardPriority` is stamped from the authored `encounter` field directly.
- "area" vocabulary beyond difficulty, if consumable eligibility needs more than `tier >= expert`.
- min-first-across-all allocator upgrade — only when a second nonzero-`min` distribution contends
  for the same pool (e.g. Increment-2 shop stock).
