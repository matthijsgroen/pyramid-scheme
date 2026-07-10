# Mods architecture — design exercise

Status: **exploratory, not decided**. Captures a brainstorm on reshaping trap /
puzzle / shop mechanics into pluggable mods over a shared engine. Shop has
now landed on `main` (#104, #106–109) — three real implementations exist to
generalize from instead of two and a plan doc, which was the condition this
doc set for moving from design to implementation. Reviewed shop against this
doc on PR #106; feedback incorporated (`useShopEncounter.ts`, pointer
comments on `TreasureReward`).

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
- `useProgression.ts` — one flat state blob mixing several mods' currencies
  (fragments belong to `hieroglyph`, mosaic to `mosaic`, health to `trap`)
  with mechanic-specific perks (`armorStacks`, `trapInsightStacks` are
  trap-only, but live in this shared blob) and a third, entirely separate
  reward channel (perks) this doc didn't originally account for — now
  resolved, see "Gates, ward paths, hidden passages, perks, detectors".

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

// health is trap's own currency (see "Granularity" below) — no cross-mod
// dependency needed, trap just owns and spends its own ledger entry

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
core/                engine only, owns no currency and (mostly) no screen:
  ledger/              generic bucket store, doesn't know what any currency
                       id means; topological dependency loader; the
                       generic reward-claim dispatch for treasure rooms
                       (grant whatever currency id a RoomSpec names,
                       regardless of which mod owns its meaning)
  roomDispatch/        encounter room -> family lookup, replaces the
                       hand-written claim-switch in SiteMapScreen.tsx
  siteBuilder/         topology + gating (grid, corridors, chains,
                       floor-key / tomb-key chains, grid movement,
                       staircases, journey-completion bookkeeping)
  Collection.tsx       the one generic screen: renders ledger.entries() +
                       registered CurrencyMeta, aggregates across every
                       mod, owned by none of them

mods/trap/           timers, family variants (ArithmeticReflex...), owns
                     health AND bandage/oil (its own healing consumables)
                     AND trapTool — single consumer, no dedicated screen,
                     folds in fully per "Granularity" below
