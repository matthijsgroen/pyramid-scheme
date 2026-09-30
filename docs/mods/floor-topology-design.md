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

**Beside the wish there is a second form, for a floor whose shape is the puzzle.** A wish, however
tightly pinned, says what a floor should contain. It cannot say that reaching one switch depends on
having thrown another, because that is a relation between places and a wish names no places. So an
author may instead name a floor's regions, the gates between them and what owns each gate, and the
builder carves to that. Both forms stay: the wish sprinkles a mechanic across a tier, and the
authored lock set out below designs one floor.

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
| **binds**    | which gates each state opens    | solved toward north opens the north gate | —                                               | used, and the mask moves from one section to the other |
| **gated by** | a currency the player must hold | —                                        | `rope`, for the variant that is the only way in | —                                                      |

Two slides that look identical and differ only in `gated by` — one a shortcut, one an entrance
waiting for a rope — are the same feature authored twice, which is the sign the shape is right. A
crack in a wall waiting for a hammer is a gate whose `gated by` names an item rather than a key, and
the keys-and-locks machinery already answers that.

The slots are what a wish has to say for the builder to find it a home. An authored lock says the
same things outright — the places, the gates, the mechanism and what each of its states opens — and
leaves the builder only the carve.

### A mechanism is a room; a one-way is a corridor

Stated by the owner 2026-09-30, and it holds everywhere — inside a lock and out of one.

**A mechanism stands in a ROOM.** A lever or a lightbeam switch is somewhere the player arrives at and
does something in, so it reads as a room like any other encounter.

**A one-way stands in a CORRIDOR.** A drop is something the passage does rather than a place to be,
which is also why it is drawn on the connector's own floor square rather than in the boundary gap.

Neither is a property of locks. A lightbeam switch on an ordinary floor and a section-addressed drop
obey the same rule, and a change to content placement that put a mechanism somewhere that is not a
room would break it everywhere at once.

### The unit of a claim is a room-to-corridor boundary

A gate occupies a boundary rather than a cell, which is what lets two features be told apart on a
floor: a claimed boundary leaves the pool, and a feature that wanted it is told which feature has it.
A boundary a ward gate already holds cannot be claimed, for the reason the allocation below gives:
two openers on one barrier and the player cannot tell which thing they are looking at.

**A gate sits on any boundary, and a mechanism owns it.** Nothing in a gate requires its owner to
stand beside it. The common case is a mechanism in the room its gates lead out of — the fork below —
because that is the shape a builder can find on a floor it is carving for other reasons. The case
that makes a floor a puzzle is a gate that swings somewhere the player is not standing.

### A gate says what opens it

A lock the player cannot read is not a puzzle, it is a wall they walk into twice. Four things carry
that reading, and they answer different questions.

**Shape says what kind.** A mechanism's silhouette names the mechanic: this is a lever that toggles
two doors, that is a board that routes a beam, the other is a wheel that floods a floor. It is
learned once and transfers to every instance of it the player ever meets, which is what turns a
collection of one-off contraptions into mechanics a player gets good at. The map already works this
way — a node's shape says puzzle, trap, gate, treasure, junction — so a mechanism kind earns a shape
beside them.

**Colour says which one.** Within a floor, a mechanism and the gates it owns share a mark — the fork
and its two doors orange, the lever and its pair green, the last lever and the way out blue. Floor
keys already pair a key to a door by colour, so this is the existing vocabulary rather than a new
one.

**A mark is a glyph on a coloured ground.** The colour groups, the glyph says which one, and a
mechanism and every gate it owns wear the same pair. `KeyColor`'s five values are the grounds, shared
with the floor's key doors; the glyphs are the alphabet `sequenceLock`'s markers already want, bought
once for both. Two levers on one floor may therefore both be green and still be told apart, and the
cap a five-value budget would have forced never has to be decided. The cost is two things to read
where one would do, which is why the ground carries the grouping a player looks for first.

**Consequence confirms it.** (Designed in full: `docs/game-design/consequence-camera.md`.) The player can look anywhere they have explored, so throwing a switch is
a thing they can watch. That makes a floor something to experiment with: flip, see what moved,
understand. The camera may travel to the change and come back, and if it does, two things matter more
than the going — it must return the player to where they were at the zoom they chose, because on a
floor worth experimenting with they will throw a switch many times; and it must show nothing at all
when the change lands in ground they have not explored. Panning into the fog would say something is
there, which is the spoiler that already stops a switch gating a hidden branch. A flip that visibly
does nothing, followed by finding out later, is honest.

A mechanism owning many gates — a waterline draining a dozen corridors — has nowhere to travel to.
That case wants the whole changed area framed at once rather than a tour of it, and being the harder
case it is the one the interaction should be designed against.

**Explained at the door, where none of that reaches.** An order cannot be drawn in a colour or
learned by watching one flip, so a sequence lock's door carries an encounter showing the symbols and
the order they are wanted in, the way a ward gate already tells the player which key it wants.

**A gate encounter may read, never open.** A door the player opens by tapping is a door the mechanism
does not control, which is the whole of what the gate was for; a door that explains itself when
tapped takes nothing from the mechanism. That distinction belongs in the type that carries the
encounter, because the two look identical from outside.

A switch's own gates need no encounter at all — the board and its doors are in one room and the
player sees both at once. The explaining is needed exactly where the mechanism is out of sight.

### A fork knows its exits, and a switch is a fork that carries an encounter

**This is the shape a wished-for switch takes, and the common case rather than the only one.** A fork
is already the place where ways diverge, so it is the only node that knows, by construction, what
leaving it in each direction means. Give it that knowledge explicitly — **each exit has a direction
and a kind: a ward gate, the main path onward, a side path, or another fork** — and a switch the
builder placed needs no geometry of its own. It is a fork with an encounter in it, reading the exits
it already has.

