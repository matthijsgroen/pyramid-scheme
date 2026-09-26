# Authored topology locks

A floor's shape becomes something an author can design, without floors ceasing to be generated.

Today a topology feature is a **wish**: `forks: [{ exits: 2, count: 1 }]` asks for a junction and
`switches: { encounter, min, max }` puts a board in one, and the builder decides everything else.
That is right for sprinkling a mechanic across a tier. It cannot express a floor whose _shape is the
puzzle_ — where reaching one switch depends on having thrown another, and the order is the thing the
player works out.

This page adds a second, deliberate form beside the wish form. Both stay.

---

## The worked example

The floor this design was drawn from, and the test of whether the vocabulary says enough:

- A fork carries a beam board, `Y`, whose two ways out are both shut.
- The right way leads, through a gate that **starts open**, to a lever `S1`.
- Throwing `S1` swaps its two gates: the one behind the player closes, and one on the _left_ branch
  opens. The player has shut their own way back.
- A one-way drops from `S1`'s chamber onto the left branch — landing **between** the fork's left gate
  and the newly opened one, so the player climbs to `S2` without returning to `Y`.
- `S2` opens the way out.

The ordinal position of that drop is load-bearing. Land it below the fork's left gate and the floor
is a different, easier puzzle; land it above the green gate and the lock is bypassed entirely.

## What an author writes

### Regions

A **region** is everywhere reachable without passing a gate — the partition the locks induce. Regions
are named by the author, and naming them is naming the _puzzle's_ structure rather than the map's
shape: `leftLower` means "past the fork's left gate, before the green one", not "the left-hand side".

A region carries the content vocabulary a section already carries, so a region is a section you have
named:

```ts
regions: {
  entrance:  { pathPuzzles: 1 },
  s2Chamber: { sideSections: [holdChest(1)] },
}
```

### Gates

A **gate** is a lock on the boundary between two regions, owned by a switch, optionally open at the
start:

```ts
gates: {
  greenRight: { from: "rightLower", to: "s1Chamber", owner: "S1", startsOpen: true },
}
```

This is the significant generalisation. A gate today can only be a fork's way out; the builder picks
a junction and shuts the ways leading off it. Here a gate is a lock on **any** boundary, and
everything else follows from that.

`startsOpen` is authored, never defaulted. The worked example turns on it: the player walks through a
door and then closes it behind them, which is only a move if the door began open.

### Switches

A **switch** is a control that owns gates. It stands in a region and names a family; whether that
family is a board to solve or a lever to pull is the mod's business, and core never learns the
difference:

```ts
switches: {
  Y:  { in: "entrance",  encounter: "lightbeamSwitch" },
  S1: { in: "s1Chamber", encounter: "handle" },
}
```

A handle is therefore a family, not a flag. This also absorbs the catalogue's D2, "a lever elsewhere
opens a door here" — it is this, with a lever instead of a board.

The existing ruling holds unchanged: **there is no key; the state of the switch is which of its gates
stands open.** Nothing is minted, nothing is held.

#### A switch is one shape of a general mechanism

Stated generally so the verifier does not have to be rewritten for the next one: **a mechanism has
states, a mapping from each state to which of its gates stand open, and transitions the player
causes.**

| Mechanism      | States              | Open at               | Transition       |
| -------------- | ------------------- | --------------------- | ---------------- |
| a beam board   | which shrine is lit | that shrine's gate    | solving it       |
| a handle       | its positions       | that position's gate  | pulling it       |
| `sequenceLock` | progress `0..N`     | its gate, only at `N` | crossing a glyph |

The mappings differ — a board opens one gate per state, a sequence opens its gate only in the last —
but that is data rather than a new mechanism. What matters today is only that the verifier asks a
mechanism for its own state-to-gates mapping rather than assuming "a state is which gate is open".
That is a one-line difference now and an unpicked assumption later.

**Not built, and not to be built ahead of a feature that needs it:** a sequence also wants
**markers** — named trigger points inside regions, finer than a region because regions are defined by
the gates and two glyphs in one gate-free area cannot be separated by naming.

```ts
markers: { ibis: { in: "leftLower" }, jackal: { in: "entrance" } }
switches: { door: { encounter: "sequenceLock", sequence: ["ibis", "jackal"] } }
```

That the region is coarser than the marker turns out not to matter: inside a region the player walks
freely, so the verifier's move becomes _trigger any marker in any reachable region_, and order within
a region is genuinely unconstrained on the real floor too. A reset tile is a marker whose transition
goes to state `0`, needing no special case.

### One-ways

Directed, region to region, and explicit:

```ts
oneWays: [{ from: "s1Chamber", to: "leftLower" }]
```

Explicit because their position is a design decision, not a safety measure — see the worked example.
The verifier catches a missing one; it does not place one.

One-ways are the catalogue's **P2**, already costed: `reachableFrom`, `findPath`, `walkableFrom` and
`completeCell` all move on the _source_ cell's `dirs` and none check the target for a reciprocal, so
no mover needs changing. The work is the carve placing them, and the art drawing a passage that reads
as unclimbable from below.

### Containers

The drawing was never a floor. Its `in` and `out` are the ports of a **lock**: a named, reusable
container that a floor places.

```ts
const doubleBack = topologyLock({ regions, gates, switches, oneWays, in: "entrance", out: "wayOut" })
```

and a floor places it:

```ts
.floor(0, { pathPuzzles: 4, locks: [doubleBack, sandBypass] })
```

The main path enters at `in` and leaves at `out`; ordinary content carries on around it. A floor with
three locks reads as three blocks rather than one tangle.

## A gate says what opens it

