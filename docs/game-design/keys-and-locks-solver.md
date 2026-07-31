# The keys-and-locks solver

Status: design doc · 2026-07-11  
Companion to `docs/game-design/pyramid-interior-design.md`. Also corrects
`mods-architecture.md`'s old "Gates and ward paths — already core, no
change" conclusion, but that's a secondary note — this is primarily a
**world builder** concern, not a mods-boundary one.

This is one subsystem of the world builder, not a mod. Floor-key/tomb-key/
ward-gate placement is not one mechanism today — it's two, conflated:

**The solver (generic, world builder engine):** understands "reachability
given a set of possessed keys." It knows nothing about what a key *is*
semantically — a map piece, a hieroglyph fragment, a ward-key treasure
are all the same shape to it: "possessing currency X's instance Y
satisfies requirement Z."

**The distribution rule (per-currency, authored):** which slots are
eligible for a given currency's instances, in what order, following what
placement policy. Today's code conflates the two: fragment/map-piece/
ward-key placement logic is hardcoded per-currency instead of being one
solver fed by per-currency rule data. (A mod that introduces its own
key-like currency would supply its own rule the same way — that's the one
place this touches the mods architecture at all.)

## World-building phases — the canonical order

Four phases, strictly sequential, each depending only on what the previous
one finished:

1. **Structural setup (DSL).** Builds every node — portal, fork, encounter
   — for the whole world, deterministic per seed. Assigns each node's own
   *wish* (a gate's `requiredKeyId`, a tableau's `requiredKeyIds`) and, new
   here, each candidate slot's own *loot preference* (`prefers: <currency>`
   — a soft tag, e.g. "this chest prefers the mosaic currency"). No reward
   is granted yet — a wish or a preference is not loot. See "Structure,
   then loot" below.
2. **Exploration.** The reactive worklist: discover key demands (locks) as
   reachability expands, place keys — anything that *gates* progress
   (map pieces, hieroglyph fragments, future mod-owned key currencies) —
   into reachable slots. See "The placement algorithm" below.
3. **Capped loot.** Runs once exploration settles (nothing left blocking).
   Any mod can register a capped-loot currency (mosaic tiles are the
   first). Every capped currency must be placed **completely** — no
   partial fills. Each currency owns its own placement rule, but should
   prefer slots already tagged in phase 1 before falling back to its
   generic rule. Spreading across journeys/pyramids/tombs is itself a goal
   of this phase, not an accident — avoid front-loading a currency's
   instances into early-game content, the same diversity-ladder shape map
   pieces already use (see "Capped loot spreads" below). Authored DSL drop
   rates for capped loot are a tentative idea, not yet designed — see
   "Open" below.
4. **Uncapped loot.** Fills whatever's left (sellables, consumables,
   junk) — a max-%-occupancy and a drop rate, not "always fill." Not yet
   designed at all; out of scope until phase 3 (capped loot) is built and
   proven. See "Open" below.

Phases 3 and 4 both used to be lumped together as "filler loot, once the
worklist is empty" — they're related (both non-gating, both run after
exploration) but distinct enough in their own completion guarantee
(capped = must-finish, uncapped = drop-rate-gated) to warrant separate
phases, not one pass.

## Node types: portal, fork, encounter — gate is not a fourth thing

Three conceptual node kinds cover every room:

- **Portal** — entrance/exit/stairhead, unified. Pure transition, no
  family dispatch, no requirement.
- **Fork** — pure branching. Structural, not a dispatched node at all.
- **Encounter** — everything else. Always family-dispatched (the existing
  `FamilyPlugin` registry), and *optionally* carries a key-requirement
  precondition on top of its own interactive content.