This is what makes the board a diagram of the room. The player stands in the fork, the board draws
the fork's own ways out at their own compass points, and routing the beam to one opens that way.

**In the wish form the builder places the gates, not the author.** It knows which boundaries are
already spoken for, and it knows the control must be reachable before what it controls — which a fork
satisfies by standing in it. Two exits are not available to gate:

- **an exit toward an existing ward gate**, because that boundary is already owned; and
- **an exit toward another fork**, because a gate there cuts one open space in two and reads as a
  wall drawn through the middle of a room.

What is left — the main path onward, and side paths — is where the gates go. Gating the main path is
allowed here for the reason the invariants already give: the opener is reachable before the blocker,
and at a fork it is the room the player is standing in.

The corridor the player arrived by is neither of those two, and whether a switch may shut it is not a
rule the builder can carry: on one floor shutting it is the puzzle and on the next it is a trap. It
is a per-floor fact, and the invariants say what establishes it.

**No bound on how much of a floor sits behind one switch, and a switch may stand at any fork.** The
tempting rule — keep the main path onward free, or cap the share held — protects a pacing the player
cannot perceive. Standing in the fork they have walked none of it: the main path and a side path are
two dark ways out, and how much lies behind either is exactly what they do not know. There is nothing
to compare, so there is no unfairness in the comparison.

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

---

## Authored locks

An author names a floor's regions, the gates between them and the mechanisms that own those gates,
and the builder carves something that satisfies it. The bargain is the wish's, struck over a finer
vocabulary: the author decides the structure, the builder decides the shape.

### The worked example

The floor this form was drawn from, and the test of whether the vocabulary says enough:

- A fork carries a beam board, `Y`, whose two ways out are both shut.
- The right way leads, through a gate that **starts open**, to a lever `S1`.
- Throwing `S1` swaps its two gates: the one behind the player closes, and one on the _left_ branch
  opens. The player has shut their own way back.
- A one-way drops from `S1`'s chamber onto the left branch — landing **between** the fork's left gate
  and the newly opened one, so the player climbs to `S2` without returning to `Y`.
- A second one-way drops off that branch back to the entrance. Nothing stops a player taking the
  first drop before throwing `S1`, and they would land between two shut gates — the fork's left gate
  above, since the board is set right, and the gate `S1` has not opened below — with the lever behind
  them. The second drop returns them to the fork, where the board can be re-solved.
- `S2` opens the way out.

The ordinal position of that drop is load-bearing. Land it below the fork's left gate and the floor
is a different, easier puzzle; land it above the green gate and the lock is bypassed entirely.

### Regions

A **region is a named area in a floor's coarse layout.** Naming one names the _puzzle's_ structure
rather than the map's shape: `leftLower` means "past the fork's left gate, before the green one", not
"the left-hand side". Two regions may be joined with a gate on the connection, or with nothing at all.

**A region belongs to the floor, not to the lock that gates it.** Four of the six catalogue features
act on the same nouns: a lock gates the boundaries between regions, `waterline` floods one from
within, `cosmicDust` re-lays which corridors connect them, `sandSlide` blocks one. So the layout —
regions, their connections, what content each will take — is **core and structural**, and the gates,
switches and one-ways placed on it are the **topology mod's**. That is the `forks`/`switches` split
one size up, and it buys the same guarantee: with the mod off, the identical walls carve and every
door stands open.

**A region declares an appetite, not contents.** It says what it will take — a reward, puzzle rooms,
nothing — and the floor authors the content as it always has; the builder matches them. A lock with
rooms baked into its regions could be placed exactly once, which is the opposite of the reusable
container this section describes. It is also what makes converting master and wizard additive: add a
lock, keep the content authoring already there.

```ts
// the lock: structure and appetite, no content
regions: {
  entrance:  { takes: "puzzles" },
  s2Chamber: { takes: "reward" },
}
```

**The walk does not read these.** `floorLock` derives its own partition by flooding the assembled
grid and stopping at gates, so the author's regions and the walk's regions are different things and
never have to agree. An earlier definition of a region as "everywhere reachable without passing a
gate" made a gateless connection a contradiction in terms; it is retired.

### Gates

A gate names the two regions it joins, the mechanisms that own it, and whether it stands open when
the player arrives:

```ts
gates: {
  greenRight: { from: "rightLower", to: "s1Chamber", owners: ["S1"], startsOpen: true },
  sluice:     { from: "deep", to: "vault", owners: ["waterline", "S1"], mode: "all" },
}
```

**A gate may answer to more than one mechanism, and `mode` says how they combine.** `all`, the
default, stands it open only while every owner opens it — a corridor both flooded and switch-gated
wants draining _and_ the sluice thrown. `any` stands it open while one of them does. One owner makes
the question moot, and that stays the common case.

This does not reopen the claim rule above. What that rule forbids is two features arriving at one
boundary independently, each unaware of the other; a multi-owner gate is one authored door naming
both, wearing the mark of each owner, so a player is told there are two things to satisfy rather than
left to guess which of two doors they are looking at.

`startsOpen` is authored, never defaulted, and it is for a gate NO mechanism owns. A default would
make one of the two floors unwritable, and leave no sign which of them the author meant.

A gate a mechanism owns needs none of it. The worked example's door — the one the player walks
through and then closes behind them — is one of `S1`'s own two gates, and it begins open because the
lever begins on that side: `starts` names which side hangs first, the runtime asks the lever what its
side opens, and the door is carved shut like any other. So a mechanism-owned gate that starts open
costs the carve nothing, and only a free-standing gate has to be carved already open.

### Switches, and mechanisms generally

A **switch** is a control that owns gates. It stands in a region and names a family; whether that
family is a board to solve or a lever to pull is the mod's business, and core never learns the
difference:

```ts
switches: {
  Y:  { in: "entrance",  encounter: "lightbeamSwitch" },
  S1: { in: "s1Chamber", encounter: "handle" },
}
```