A lock the player cannot read is not a puzzle, it is a wall they walk into twice. So a gate has to
say which mechanism owns it, and the further that mechanism sits from the door, the more it has to
say.

**Paired by a mark.** A mechanism and its gates share a colour or a glyph. The drawing this design
came from already does it without remarking on it — the fork and its two doors orange, the lever and
its pair green, the last lever and the way out blue. Floor keys already pair a key to a door by
colour, so this is the existing vocabulary rather than a new one.

**Explained at the door, where a mark is not enough.** A sequence lock's door cannot show an order in
a colour, so it carries an encounter that shows the symbols and the order they are wanted in — the
way a ward gate already tells the player which key it wants.

That is compatible with the ruling that a switch's gate holds nothing to enter, because the two
encounters do different jobs. What was forbidden is a door the player **opens** by tapping, since
that is a door the mechanism does not control. A door that **explains itself** when tapped takes
nothing away from the mechanism. The distinction is worth writing into whatever type carries it: a
gate encounter may read, never open.

It also falls out that a switch's own gates need no such encounter. The board and its doors are in
one room; the player can see both at once. The explaining is needed exactly where the mechanism is
out of sight, which is the case the generalisation above introduces.

## The rules that keep it buildable

**The gates must form a tree. One-ways may add any edge on top.**

Strip the one-ways from the worked example and the gate graph is a tree — which is exactly the
existing section model, a main path with sections hanging off it and gates on section boundaries. A
tree the carve lays out by construction.

A cycle made of _gates_ would need a carve that closes a loop through locked boundaries. It is also
rarely a puzzle: a loop walkable both ways through two locks is a room with two doors. An authored
gate cycle stops the build and names itself.

**A container's soundness may not depend on anything outside itself.** This is what makes composition
safe, and it has three consequences:

| Lock kind       | Inside a container                                                                |
| --------------- | --------------------------------------------------------------------------------- |
| Switch gate     | part of the lock; its position is state                                           |
| Floor key       | allowed, and the key must be findable inside the container                        |
| Ward (tomb) key | allowed as a bonus door, but the container must be sound with it assumed **shut** |
| Hidden section  | allowed, but the container must be sound with it assumed **unfound**              |

A ward gate opens on progress made elsewhere in the world, so a container depending on one could only
ever be verified in context. Assuming it shut keeps the proof local. Hidden pockets are already
excluded by the existing rule that an optional pocket is structurally reachable but never guaranteed.

## The verifier

Because the author names the regions, nothing has to be derived.

**A state** is _(the region the player stands in, every switch's configuration, the floor keys held)_.

Floor keys belong in the state space rather than beside it: a key changes what is passable, exactly
as a switch position does. It differs only in being monotonic — once held, always held — which is
what keeps the space small. A floor key is a lock whose switch is a chest and whose lever moves one
way.

**A move** is walking — into any region joined by an open gate, or along a one-way leading out — or
throwing a switch that stands in the region the player occupies.

**Two questions, breadth-first from the start state:**

1. **Does any reachable state reach `out`?** The lock can be solved at all. An author who builds a
   lock with no key is told so in those words, rather than discovering it as missing loot.
2. **Does _every_ reachable state reach `out`?** No order of moves strands anyone.

The second earns its keep. It finds traps nobody would think to look for — not "is there a drop from
`s1Chamber`" but "is there any sequence that paints the player into a corner", including sequences
several moves long.

A failure stops the build naming the state it died in: _"from `s1Chamber`, Y at neither, `greenRight`
shut, nothing reaches `out`"_.

### Soundness composes

Because the question is asked of a container between its own ports, the answer is a property of the
container alone. A floor built from sound locks is sound. So:

- a lock is verified once, ever — not once per floor that places it;
- three locks on a floor are three small checks, never one check over their product;
- the state space stays small permanently, however much a floor grows.

### What it answers that is already open

**The way back.** Whether a switch may shut the corridor the player arrived by stops being a rule to
decide and becomes a per-floor fact: allowed where the floor stays winnable, refused where it does
not. That closes the measured gap where **36 of 103 floors** have a junction with a way out the
switch cannot shut, and the staircase soft-lock — shut the way back, change floors, return to the
entrance side of a door only the fork can open — is caught rather than argued about.

**The wish form too.** A `forks` + `switches` floor has regions as well; the carve makes them even
though nobody named them. The same check covers `junior_2` with no new authoring.

## What this does not decide

- **The handle family's own behaviour** — whether throwing a handle cycles its gates or toggles them,
  and what a one-gate handle does. That is the topology mod's business, not core's.
- **Markers, and `sequenceLock` itself.** Sketched above so the shape does not preclude them; bought
  when that feature is built and not before.
- **What a mark is** — a colour, a glyph, or the patron vocabulary. Only that a mechanism and its
  gates share one.
- **The builder's placement algorithm** for laying a region tree into a carve, beyond the observation
  that the tree shape matches the existing section model.
- **A name.** `topologyLock` collides with the catalogue's `sequenceLock`, and "puzzle" is spoken for
  by the families. Something nearer `oldWorkings()` may sit better.

## Open questions

- **Does a lock's region tree compete with `sidePaths`/`hiddenPaths` for floor space?** A floor
  authoring three locks and a full set of paths may not fit. The economy's supply count does not know
  about regions, which is the same gap the design doc already records under "a feature that eats
  capacity".
- **Can a lock be authored across floors?** Nothing here says a region must sit on one floor, and a
  staircase inside a lock would make the container span two. Probably forbidden at first.
- **Do region names become save addresses?** They would be more stable than carve-derived section
  addresses, which is a benefit rather than a cost — but it is a save-format question and wants its
  own thought.
