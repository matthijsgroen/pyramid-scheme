# Mods architecture — design exercise

Status: **exploratory, not decided**. Captures a brainstorm on reshaping trap /
puzzle / (future) shop mechanics into pluggable mods over a shared engine.
Design now, implement later — after the in-flight shop branch lands, so the
generalization is read off three real implementations instead of two and a
plan doc.

## Starting observation

`TrapPlugin` (`src/game/traps/trapPlugin.ts`) and `PuzzlePlugin`
(`src/game/puzzles/puzzlePlugin.ts`) already register family variants
(ArithmeticReflex, Sumplete, Tableau, Crocodile) into a `Map`. But trap and
puzzle are two separate registries and two separate room types — an
artifact of history, not a real conceptual difference. See "One family
registry" below.

Two concrete coupling points found:

- `SiteMapScreen.tsx` — the claim-switch branches on room type per mechanic
  by hand.
- `useProgression.ts` — one flat state blob mixing core meta-progression
  (fragments, mosaic, tombKeys) with mechanic-specific perks (`armorStacks`,
  `trapInsightStacks` are trap-only, but live in core state) and a third,
  entirely separate reward channel (perks) nothing else in this doc accounts
  for. See "Gaps" at the end.

## One family registry — trap is a puzzle with a nonzero fail cost

Both "presses cancel on a puzzle" and "fails a trap's timer" mean the same
thing structurally: still blocked, must retry. They differ only in
consequence — puzzle-cancel costs nothing, trap-fail costs health. That
consequence is the family's own business, not core's — core doesn't read a
damage number and apply it, it just asks "did this get solved or not":

```ts
type FamilyMeta = { id: string; ownerMod: string; icon: string; color: string }

type FamilyPlugin<T> = {
  meta: FamilyMeta
  generate: (seed, ctx) => T
  Component: FC<{ puzzle: T; onSolved: () => void; onFail: () => void }>
  canAttempt?: (ledger) => boolean // optional pre-render gate; defaults to always-true
}

registerFamily({ meta: { id: "sumplete", ownerMod: "puzzle", ... }, ... })
registerFamily({ meta: { id: "tableau", ownerMod: "puzzle", ... }, ... })
registerFamily({ meta: { id: "crocodile", ownerMod: "puzzle", ... }, ... })
registerFamily({
  meta: { id: "arithmeticReflex", ownerMod: "trap", ... },
  canAttempt: ledger => ledger.get("health") >= 2, // was canAttemptTrap, now trap's own gate
  ...
})

mod("trap").dependsOn(["core-loop"]) // core-loop owns the `health` currency

// inside trap's own onFail handler — not core:
onFail: () => {
  ledger.spend("health", trapDamage(armorStacks)) // armorStacks stays trap's own perk
  markRoomBlocked() // the ONE thing core does on any fail: stay unsolved, retry
}

// puzzle's onFail: just markRoomBlocked(), no ledger call, no consequence at all
```

Core's `onFail` handling shrinks to exactly one currency-free thing: the
room isn't solved, stay blocked. That's the only part legitimately core —
whether there's a cost, how much, and which perk modifies it is trap reading
and writing a ledger it depends on, the same relationship shop already has
to money it doesn't own. No `failDamage` field, no core code that knows what
health means. One registry, one room type (`encounter`), one
`SiteMapScreen` branch instead of N — deletes a whole parallel structure
(`trapRegistry` + `puzzleRegistry` + the room-type switch), doesn't just
rename it.

## Three layers

```
core/ledger/        generic currency store — a bucket store that doesn't
                     know what any currency id means, plus a topological
                     loader that resolves mod dependencies
core/roomDispatch    encounter room -> family lookup, replaces the
                     hand-written claim-switch in SiteMapScreen.tsx
core/siteBuilder     topology + gating (grid, corridors, chains, floor-key /
                     tomb-key chains) — structural, not mechanic-specific,
                     stays core
mods/trap/           timers, family variants (ArithmeticReflex...), spends
                     health on fail via its own onFail handler, produces
                     trapTool
mods/puzzle/         family variants (Sumplete, Tableau, Crocodile...), no
                     ledger writes on fail, one of the allocation sites for
                     fragment/money rewards
mods/shop/           Fez dialogue, stock, prices (per SHOP_PLAN.md design),
                     depends on trap/puzzle/core-loop output to price itself
core-loop            walking pyramid levels — not optional, but registers
                     into the same ledger as any mod (produces mosaicPiece),
                     and owns the health resource — see below
```

## Health is a core resource, not trap-owned