A handle is therefore a family, not a flag, and the catalogue's "a lever elsewhere opens a door here"
in `../game-design/floor-as-puzzle-brainstorm.md` is this with a lever in place of a board rather
than a mechanism of its own. A handle is a TOGGLE: two sides, left and right, each naming a set of
gates. Thrown to a side, every gate that side names stands open and every gate the other side names
stands shut, and it can be thrown back and forth for ever. It hangs on one side from the moment the
floor is carved, so those gates stand open before the player has touched anything.

A single-gate handle is therefore a door the player opens and shuts at will: one side names it, the
other names nothing, and both sides still exist so the walk knows it can be closed again. A handle
naming nothing on either side is refused — a lever with no door on the end of it is a typo, not a
floor. Both sides may name several gates; what one side opens, the other shuts.

**A mechanism has states, a mapping from each state to which of its gates stand open, and transitions
the player causes.** The mappings differ, and the difference is data:

| Mechanism      | States              | Open at               | Transition       |
| -------------- | ------------------- | --------------------- | ---------------- |
| a beam board   | which shrine is lit | that shrine's gate    | solving it       |
| a handle       | left or right       | that side's gates     | throwing it      |
| `sequenceLock` | progress `0..N`     | its gate, only at `N` | crossing a glyph |

A board opens one gate per state; a sequence opens its gate only in the last. So what the invariants
ask a mechanism for is its own state-to-gates mapping, rather than assuming a state is which gate is
open. That is a one-line difference to write and an assumption nobody could find later.

**Markers are sketched, and bought with the feature that needs them.** A sequence wants named trigger
points inside regions, finer than a region because regions are defined by the gates, and two glyphs
in one gate-free area cannot be told apart by naming:

```ts
markers: { ibis: { in: "leftLower" }, jackal: { in: "entrance" } }
```

The sequence names them in the order it wants:

```ts
switches: { door: { encounter: "sequenceLock", sequence: ["ibis", "jackal"] } }
```

That a region is coarser than a marker turns out not to matter: inside a region the player walks
freely, so the walk's move becomes _trigger any marker in any reachable region_, and order within a
region is genuinely unconstrained on the real floor too. A reset tile is a marker whose transition
goes to state `0`, needing no special case. A marker is P3 in authored form — the named point is a
mod marker on a cell, and firing on being crossed is what P3 buys — so `sequenceLock` buys primitive
and authoring together. What P3 does not cover is a marker an author wants in a room rather than a
corridor, and that waits for the feature to ask.

### One-ways

Directed, region to region, and explicit:

```ts
oneWays: [
  { from: "s1Chamber", to: "leftLower" },
  { from: "leftLower", to: "entrance" },
]
```

**What a one-way guarantees.** These are the contract, not notes about one floor: a drop is an
ingredient, and every lock that ever stands one inherits all of it.

| From the source | an ordinary corridor — it looks, walks and reveals like any other |
| From the landing | the mouth is visible, and nothing past it |
| At the landing | the movement marker toward it is drawn refused, not omitted |
| Across a gate | a drop may leave a gated region or run inside one, never enter a gate unearned |
| At the way out | never hung off the exit node, which stays a dead end |
| Into a hidden section | refused; out of one is allowed |
| To the walk | reported as a move, so the ground past it is reachable rather than stranded |

The two that look like details are the two that cost the most to learn. **A marker that is merely
absent teaches nothing** — a missing arrow is indistinguishable from a wall, and the player never
learns the way exists; so the refusal is drawn, as the same shape at half strength with a bar across
it. And **a mouth that cannot be seen from the landing is a passage the player never knows about**,
which makes the barred marker unintelligible when they do meet it.

Two consumers of `dirs` must be left symmetric, and both were nearly "fixed" while this was built:
`isPassable` and `isForkMeetingClaim` in the map's own claim rules. Their symmetry is what merges a
fork's rooms across a shared void cell. The readers that DID need teaching were the region flood in
`floorLock` (a drop is not a two-way edge and a pocket behind one is its own region) and `completeCell`
(a single-`dirs` cell is a passage to walk through, not a dead end to stop at).

Explicit because where a drop lands is a design decision rather than a safety measure — the worked
example is a different floor one gate lower. The walk catches a missing one; it does not place one.
A one-way is P2, costed below.

### Containers with ports

A lock is not a floor. It is a named, reusable container with an `in` and an `out`:

```ts
const doubleBack = topologyLock({ regions, gates, switches, oneWays, in: "entrance", out: "wayOut" })
```

A floor places it, and ordinary content carries on around it:

```ts
.floor(0, { pathPuzzles: 4, locks: [doubleBack, sandBypass] })
```

The main path enters at `in` and leaves at `out`. A floor with three locks reads as three blocks
rather than one tangle — for the author, and for the walk the invariants describe.

### What makes a lock acceptable

Stated by the owner 2026-09-30. Four criteria. A floor that fails any of them is not a lock, whatever
it looks like on the grid.

**What a lock IS**

1. **A lock is a CONNECTIVITY graph.** It says which places join which, and nothing about size. How
   many regions a carve produces, how long its corridors are and how many cells it spends are not
   properties of the lock — two carves of one lock may differ in all of them and be the same lock.
2. **A lock has one way in and one way out.**
3. **Every region in the lock is reachable.**
4. **The player can get from the way in to the way out with no outside help** — no key, tool or
   progress earned beyond the lock. This is the bracket table below, stated as a criterion: a ward is
   assumed shut, a hidden pocket assumed unfound, and the lock must still be walkable.

**What a region may hold**

5. **Each region states what content it allows or refuses:**
   `"path" | "chest" | "none" | "free" | "lock" | "stair"`, defaulting to `"free"`.

**What the builder may do with the shape**

6. **A connecting corridor may absorb side paths.**
7. **The site builder may carve side paths off a lock's connecting corridors** when it has a lot of
   content to place.