mods/puzzle/         family variants (Sumplete, Tableau, Crocodile...),
                     owns no currency of its own — an allocation site and
                     consumer of fragment (hieroglyph mod's) and money
                     (shop's)
mods/shop/           Fez dialogue, stock, prices (per SHOP_PLAN.md design),
                     owns money, depends on puzzle/core output to price
                     itself
mods/hieroglyph/     owns fragment, HIEROGLYPH_REQUIRED, the Collection
                     grid's hieroglyph sections
mods/mosaic/         owns mosaicPiece, MosaicPage.tsx (its own persistent
                     screen — see "Collection & Mosaic" below), the
                     LEVEL_STEPS reveal logic
mods/tomb-treasure/  owns mapPiece, tombKey, the perk-grant table
                     (TREASURE_PERKS/TOMB_PERK_IDS) — the 40 treasures and
                     what each one unlocks
```

## Granularity: when does a currency get its own mod?

Health forced a correction. Checked `useProgression.ts`: `currentHealth`/
`maxHealth` have exactly one consumer (`takeTrapDamage`, `canAttemptTrap`)
and no dedicated screen — just a bar `SiteMapScreen` renders in the HUD.
Compare `fragment` and `mosaicPiece`: each has a *second stakeholder*
independent of any mechanic — a dedicated screen that treats the currency
as a first-class collectible (`Collection.tsx`'s hieroglyph grid,
`MosaicPage.tsx`'s reveal). That screen is what forced fragment and mosaic
into their own mods, not "more than one mod touches it" — puzzle is still
fragment's only mechanic consumer today, same as trap is health's only
consumer, yet the two land differently.

**Rule: promote a currency to its own mod when a second independent
consumer appears, or when it earns a dedicated screen — whichever comes
first. Not before.** Health satisfies neither, so it folds entirely into
`mods/trap/`: the currency, `bandage`/`oil` (they heal it, so they're
trap's consumables too, not a separate ownership question), `armorStacks`,
`canAttemptTrap`. No cross-mod dependency needed for something a mod owns
outright — that line is gone from the family-registry example above.
`trapTool` was never in question, disarm/skip has nothing to do with
health.

This resolves the old "bandage/oil ownership" gap outright rather than
downgrading it: there's no ambiguity left once health itself is trap's.

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

registerCurrency({ id: "health", ownerMod: "trap", kind: "counter", ... }) // folded in, see "Granularity"
registerCurrency({ id: "fragment", ownerMod: "hieroglyph", kind: "capped", total: SUM_HIEROGLYPH_REQUIRED, ... })
registerCurrency({ id: "mosaicPiece", ownerMod: "mosaic", kind: "capped", total: LEVEL_STEPS.length, ... })
registerCurrency({ id: "mapPiece", ownerMod: "tomb-treasure", kind: "capped", total: TOMB_COUNT, ... })
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

- **Open counter** — no fixed total, only a flow guard. `money` (shop),
  `health` (trap), consumables (`bandage`/`oil`/`trapTool`, all trap's).
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

// today: plain treasure rooms (core's own room type, no mechanic involved)
// hand out every mapPiece instance. shop's plan: relocate ONE instance out
// of that pool into shop stock — not a second producer, a second
// *placement site* drawing from the same pool the owning mod (tomb-treasure)
// still defines the total for
registerCappedPool({
  currencyId: "mapPiece", // owned by tomb-treasure — see registerCurrency above
  total: TOMB_COUNT,
  sites: [
    { modId: "core", take: ctx => TOMB_COUNT - 1 }, // ordinary treasure rooms
    { modId: "shop", take: ctx => 1 }, // the "unlocks last tomb" slot
  ],
})
```

## Reward weight: a fill-order algorithm the allocator was missing

`CappedPool.sites` says *how many* instances a mod's rooms take, but never
said *which specific room* among many candidates of the same type gets one
— that gap was filled by hand (`fragmentSlot` sentinels an author places
explicitly) or, in the in-flight shop branch, by a bespoke deterministic
shuffle over puzzle rooms specifically (`SHOP_PLAN.md`'s puzzle-solve
rewards: 441 of 1,714 puzzles picked by shuffle+slice). Two mechanisms
doing the same job differently.

Checked `siteAssembler.ts`'s room-spec calls to see what's eligible today:
`roomType: "puzzle"` and `roomType: "trap"` carry **no** `reward` field at
all — solving a puzzle or surviving a trap grants nothing today. Only
`roomType: "treasure"` ever does. The shop branch's puzzle-solve mechanic is
the *first* thing making a solve event reward-eligible, and it's narrow —
puzzles only, flat shuffle, no notion of priority by type.

Generalizes to a weight each room type/family declares, and one generic
fill algorithm across the whole population of solved nodes instead of a
bespoke selection per mechanic:

```ts
type RoomTypeMeta = { rewardWeight: number } // 0 = never eligible

registerFamily({ meta: { id: "sumplete", rewardWeight: 8, ... } })         // puzzle: high
registerFamily({ meta: { id: "tableau", rewardWeight: 8, ... } })
registerFamily({ meta: { id: "arithmeticReflex", rewardWeight: 0, ... } }) // trap: survived, not solved — none

// core room types, not families — not competing in the ranking at all:
"treasure": rewardWeight: Infinity  // already the reward, not a candidate for one
"gate": rewardWeight: 0
"stairhead" / "exit": rewardWeight: 0
```

`CappedPool`'s allocator ranks every solved node in the generated world by
`rewardWeight` and walks down the ranking assigning instances until `total`
is exhausted — one generic weighted fill replacing both the hand-placed
sentinel mechanism and the branch's bespoke shuffle.

Trap at `0` is a real design call, not just an architecture one — but
that's exactly what this model is good at: it's one number, not a decision
baked into the mechanism. `0` for now, undecided whether traps should ever
pay out; revisiting it later is changing `rewardWeight`, nothing structural.

**This is a different mechanism from `Distribution`, not a replacement for
it.** `rewardWeight` handles the bulk, doesn't-matter-which-specific-one
case — most fragment instances, most puzzle-solve consumables.
Narratively-load-bearing placements (shop's map piece that must be the one
unlocking the *last* tomb, the crocodile capstone) stay explicit
`Distribution` overrides / reserved `CappedPool` sites — those are pinned
by design, not ranked by weight, and weight-based fill should never be
allowed to override a pin.

## Dependencies replace the closed vocabulary AND the standalone guard

Shop can't validate its own price list in isolation — it's only valid
relative to what puzzle and core's plain treasure/junk rooms actually grant.
Rather than a separate "composed guard" pass, this is just shop declaring a
read dependency and checking at load time:

```ts
mod("shop").dependsOn(["puzzle", "core"])

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

## Collection is core; Mosaic is a mod's own screen — corrected

Originally called both core. Wrong for Mosaic: checked where
`mosaicPiece` actually gets produced (`SiteMapScreen.tsx:246`) and it's
granted through the exact same treasure-room claim-switch as `mapPiece` and
`fragment` — an ordinary allocated currency, not something the engine
produces on its own. `MosaicPage.tsx` is `mosaic` mod's own dedicated
screen, always has been, just unlabeled — the "second stakeholder" signal
from "Granularity" above.

`Collection.tsx` stays core: it aggregates hieroglyph's fragments *and*
tomb-treasure's treasures in one grid, owned by neither — the generic
renderer over `ledger.entries()` + registered `CurrencyMeta` this doc
already described. `hieroglyphFragments` is a read, not something
Collection produces.

Tell that still holds either way: turn trap off, fragments you already own
should still show, because neither screen depends on trap at all.

## UI wiring

**Mechanic mods have exactly one entry point into the app: `roomDispatch`.**
Checked shop specifically against this — per `SHOP_PLAN.md` it's "hosted
by Fez on an ungated sidepath off its tomb," which is a `sideAttachment`
room, dispatched exactly like any encounter. Shop needs no slot in
`Base.tsx`'s navigation at all. Nothing about trap or puzzle needs one
either. A mechanic mod's UI *is* the room it's dispatched into — nothing
else to wire.

**`Base.tsx` isn't fully fixed — progression mods can register a
persistent page.** It's a hardcoded 3-page swipe deck today (`Travel`,
`CollectionPage`, `MosaicPage`), but `MosaicPage.tsx` was already a mod's
own page before anyone labeled it that way (see "Collection is core;
Mosaic is a mod's own screen" above). Rule: core pages (`Travel` — engine
chrome; `Collection` — generic cross-mod aggregator) plus any progression
mod whose content is meant to be *browsed* rather than *encountered*.
Mechanic mods (trap/puzzle/shop) never get one — their interaction is
always a room, never a page.

**HUD stays core-composed, driven off metadata, not a widget registry.**
`SiteMapScreen.tsx`'s `SiteHudBar` hardcodes three things today:
`DetectorPanel` (core perks), `HealthDisplay`, `ConsumableBar` (both
trap's, per "Granularity"). Considered a `registerHudWidget` mechanism for
mods to plug into; rejected for the same reason `CurrencyMeta` beat a
closed reward-type union — three known things doesn't justify a plugin
slot. Cleaner: `CurrencyMeta` gets a `showInHud: boolean`, and the bar
loops over registered currencies rendering anything flagged, the same
generic-renderer pattern already used for `Collection.tsx`. No registry,
no new mechanism, reuses data that already exists.

**i18n scoped per mod.** Agreed, logical extension of the physical-folder
separation this whole doc is chasing — one shared `useTranslation("common")`
namespace today, each mod should own its own. Not detailed beyond the
decision; the mechanics of splitting `public/locales/*/common.json` per
mod folder are implementation work, not a design question.

**Detector target selection: from the SiteMap HUD, or from Collection.**
`compassResults` (`useDetector.ts`) is a pure, stateless query over
`generatedWorldConfigs` + the ledger — it doesn't structurally need to be
"inside a site" at all, that's just where the current UI happens to live.
Two ways to wire "pick an unfinished hieroglyph, activate the detector":

1. **Inline on Collection.** Tapping an unfinished tile calls
   `findUnownedInstances("fragment", hieroglyphId)` directly and shows
   results in a popover under the tile. No detector "mode," no cross-screen
   state, no navigation — the same core query the HUD panel would use,
   reused from a second entry point.
2. **Jump into a site with the target pre-armed.** Lift a
   `pendingDetectorTarget` to app-root state, route into an expedition,
   seed `useDetector`'s initial `compassTarget` from it.

At the time this was discussed, (2) had a precedent to copy —
`pendingHieroglyphSearch` did the same lift-and-route for a coarser,
tier-level version. That precedent is now gone: it predated PR #72's
pyramid-interior redesign and was removed this session (see commit
`b4ded7c`) for solving a problem the walkable interiors already solve
better. So (2) is no longer "reuse an existing pattern," it's "build new
cross-screen state infrastructure." (1) needs zero new plumbing and reuses
a query this doc already specified — the better default unless there's a
concrete reason to want the "jump there live" experience over a location
list.

Neither option is decided; this is where the choice stands.

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

**Weights should be relative, not required to sum to anything, and the
tunable numbers should stay where they already live.** Checked
`src/worldGen/spec/global.ts` — `GLOBAL_DEFAULTS` already is "one place a
designer eyeballs" (its own comment says so), with `chance` cascading
through the existing global → tier → journey → pyramid rule scoping. That
doesn't go away — a family's weight function is a thin read of that
resolved value, not an independently authored number:

```ts
weight: ctx => ctx.chance         // trap — reads the existing cascade
weight: ctx => 1 - ctx.chance     // puzzle — complement of the same knob
```

That works for exactly two competitors and silently breaks the moment a
third family bids on the same slot kind — `1 - ctx.chance` stops summing to
1 and nothing notices. Real fix: core normalizes whatever weights get
registered for a scope, so mods declare relative desire, not numbers that
have to add up to anything —

```ts
function resolveSlot(bids: { family: string; weight: number }[]): string {
  const total = bids.reduce((sum, b) => sum + b.weight, 0)
  const roll = seededRandom() * total
  // pick by cumulative weight — no normalization step for any author to remember
}

weight: ctx => ctx.chance   // trap, still reads the one authored knob
weight: ctx => 1            // puzzle, "whatever's left"
// a fourth family later just adds its own weight — no existing file needs touching
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

## Gates, ward paths, hidden passages, perks, detectors

Walked the rest of the world-gen/progression surface against this model.
Most of it already fits without change; two things (perks, detectors) needed
a real answer.

**Gates and ward paths — already core, no change.** Floor-key/tomb-key gates
(`types.ts:24`) are pure topology, `core/siteBuilder`'s job as already
stated. `wardPaths`/`wardWings` (`buildSite.ts:272-319`) decide *how many*
gated side-paths/wings a tomb gets — also structural, also core. What's
*inside* one (a fragment reward, optionally all-trap via
`wardPathTrapped` — a corridor with only traps, per the earlier
conversation) is a scoped `Distribution` override, same primitive as the
crocodile capstone, not a new mechanism:
`{ scope: wardPathOf(idx), fill: "trap" }` replaces the bespoke `trapped`
boolean threaded through `buildSite.ts`. Two independent confirmations of
the same primitive now (crocodile, ward-path-trapped) — good sign it's the
right one, not a one-off fit.

**Hidden passages — core, one leaky call site.** Masking
(`useAssembledFloor.ts`) and reveal-on-detection are structural/core, but
`maskHiddenCells(grid, detectionLevel: number, ...)` hardcodes that one
perk's field name directly into core rendering code — a concrete instance
of the `PerkState`-blob-leaking-into-core problem already flagged in "Known
cost," not a new issue.

**Perks — resolved, the "Gaps" bullet below is answered.** Ward keys turned
out to matter here: `wardKeyId` in a gate is literally one of the ids
`applyTreasurePerk` grants perks for (`TOMB_PERK_IDS`/`TREASURE_PERKS`,
`useProgression.ts:138-159`) — a ward gate's unlock check and a perk grant
are the same mechanism under two names. The split that resolves it:

- **Grant** — which treasure id maps to which perk, at which level. Core-
  owned *authored content*, same shelf as `data/treasurePerks.ts` today —
  design data, not mod logic, exactly like deciding which room gets
  `mapPiece` instance #3.
- **Consume** — whoever reads the perk and changes behavior. Genuinely
  mod-owned, and the current code already proves the split is real without
  anyone declaring it: `compassLevel`/`consumableDetectorLevel`/
  `detectionLevel` are read only by core's own navigation code
  (`DetectorPanel`, `useAssembledFloor`'s masking) — engine-level generic
  functionality, not owned by any mod; `scribesEyeLevel` is read only by
  puzzle mod's `TombPuzzle.tsx:58` for hieroglyph hint slots. Nobody wrote
  that rule, consumption just naturally ended up sitting with whoever cares.

```ts
registerPerk({ id: "scribesEye", ownerMod: "puzzle", maxLevel: 3 })
registerPerk({ id: "compass", ownerMod: "core", maxLevel: 3 })
```

A mod can register a new perk id it wants to *consume*. It can't decide
which specific ward key grants it or at what level — that's the authored
allocation table, same reason `mapPiece` placement isn't decided by
whichever mod's `Distribution` slot happened to win. This isn't a mechanism
that needs enforcing, either — the only way grant and consume drift apart
is authoring a mismatch, same category of mistake as double-allocating a
capped hieroglyph, and `validate.ts`'s existing
`findWardKeyGrants`/`findWardKeyRequirements` ordering check is the model
for how you'd catch it if it ever mattered enough to check.

**Detectors — a generic core query over allocation records, not per-type
scan functions.** Checked `useDetector.ts`: compass already does "pick a
fragment, scan for it" (`scanFloorForFragments` walks every
`generatedWorldConfigs` floor, diffs against `progression.hasFragment`);
the consumable detector does something structurally different — "find
rooms I skipped because inventory was full" (`getSkippedConsumables`). Two
hand-written functions today, one per reward type. Both collapse into
generic queries once currencies are registered the way this doc describes:

- **Capped/allocated currencies** — a `CappedPool`'s `sites` already record
  which room holds which specific instance, by definition. Detecting one is
  `findUnownedInstances(currencyId, variantFilter?)`, diffing allocation
  records against the ledger. Compass's "pick a hieroglyph" is filtering
  fragment instances by variant; **detecting a map piece is the identical
  query** with `currencyId: "mapPiece"`, filtered by tombId instead —
  same function, no new mechanism, direct answer to "can a mod detect a
  map piece": yes, for free, by registering the currency as capped.
- **Open counters hitting a cap** (skipped consumables) — a different
  query, `findSkippedGrants(currencyId)`, still generic, still core, since
  it's ledger bookkeeping (where a grant was attempted and dropped), not
  mod logic.
- **Hidden passages** stay outside this — live grid masking while walking,
  not a scan-and-report query, already a different mechanism above.

Core owns one generic locator over whatever `CappedPool`/ledger records
mods already register for other reasons — a mod gets detectability for
free just by registering its currency as capped, no scan function to
write. Which detector buttons show stays perk-gated
(`compassLevel > 0`, from the perk-consumer model above).

Live bug this surfaces, independent of any redesign:
`SiteMapScreen.tsx` passes `availableHieroglyphs={[]}` — hardcoded empty,
always. Compass's target-picker was never actually wired to a real list.
The generic model fixes this near-incidentally: "available variants of the
fragment currency the player hasn't completed" becomes a ledger query
instead of something someone forgot to hand-wire.

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

- ~~Perks are an unmodeled third reward channel.~~ **Resolved** — see
  "Gates, ward paths, hidden passages, perks, detectors" above: grant
  (authored, core) vs. consume (`registerPerk`, mod-owned) split, same
  shape as `mapPiece` allocation vs. family placement.
- **Determinism vs. mod set — downgraded.** World gen is fixed-seed. A new
  mod shipping does regenerate the world once, same as any other worldgen
  change today — not a live toggle players flip, so this doesn't need a
  general answer, just the same release discipline already used for any
  worldgen change.
- ~~Tier tuning ergonomics.~~ **Resolved** — see "Distribution" above.
  The tunable numbers stay exactly where they are (`GLOBAL_DEFAULTS`, the
  existing global/tier/journey/pyramid cascade); mod weight functions are
  thin reads of that cascade, not independently authored numbers. What
  needed fixing wasn't ergonomics, it was that `1 - ctx.chance`-style
  complements break past two competitors — core normalizing registered
  weights removes the cross-file coordination burden permanently, not just
  for today's two mods.
- ~~Snapshot tests.~~ **Resolved.** Design intent is expressed in counts,
  not exact placement — a sidepath landing after puzzle 2 vs. puzzle 3
  is equally valid as long as it exists where the design calls for one.
  `validateWorldSpec.ts` already checks counts, not layouts, so it already
  checks the right thing — a `Distribution` resolver producing a different
  *valid* room order on the same seed isn't a regression to guard against.
- **Save migration.** `useProgression`'s flat blob to a ledger shape is a
  save-format migration for existing players — not designed yet.
- ~~Bandage/oil ownership.~~ **Resolved** — health folded fully into
  `mods/trap/` (see "Granularity"), so bandage/oil are unambiguously trap's
  own consumables, not a separate ownership question.
- **`detectionLevel` leaks into core rendering code.** `maskHiddenCells`
  takes it as a directly-typed param (`useAssembledFloor.ts:48`) instead of
  reading it through a generic perk query — small, but the same
  `PerkState`-blob problem as trap-only perks sitting in core state.
- **`availableHieroglyphs={[]}` is a live stub**, not a design gap —
  `SiteMapScreen.tsx` hardcodes it empty, so compass's target-picker has
  never worked end to end. Worth fixing regardless of this redesign; the
  ledger-query approach above fixes it as a side effect.

## Open question

Whether a 4th mod (buffs, curses, seasonal event) would need anything this
shape doesn't already provide — good sanity check before committing to it,
not evaluated yet.
