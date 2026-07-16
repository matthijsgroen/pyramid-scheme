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
  - **Revised** — the shop `fill` originally emptied its own surplus (which caught chests). See
    "Contract revision — mods fill only, core owns emptiness" below: the economy now fills-all +
    scales-to-goal, core owns emptiness, and empties are always bottom-of-priority.

## Contract revision — mods fill only, core owns emptiness (empty-chest fix, 2026-07-16)

**Problem found.** The world had 15 empty *chests* (`end:"treasure"` serialized with no reward) —
e.g. `starter_1:L0:F0:s1`, the first pyramid. Root cause, two deviations from the model above:
1. **`EMPTY_FRACTION = 0`** (`scripts/generateWorld.ts`) — core hid nothing, so the *shop economy*
   was forced to decide emptiness itself.
2. **The shop `fill` emptied its own surplus** (phase-4 `slot.assign(undefined)`) after filling to
   budget, and it fills **per material tier** (junk tier-spread), so its "surplus" wasn't the
   global least-eager — it caught **chests**. A mod emptied a chest; priority was ignored.

The eager/`emptyFraction` bullets in "As-built refinements" describe the *intended* model; the shop
fill violated it. This section is the authoritative correction.

### The invariant (revised locked contract)

- **Mods `fill` only — never empty.** A distribution's `fill` may assign a reward or leave a slot
  untouched; it MUST NOT call `slot.assign(undefined)`. Emptiness is **core's** concern alone.
- **Fill is top-priority-first.** `allocateDistributions` offers slots `rewardPriority`-desc, so
  every provider fills chests (100) before puzzles (60). Whatever is left unfilled is therefore
  always the **least-eager** slots.
- **Empties have two legitimate sources, both bottom-of-priority:**
  1. **Authored** — `emptyFraction` skims the least-eager loot-eligible slots up front (the author's
     DSL dial). Chests, being top-priority, are never in that slice.
  2. **Exhaustion** — after all providers fill, every provider's own thresholds (gating/capped
     totals, shop budget ceiling + per-item caps) may leave slots unfillable. Core empties those.
- **A chest empty ⇒ a genuine content shortfall**, never a distribution accident: it can only happen
  when total loot supply across all providers can't cover the chest count. → **hard-fail** (guard
  below), message points the author at the DSL (add loot capacity / cut chests). Puzzle-slot empties
  are normal (authored or exhaustion); chest empties are a build error.

### The economy adapts magnitude, not emptiness

The shop economy **fills every slot it is handed** (never leaves one empty) and scales reward
*magnitude* to hit the economy goal `[budgetMin, budgetMax]` over that slot count:
- **Fewer slots** (author raised `emptyFraction`) → **higher** per-slot rewards.
- **More slots** (`emptyFraction` low) → **lower** per-slot rewards (down toward loose 1-coins).
- Junk value is tier-fixed (`SELL_VALUE_BY_TIER`), so scaling rides **loose-coin amounts + the
  junk/coin ratio**, not junk value.
- If minimal fill of all handed slots would still exceed `budgetMax` → **hard-fail: raise
  `emptyFraction` / cut shop stock**. If it can't reach `budgetMin` → **hard-fail: add loot
  capacity** (the existing self-check). `emptyFraction` is therefore a real **balance dial**, not
  cosmetic — it is how the author keeps found-loot meaningful *and* the economy under its ceiling.

### Mechanism

- **`slotAllocator.allocateDistributions`:** after `dist.fill(take)`, **reclaim** any `take` slot the
  fill left unassigned back into `available` (requires tracking whether a slot got a real reward).
  This is the seam that makes "fill some, leave the rest" possible **without a mod emptying** — the
  reclaimed slots flow to the core tail, which empties them (least-eager by construction).
- **gating + capped eligibility:** drop `kind === "end"` → `rewardPriority > 0` (any loot node),
  eager-ranked. Per TARGET.md rule 2 ("**any** loot-bearing node can hold **any** capped currency";
  chests just rank first). Fixes the fidelity deviation that restricted required loot to ends only.
- **shop `loot.ts`:** delete phase-4 self-empty; fill-all + scale-to-goal.
- **core guard (`validate.ts`):** no `end:"treasure"` serialized without a reward. **Mod-aware** — a
  deliberately loot-less world (loot mods toggled off) is exempt (the documented toggle-off
  degenerate), so the guard trips only on a real shortfall while providers are registered.

### Required tests (every loot-providing mod's `fill`)

A loot distribution's `fill` MUST be unit-tested across span sizes (the ratio of budget goal to slot
count), plus the ordering + no-empty invariants:
- **Large span** — many slots, low budget-per-slot: all slots filled, rewards small (toward 1-coin),
  total within `[budgetMin, budgetMax]`, mod emits no `undefined`.
- **Good span** — balanced: all filled, moderate rewards, within budget.
- **Tight span** — few slots, must scale up: all filled, higher per-slot rewards, hits `budgetMin`
  without exceeding `budgetMax`.