8. **A lock may stand anywhere in a larger map** — side sections may hang before its `in` and after
   its `out`.

**How locks compose**

9. **Locks may be CHAINED.**
10. **Locks may be NESTED.**

**What a lock may not do**

11. **A pyramid's exit may not stand inside a lock.**
12. **At the top level, the lock(s) are the ONLY way from entrance to exit.** No route round them.

**What enforces each today:**

|     | Enforced by                                                                             | Gap                                                                                                      |
| --- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | `LockSpec` is a connectivity graph by construction                                      | **The authored graph and the compiled one are different objects, and NOTHING COMPARES THEM** — see below |
| 2   | `LockSpec` carries a single `in`/`out`; `checkLockSpec` refuses either naming no region | —                                                                                                        |
| 3   | `strandedRegions` structurally, `deadRegions` for a region no reachable state stands in | —                                                                                                        |
| 4   | `walkLock`, with ward keys assumed shut and hidden sections assumed unfound             | —                                                                                                        |

**THE GAP UNDER CRITERION 1, measured 2026-09-30.** `floorLock` derives the lock by flooding the
ASSEMBLED GRID and stopping at gates, so what gets walked is whatever the carve produced — the
authored region graph is an instruction to the carve, never a thing the result is checked against.
Measured on `doubleBack`, authored as six regions and five gates, compiled at six values of `packing`
at one seed:

```
p=3  regions=13 gates=10 mech=3 oneWays=4  unsolvable
p=4  regions=13 gates=10 mech=3 oneWays=4  unsolvable
p=5  regions=13 gates=10 mech=3 oneWays=4  SOUND
p=6  regions=13 gates=11 mech=3 oneWays=4  unsolvable
p=7  regions=13 gates=10 mech=3 oneWays=4  unsolvable
p=9  regions=13 gates=10 mech=3 oneWays=4  SOUND
```

Identical in every count, and still flipping between solvable and not: the carve decides WHICH region
touches WHICH, which is precisely what criterion 1 says a lock is. The counts differing from the
authored six and five is not itself the fault — a door is its own region in the compiled walk, so the
inflation is expected, and criterion 1 says size is not the question. The fault is that connectivity
is an outcome rather than a requirement.

**Where each criterion stands, audited 2026-09-30.**

| #   | Criterion                         | State                                                                                             |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | connectivity graph                | type is real; **nothing compares the carve to the authoring**                                     |
| 2   | one in, one out                   | authored side refused by name and tested; compiled side checked at runtime, no regression test    |
| 3   | every region reachable            | `strandedRegions` + `deadRegions`, both tested, refused at build and reported by `validate-world` |
| 4   | no outside help                   | `walkLock` with wards sealed in `floorLock`; ward half tested, **hidden-section half untested**   |
| 5   | region vocabulary                 | the four existing kinds only; `lock` and `stair` do not exist                                     |
| 6   | corridors absorb side paths       | true, but **emergent from the flood algorithm** — no rule to violate                              |
| 7   | side paths off a lock's corridors | built, tested, refused by name                                                                    |
| 8   | a lock stands anywhere in a map   | **not there**                                                                                     |
| 9   | locks chain                       | only as gates in sequence inside one flat graph                                                   |
| 10  | locks nest                        | **not there — no container abstraction exists**                                                   |
| 11  | exit not inside a lock            | **not there**                                                                                     |
| 12  | no route round a top-level lock   | **not there**                                                                                     |

**THE ONE FACT BEHIND 8, 10, 11, 12 AND 1's GUARANTEE.** `regionLayout` is stretched to cover the
floor's ENTIRE main path, and the lock's ports are the floor's own entrance and exit. **A lock is not
something placed on a floor; a lock currently IS the floor.** So a lock cannot stand mid-map because it
occupies the map; nesting has no container to nest; the exit cannot be excluded because the exit is
defined as the lock's `out`; nothing checks for a bypass because there is no outside to bypass through;
and nothing compares carve to authoring because the authoring was only ever an instruction to the carve.

`doubleBack` works precisely because it is the whole floor. The container with ports this document
describes above — "entered and left through its **ports**", "a region may be filled by floor content OR
by another container" — is the piece that was never built, and building it is what turns five separate
gaps into one job.

**What follows: the builder must check the carve against the lock it was given.** Same regions joined
the same ways, gates between the same pairs — and where the carve produced something else, re-seed and
try again, then refuse by name after the attempt budget, exactly as it already refuses a dozen other
things. Until then the only signal is `walkLock` reporting `unsolvable` afterwards, and the only
remedy is an author sweeping `packing` until a seed happens to land on a shape that works. That is a
search, not authoring, and it does not scale to master and wizard's 56 gates.

### What makes a lever and a gate acceptable

Stated by the owner 2026-09-30, as the use cases a lever and its gates must satisfy. A floor whose
mechanisms fail any of them is wrong however sound its lock is. Where the lock criteria above describe
a floor's SHAPE, these describe what the player meets when they walk up to it.

**One lever, one gate**

1. **A gate is closed by default.**
2. **A gate stands on the edge between a room and a corridor.**
3. **A closed gate is not a direction the room offers.** Standing in the room, the way to a closed gate
   is not among the ways out — not drawn, not tappable.
4. **An open gate is a direction the room offers**, like any other way out.
5. **A lock may author a gate open by default**, in which case throwing the lever closes it.

**One lever, two gates**

6. **Two gates named by one position open and close together.**
7. **A gate authored open against one authored closed makes the lever a toggle** — throwing it swaps
   which of the two stands open.

**Two levers, one gate**

8. **`or`: either lever opens the gate.**
9. **`and`: the gate opens only while BOTH levers are thrown, and is closed otherwise.**

**What enforces each today, audited 2026-09-30.**

