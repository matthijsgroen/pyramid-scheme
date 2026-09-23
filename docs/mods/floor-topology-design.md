# Floor topology as mods

How a mechanic that changes where a player can walk becomes a mod, with the same toggle-off
guarantee the loot mods have.

Companion to `TARGET.md` (the three layers and the two rules), `ARCHITECTURE.md` (how the pieces
fit), `SLICE-CHECKLIST.md` (how a slice lands), and
`../game-design/floor-as-puzzle-brainstorm.md` (the catalogue of mechanics this serves).

---

## The problem

`TARGET.md` puts `topology/ — grid/corridor/gate/chain skeleton` in core and marks it **never
mod-specific**. Every extension point on `ModDescriptor` is content-side: currencies, families,
distributions, validators, reachability support, shop stock. None of them reaches the carve.

A floor mechanic — a one-way ramp, a flooded corridor, a buried side path — is topology. So either
those mechanics cannot be mods, or core grows generic topology primitives the way it grew generic
currency primitives. This page takes the second road, under Rule 2: **a mod may not invent topology
either.** Structure is authored in the DSL; core carves it; the mod owns what it means.

Core gets a directed edge. `sandSlide` knows it is sand.

---

## What an author writes

**An author provides wishes and constraints. The map builder makes the best of them.**

Nobody hand-designs a floor. An author says what should be true of a place — how long the walk is,
how much it sprawls, what fills its rooms — and the builder carves something that satisfies it. A
topology feature is the same kind of statement, and it joins the same sentence: this tier's floors
sprawl, hold these puzzle families, and have flooded corridors in them.

**Specificity is the dial, and it decides whether a statement is a wish or a constraint.** A feature
named at a broad scope with an intensity is a wish: the builder places as many as fit and reports
what landed. A feature pinned to one floor is a constraint: it lands there or the build stops. That
is the same cascade every other authored value already rides — a tier's default, overridden at a
journey, overridden at a pyramid — so a feature needs no placement mechanism of its own.

A slide or a fork is usually worth pinning; "some of this tier's corridors are flooded" is not, and
pinning each one would be an author doing the builder's job.

## Features, and who owns them

**A mod registers topology features by name — `LightSwitchFork`, `FloodedCorridor`, `SandSlide`.
Registering one makes that mod its owner. Authoring names the feature and nothing else.**

Ownership stops being something an author writes down. The registry maps a feature's name to the mod
that registered it, so core knows who owns a piece of authored structure by looking it up. Toggle
that mod off and the feature drops, taking everything it placed with it.

A feature is the authored unit. The catalogue in `../game-design/floor-as-puzzle-brainstorm.md` is
the feature list — the one-way ramp, the waterline, the sequence door, the choked pyramid — and what
this page once called primitives is the vocabulary those features are built from, not something a mod
ships on its own.

### The four slots

| Slot         | What it says                    | `LightSwitchFork`                        | `SandSlide`                                     | `Pump`                                                 |
| ------------ | ------------------------------- | ---------------------------------------- | ----------------------------------------------- | ------------------------------------------------------ |
| **needs**    | what the floor must provide     | a room with 2+ exits to gate             | a deep room and an upstream one                 | two sections on a floor                                |
| **places**   | geometry and controls           | an encounter, and a gate per exit        | a directed link                                 | a control room, and a mask over one section            |
| **binds**    | control to geometry             | solved toward north opens the north gate | —                                               | used, and the mask moves from one section to the other |
| **gated by** | a currency the player must hold | —                                        | `rope`, for the variant that is the only way in | —                                                      |

Two slides that look identical and differ only in `gated by` — one a shortcut, one an entrance
waiting for a rope — are the same feature authored twice, which is the sign the shape is right. A
crack in a wall waiting for a hammer is a gate whose `gated by` names an item rather than a key, and
the keys-and-locks machinery already answers that.

### A fork knows its exits, and a switch is a fork that carries an encounter

A fork is already the place where ways diverge, so it is the only node that knows, by construction,
what leaving it in each direction means. Give it that knowledge explicitly — **each exit has a
direction and a kind: a ward gate, the main path onward, a side path, or another fork** — and a
switch needs no geometry of its own. It is a fork with an encounter in it, reading the exits it
already has.

This is what makes the board a diagram of the room. The player stands in the fork, the board draws
the fork's own ways out at their own compass points, and routing the beam to one opens that way.

**The builder places the gates, not the author.** It knows which boundaries are already spoken for,
and it knows the control must be reachable before what it controls — which a fork satisfies by
standing in it. Two exits are not available to gate:

- **an exit toward an existing ward gate**, because that boundary is already owned; and
- **an exit toward another fork**, because a gate there cuts one open space in two and reads as a
  wall drawn through the middle of a room.

What is left — the main path onward, and side paths — is where the gates go. Gating the main path is
allowed here for the reason the invariants already give: the opener is reachable before the blocker,
and at a fork it is the room the player is standing in.

### The unit of a claim is a room-to-corridor boundary

A gate occupies a boundary rather than a cell, which is what lets two features be told apart on a
floor: a claimed boundary leaves the pool, and a feature that wanted it is told which feature has it.
The fork above is the worked example — it claims the boundaries it gates, and cannot claim the one a
ward gate already holds.

### A feature claims what it uses, and a claim is exclusive

**No two features share a corridor, a room or a section.** A corridor claimed as a flooded stretch
cannot also be a sand barrier waiting on a switch from another pyramid, and the builder refuses the
pair rather than choosing between them.

The reason is not tidiness. Two features on one passage means two openers on one barrier, and a
player looking at it cannot tell which thing they are looking at — or which of the two they have just
satisfied. The floor stops being readable before it stops being solvable.

So placement is an allocation: each feature claims the elements it occupies, claimed elements leave
the pool, and what is left is what the next feature may have. `slotAllocator` already does exactly
this for loot — footprint, eligibility, and removal of what is taken — one level up from the floor
elements a feature wants.

Order follows from wishes and constraints, and needs no rule of its own:

1. **Pinned features claim first.** They named a place; that is what pinning means.
2. **Woven features then claim what remains**, in registry order, the way the dynamic loot
   distributions already resolve a contested slot deterministically.
3. **A wish with nothing left to claim is reported.** A constraint with nothing left to claim stops
   the build, and names the feature that took the ground it wanted.

That last line is the one worth keeping: when two authored intentions collide, the author hears which
one won and why, rather than finding a floor missing something they asked for.

### Why this does not break Rule 2

`TARGET.md` says core never invents topology to hit a per-mod target. A woven feature is not core
inventing: the author asked for it by name, and the builder is filling an authored request. The
precedent is already in the DSL — `sidePaths` and `hiddenPaths` name an intensity and let the builder
choose how many and where. What stays forbidden is unchanged: no auto-distributor, and no structure
conjured to satisfy a mod's own numbers.

**A constraint that cannot be met stops the build**, naming the feature and the floor, the way a chest
holding nothing already does. **A wish that cannot be met is reported, not fatal** — that is the
difference the two words carry.

## Mod-owned authoring

**Structure placed by a feature belongs to that feature's mod. Untagged authoring is core's; owned
authoring drops when its mod is not registered.**

One rule, and both degradation modes fall out of it rather than needing separate machinery:

| The tagged field                                       | Dropping it                               | What it costs a run           |
| ------------------------------------------------------ | ----------------------------------------- | ----------------------------- |
| _added_ geometry — a ramp's link                       | the floor carves without that corridor    | nothing; walls moving is free |
| _removed_ passability — a flood, dust over a side path | the restriction lifts, geometry unchanged | nothing                       |

Same mechanism, opposite consequence, decided by which of the two the authoring was.

Why not "always go permissive": a one-way ramp made two-way is a **bypass**. It would let a player
walk back up past the puzzle rooms the ramp skips, which is what `sealed` exists to suppress. So
invented geometry has to leave, and restriction has to lift.

The gate this sets, alongside `TARGET.md`'s: **mod off → the world still generates and every reward
stays reachable. Pacing is not preserved.** An unflooded floor opens early, and that is acceptable
for a toggle-off proof. A bypass around a puzzle room is not.

---

## The invariants

A pyramid can always be finished. The gates between tiers are the tomb tableaus, and no journey is
withheld by a key. With one mechanic authoring blockers that rule holds by convention; with six mods
authoring them it needs a check.

### Every blocker's opener is reachable

For each blocker, one of these holds, and both are questions the solver already answers:

- **In-floor.** With the blocker closed, its opener is reachable on this floor. `collectReachableKeys`
  already runs a `while (changed)` fixed point that finds a key by walking, re-BFSes, and repeats.
  An in-floor lever is a key with a different sprite.
- **Elsewhere.** The opener lies outside the site and is reachable in the coarse world graph without
  entering it. A ward key from a tomb opening a pyramid floor is the same shape.