- **Shortfall** — too little capacity to reach `budgetMin`, or too many slots to stay under
  `budgetMax` even minimally: **hard-fails** with the author-facing message.
- **Ordering** — a mixed end+puzzle pool fills ends before puzzles; a chest is never the empty one.

## Build plan — empty-chest fix (pick up after a context clear)

Design is in "Contract revision" above (frozen). Each phase = its own commit/slice: self-verify with
the CLI (`tsc -b` + `vitest` + `lint` + `build` + `generate-world`; editor diagnostics lag — trust
the CLI), then push. Regen is expected to change (loot redistributes); review the diff, don't chase
byte-identity. Do the phases in order — EP1 is the enforcement seam the rest leans on.

- [ ] **EP1 — `slotAllocator` reclaim seam (enforce "mods fill only").** Track whether a slot got a
      real reward; after `dist.fill(take)`, return any unfilled `take` slot to `available` so the
      core tail empties it (never a mod). Add a dev assertion that no mod left a `fragmentSlot`
      sentinel behind. Tests: a fill that fills-some-leaves-rest → the rest is reclaimed + ends empty
      via the tail, not via the mod. (Enabler + safety net for EP3.)
- [ ] **EP2 — widen gating + capped eligibility (fidelity, TARGET rule 2).** Drop `kind === "end"`
      from `placeFragments` (gating) and `cappedToDistribution` (capped) → `eligible: rewardPriority
      > 0`, keep eager `rank` (chests first). Required/optional-pocket + hidden + shop-bucket rules
      still hold. Regen: fragments/mosaic may now sit in puzzle slots once chests are full — review.
- [ ] **EP3 — shop `loot.ts`: fill-all + scale-to-goal (drop phase-4).** Remove the phase-4
      `slot.assign(undefined)`. Fill every handed slot, eager (chests first), completeness (≥1 junk
      per present tier), scaling loose-coin amounts + junk/coin ratio to land in
      `[budgetMin, budgetMax]`. Hard-fails: below floor → "add loot capacity"; minimal fill above
      ceiling → "raise `emptyFraction` / cut shop stock". Unit tests: **large / good / tight** spans
      (all filled, scaled, in budget) + **shortfall** (hard-fail) + **ordering** (ends before
      puzzles; a chest is never the empty one).
- [ ] **EP4 — core no-empty-chest guard (`validate.ts`), mod-aware.** After build, throw if any
      `end:"treasure"` serialized with no reward WHILE a loot provider is registered; exempt the
      loot-mods-off degenerate. Tests: trips on an empty chest, passes a full world, exempt when loot
      off.
- [ ] **EP5 — set `EMPTY_FRACTION` (tuning).** With fill-all, `EMPTY_FRACTION=0` fills everything →
      low per-slot money. Pick a sensible default (feel-check) so found loot stays meaningful; the
      author can dial per taste. Regen + eyeball reward density.
- [ ] **EP6 — regen + full verify + toggle-off.** `generate-world`: 0 empty chests, economy guard +
      determinism + winnability pass, diff reviewed (fragment/mosaic relocation, money/junk
      redistribution). Prove toggle-off: shop off → guard exempt, world builds. Update this doc's
      status + memory.

### Kickoff prompt (paste into a fresh session)

```
Build the empty-chest fix on branch mods/hieroglyph-currency. Read
docs/mods/distribution-primitive-design.md — the "Contract revision — mods fill
only, core owns emptiness" section (FROZEN design) + the "Build plan — empty-chest
fix" checklist. Also skim [[project_distribution_primitive_contract]] in memory.

Do the phases EP1..EP6 IN ORDER, one commit per phase. EP1 (slotAllocator reclaim)
is the enforcement seam the rest needs. Self-verify each with the CLI (tsc -b /
vitest / lint / build / generate-world — editor diagnostics lag). Regen WILL change
(loot redistributes) — review the diff, don't chase byte-identity. The acceptance
gate: 0 empty chests in generate-world, economy guard + winnability still pass, and
the required span/shortfall/ordering unit tests exist per the design. No silent
guesses — if the task didn't cover something, record the decision in the doc. When
done: tick the checklist, update status, and note it in memory.
```

## Still open (for the build, not blocking the design)

- Increment 2 — encounters as distributions ✅ (shop-stock slice; see `ARCHITECTURE.md`, shop mod):
  `Slot.encounter` + `FamilyMeta.rewardCapacity` metadata landed; a shop node expands into 6
  reward slots (priority 0) written into the node's `rewards[]`; the currency mods place stock on
  the `slot.encounter === "fez-shop"` join (`placeShopStock`), and trap fills the leftovers with
  finite consumables. `rewardPriority` is stamped from the authored `encounter` field directly.
- "area" vocabulary beyond difficulty, if consumable eligibility needs more than `tier >= expert`.
- min-first-across-all allocator upgrade — only when a second nonzero-`min` distribution contends
  for the same pool (e.g. Increment-2 shop stock).