| #   | Criterion                       | State                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | closed by default               | holds: `openDoorsFor` falls back to `mechanism.initial`, so a gate the initial position does not name is shut before anyone touches the lever                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2   | on a room/corridor edge         | partly: `gateBoundary.spec.ts` carves a chain floor and a branching floor over 30 seeds each and finds every gate whose connection is on the main route or inside a side chain standing beside a room of the other named region, and the only passage joining the two. A gate on a side chain's MOUTH connection does not: the chain hangs off whichever main-route room the maze chose as its host, so on most seeds the gate's near neighbour is another region (125 of 200 seeds for `entrance`/`rightLower` in the branching fixture). That case is pinned as an expected failure (`it.fails`) and flips red when the seat follows the named region. |
| 3   | closed gate offers no direction | holds: an obstacle gate carries no family, so `isSealedWayOut` treats it as a wall — refused by `walkableFrom` and `findPath`, offered no marker, never `completed`, and opening no screen when tapped                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 4   | open gate offers a direction    | holds: `openWaysOut` gives a family-less gate its corridor back the moment its key is open, so the way out is an ordinary way out, decided by the lever alone rather than by the player having passed through it                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 5   | authored open by default        | holds: name the gate under the control's `initial` state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 6   | two gates in sync               | holds: two `positions` entries sharing a `state`, each with its own `gateKeyId`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 7   | one lever toggles two gates     | holds: the second gate named under the other state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 8   | `or`                            | holds: `mode: "any"` on the obstacle — one owner naming the gate in its current state is enough                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 9   | `and`                           | holds: an obstacle with no `mode` stands open only while EVERY control naming it is in a state that names it; `openDoorsFor` folds its owners by the gate's mode, the way the soundness walk's `openGates` does, and `gateMode.spec.ts` asserts the two agree in every configuration. A mixed condition (S1 thrown, S2 at rest) is the same fold: S1 names the gate on its thrown side, S2 on its rest side                                                                                                                                                                                                                                              |

**How a gate's condition is stated.** A control states which gates its own position opens; a gate's
opening condition (`GateObstacle.mode`) says how its owners' statements combine. The condition rides
each owner's `positions` entry to `openDoorsFor` and to the `LockGate` the walk reads, so the runtime and
the proof fold one rule, and `gateMode.spec.ts` asserts they agree in every configuration of a floor.
That agreement is the thing to keep: before it, `openGates` folded by mode while `openDoorsFor` unioned,
so a two-owner gate would have been PROVED under `and` and PLAYED under `or`, with `validate-world`
reporting sound throughout.

**Two places the same divergence can still open, neither reachable by anything authored today.** Both
are the runtime and the walk counting a gate's owners differently, which is the fault above wearing a
different hat:

- **A door carrying several `requiredKeyId`s, one of them sealed, under an authored `any`.** The walk
  pools the mechanisms of every key on the door into one gate; the runtime folds per key. The two
  disagree about what "any" ranges over.
- **A gate whose key a chest also mints.** In `floorLock` the `key …` mechanism minted from a chest and
  the `sealed …` owner both count as owners, so an `and` gate needs the chest key in the walk — and the
  runtime does not model that key at all.

Nothing authors either shape, so both are latent. They are recorded here rather than guarded because a
guard for a shape no author can reach is a guard that can never be watched failing.

### What makes the map of a floor acceptable

Three properties the player depends on, whatever stands on the floor. They are asserted by
`src/app/SiteMap/movementInvariant.spec.ts` over a hand-built fixture per mechanic, walked through
every (position × mechanism state) that fixture can reach. They are stated here because they are
acceptance criteria like the two sets above, not an implementation detail of one spec file.

1. **Every place you can walk to, the map names.** A stopping point `walkableFrom` reaches — a room, or
   a corridor corner — is some marker's click target. Nothing is reachable and unnamed.
2. **Taking an offer moves you.** Clicking a target the map offered leaves the explorer standing on it.
3. **Every tap draws something**, except a corridor corner the player has already walked. That one
   exemption is deliberate: a walked corner is drawn ground they can see, so it needs no marker to be
   findable — which is exactly what is NOT true of a one-way mouth, `visible`, never walked, with
   nothing else pointing at it.

**What enforces each today, audited 2026-09-30.**

| #   | Criterion                 | State                                                                                                                                                                                          |
| --- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | reachable implies named   | holds: `offerViolations`, at every step of every fixture walk                                                                                                                                  |
| 2   | taking an offer moves you | holds: asserted on every offer the walk takes, with a permanent guard test that no-ops the store's write                                                                                       |
| 3   | every tap draws something | holds: `markerViolations` reads the rendered DOM, with a permanent guard test that drops the one-way mouth's marker and asserts the mouth alone is reported while a walked corner stays exempt |

**Why these are worth stating.** Every regression that shipped green on this branch broke one of them
while the test written for the change itself passed: an arrow drawn over a dead click, a mechanism's own
corridor staying dark, a corner dot that revealed without walking, a mouth with a live tap and no marker.
Each had a test for the thing it changed, and none for "standing anywhere reachable, I can get somewhere
else".

### The rules that keep a lock buildable

**The gates must form a tree. One-ways may add any edge on top.**

Strip the one-ways from the worked example and the gate graph is a tree — which is the existing
section model, a main path with sections hanging off it and gates on section boundaries, and a tree
the carve lays out by construction. A cycle made of _gates_ would need a carve that closes a loop
through locked boundaries, and it is rarely a puzzle in any case: a loop walkable both ways through
two locks is a room with two doors. An authored gate cycle stops the build and names itself.

**A container's soundness may not depend on anything outside itself.** That is what makes placing one
anywhere safe, and it decides what each kind of lock may do inside a container:

| Lock kind       | Inside a container                                                                |
| --------------- | --------------------------------------------------------------------------------- |
| Switch gate     | part of the lock; its position is state                                           |
| Floor key       | allowed, and the key must be findable inside the container                        |
| Ward (tomb) key | allowed as a bonus door, but the container must be sound with it assumed **shut** |
| Hidden section  | allowed, but the container must be sound with it assumed **unfound**              |