Checked `useProgression.ts` — today `currentHealth`/`maxHealth` are only
ever debited by `takeTrapDamage`, only gate trap attempts
(`canAttemptTrap`), only get restored by trap-folder consumables
(bandage/oil). Puzzle-cancel never touches it. That's an artifact of trap
being the only family with a nonzero consequence today, not a reason health
itself should be trap's, and not a reason core needs to know what "damage"
means either.

Under the unified family model, health becomes a **core ledger counter**
(`kind: "counter"`, cap = `maxHealth`) owned by `core-loop`. Trap declares a
dependency on it and spends from it itself inside its own `onFail` handler
— core never reads a damage number or applies anything. `armorStacks` (a
trap perk that reduces trap's own damage formula) and the pre-attempt gate
(`canAttemptTrap` becomes trap's own `canAttempt: ledger => ...`, see above)
both stay entirely inside trap's code. Core's only currency-free
responsibility on any fail, trap or puzzle, is marking the room still
unsolved.

Murkier: `bandage`/`oil` heal a now-core resource but are named and folded
into trap's consumable set today by inertia, not necessity — worth an
explicit ownership call rather than leaving them in `mods/trap/` unexamined.
`trapTool` (disarm/skip, never touches health) is the one genuinely
trap-specific consumable of the three.

## Currencies are mod-owned, not a closed core vocabulary

Original idea was a closed reward-type union mods request from. Revised:
**no predefined vocabulary at all.** Whoever produces a currency registers
it; nothing central needs to know what it means.

```ts
type CurrencyMeta = {
  id: string
  ownerMod: string
  displayName: string
  icon: string
  kind: "counter" | "capped"
  total?: number // required when kind === "capped"
}

registerCurrency({ id: "health", ownerMod: "core-loop", kind: "counter", ... })
registerCurrency({ id: "fragment", ownerMod: "puzzle", kind: "capped", total: SUM_HIEROGLYPH_REQUIRED, ... })
registerCurrency({ id: "mosaicPiece", ownerMod: "core-loop", kind: "capped", total: LEVEL_STEPS.length, ... })
registerCurrency({ id: "money", ownerMod: "shop", kind: "counter", ... })
```

Core reduces to: a generic bucket store (`ledger.grant(id, n)` /
`ledger.spend(id, n)`), a topological loader that resolves declared
dependencies and rejects cycles, and one generic UI renderer per registered
`CurrencyMeta` (icon/name/format) instead of `Collection.tsx` hand-coding a
case per reward type.

## Two currency kinds, not one

Checked the actual data — most of what looked like "produce more of X" is
actually a fixed pool with an allocator, not an open counter:

- **Open counter** — no fixed total, only a flow guard. `money`, `health`,
  consumables (`bandage`/`oil`/`trapTool`).
- **Capped/allocated** — a fixed total decided up front; the only question
  is *which room* hands out *which specific instance*. `fragment` (Σ
  `HIEROGLYPH_REQUIRED` across the fixed hieroglyph roster, see
  `src/worldGen/fragments.ts`), `mosaicPiece` (`LEVEL_STEPS.length`),
  `mapPiece` and `tombKey` (one per tomb).

Capped currencies need an **allocator**, not a producer — multiple mods can
be *placement sites* for the same finite pool without each independently
minting more of it:

```ts
type CappedPool = {
  currencyId: string
  total: number
  sites: { modId: string; take(ctx): number }[] // sums to `total`, enforced at load
}

// today: core treasure rooms hand out every mapPiece instance
// shop's plan: relocate ONE instance out of that pool into shop stock —
// not a second producer, a second site drawing from the same pool
registerCappedPool({
  currencyId: "mapPiece",
  total: TOMB_COUNT,
  sites: [
    { modId: "core-loop", take: ctx => TOMB_COUNT - 1 },
    { modId: "shop", take: ctx => 1 }, // the "unlocks last tomb" slot
  ],
})
```

## Dependencies replace the closed vocabulary AND the standalone guard

Shop can't validate its own price list in isolation — it's only valid
relative to what trap/puzzle/core-loop actually grant. Rather than a
separate "composed guard" pass, this is just shop declaring a read
dependency and checking at load time:

```ts
mod("shop").dependsOn(["trap", "puzzle", "core-loop"])

function shopGuard(ledger) {
  const granted = ledger.totalGranted(["money"]) // summed from whatever
                                                   // dependency mods produced
  const priceListTotal = SHOP_PRICES.reduce((a, p) => a + p.price, 0)
  if (granted < priceListTotal) throw new Error("shop underfunded by economy")
}
```

The guard *is* the dependency read. No second mechanism.

Downgraded: what shop does when a dependency mod is off used to be an open
question needing a real answer. It doesn't — see "Toggling is a
diagnostic" below. Dependencies only ever get declared once the depended-on
mod is finished and shipped, so shop never actually faces a missing
dependency in a real configuration. A hard failure on an unsupported combo
is enough.

## Collection & Mosaic screens are core, not mod UI

`Collection.tsx` and `MosaicPage.tsx` both read `useProgression()` directly
(`hieroglyphFragments`, `mosaicPieceCount`, `mosaicSeenCount`) — core
meta-progression every mod feeds into, not something that disappears if a mod
is toggled off. Tableau puzzle reads hieroglyph IDs for its formula theming
(`generateRewardCalculation.ts`) but never writes the ledger — read-only tap,
same boundary.

Tell: turn trap off, fragments you already own should still show. Under the
revised model, these screens become one generic renderer over
`ledger.entries()` + registered `CurrencyMeta`, rather than a fixed set of
hand-coded props.

## Toggling is a diagnostic, not a production requirement

Real intent, clarified: trap/puzzle/shop are never actually disabled for
real players. On/off exists for two narrower purposes —

1. **Demo builds.** Flip a mod off to show a slice in isolation. Fine for
   this to fail loudly on an unsupported combination; no need for graceful
   degradation of a configuration nothing ships.
2. **A future mod's development lifecycle.** A genuinely new mechanic gets
   built as its own mod, feature-flagged **locally** during playtesting,
   then the flag is removed at release and it's just always-on like the
   others. That's a one-way transition exercised once, not a persistent
   runtime switch players or config toggle back and forth — the new mod is
   additive (its own rooms, its own currencies) while flagged, and nothing
   else declares a dependency on it until it's actually finished and wired
   in. So the "what if a dependency mod is off" problem doesn't arise in
   practice even here: dependencies only get declared once the depended-on
   mod is done.

This changes the implementation bar a lot. Off = don't import the mod's
barrel file at the app root; `roomDispatch` tolerates an unclaimed room type
returning nothing. What's *not* needed: a runtime-graceful "handle a missing
dependency" system, or solving determinism across arbitrary mod
combinations — only across the one combination that ever ships. The real,
permanent deliverable is the physical separation itself: a mod's code can't
reach into another mod's internals, only its registered ledger/registry
surface, enforced at build/lint time. Toggling for a demo or a WIP mod is a
cheap proof that boundary is real, not a feature to build robustness for.

## Distribution is a separate, currently-unsolved problem

`section.trapped` (`siteAssembler.ts:923-927`) is one hardcoded boolean
deciding trap vs puzzle per intermediate room. `puzzleFamily?: "sumplete" |
"tableau"` (`dsl.ts:34`) picks one family for a whole floor. And
`lastMainPuzzleFamily?: "crocodile"` (`types.ts`) is a bolt-on field that
exists *only* because "the last one is different" had no general
expression — Crocodile didn't even fit the `PuzzleFamily` union, it needed
its own field.

None of that is a family-registry problem. It's that **placement has never
had its own primitive** — every special case has been a new DSL field
instead of an instance of one general rule. A tomb wanting "three Tableaus
in order, Crocodile as the capstone" and a section wanting "30% trap, 70%
puzzle, no particular order" are the same kind of rule at different
settings, not two different mechanisms:

```ts
type Distribution = {
  scope: "mainPath" | SideSectionRef | "tomb"
  fill: FamilyRef | { family: FamilyRef; weight: number }[] // uniform or weighted mix
  overrides?: { position: "first" | "last" | number; family: FamilyRef }[]
}

// today's crocodile special case, generalized:
{ scope: mainPathOf("wizard_treasure_tomb"), fill: "tableau", overrides: [{ position: "last", family: "crocodile" }] }

// today's section.trapped chance knob, same primitive, no more privileged binary:
{ scope: sectionOf(ctx), fill: [{ family: "arithmeticReflex", weight: 0.3 }, { family: "sumplete", weight: 0.7 }] }
```

Room *type* (which family plays here, resolved by `Distribution`) and reward
*instance* (which specific fragment/mapPiece/money amount that room's
treasure grants) stay two separate systems — already true in the current
code (`roomType` vs `reward` fields on `RoomSpec`). `Distribution` decides
the former; the capped-pool allocator or open-counter grant decides the
latter. Conflating them was an earlier mistake in this exercise: fragments
aren't "produced" by a family winning a distribution slot, they're allocated
to whichever room that slot happened to land on.

Topology and gating (grid/corridor layout, floor-key / tomb-key chains) stay
core — nothing mechanic-specific about them. `Distribution` only fills
encounter slots within that skeleton.

## DSL changes

Two closed unions already show strain from a family list that's smaller
than it will be:

- `PuzzleFamily = "sumplete" | "tableau"` (`dsl.ts:34`) doesn't include
  `"crocodile"` — hence the bolt-on field. Collapses into one open id
  validated against the family registry at `configBuilder.ts` build time,
  not by the type checker.
- `TreasureReward` (`types.ts`) and `RewardSpec`/`RewardHint` (`dsl.ts`) are
  two separately hand-maintained closed unions for reward types at two
  layers, already duplicated. Collapse into currency ids validated against
  registered `CurrencyMeta`.

New mod-contributed knobs (shop's price/stock knobs, a family's own tuning)
merge into the schema instead of being predeclared fields on `FloorConfig`/
`SubSection`. `Theme = string` (`dsl.ts:35`, e.g. `"desert"`, `"underwater"`)
needs no change — already a loose renderer hint, already fits.

## Strong typing — the real cost, not a detail

Closed TS unions and pluggability are in tension by nature: a closed union
enumerates every case; a plugin system can't, because the point is cases not
known at compile time. `PuzzleFamily`/`TreasureReward` being closed unions
is *why* the compiler catches a typo'd family or unsupported reward today,
for free, at build time. Opening them to mod-registered ids trades that for
load-time checks in `configBuilder.ts` — strictly weaker, worth stating
plainly rather than glossing over.

Not everything should open up. `Tier`, `GateType`, `KeyColor` are
structural, never going to be a mod — keep them as closed literal unions
exactly as they are today. Only the fields meant to grow by mod (family id,
currency id) should go generic, and even there, a generated union from the
currently-registered mod list (same codegen approach `generatedWorld.ts`
already uses) beats a bare `string` — recovers exhaustiveness-checking
against what's actually registered instead of hardcoding the list by hand.

## Known cost / non-goals

- This is a real refactor of `siteAssembler.ts`'s core loop, not an
  afternoon change — bigger than the room-dispatch sketch in `SiteMapScreen`.
- `PerkState` in `useProgression` needs splitting by which mod consumes each
  perk before toggling means anything for state (trap-only perks currently
  sit in core).
- Not attempting to make *everything* generic — topology/gating skeleton is
  deliberately not a mod concern.
- Cycle detection at registration time is required once dependencies are a
  thing (e.g. puzzle must never end up depending on shop).

## Gaps — not yet resolved

- **Perks are an unmodeled third reward channel.** `applyTreasurePerk`
  (`useProgression.ts:138-159`) grants perks via a static `TREASURE_PERKS`
  table keyed by treasure id — entirely separate from the `TreasureReward`
  DSL union and from the currency/ledger model above. Nothing in this doc
  accounts for it yet. Likely needs its own registered-effect concept
  (a perk grant mutates mod-owned state directly, isn't a spendable/summed
  resource, doesn't fit `CurrencyMeta`).
- **Determinism vs. mod set — downgraded.** World gen is fixed-seed. A new
  mod shipping does regenerate the world once, same as any other worldgen
  change today — not a live toggle players flip, so this doesn't need a
  general answer, just the same release discipline already used for any
  worldgen change.
- **Tier tuning ergonomics.** Today's per-tier knobs (`chance`,
  `wardPaths`, `consumableRates` from PR #103) sit in one place a designer
  can eyeball. Spread across mod-owned `Distribution` weights, tuning "make
  wizard tier 30% trap" means checking that trap's and puzzle's weights
  still sum sensibly across files instead of reading one table.
- **Snapshot tests.** `validateWorldSpec.ts` and related specs pin exact
  counts (85 pyramids, 40 treasures, etc). "Roughly the same world" needs to
  be checked against these, not assumed from the shape being equivalent —
  a `Distribution` resolver can produce a different *valid* room order than
  today's straight-line loop on the same seed, same stats, different map.
  Whether that's acceptable is a call to make explicitly.
- **Save migration.** `useProgression`'s flat blob to a ledger shape is a
  save-format migration for existing players — not designed yet.
- **Bandage/oil ownership.** Heal a core resource (health) but are
  currently folded into trap's consumable set by naming, not by necessity.

## Open question

Whether a 4th mod (buffs, curses, seasonal event) would need anything this
shape doesn't already provide — good sanity check before committing to it,
not evaluated yet.