**Gate is not architecturally distinct from encounter — it's a family.** A
gate has real interactive content: it renders a visual, the player clicks
to attempt it, shows "you don't have the right key yet" if unsatisfied
(soft — same as every other gating in this doc, never a hard block on
approach), and calls `onSolved()` once the requirement is met and the
player clicks. That's the exact same `FamilyPlugin` contract
`TreasureFamily`'s click-to-open chest already uses — a gate is just a
registered family (`id: "key-gate"`, tags: `["gate"]`) whose defaults are
"no loot on solve, solving requires possessing a key." Today's `RoomType`
(`entrance | encounter | fork | gate | stairhead | exit`) collapses one
step further than the mods-architecture doc's original family-registry
work: `gate` merges into `encounter`, and `entrance`/`stairhead`/`exit`
unify into `portal`. Final shape: `portal | fork | encounter`.

**Tableau is an encounter that also happens to gate.** The same
key-requirement precondition that makes a gate a gate is just a property
any encounter can carry — a tableau room still renders its own interactive
puzzle content, but can't be solved until the player possesses the
required hieroglyph symbols. Not two mechanisms, one precondition applied
to two different kinds of interactive content (a gate with none, a tableau
with its own puzzle).

## Demand vs. supply: a node declares what it needs, a currency decides where it goes

A gate/encounter's key-requirement is authored **on the node** — what
currency, how many instances (or which specific variants). It does **not**
own placement. Placement stays the currency's own distribution rule (map
fragment's "one per journey" applies no matter which gate needs it).
Node = demand. Currency = supply policy. This keeps the split intact
everywhere: a hundred different gates can all demand "2 hieroglyph
fragments" without any of them knowing or caring where those fragments
actually get placed.

## A currency's "key" role and its collection-screen visibility are independent

Whether a currency shows on a persistent collection UI (`Collection.tsx`)
is its own metadata flag, unrelated to whether it functions as a key.
Three currencies, three independent combinations already exist in the
game as designed: hieroglyph fragments are both a key (gate tableaus) and
collection-tracked (the 58-hieroglyph collection screen); map pieces are a
key (gate tomb entry) with no collection UI at all; mosaic tiles are
collection-tracked (the mosaic reveal) and never function as a key.

## Locks have a scope — room, journey, or global

A lock's possession-check is the same mechanism everywhere — "does the
player hold currency X" — but what it unlocks differs by **scope**:

- **Room-scoped** — a gate/encounter node in one specific site.
- **Journey-scoped** — a tomb becomes enterable once `piecesRequired` map
  pieces are held (no single room, a threshold over the whole journey).
- **Global-scoped** — the next difficulty tier unlocks.

One key instance can satisfy multiple scoped locks at once — a tomb's
first treasure is simultaneously the thing that opens that tomb's own
room-scoped ward gates *and* the thing that flips the global next-
difficulty unlock. Not two keys, one key checked against two locks of
different scope.

## The invariant the solver exists to guarantee

Reaching the highest difficulty tier (Wizard) must never be blocked. This
is the one hard requirement everything else serves — not "probably fine,"
mechanically guaranteed the same way `keyAfterGate` (`siteValidator.ts`)
mechanically guarantees a gate's key is never placed behind the gate it
opens.

## The progression ladder

Difficulty is linear: each tier is 4 pyramid journeys + 1 tomb. Collecting
ANY ONE of a tomb's 4 designated tier-unlock treasures (`TIER_UNLOCK_PERK_IDS`,
`src/data/treasurePerks.ts`) unlocks the next tier (another 4 journeys + a
tomb), and so on to Wizard. The solver's top-level goal graph is exactly
this ladder — reaching Wizard. Each of those 4 treasures is *also* paired to
one specific journey of the next tier (journey N's own ward gates open on
tier-unlock key N) — so tier entry itself only ever needs one key, but
fully exploring the tier's ward-gated bonus content across all 4 journeys
means finding all of them, which is the actual progression this rewards.