A ward gate opens on progress made elsewhere in the world, so a container depending on one could only
ever be verified in context; assuming it shut keeps the proof local. A hidden pocket is never
guaranteed either — it is structurally reachable and nothing says the player found it — which is the
same reasoning that stops a switch gating a hidden branch.

### A floor key orders a walk; a mechanism changes a floor

A coloured floor key can say one thing: _this before that_. The key is found, then the door opens,
and it stays open. That makes a walking order, and a walking order is the shallowest floor-as-puzzle
there is — nothing about it can be got wrong, which is also why nothing had to check it.

A mechanism says something strictly larger: the floor is in a state, and the player changes it. A
door can shut again. A route can be spent. An order can be wrong and cost a walk. That is a language
in which a floor can be a puzzle, and it is also a language in which a floor can be **broken**, which
is what the walk over a mechanism's states is for.

So where a floor leans on keys to be interesting, it is authoring the weaker form, and the master and
wizard tiers lean hardest: **58 floor-key gates across the world, 56 of them at master and wizard**,
including a key chain — a red door guarding a room that holds a green-gated vault — which is a
dependency chain assembled from the only material keys offer, things you pick up and keep. Those are
the floors to author as locks.

A key remains the right thing where finding it _is_ the content: one key, one door, a pocket worth
the walk. The walk counts held keys in its state alongside mechanism configurations, so the two
coexist and a floor can be converted when someone gets to it rather than all at once.

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

Where the states in between cannot be counted, bracket them:

- **Most permissive** — every blocker assumed clearable. Answers _is every reward ever obtainable?_
  This is what placement and reachability already compute.
- **Most restrictive** — every blocker at its worst: ramp absent, corridors flooded, dust in place,
  upper floor choked. Answers _is each blocker's opener still reachable?_

None of those three has a finite set of configurations to walk, so the two runs stand in for walking
them and the state in between never enters the solver. **A mechanism that can name its own states
gets the stronger treatment instead.**

### The states a mechanism names are walked, not bracketed

A mechanism declares its states, so for a lock there is nothing to bracket — the configurations are
countable. Because the author names the regions too, nothing has to be derived.

**A state** is _(the region the player stands in, every mechanism's configuration, the floor keys
held)_. Whether a gate stands open in a state is the fold over its owners that `mode` names, read off
each owner's own state-to-gates mapping.

Floor keys belong in the state space rather than beside it: a key changes what is passable exactly as
a switch position does. It differs only in being monotonic — once held, always held — which is what
keeps the space small. A floor key is a lock whose mechanism is a chest and whose lever moves one
way.

**A move** is walking, into any region joined by an open gate or along a one-way leading out; or
throwing a switch that stands in the region the player occupies; or leaving the site and coming back,
which puts the player at `in` with every mechanism as they left it.

**Two questions, breadth-first from the start state:**

1. **Does any reachable state reach `out`?** The lock can be solved at all. An author who builds a
   lock with no way through is told so in those words, rather than discovering it as missing loot.
2. **Does _every_ reachable state reach `out`?** No order of moves strands anyone.

The second earns its keep. It finds traps nobody would think to look for — not "is there a drop from
`s1Chamber`" but "is there any sequence that paints the player into a corner", including sequences
several moves long. A failure stops the build naming the state it died in: _"from `s1Chamber`, Y at
neither, `greenRight` shut, nothing reaches `out`"_.

That is strictly stronger than the permissive bracket over the same floor. The permissive run answers
_is this reward ever obtainable_, which is no comfort to a player who cannot reach it by any legal
sequence of moves; the walk answers whether such a sequence exists, and whether any sequence ends
badly.

**Soundness composes.** The question is asked of a container between its own ports, so the answer is
a property of the container alone, and a floor built from sound locks is sound. A lock is verified
once ever rather than once per floor that places it; three locks on a floor are three small checks
rather than one check over their product; and the state space stays small however much a floor grows.

**The way back is a per-floor fact.** Whether a switch may shut the corridor the player arrived by is
not a rule to settle once: it is allowed where the floor stays winnable and refused where it does
not. Both halves cost something real. Refusing it everywhere leaves **36 of 103 floors** with a
junction whose way out the switch cannot shut, so the player walks on without working the board.
Allowing it everywhere opens a trap: shut the way back, take a staircase, come back, and the player
stands on the entrance side of a door only the fork can open — ordinary play, because a saved
position belonging to another floor falls back to the entrance. Coming back is one of the moves, so
that trap is a state the second question fails on rather than an argument to have.

**The wish form is covered too.** A floor authored with `forks` and `switches` has regions as well;
the carve makes them even though nobody named them, so the same walk covers it with no new
authoring.

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

A check that runs on every floor is a different guarantee from a guard that only runs where a
switch stands: no journey authors `switchFork` yet, so the second kind has never once fired outside
a spec. Six rows below are that second kind, and say so.