A blocker on the main path is allowed. Being stuck is what is forbidden.

The worked example is cosmic dust's choked pyramid: it is entered and gives nothing at all until its
siblings are worked — the one site in the game not completable on arrival. It satisfies the second
clause, not the first. The opener is in the journey's other pyramids, and leaving is always
available, so the player is never stuck, only sent elsewhere.

### Two bracket runs, one BFS

Passability today is a function of `(grid, ownedKeys)`, and keys only accumulate — which is what
lets the fixed point terminate. A waterline lever, sand closing behind the player, a half-turned
hourglass are **non-monotonic**: same player, same keys, floor open at one moment and shut at
another.

Rather than model the states in between, bracket them:

- **Most permissive** — every blocker assumed clearable. Answers _is every reward ever obtainable?_
  This is what placement and reachability already compute.
- **Most restrictive** — every blocker at its worst: ramp absent, corridors flooded, dust in place,
  upper floor choked. Answers _is each blocker's opener still reachable?_

Non-monotonic state never enters the solver. The two runs bound it.

### A hidden way out stays one-way

A hidden section may end in a one-way that spills into an open corridor. The player finds the section
by its proper entrance, walks it, and comes out somewhere visible — that is a good shape, and the
emergence is part of the reward for having found it.

**What no tool may do is make that one-way passable in reverse.** A rope that turns a slide into a
climb, or anything else that reverses a passage, refuses the ones whose far side is hidden. Otherwise
the section is enterable by someone who never discovered it, and hiding it bought nothing.

The same reasoning stops a switch gating a hidden branch: a gate the player can see is a statement
that something is there. A hidden section is a statement that nothing is, until they find otherwise.

### What holds each rule

A rule with no check and no marker is indistinguishable from a rule that is enforced, which is how a
collection became uncompletable while every check stayed green. So each rule here names what holds
it, or says plainly that nothing does.

| Rule                                                            | Held by                                                                    |
| --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| A floor-key gate has a collectible key                          | `keyAfterGate`                                                             |
| A fork's branches are not all bland                             | `allBlandFork`                                                             |
| Map pieces present, unique, reachable behind their seal         | the three `mapPiece*` reasons                                              |
| Mosaic pieces present, unique, reachable                        | the three `mosaic*` reasons                                                |
| A section has a name a save can file it under                   | `unusableSectionAddress`                                                   |
| No two rooms of a section answer to one slot                    | `duplicateCellSlot`                                                        |
| A switch found two ways left to close                           | `switchForkWithoutGates`                                                   |
| Switch key stems are unique across floors                       | `validateSwitchForkKeys`                                                   |
| Rewards counted, no chest left empty, the shop economy balances | `validateRewardCounts`, `findEmptyChests`, the shop mod's `worldValidator` |
| No boundary is gated twice                                      | **nothing yet**                                                            |
| A switch's gates are reachable only through the switch          | **nothing yet**                                                            |
| A switch's family is re-enterable                               | **nothing yet**                                                            |
| A switch never gates a hidden branch                            | **nothing yet**                                                            |
| A room's exits do not outlive its directions through masking    | **nothing yet**                                                            |
| A hidden way out stays one-way under any tool                   | **nothing yet**, and no tool exists to break it                            |
| An authored gate's key is minted by whoever owns it             | **nothing yet**                                                            |
| Every collection's target count is reachable                    | **nothing yet**                                                            |

The last two are the ones that bite hardest and neither is floor-shaped. A misspelled key id leaves
its branch unreachable for ever and no check notices, because the validator skips authored keys and
the solver only records a lock it discovered. And reachability answers "can this be got to", never
"is there enough of it" — which is the whole distance between a green build and a game that can be
finished.

### Per-visit state is the mod's problem

Leaving is always available, and re-entry returns the player to the position they left at. So
stranding is never about reaching the exit — it is about coming back to the same trap. A mod owning
non-monotonic state either discards it on leave, or guarantees its opener is reachable from wherever
it can strand a player.

`hourglass` proves its own flippability through `worldValidator`, the descriptor field the shop
economy guard already uses. It drops with the mod, and core never learns what sand is.

---

## The vocabulary features are built from

These are core's, not any mod's. A feature composes them; none of them is a thing a mod ships on its
own, and none is built before a feature needs it.