**The ladder is linear; reachability is not.** The solver must compute
reachability across the **whole world at once**, not tier by tier. `WARD_MIX`
(`pyramid-interior-design.md` §6) already places ward keys across tiers in
both directions — a starter treasure can gate a junior pyramid's floor, and
a wizard treasure can gate a junior one. Concretely: the player reaches
junior difficulty via starter's tier-unlock treasure; a *different* starter
treasure (key 2) gates a floor inside a junior pyramid; a fragment placed
behind *that* gate might be exactly what starter's own tableau (key 3)
needs. Reachability genuinely flows backward (deeper tiers feeding earlier
ones) as well as forward — a sequential per-tier loop cannot model that,
only one whole-world graph can.

## Two levels: a coarse world graph over an unchanged fine-grained one

The reachable play area is computed at two levels, not one giant room-level
graph spanning the whole world:

- **Fine-grained (existing, unchanged):** `siteValidator.ts`'s
  `reachableFrom` already solves "which rooms are reachable within this one
  floor, given owned keys" — correct today, nothing here changes it.
- **Coarse (new):** a much smaller graph over floors/tombs/journeys —
  "which floors/tombs are even enterable at all, given keys collected so
  far." Far smaller state space than reasoning about every room in the
  world at once.

**A coarse edge is a projection, not an independently authored fact.** A
floor itself is never "locked" — what's locked is the *path to its own
stairhead*, inside whichever earlier floor actually contains that
transition. "Floor 2 requires key X" is derived by asking the existing
fine-grained model "is the specific stairhead cell leading to floor 2
reachable, within floor 1, given currently-possessed keys?" — never stored
as a separate fact on floor 2 itself. This matters: if floor 1's topology
changes (different gate position, different key), the coarse edge updates
automatically because it's computed on demand, not duplicated data that
could silently drift out of sync with the room graph it's supposed to
describe.

Concretely, `configBuilder.ts`/`siteAssembler.ts` don't change for this —
they keep building per-floor topology exactly as today. The new coarse
solver is a separate pass (in `scripts/generateWorld.ts`, after topology
exists, per the two-phase shape already agreed), reading the already-built
floor data to answer "which floors are reachable" and, within a reachable
floor, "which of its rooms are eligible slots" — by calling the existing
fine-grained BFS, not re-deriving it.

## Structure, then loot — two strictly separate phases

`assembleFloor` (structure phase) builds every node — every portal, fork,
and encounter — for the *entire* world, up front, deterministic per seed.
Every node's own **wish** is baked in at this point: a gate's
`requiredKeyId`, a tableau's `requiredKeyIds` (from that family's own
`resolveKeyRequirements`), a slot's optional `prefers` tag. None of this is
loot yet — a wish is a precondition or a preference, not a granted reward.
No currency's actual reward value (which specific hieroglyph, which
tomb's map piece) is written during this phase.

The solver (grant phase, below) never adds or removes nodes — it only
walks the already-finished structure and grants currency instances into
slots to satisfy wishes and fill capacity. This is why a "lock" doesn't
need to be invented or pre-enumerated: it's *discovered* by walking the
fixed-point BFS (`collectReachableKeys`) and noting which reachable
frontier cells carry a wish that current `ownedFacts` don't satisfy yet —
the same wish that was always there in the structure, just not yet
visible to the walk because nothing had opened the door to it.

## The placement algorithm

At every point the solver knows the **currently reachable play area** —
everything solvable given the keys the player could plausibly already
hold, computed from scratch at world-gen time (the theoretical maximum,
not a simulated playthrough). A key is never placed outside that reachable
area — this is what mechanically guarantees "never blocked," not authoring
discipline.

This is **worklist-driven, not ladder-driven** — the progression ladder
(reach Wizard) is the invariant checked at the end, not the control flow.
The solver keeps a queue of not-yet-satisfied locks (gates, journey
thresholds, the tier-unlock); after each placement it recomputes the
reachable set, which may reveal new locks to enqueue and may satisfy
others. It stops when the queue empties (everything placed, world fully
solvable) or when nothing can progress — the latter is the hard-fail
condition, no ladder-position bookkeeping needed to detect it. Worklist
over ladder specifically because locks don't resolve in tidy tier order —
`WARD_MIX`-style cross-tier gating (a starter key gating a junior floor
holding a starter-tier fragment, per the earlier example) means whatever's
actually blocking gets processed whenever it becomes the frontier,
regardless of which tier it nominally belongs to. This also keeps
exploration open rather than corseting the player into one tier at a time.