| Rule                                                            | Held by                                                                                                                                                                                                                    |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A floor-key gate has a collectible key                          | `keyAfterGate`                                                                                                                                                                                                             |
| A fork's branches are not all bland                             | `allBlandFork`                                                                                                                                                                                                             |
| Map pieces present, unique, reachable behind their seal         | the three `mapPiece*` reasons                                                                                                                                                                                              |
| Mosaic pieces present, unique, reachable                        | the three `mosaic*` reasons                                                                                                                                                                                                |
| A section has a name a save can file it under                   | `unusableSectionAddress`, over every authored level rather than the two the carve reaches                                                                                                                                  |
| A section is no deeper than the carve builds                    | `sectionTooDeep` — the DSL nests without limit, the carve goes two levels, and a third is refused by name rather than built as nothing                                                                                     |
| No two rooms of a section answer to one slot                    | `duplicateCellSlot`                                                                                                                                                                                                        |
| A switch found two ways left to close                           | `switchForkWithoutGates`, which runs only off an authored `switchFork` — a guard, not yet reached by an authored floor                                                                                                     |
| Switch key stems are unique across floors                       | `validateSwitchForkKeys`, which runs only off an authored `switchFork` — a guard, not yet reached by an authored floor                                                                                                     |
| Rewards counted, no chest left empty, the shop economy balances | `validateRewardCounts`, `findEmptyChests`, the shop mod's `worldValidator`                                                                                                                                                 |
| No boundary is gated twice                                      | `boundaryGatedTwice`, which fires only from `exit.gateKeyId`, set only by a switch — a guard, not yet reached by an authored floor                                                                                         |
| A switch's gates are reachable only through the switch          | `switchGateNotBehindSwitch`, which fires only from `exit.gateKeyId`, set only by a switch — a guard, not yet reached by an authored floor                                                                                  |
| A switch's family is re-enterable                               | `switchFamilyNotReEnterable` — a guard, not yet reached by an authored floor                                                                                                                                               |
| A switch never gates a hidden branch                            | `closableExits`, which skips a hidden neighbour — a guard, not yet reached by an authored floor                                                                                                                            |
| An exit is pruned when the node it leads to is hidden           | `maskHiddenCells`, which checks the hidden set two cells out, not `dirs` — fires on every floor, switch or not: prunes 76 exits across 61 of 206 authored floors                                                           |
| A hidden way out stays one-way under any tool                   | **nothing yet**, and no tool exists to break it                                                                                                                                                                            |
| A lock is solvable, and no order of moves strands the player    | `walkLock`, over the lock `floorLock` reads off each assembled floor, swept by `findStrandingLocks` — runs on every floor standing a switch, which is one floor in the world today                                         |
| A lock's gates form a tree                                      | **nothing yet** — the builder's rule, arriving with the region tree                                                                                                                                                        |
| An authored gate's key is minted by whoever owns it             | for a switch fork, unrepresentable — the assembler writes gate and key from one expression. For a hand-authored gate, **nothing generic**: the two the world has are pinned by name in `configBuilder.integration.spec.ts` |
| Every collection's target count is reachable                    | the mosaic mod's `worldValidator`, per register, over the permissive walk                                                                                                                                                  |

A misspelled key id is the one that still bites, and it is not floor-shaped: it leaves its branch
unreachable for ever and no check notices, because the validator skips authored keys and the solver
only records a lock it discovered. The generic check — the owning mod asked whether it mints the id
the gate names — waits for a consumer. Every hand-authored gate the world has is the witness door's,
already pinned by name, and a switch fork cannot disagree with itself. `sequenceLock` is the first
feature to author a door key by hand, and the check lands with it.

The collection rule is held now, and the bracket it is held in is the permissive one — a collection
is loot, not a lock, so a piece counts if it is reachable at _any_ point in time. A hidden pocket
counts, and so does a branch behind an authored key, because solving the room that mints that key is
how the player gets there. Locks keep the stricter bracket: an opener must be reachable _before_ its
blocker, which the placement worklist already enforces.

The count is asked per bucket and never as one world total. Mosaic is not 252 pieces; it is a set
per difficulty tier, and a global sum would pass while junior ran short and wizard ran over.
`placeFragments` walks the finished world once more with authored doors standing open and hands
every reward it finds to each world validator; mosaic counts its own glass in there against
`MOSAIC_STEPS_BY_TIER` and names the register and the shortfall when one comes up short.

### Per-visit state is the mod's problem

Leaving is always available, and re-entry returns the player to the position they left at. So
stranding is never about reaching the exit — it is about coming back to the same trap. A mod owning
non-monotonic state either discards it on leave, or guarantees its opener is reachable from wherever
it can strand a player. Where the mechanism names its states, that guarantee is not an argument the
mod makes: it is a state the second question fails on.

`hourglass` proves its own flippability through `worldValidator`, the descriptor field the shop
economy guard already uses. It drops with the mod, and core never learns what sand is.

---

## The vocabulary features are built from

These are core's, not any mod's. A feature composes them; none of them is a thing a mod ships on its
own, and none is built before a feature needs it.

|     | Primitive                                                                                   | Generalises                                                                | Serves                                                  |
| --- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| P1  | **Blocked-until, with a registered opener**                                                 | `hidden`+found and `gate`+key are two hardcoded instances of this one idea | flooding, collapse, dust, the hourglass                 |
| P2  | **Authored edge between two addresses, optionally directed**                                | —                                                                          | ramps, back-bars, shafts                                |
| P3  | **Corridor cells carry mod markers**, fired on being crossed                                | only rooms carry anything                                                  | glyph tiles, sand trails, a sequence's authored markers |
| P4  | **Floor-scoped encounter** — the board is the floor, the moves are steps                    | room-sized boards                                                          | the hourglass, visit-order floors                       |
| P5  | **Currency scope** — journey, beside positional and world-spread                            | §E's positional-vs-spread split                                            | cosmic dust                                             |
| P6  | **Per-visit mod state with a lifecycle** — created on entering a site, discarded on leaving | mods own persistent state only                                             | the hourglass flip                                      |

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

A one-way cell has `dirs.size === 1`, which several readers of `dirs` took for something else before
this landed — see "What a one-way guarantees" below for what each of them now does. `renderAscii` draws
such a cell as the arrow it is rather than falling through to `·`, so one-ways are legible in the ascii
view the specs read.