|     | Primitive                                                                                   | Generalises                                                                | Serves                                  |
| --- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------- |
| P1  | **Blocked-until, with a registered opener**                                                 | `hidden`+found and `gate`+key are two hardcoded instances of this one idea | flooding, collapse, dust, the hourglass |
| P2  | **Authored edge between two addresses, optionally directed**                                | —                                                                          | ramps, back-bars, shafts                |
| P3  | **Corridor cells carry mod markers**, fired on being crossed                                | only rooms carry anything                                                  | glyph tiles, sand trails                |
| P4  | **Floor-scoped encounter** — the board is the floor, the moves are steps                    | room-sized boards                                                          | the hourglass, visit-order floors       |
| P5  | **Currency scope** — journey, beside positional and world-spread                            | §E's positional-vs-spread split                                            | cosmic dust                             |
| P6  | **Per-visit mod state with a lifecycle** — created on entering a site, discarded on leaving | mods own persistent state only                                             | the hourglass flip                      |

P1 is the one worth building for its own sake: it does not merely serve a mod, it **subsumes two
special cases core currently hardcodes**. Core gets smaller.

**P1's mechanism already exists**, which is what makes it the cheap primitive rather than the
expensive one. `useAssembledFloor` masks a hidden section by deleting the `dirs` that point into it
and turning its cells `empty`, keyed on `revealedSections` — blocked-until, implemented as
dirs-editing at assembly time. It already carries the knock-ons: it marks the junction, downgrades a
room to a corridor when dir-removal leaves it a passthrough, and varies the junction's state by
detector level. P1 generalises the **opener**, and a new opener inherits all of that.

**P2 is a directed `dirs` pair, and every mover already honours it.** `reachableFrom`, `findPath`,
`walkableFrom` and `completeCell` all move on the **source** cell's `dirs` and none check the target
for a reciprocal — the solver and the runtime agree, so a one-way edge needs no traversal change
anywhere.

**P2's cost is art, not logic.** `roomClaims` reads an edge as open if _either_ side declares it —
"a real way through, from either side" — which is what keeps a one-way corridor drawn at all, and
also means its mouth is drawn open from below, offering a passage the player cannot take. The fix
belongs in the drawing: a ramp should read as a ramp from above and as an opening too high to climb
from below. Making `roomClaims` direction-aware instead would fight an intent that exists for the
junction rooms that share a void cell.

One accident in P2's favour: a one-way cell has `dirs.size === 1`, so `completeCell`'s straight-
through test fails and the cell is marked reachable — a blind spot the player must click — rather
than auto-revealed. That is the seen-on-arrival behaviour a ramp wants, for free. Less welcome:
`renderAscii` has no glyph for a single-dir cell and falls through to `·`, so one-ways are
unreadable in the ascii view the specs read. Worth extending with P2.