For each entry pulled off the worklist:

1. Compute the reachable play area given everything placed and possessed
   so far.
2. For each remaining instance of this key, in the currency's own priority
   order:
   - Use an authored placement preference if one exists for this specific
     instance.
   - Otherwise pick from the reachable area's available loot slots,
     filtered by that currency's own **distribution rule** (an authored
     placement policy — e.g. map pieces: prefer one per journey, never
     two in the same pyramid; hieroglyph fragments: difficulty X fragments
     go in difficulty X corridors), ranked within the eligible candidates
     by the existing generic loot-slot priority order (chests first — see
     `pyramid-interior-design.md`'s "Loot priority order").
3. Once every instance of that key is placed, whatever it unlocked becomes
   solvable — recompute the reachable play area (now bigger), enqueue any
   newly-visible locks, and continue.

### Phase 3/4 loot: the same pipeline, once the worklist is empty

Once every key-like currency is fully placed (no blockers left), remaining
slots get filled by phase 3 (capped loot: mosaic tiles today, more
mod-owned capped currencies later) then phase 4 (uncapped loot:
consumables, sellables, junk) — through the **same composable
distribution-rule pipeline** every key currency already uses, just with
different completion guarantees (capped = must fully place; uncapped =
drop-rate-gated, a slot can end up genuinely empty). Neither phase needs
incremental reachability recompute — by the time the worklist is empty the
reachable area *is* the final, fully-unlocked world, so both are one pass
over whatever candidate slots remain, not a re-expanding loop.
`fragments.ts`'s old final pass ("fill every remaining slot with junk
loot") proved this shape in miniature, unconditionally — it needs to
become two real, ranked phases (capped first, uncapped second), not stay
fragment-specific or single-pass. Since shop stock is a capacity-bearing
slot like any other, this same pipeline is what populates a shop's stock,
too.

### Capped loot spreads across journeys/pyramids/tombs — a general property

Map piece placement's two-level diversity ladder (below) isn't a
map-piece-specific quirk — it's the general shape every phase-3 capped
currency should follow: prefer spreading instances across journeys first,
relax to pyramid-level diversity only once every journey already holds
one. The goal is the same regardless of currency — a capped currency's 298
(or however many) instances should read as spread through the whole game,
not clustered into whichever handful of slots the ranker reaches first.

### Distribution rules: composable functions, not declarative config

A distribution rule is a plain function over the reachable area's
candidate slots, `(candidates, ctx) => candidates` (filtered/reordered,
best-first) — registerable by a mod the same way `registerFamily`/
`registerCurrency` already are. `WARD_MIX`-style weighted cross-tier
targeting is real logic, not expressible as a simple config object without
inventing a rule language for it.

> **As-built note (§E, 2026-07-14).** The rule names below (`lootPriority`,
> `weightedTierTarget`) are illustrative — the real rankers are each currency's
> own bespoke `byPoolScore` (`src/mods/*/game/*Currency.ts`). And crucially: only
> the **spread** currencies (map pieces, hieroglyph fragments) are placed by a
> distribution rule. **Ward/tomb keys are NOT a distributed currency** — they're
> **positional tomb content** (one treasure per tomb floor, "the treasure IS the
> key"), placed by tomb structure and *harvested* by the reachability model, never
> ranked into free slots (210 gates reference only ~32 distinct keys — many:1,
> threshold-1 demand; a demand-spread currency can't express that). So the
> ward-key line below never became real code, and `WARD_MIX` stays buried.
>
> **Why retiring `validateDiscovery` is safe (the invariant chain):** every tomb
> treasure is always placed as positional content → every ward key is therefore
> harvestable → every ward gate (optional or load-bearing) resolves in reachability
> → no hard-fail. A ward pocket is *optional loot* by default; it becomes
> *load-bearing* only when it holds a required currency (e.g. a secondary-tomb map
> piece on a deep floor), and the worklist already sequences that (place ward key →
> pocket reachable → place the required piece). Reachability's winnability sweep +
> `settleHarvest` enforce this structurally, subsuming `validateDiscovery`'s old
> existence-only check.

The three rules named so far all decompose into two small, reusable
primitive kinds — **filters** (narrow candidates) and **rankers** (order
what's left) — composed with a plain `pipe`:

```ts
// map piece: prefer a different journey per instance; relax to a different
// pyramid within an already-used journey (see "Map piece placement" below)
pipe(uniqueBy(slot => slot.journeyId), rankBy(lootPriority))

// hieroglyph fragment: tier-match filter, then generic loot priority
pipe(filterBy(slot => slot.difficulty === ctx.targetDifficulty), rankBy(lootPriority))

// ward-key: NOT built — ward/tomb keys are positional tomb content harvested by
// reachability, not a distributed currency (see the §E as-built note above)
```

A future currency composes the same handful of primitives instead of
writing placement logic from scratch.

The hieroglyph-fragment tier filter is a genuine hard filter
(`filterBy(s => s.tier === demand.tier)`, `HIEROGLYPH_CURRENCY.rank` in
`src/mods/hieroglyph/game/hieroglyphCurrency.ts`) — a fragment may never land
in a slot whose own authored difficulty differs from its tier, regardless of
ranking pressure. Beyond the tier filter, the rank composes two further soft
rungs: a ward-key/preference score, then a dedup that caps a hieroglyph to
**at most one ward-matched slot per distinct matched key**
(`uniqueBy(s => matchedKey ? `__ward__:${matchedKey}` : `${journeyId}#${levelIndex}`)`,
falling back to per-pyramid dedup for non-ward slots) — without this cap a
single hungry symbol would claim every gated slot behind a tomb's own key,
leaving nothing for the other symbols that also prefer it. The cap means a
symbol needed deep in its tomb's tableau chain (several preferred keys, one
per earlier floor) holds back one fragment per floor instead of piling them
all behind the first, and no two of its own gated copies ever require the
identical key.

A per-symbol `endReward: "hieroglyph:<id>"` preference tag is deliberately
not used to reserve a slot for a specific symbol: it would still be only a
soft +1 score (stealable by whichever demand processes first, not an
exclusive claim — see "A slot's authored placement preference is a soft tag"
below), and it would rot whenever the tableau story generator
(`orderByGradualReveal`, `src/data/tableaus.ts`) reshuffles which symbol is
first needed at which run. The ward-slot cap achieves the same outcome
without hardcoding a symbol id into the spec.

### Map piece placement — a two-level diversity ladder, not a single dedup

A journey (one of the 4 pyramid-type entries per tier, e.g. `starter_1`) is
made of several pyramids (its own replayable sites, indexed by
`levelIndex` — see `pyramid-interior-design.md`'s Terminology section).
Map piece placement prefers to spread across **journeys** first — no two
instances in the same journey — and only relaxes to **pyramid**-level
diversity (a different pyramid within a journey that already has one) once
every journey in the tier already holds an instance:

```ts
preferThenRelax(
  uniqueBy(slot => slot.journeyId),
  preferThenRelax(uniqueBy(slot => `${slot.journeyId}:${slot.levelIndex}`), rankBy(lootPriority))
)
```

This is the same `preferThenRelax` combinator nested two deep, not a new
primitive — a tier with more tomb map-piece demand than it has journeys
(e.g. a tier needing 4 pieces across only 4 journeys is exactly at the
boundary) degrades to reusing a journey rather than failing outright.

### Preferences are soft — they relax under pressure, they don't block

A distribution rule's constraint can be broken if honoring it strictly
would leave instances unplaceable. Concretely: map pieces prefer one
per journey, but higher difficulty tiers have more tombs (more fragments
needed) than journeys to spread them across uniquely — the constraint must
degrade gracefully, not block generation. This isn't new: `fragments.ts`'s
`assignFragments` already does exactly this today (a strict first pass,
then a relaxed second pass if the strict pool's exhausted) — it just needs
to become a **generic combinator** every currency reuses instead of
per-currency bespoke retry code:

```ts
preferThenRelax(uniqueBy(slot => slot.pyramidId), rankBy(lootPriority))
// tries the strict filter first; only falls through to the relaxed rule
// (skipping the filter, keeping the ranker) if too few candidates survive
```

### Slots have capacity — a shop can hold many keys, a chest holds one

A candidate slot isn't always single-use. A treasure chest takes exactly
one item; a shop slot is its own **stock** — several items can be assigned
to the same shop at once. The candidate-slot model needs a capacity, not
just an occupied/free flag.

This makes a shop a legitimate placement target for a key-like currency,
same as any chest — "purchasable" is just another acquisition channel a
distribution rule can prefer. Concretely: the map piece gating wizard
tier's second tomb can prefer placement as shop stock inside wizard tier's
*first* tomb (its own fez-shop) — once the player has reached that far,
the fragment is right there to buy, no separate exploration required.

### A slot's authored placement preference is a soft tag, not an exclusive claim

"Use an authored placement preference if one exists for this specific
instance" (the placement algorithm, step 2) is realized as an optional
`prefers: <currency>` tag on a candidate slot itself — set once, at
structure-build time, by whoever authors that node (e.g. "this journey's
first pyramid's main chest prefers the map piece"). It is a ranking boost,
not an eligibility filter: a currency's distribution rule ranks
preference-tagged slots first, but any slot remains eligible for *any*
currency's generic fill. Once the preferred currency's demand is fully
satisfied, a leftover `prefers` tag is simply inert — the slot falls
through to whatever fills next (generic loot-priority ranking, then filler
loot), never blocking or reserving capacity nobody claims. This is what
lets `mainEndReward: "mapPiece"`-style DSL authoring stay expressive
(“the map piece goes here, normally”) without baking a literal reward at
structure-build time — see "Structure, then loot" below.

### Mod-owned slot types need their own fallback rung

The shop is itself a mod (`ownerMod: "shop"`) — disable-able, per the mods
architecture's own principle that mods can be turned off. A rule preferring
shop placement must fall back to a non-shop slot if the shop mod isn't
registered in a given build — one more rung on the same `preferThenRelax`
chain: prefer shop stock in wizard tomb A's shop → relax to any wizard-tier
chest → etc. Any rule targeting a mod-owned slot type needs this same
tolerance, not just the shop case.

### Exhausted relaxation is a build failure, not a warning

If every relaxation rung is exhausted and a required key still has no
eligible slot, world generation must **hard-fail** — this is where the
"never blocked" invariant actually gets enforced, same category as
`keyAfterGate`. `fragments.ts`'s current behavior (a `console.warn` when a
hieroglyph can't place all its required fragments) is exactly what this
replaces: today that's a soft warning a build can silently ship with;
under this solver it becomes a real build error.

## Worked example

**Blocker 1 — reaching the first tomb.** The tomb needs `piecesRequired`
map pieces to unlock. Compute the reachable area with zero keys placed
— the starting four journeys. Place map piece 1: no authored
preference, so pick the highest-priority available slot (a chest) in the
reachable area. Place map piece 2: the currency's distribution rule
("never the same pyramid as another instance") filters candidates to a
different journey; again no authored preference, pick the best slot there.
Repeat for 3 and 4. All four sit *inside* the area computed *before* any of
them existed — they can never gate themselves. The tomb is now enterable.

**Blocker 2 — the tomb's first tableau.** Reaching the tier-unlock goal
(the tomb's first treasure) is now blocked by a tableau requiring several
hieroglyph fragments. Same loop, different currency, different
distribution rule (difficulty-matched: a starter hieroglyph's fragments go
in starter pyramids/paths). Placed the same way — authored preference
first, then loot-priority ranking within the reachable area.

**Recursion.** Collecting the tomb's first treasure unlocks the next
difficulty tier — the reachable area widens (new journeys, plus newly
satisfiable ward gates inside already-visited pyramids). The whole loop
repeats one tier up, all the way to Wizard.

**Why this has to be whole-world, concretely.** Starter's tomb has more
than one treasure — treasure 1 flips the global tier-unlock (junior
becomes playable); treasure 2 (a different key, same tomb) happens to be
the ward-key a *junior* pyramid's floor demands. The player is now in
junior difficulty, exploring junior pyramids, and opens that gate with a
key they got from starter. Behind it sits a hieroglyph fragment — and that
fragment turns out to be exactly what starter's *own* tableau needs for
its treasure 3. The player leaves junior, walks back into the starter
tomb, and only now can pass a gate they walked past on their very first
visit. This is the pitch's "backward and forward" in miniature: a worklist
processing whatever's blocking, regardless of which tier it nominally
belongs to, is what makes this kind of path even expressible.

## Relationship to CappedPool / reward-weight / Distribution / WARD_MIX

This folds into, and supersedes the earlier separate framing of,
`CappedPool` and `mods-architecture.md` step 4's reward-weight allocator —
a `CappedPool`'s `sites`/`take()` and a key's placement rule are the same
concern: which specific instance goes where, reachability-gated.
`Distribution` (family selection per room slot) stays a separate, narrower
concern — which family renders a slot, not what unlocks it or where its
keys land.

`WARD_MIX` (`pyramid-interior-design.md` §6 — a design-doc-only table,
never implemented in code: "treasure tier → target pyramid tiers →
distribution") is also superseded, not a separate mechanism to preserve
alongside this one. "Which tiers a ward-key currency's instances can
target" is just that currency's own distribution rule, same shape as map-
fragment's "one per journey" or hieroglyph-fragment's "difficulty-matched
corridor" — it plugs into this solver as data like every other key type.

## Open (implementation not yet designed)

Resolved during design (kept here only as a changelog, not a live list):
distribution rule shape (composable filter/rank functions), where the
solver lives (`scripts/generateWorld.ts`, after topology, over the
existing per-floor BFS), and hard-failure enforcement (exhausted
relaxation fails the build — no separate post-hoc validator needed, since
the solver only ever places constructively within the reachable area).

Also resolved since (2026-07-11/12 gap-analysis pass — see `TODO.md` for
live implementation status): the map-piece two-level diversity ladder
(journey then pyramid, not a single dedup level — see "Map piece
placement" above), the soft preference-tag mechanism for authored
placement preferences, and the structure/loot phase split ("Structure,
then loot" above).

Resolved since: the real worklist queue is built and proven, and map
pieces are migrated onto it using the two-level diversity ladder —
phases 1 and 2 above are real, not just designed.

Still genuinely open:

- **Phase 3 (capped loot) isn't generalized yet.** Mosaic tiles are still
  placed by an older, structural, pre-worklist mechanism — deciding how
  many mosaic slots a pyramid gets at build time, rather than a currency
  choosing among already-built candidate slots. Migrating it to a real
  phase-3 currency is the current work.
- **Phase 4 (uncapped loot) isn't designed at all.** What "drop rate" and
  "max occupancy" mean precisely, and what happens to a slot that misses
  its roll (decided: genuinely empty, not a guaranteed fallback) still
  need a real mechanism, not just this paragraph.
- **Authored DSL drop rates for phase-3 capped currencies** — floated as
  an idea, not committed to a shape. May not survive contact with
  "capped loot must fully place" (a dropped roll would need to be retried
  somewhere, or the total would need to shrink) — genuinely open.
- Slot capacity (a shop's several-items stock) is not built — a slot is
  still single-assign only.
- Whether the coarse solver needs to re-run incrementally during
  development or only matters for the final validated build.
