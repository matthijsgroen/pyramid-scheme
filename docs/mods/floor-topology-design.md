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

## Mod-owned authoring

**Authored structure may carry an owning mod id. Untagged authoring is core's; tagged authoring
drops when that mod is not registered.**

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

### Per-visit state is the mod's problem

Leaving is always available, and re-entry returns the player to the position they left at. So
stranding is never about reaching the exit — it is about coming back to the same trap. A mod owning
non-monotonic state either discards it on leave, or guarantees its opener is reachable from wherever
it can strand a player.

`hourglass` proves its own flippability through `worldValidator`, the descriptor field the shop
economy guard already uses. It drops with the mod, and core never learns what sand is.

---

## The primitives core grows

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

P2 is smaller than it looks. `reachableFrom` moves on the **source** cell's `dirs` and never checks
for a reciprocal dir on the target, so the grid is already directed-capable — a one-way ramp is an
asymmetric `dirs` pair, not a traversal change.

Two-sidedness, following the currency precedent: a blocker needs a game-side reachability fact ("this
opens on currency X") for world-gen and an app-side evaluator ("is this walkable now") for the
runtime. The descriptor stays React-free; the evaluator registers through `registerModApps`.

---

## The slices

One mod per mechanic, so a mechanic that needs tuning leaves without touching its neighbours. Each
slice buys at most one primitive, and buys it because that mod needs it — never ahead of one.

| Order | Mod            | Buys    | Tier it lands at | Toggle-off looks like                   |
| ----- | -------------- | ------- | ---------------- | --------------------------------------- |
| 1     | `witnessDoor`  | nothing | junior           | both corridors open, an ordinary puzzle |
| 2     | `sequenceLock` | P3      | expert           | door unlocked, no glyph tiles           |
| 3     | `sandSlide`    | P2      | expert           | ramp corridors absent, floor re-carves  |
| 4     | `waterline`    | P1      | master           | floor permanently drained               |
| 5     | `cosmicDust`   | P5      | wizard           | pyramid not choked, handles inert       |
| 6     | `hourglass`    | P4, P6  | wizard           | upper floor clear, lower floor ordinary |

`witnessDoor` buys nothing, which is why it goes first: gates already open on a registered currency
and `gate.wardKeyId` is already free to change, so it proves a floor mechanic can be a mod against
the descriptor as it stands. The smallest slice that still has a real acceptance gate.

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

One consequence to decide deliberately rather than discover: a wizard journey's levels escalate, and
free order lets a player meet the hardest first.

---

## Not mods

- **Free-order journeys** — core progression, authored per journey.
- **Keys under locks** — `floorKeys.ts` already does it. Authoring.
- **Inscriptions that name a place** — room text over existing dispatch.
- **Back-bars, shafts, collapsing corridors, rising sand, visit-order floors** — not separate
  mechanisms. Each is authoring on a primitive an earlier slice bought: back-bars and shafts ride
  P2, collapse and rising sand ride P1 with P3, visit-order floors ride P4.

Which is the claim the architecture rests on: **past the sixth slice, the rest of the catalogue is
authoring rather than engineering.** Six containers, six primitives, and every remaining mechanic
becomes a DSL field on something already built.

---

## To verify before P2 is designed

Runtime navigation must agree with `reachableFrom` about direction. The solver moves on the source
cell's `dirs`; if `gridNavigation.ts` requires a reciprocal dir, the player and the solver would
disagree about a one-way edge in opposite directions.