Two-sidedness, following the currency precedent: a blocker needs a game-side reachability fact ("this
opens on currency X") for world-gen and an app-side evaluator ("is this walkable now") for the
runtime. The descriptor stays React-free; the evaluator registers through `registerModApps`.

---

## The slices

One feature per slice, so a feature that needs tuning leaves without touching its neighbours. Each
slice buys at most one primitive, and buys it because that feature needs it — never ahead of one. A
mod may end up owning several features; what a slice delivers is one feature, registered and
authored.

| Order | Feature           | Buys                                         | Tier it lands at | Toggle-off looks like                   |
| ----- | ----------------- | -------------------------------------------- | ---------------- | --------------------------------------- |
| 1     | `LightSwitchFork` | a runtime-minted key (no topology primitive) | junior           | both corridors open, an ordinary puzzle |
| 2     | `sequenceLock`    | P3                                           | expert           | door unlocked, no glyph tiles           |
| 3     | `sandSlide`       | P2                                           | expert           | ramp corridors absent, floor re-carves  |
| 4     | `waterline`       | P1                                           | master           | floor permanently drained               |
| 5     | `cosmicDust`      | P5                                           | wizard           | pyramid not choked, handles inert       |
| 6     | `hourglass`       | P4, P6                                       | wizard           | upper floor clear, lower floor ordinary |

`LightSwitchFork` goes first because it needs no topology primitive at all — its fork is two ordinary
gates, and the choice is which one opens. It does buy one small thing: **a key the player mints at
runtime**. `getOwnedKeys` derives a floor's keys from completed cells' authored rewards, and a key
handed out by a family on solve has no such cell, so owned keys grow a registry of contributors —
unioned where `SiteMapScreen` already unions ward keys.

It also settles how a feature names a key at all. A `floor-key` gate takes its id from the
assembler's rotation and makes the floor grow a section to host that key's chest, which is wrong when
the key comes from a room. So the gate gains an authored `keyId`: naming an id means the **author**
owns the key's provenance, so no host is grown. The owner is looked up from the feature registry
rather than written beside it, and both are opaque to core.

**The fork's targets are the room's own doors.** A switch room knows which of its exits it gates, so
the board draws those doors at those compass points rather than abstract targets, and routing the
beam north visibly opens the north corridor. That is what makes the choice legible: the board is a
diagram of the room the player is standing in.

**The light-beam puzzle plays two roles, sharing everything but the generator.** A corridor puzzle
when it bars the way, a switch when it drives doors: one family, one visual language, one board, one
set of mirrors, one rules voice. What the switch role does not share is board generation, and the
reason is structural rather than a preference — the corridor generator reasons about _the_ shrine
throughout, in its route search, its uniqueness check, its greedy-resistance measure and a technique
rung that is also the hint source. A switch board is a fork with one branch per door, which is a
different construction rather than the same one with a number changed.

**The switch role stays seeded, because a fork has only four shapes.** A compass direction is an
outcome of the carve, so at first glance no offline pass can know which doors a board must answer —
but up to rotation there are only four ways a fork can be shaped: two exits adjacent, two opposite,
three, or four. Bake a set per shape per difficulty and every fork in the game is covered.

So the bucket key gains the fork's shape and nothing else, and the **rotation stays out of it** —
the board is turned to face the fork's real exits when it is opened. Turning it is a symmetry rather
than a regeneration: a quarter turn is an even step in the direction encoding, the sun and the
mirrors turn with the targets, and the beam behaves identically. That keeps the offline verification
the seed list exists for, which live generation would have traded away for a rejection rate in the
player's session.

`hourglass` is last because P4 is the only new dispatch shape in the set and P6 the only new state
shape.

### Three ladders, one order

The order falls out identically from three independent directions:

- **cost to a run** — free, free, carve, carve, rooms, rooms
- **tier** — junior, expert, expert, master, wizard, wizard
- **primitives** — none, P3, P2, P1, P5, P6+P4

Nothing regenerates the world until the third slice. Nothing touches the save shape until the fifth.

### The sweep needs a mod-off arm

`worldFloorAssembly.spec` proves no encounter moves a wall by rewriting every encounter in the world
to one family and demanding identical walls. The analogous proof for a topology mod: with the mod
unregistered, every floor still carves, and the only difference is that mod's own geometry.

---

## Free-order journeys

`cosmicDust` needs a journey whose pyramids are all open at once, and the dependency runs both ways:
without dust, a free-order wizard journey has nothing left to come back for, because
`getUnexploredLevels` has nothing to report.

This is **core progression, authored per journey** — not something the dust mod owns. With dust
unregistered, a free-order journey is simply a more open journey.

**It opens one level of the ladder and no other.** Tiers gate on tomb tableaus; a tomb gates on its
`piecesRequired` map pieces; a journey unlocks the next one in its tier by being completed. Free
order changes none of those. It reaches the level underneath them: the pyramids **inside** one
journey. That is also why the dust currency's scope is the journey — the handles clear a pyramid
among its own siblings, never across journeys.

Only the tomb-treasure mod's `journeyEntryLock` and `tierUnlockBucket` are visible to the solver;
journey-to-journey progression is app-side and outside its scope, the same way pyramid order is.

**"Journey complete" has to be restated.** A cursor passing `levelCount` means _last pyramid done_
and _all pyramids done_ at once, so the two readings are indistinguishable today. Once `levelNr`
becomes a set, they come apart, and the unlock condition must say `completed.size === levelCount`
explicitly — otherwise a free-order journey unlocks its successor off whichever pyramid the player
happened to finish last. The migration that buys free order carries this predicate with it.

**The choked pyramid is always its journey's last.** It cannot be finished until its siblings hand
over the handles, so a free-order journey still has a definite ending, and dust is what guarantees
it.

What it costs:

- `levelNr` stops being a cursor and becomes a set of unlocked levels. A save migration —
  double-write, backfill, switch the read.
- `progressPercentage` derives from completed count rather than from the cursor.
- The travel screen carries more weight: `getUnexploredLevels` becomes the primary navigation
  rather than a nudge.
- Each pyramid's exterior puzzle still gates its interior, so free order means "attempt any", not
  "walk in free".

What it does **not** cost: the solver. `reachability.ts` already leaves level progression out of
scope — the coarse graph never locks level N+1 behind level N. Free order removes a divergence
between what the solver assumes and what the game enforces.

### Pacing inside a free-order journey must be a key

Placement addresses a site by `journeyId:levelIndex` and seeds from it; it never treats the index as
an ordering. So "the rare thing is in level 4" paces a player only by a convention world-gen cannot
see, and in a free-order journey that convention evaporates.

The authoring rule that follows: **in a free-order journey, pacing that matters is expressed as a
key, or it does not exist.** Which is what cosmic dust is for — it gives back, in a form the solver
can read, the sequencing free order removes.

The place this bites is `PyramidSelector` — `number | "first" | "last" | "middle" | "n-m" |
"last-n"`, which the whole world is authored with. Every selector stays a valid **address**; what
`first` and `last` stop carrying is **when**. Authoring that used position to pace — the gentle
pyramid first, the map piece last — keeps naming the same pyramid and stops meaning the same thing.

`PathPuzzlesRange {start, end}` is the same thing one step further in, and it is live world data
rather than a hypothetical: it interpolates linearly from a journey's first pyramid to its last, and
`PYRAMID_PATH_PUZZLES` is written as ranges. Under free order it still interpolates — the pyramids
still get 4, 5, 6, 7 — but the ramp becomes a spread, because the player may meet the 7 first.

**A free-order journey needs a difficulty read on the travel screen, and does not have one.**
`JourneyPathView` takes `levelCount`, `levelNr` and `unexploredNodes`; `JourneyCard` shows the
journey's tier, so every wizard pyramid reads "wizard". Without the read, free order is a coin flip
rather than a choice, and a player who meets the hardest pyramid first has no way to tell an easier
one was open. Dust guarantees the journey an ending; nothing yet guarantees it an on-ramp. The node
per pyramid is already positioned and already carries state, so this is a prop and a fill rather
than a screen. The authoring-side statement of all this lives in
`../game-design/worldgen-dsl-redesign.md`.

**Steep and choked are different tenses, not different intensities.** A steep pyramid says _this
will take some doing_, and it is about the player; a choked one says _this is not open yet_, and it
is about the world. Drawn as one severity scale they collapse, and a player reads the choked node as
"very hard", picks it deliberately and finds a wall. The two need distinct reads on the node — cheap
to settle before the art exists, annoying to retrofit after.

One consequence to decide deliberately rather than discover: a wizard journey's levels escalate, and
free order lets a player meet the hardest first.

---

## The world must validate as solvable

Reachability proves that each reward **can be got to**. It does not prove the game can be
**finished**, and those are different claims. A register that needs 44 pieces and a world holding
exactly 44, one of them behind a door that opens only one way, passes every reachability check and
cannot be completed. That is not hypothetical: it is what the first feature's build produced, and
what caught it was a person counting, not the build.

So the build asserts solvability, not only reachability:

- every collection the game asks a player to finish — a mosaic register, a hieroglyph, a tomb's
  `piecesRequired` — has **at least its target count reachable**, counted against the placements the
  solver can actually get to rather than against the world's totals;
- every lock has an opener a player can hold before they meet it;
- no feature makes a currency less obtainable than the demand for it.

**The count belongs to whoever owns the currency, not to core.** Core supplies which placements are
reachable; the mod asserts that enough of its own are, through the `worldValidator` the descriptor
already carries for the shop's economy guard. Core never learns what a register is, and the check
drops with its mod like everything else.

The cheap version of this check is a sum, and the cheap version is what would have caught the
failure above.

## Not features

- **Free-order journeys** — core progression, authored per journey.
- **Keys under locks** — `floorKeys.ts` already does it. Authoring.
- **Inscriptions that name a place** — room text over existing dispatch.
- **Back-bars, shafts, collapsing corridors, rising sand, visit-order floors** — not separate
  mechanisms. Each is authoring on a primitive an earlier slice bought: back-bars and shafts ride
  P2, collapse and rising sand ride P1 with P3, visit-order floors ride P4.

Which is the claim the architecture rests on: **past the sixth slice, the rest of the catalogue is
authoring rather than engineering.** Six features, six primitives, and every remaining mechanic
becomes a feature composed from vocabulary that already exists.

## Open

- **A feature that eats capacity.** A feature taking a side path takes a loot slot with it, and the
  economy's supply count does not know. Whether a feature declares what it consumes, or the economy
  reads the floor after features land, is undecided.
- **`needs` above floor scope.** The hourglass spans two floors and cosmic dust spans sibling
  pyramids, so their requirements are not statements about one floor. The slot's vocabulary covers a
  floor today.