Two-sidedness, following the currency precedent: a blocker needs a game-side reachability fact ("this
opens on currency X") for world-gen and an app-side evaluator ("is this walkable now") for the
runtime. The descriptor stays React-free; the evaluator registers through `registerModApps`.

---

## The slices

One feature per slice, so a feature that needs tuning leaves without touching its neighbours. Each
slice buys at most one primitive, and buys it because that feature needs it — never ahead of one. A
mod may end up owning several features; what a slice delivers is one feature, registered and
authored.

| Order | Feature           | Buys                                    | Tier it lands at | Toggle-off looks like                   |
| ----- | ----------------- | --------------------------------------- | ---------------- | --------------------------------------- |
| 1     | `LightSwitchFork` | nothing (no topology primitive, no key) | junior           | a bare junction, every way out open     |
| 2     | `sequenceLock`    | P3                                      | expert           | door unlocked, no glyph tiles           |
| 3     | `sandSlide`       | P2                                      | expert           | ramp corridors absent, floor re-carves  |
| 4     | `waterline`       | nothing                                 | master           | floor permanently drained               |
| 5     | `cosmicDust`      | P5                                      | wizard           | pyramid not choked, handles inert       |
| 6     | `hourglass`       | P4, P6                                  | wizard           | upper floor clear, lower floor ordinary |

**Four of these six are the same feature wearing different clothes**, once a mechanism is a thing
with states that owns gates. `LightSwitchFork` is a mechanism with a board. A lever elsewhere opening
a door here is a mechanism with a handle. `waterline` is a mechanism with two states owning a set of
gates — every corridor below the line — which is why it buys no primitive: a flood is blocked-until
with a mechanism as the opener, and that is the thing being built. `sequenceLock` is a mechanism
whose states are progress, and it buys P3 for its markers rather than for the lock.

What stays genuinely separate is the pair that reaches past one floor: `cosmicDust` spans a journey's
pyramids and `hourglass` spans two floors with per-visit state. That is a satisfying place for the
boundary to fall — a floor's mechanisms are one vocabulary, and reaching beyond a floor is what costs
a new one.

Which moves the weight of the work off the features and onto the vocabulary. A lock is then twenty
lines of authoring and a walk over its states, so a floor's difficulty is composed rather than built,
and a mechanism hidden behind other mechanisms — a flood lever you have to earn — is authoring
rather than a feature.

`LightSwitchFork` goes first because it needs no topology primitive at all, and it buys nothing
either: **a fork's ways out are a function of the board standing in it.** Route the beam north and
north is open while the rest are shut; come back and route it east, and east opens as north closes.
One solve, one configuration.

So there is no key anywhere in this feature — nothing minted, nothing held, nothing accumulated, and
no id to keep unique across the world. The gate it draws has nothing to enter, because there is
nothing to spend at it: the switch is already the thing that opens the way. A player cannot strand
themselves either, since a door only changes while they stand in the fork, and walking away leaves
the configuration as they set it. What the feature does need is that the switch room is
**re-enterable**, which is what lets them change their mind.

For the solver this is the permissive bracket and nothing new: every branch is reachable, because the
player can always walk back and choose it. That argument holds exactly as long as the way back is
open, which is the fact the walk establishes floor by floor.

**The fork's targets are the room's own doors.** A switch room knows which of its exits it gates, so
the board draws those doors at those compass points rather than abstract targets, and routing the
beam north visibly opens the north corridor. That is what makes the choice legible: the board is a
diagram of the room the player is standing in.

**The light-beam mod owns two families: `lightbeam` bars the way, `lightbeamSwitch` drives doors.**
One visual language, one board, one set of mirrors, one rules voice, shared between them. What they
do not share is board generation, and the reason is structural rather than a preference — the
corridor generator reasons about _the_ shrine throughout, in its route search, its uniqueness check,
its greedy-resistance measure and a technique rung that is also the hint source. A switch board is a
fork with one branch per door, which is a different construction rather than the same one with a
number changed.

Two families rather than one family branching on where it stands, because the two facts that differ
are family-shaped: `lightbeam` joins the generic puzzle pool and `lightbeamSwitch` must not, and
`lightbeamSwitch` must be `reEnterable` while the corridor puzzle need not be. Both are read off
`FamilyMeta`, so one family would have to make them per-room answers and teach every reader of that
meta the difference.

`lightbeamSwitch` is what the `witnessDoor` mod becomes. Its board already routes a beam to one of
two shrines and mints that shrine's key; what it lacks is taking its shrines from the fork's own
exits instead of a hardcoded east and north.

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
- every lock has an opener a player can hold before they meet it, and every authored lock reaches its
  `out` from every state a player can reach inside it;
- no feature makes a currency less obtainable than the demand for it.

**The count belongs to whoever owns the currency, not to core.** Core supplies which placements are
reachable; the mod asserts that enough of its own are, through the `worldValidator` the descriptor
already carries for the shop's economy guard. Core never learns what a register is, and the check
drops with its mod like everything else.

The cheap version of this check is a sum, and the cheap version is what would have caught the
failure above. It is a sum **per bucket**: mosaic's target is a set per difficulty tier, so one
world total would pass while a single panel ran short. It is built, for the one collection that is
loot rather than a lock — the mosaic mod's `worldValidator`, counting its own glass in the finished
world's permissive walk. A hieroglyph and a tomb's `piecesRequired` are locks, and the placement
worklist already holds them to the stricter reading.

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
  reads the floor after features land, is undecided. A lock's region tree is the same gap at a larger
  size: a floor authoring three locks and a full set of paths may not fit, and nothing counts.
- **`needs` above floor scope.** The hourglass spans two floors and cosmic dust spans sibling
  pyramids, so their requirements are not statements about one floor. The slot's vocabulary covers a
  floor today. A lock asks it from the other side: nothing says a region sits on one floor, and a
  staircase inside a container would make it span two.
- **Whether region names become save addresses.** They would be steadier than carve-derived section
  addresses, which is a benefit rather than a cost — but it is a save-format question and wants its
  own thought.
- **What the container is called.** `topologyLock` collides with the catalogue's `sequenceLock`, and
  "puzzle" is spoken for by the families. Something nearer `oldWorkings()` may sit better.
- **How the builder lays a region tree into a carve.** That the tree shape matches the existing
  section model is the whole of what is settled.
