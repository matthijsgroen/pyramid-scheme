# The mechanic contract

How a lock and its mechanics are defined, so that what an author writes is what they get. Settled with
the designer on 2026-10-02. `topology-status.md` says what is built today; this says what the authoring
vocabulary must express. Where the two disagree, this document is the target and that one is the record.

**The defect this exists to prevent is silent fallback.** A control with no encounter became a lever; a
`encounter: "torch"` was drawn as a lever; `switches` meant one thing in the spec and another in the
code. Every time the author got something other than what they wrote, and nothing said so. So: an
omitted property is asked for or refused, never guessed, and the tool refuses what the carve cannot
build rather than substituting something near it.

## 1. Three layers

| layer | what it says | examples |
|---|---|---|
| **control** | the state machine the player drives | back and forth, on only, in order, rest plus one per exit |
| **effect** | what each state does to the map | these gates open, these regions impassable |
| **realisation** | how it looks and is operated | zipline or headwind, lightswitch or another switch puzzle |

A **lock** names controls and effects. It never names a realisation. A realisation is bound from
**outside**, where the lock is placed, so one lock can be reused across pyramids with different themes:
the same one-way is a zipline in one pyramid and a strong headwind in another.

**A realisation may not change what the solver sees.** Same states, same edges, same directions. Only
the drawing and the operation differ. Something that adds a state is not another realisation of that
control; it is another control.

## 2. The controls

| control | states | notes |
|---|---|---|
| **toggle** | two, back and forth | the lever |
| **activator** | two, no way back | the torch; also a floor key, whose operation is taking it from a chest |
| **sequence** | progress 0..n, with a reset | tiles walked in the right order; see §3.1 |
| **fork-switch** | rest, plus one per exit of its fork | governs its own fork; see §4 |
| **weights** | one per stone arrangement | the stones on plates; see §3.2 |

**one-way** is an effect with no control: always on, directed, and **always taken through a prompt** so
the player never crosses by accident and finds they cannot come back. Every realisation of it must
offer that prompt, including ones that would otherwise be passive.

A **floor key is an activator.** The solver already models it as `absent -> held` with no return; the
only difference from a torch is how the player works it. It can therefore own gates and take part in
conditions like any other control.

## 3. Effects

An effect is a table from a control's state to what that state opens. A state that names nothing does
nothing, so nothing has to be forbidden.

A target is either:

- **an edge** — a gate between two regions
- **a region** — made impassable

A gate may name more than one owner, with `and` (every owner must name it) or `any` (one is enough).
Four torches opening one gate is four activators owning one gate with `and`.

### A gate shows its own condition

A gate may carry an encounter that **reads and never opens** — it tells the player what the door is
waiting for, the way a ward gate already shows the key it wants.

- **An `and` door shows one marker per owner**, lit once that owner names the door. Four torches are four
  flames; three torches and a floor key are three flames and a key. The icons come from the owners, so
  nothing special is needed for a mixed condition.
- **A sequence door shows the order**, and carries the **reset**. The door is where the player learns
  what the order is, so it is where they must be able to start again.

### 3.1 The sequence

- The lock expresses **order** only. The carve picks the hieroglyphs, from a set, **unique within a
  floor** so two sequences never share a symbol.
- Each tile shows its own state: not yet walked, walked in the right order, walked in the wrong order.
- A wrong step **registers** rather than doing nothing, so the player can see they have spoiled the run.
- **Progress survives leaving.** It is an ordinary state like any other, and only the reset clears it.
  This follows from the reset living at the door: without it, walking back to read the order would wipe
  the progress, turning the safety net into a trap.
- The reset is operated **at the door, not where the mechanic stands.** `LockSpec` already carries an
  `at` per transition, so the advance steps happen at each tile's region and the reset at the gate's —
  see §9.

### 3.2 Stones on plates

- **The lock's `weights` field** lists its plates: each has a region, whether a stone starts on it, and the
  gates it opens while weighted or while empty. Stones are alike and have no ids; a stone is authored as the
  plate it starts on. A gate owner is a plate id, or `unladen` (empty hands), under `and` or `any`.
- **One control per lock.** `compileLock` turns the whole `weights` field into one control, id
  `<namespace>.stones`, because a lift and a set-down move one shared arrangement, not one plate. Its states
  are the arrangements (`stoneArrangements`): which plates hold a stone, and whether the hand holds one.
- **The record is built like a sequence's.** Placed-only: a plate works only the moves made at its own cell.
  The record stands on the first plate, and every plate carries `worksMechanism` pointing at it, so the
  arrangement is one state saved once.
- **Gates read the arrangement.** A gate is open under every arrangement where its stone terms hold, and the
  door folds in its other owners by the gate's mode. `unladen` holds in every arrangement without a stone in
  hand.
- **The way out is left with empty hands.** `leaveWith` on the walk spec names the states that forbid
  leaving: the way-out region may be entered carrying, only leaving (and finishing) needs empty hands. A
  stone never leaves its floor, and `yarn lock` never reports a route that ends with one in hand.
- **Binding.** The binding key is `weights`; its realisation is `stonePlate` (topology mod), which draws
  nothing of its own: plates are read from the cell's `plate`. A plate needs a free node in its region, and
  placement refuses naming the plate when there is none.
- **With the topology mod off** the plates are bare ground and the carve is otherwise identical. Every door
  the plates govern stands open, unless another live control still holds it, so the walk is unobstructed.

### Impassable regions

A region made impassable behaves as a gate that presents differently: the player can see the first
stretch and the blockage — a sand pile, a flooded passage — and nothing beyond it.

**It conceals what was already explored.** Exploration is otherwise permanent, but a region that becomes
impassable again hides what the player saw while it was open; otherwise they look straight through the
sand and the illusion is gone. The exploration is **hidden, not erased**: when the region opens again it
is there as they left it, and they do not walk it twice.

This is a property of the effect, not of the realisation. Sand and water conceal alike.

## 4. The fork-switch governs its own fork

Every other control takes its effect from the lock. A fork-switch does not: **a fork puzzle operates
that fork.** Its targets are the exits of the junction it stands in, and its state count follows from
them.

The consequence for the carve: when a fork-switch stands in a region whose connections are the fork's
branches, **the carve must lay the fork so that its exits are those seams.** Today the carve chooses the
junction's exits independently of the region seams, which is why a floor authored this way strands — the
region straddles the door.

## 5. Binding a realisation

- Written **outside** the lock, where it is placed.
- Declared at several levels — floor, pyramid, journey, difficulty — and **the most specific wins**, the
  same way the other selectors in this codebase work. Global defaults, local overrides.
- **Resolved at bake time**, because space depends on the realisation and the carve has to know it before
  it searches.
- **An unbound role is refused.** No default realisation.

Within one lock, all roles of a kind take the same realisation for now. Per-role selectors are a later
idea, not a current one.

**Space is realisation-dependent, and that is the carve's problem to solve.** A zipline needs a straight
run of launch, three obstacle cells and a landing; a vertical lightswitch currently takes more cells than
a horizontal one; a headwind may need almost nothing. The carve may grow to fit, which costs time, and
the seed that succeeded is pinned afterwards — which is what `carveLedger.json` already does.

**Mechanics are independent of difficulty.** Art is not: a realisation may have no art at a given rank
yet. That is an outstanding job with a chosen fallback, not a reason to refuse the binding — but the
fallback must be chosen rather than whatever happens today.

## 6. What a mechanic declares

```
mechanic lever
  control    toggle              # two states, back and forth
  governs    edges, regions      # what its effect may target
  built      yes

mechanic torch
  control    activator
  governs    edges, regions
  built      yes

mechanic pressure-tiles
  control    sequence            # progress along tiles, with a reset
  governs    edges, regions
  built      no

mechanic lightswitch
  control    fork-switch
  governs    own-fork            # the exception of §4
  built      yes
```

`built: no` is what lets a design be written and checked before the code exists. The tool validates such
a lock and refuses to bake it, saying which mechanic is not ready.

## 7. The lock format

A lock is one JSON document. It names regions, how they join, the barriers on those joins, and the
mechanics that work them. It never names a realisation: that is bound outside, where the lock is
placed (§5), and so is nesting one lock inside another.

```json
{
  "name": "doubleBack",
  "regions": {
    "in":         { "takes": "puzzles" },
    "leftLower":  { "takes": "nothing" },
    "rightLower": { "takes": "nothing" },
    "s1":         { "takes": "nothing" },
    "s2":         { "takes": "reward" },
    "out":        { "takes": "nothing" }
  },
  "connections": [
    ["in", "leftLower"], ["in", "rightLower"], ["rightLower", "s1"],
    ["leftLower", "s2"], ["in", "out"]
  ],
  "gates": {
    "in-leftLower":  { "from": "in",         "to": "leftLower",  "owners": ["Y"] },
    "in-rightLower": { "from": "in",         "to": "rightLower", "owners": ["Y"] },
    "rightLower-s1": { "from": "rightLower", "to": "s1",         "owners": ["S1"] },
    "leftLower-s2":  { "from": "leftLower",  "to": "s2",         "owners": ["S1"] },
    "in-out":        { "from": "in",         "to": "out",        "owners": ["S2"] }
  },
  "mechanics": {
    "Y":  { "control": "fork-switch", "in": "in" },
    "S1": { "control": "toggle", "in": "s1", "starts": "a",
            "opens": { "a": ["rightLower-s1"], "b": ["leftLower-s2"] } },
    "S2": { "control": "toggle", "in": "s2", "starts": "a",
            "opens": { "a": [], "b": ["in-out"] } }
  },
  "oneWays": [
    { "from": "s1",        "to": "leftLower" },
    { "from": "leftLower", "to": "in" }
  ],
  "in": "in",
  "out": "out"
}
```

### Connections

`connections` is the whole shape of the lock: every pair of regions that join. A connection with nothing
on it is a passage the player simply walks, which is what lets two regions be distinct places without a
barrier between them — needed to put a sequence's tiles in different regions that nothing separates.

An edge gate stands ON a connection, so every `from`/`to` gate must name one that exists. Topology is
written once, in `connections`; `gates` says which of them are barred. A gate naming a connection that
was never declared is an error rather than a new passage.

A region gate needs no connection: it bars a region rather than an edge.

### Gates

A gate is a barrier. It has two shapes, and `opens` names either kind by id:

```json
"in-leftLower": { "from": "in", "to": "leftLower", "owners": ["Y"] },
"floodedHall":  { "region": "hall",               "owners": ["sluice"] }
```

An edge gate stands between two regions. A **region gate** makes a whole region impassable: the player
sees the first stretch and the blockage and nothing beyond it (§3).

`owners` lists the mechanics that work it. With more than one, `"mode": "any"` means one is enough;
the default is that every owner must name it.

**A gate has no start state of its own.** It is open when the starting states of its owners name it,
folded by its mode. Saying it twice — once on the mechanic, once on the gate — gives two sources that
can contradict each other, so the mechanic is the only one.

### Mechanics, one small example each

**toggle** — two states, back and forth. The lever, and anything else that can be put back.

```json
"S1": { "control": "toggle", "in": "s1", "starts": "a",
        "opens": { "a": ["rightLower-s1"], "b": ["leftLower-s2"] } }
```

**activator** — two states, no way back. The torch; a floor key is the same control with another
realisation.

```json
"brazier": { "control": "activator", "in": "hall", "starts": "unlit",
             "opens": { "unlit": [], "lit": ["hall-vault"] } }
```

Four of them on one door is four activators and the default `and`:

```json
"hall-vault": { "from": "hall", "to": "vault",
                "owners": ["brazier1", "brazier2", "brazier3", "brazier4"] }
```

**sequence** — tiles walked in order, with a reset at the door. Each step names its own region, so the
author places them; the carve picks the hieroglyphs, distinct within a floor.

```json
"plates": { "control": "sequence", "in": "hall",
            "steps":   [{ "in": "hall" }, { "in": "vault" }, { "in": "hall" }],
            "resetAt": "hall-vault",
            "opens":   { "done": ["hall-vault"] } }
```

**fork-switch** — operates its own fork, so it names no targets. The gates name it instead, and every
one of them must be a seam leaving the region it stands in (§4). The tool checks that.

```json
"Y": { "control": "fork-switch", "in": "in" }
```

**one-way** — an effect with no control, always taken through a prompt.

```json
"oneWays": [ { "from": "s1", "to": "leftLower" } ]
```

**a region put beyond reach** — an ordinary toggle whose targets are region gates. Water moved from one
place to another is one mechanic with two states:

```json
"sluice": { "control": "toggle", "in": "pumpRoom", "starts": "dry",
            "opens": { "dry": ["floodedVault"], "wet": ["floodedHall"] } }
```

**A mechanic may not stand in a region it makes IMPASSABLE.** The sluice is in `pumpRoom`, not in `hall`
or `vault`: flooding the room it stands in would put its own cell beyond reach, and nothing could undo
it. The tool refuses that where it is written.

**Shutting an edge behind yourself is allowed.** A lever that closes the door you came through leaves
you standing beside the lever, so you can open it again. That is a choice the player makes, not a trap,
and nothing stops it.

### What the tool should show back

The starting state is derived, so the author cannot read it off the document. The tool should report it:
*"at the start these gates stand open"*. That catches a lock whose only open gate is one nobody can
reach yet — which is what doubleBack does today.

## 8. Settled, and still open

**Settled.** The three layers. The four controls plus one-way. Targets are edges or regions. `and`/`any`
conditions. A floor key is an activator. The fork-switch governs its own fork. Realisations are bound
from outside, most specific wins, at bake time, refused when unbound. A realisation may not change what
the solver sees. Impassable conceals, and conceals what was explored, without erasing it.

A gate may show its own condition, and a sequence's reset is at its door.

**Open.**

- The sequence: whether its tiles may span regions and so interact with another lock, and whether it
  stays fired once fired.
- The sand barrier: parked. A wizard-pyramid idea that may not belong to the lock model at all.
- Whether a realisation may demand anything of placement beyond space.

## 9. What this requires of the engine

Each is measured in `topology-status.md` §6.

1. **Separate control from effect.** `MechanismRecord` already carries states and a table of state to
   what opens; the table must widen from gate ids to targets, where a target is an edge or a region.
2. **The fork's exits must be able to coincide with authored seams** (§4).
3. **An open gate keeps its symbol and colour**, or the player cannot reason that it will shut when
   another opens.
4. **Two mechanics on one floor never share a mark**, and the same assignment must give a sequence's
   tiles distinct hieroglyphs — a repeated symbol does not merely confuse, it makes the order unreadable.
5. **A realisation decides the drawing**, which `encounter` does not do today.
6. **`openDoorsFor` and `floorLock` must agree on a door naming more than one key.** This was documented
   and left alone on 2026-10-01, correctly, because nothing could author such a door. Floor keys taking
   part in conditions makes it reachable, so it is now load-bearing.
7. **Concealing an explored region** is new: exploration is permanent today.
8. **A mechanic's transitions may happen in different places.** `LockSpec` already carries an `at` per
   transition, but `floorLock` gives every transition of a mechanism the one cell it stands on. A
   sequence advances at its tiles and resets at its door, so that assumption has to go.
9. **A gate must be able to carry an encounter that reads and never opens.** Today a gate is either a
   wall or a puzzle room; there is no third kind that explains itself without being the puzzle.

Nine more, found while sizing the first nine. They are peers, not footnotes: 10 blocks the worked
example and 12 undoes a decision made the same afternoon.

10. **Off-route regions must form a tree, not one chain.** `offRouteChains` walks a component into a
    linear list, so a region with two arms cannot be seated and comes back `obstacleOffRoute`. Measured:
    the doubleBack of §7 carves on 0 of 60 seeds; the same layout without its drops carves 60 of 60. Two
    faults are tangled here — drops counted as undirected edges merge the two arms into one component,
    and `regions.ts:273` puts connections and one-ways in one neighbour list without dedupe, so a pair
    joined by both is visited twice.
11. **The lock format itself.** There is no `locks:` field, no reusable lock, no selector cascade for
    binding a realisation (floor/pyramid/journey/difficulty), no refusal of an unbound role, and no
    `built: no` validation. §5 and §7 describe all of it; none of it exists.
12. **Two regions joined by nothing must stay two regions.** `floorLock` flood-fills, so an unbarred
    connection merges them into one region of the compiled lock. A sequence's tiles placed in separate
    regions collapse into one and the walk cannot see the order — which is exactly what §7's
    `connections` field was added for.
13. **A step onto a tile is not optional.** A tile is a region of one cell on a cut of the walk, and the
    solver makes its transition on entering that region (`Mechanism.entries`), never as a move the player
    may decline; a floor no walk completes in order is refused naming the sequence (`Mechanism.goal`).
14. **A mechanic's state may live across several cells.** `mechanismStates` is keyed by one cell
    address; a sequence has one state and many tiles.
15. **A cell's slot must not embed the family.** It is `x<family>:<mechanismId>` today, so binding one
    lock to another realisation orphans the player's stored progress on that mechanic.
16. **The carve may not depend on mod-owned authoring.** `forks` is core and `switches` is owned by the
    topology mod, so a seam-coincident junction has to hold from `regionLayout` and `forks` alone, or
    turning the mod off moves the carve. Holds: mechanics are core authoring, so a mod being off refuses a
    floor by name (`realisationMissing`) and never changes its walls (`docs/mods/ARCHITECTURE.md`).
17. **One fold for a gate's mode.** `floorLock` sets it per boundary and `openDoorsFor` per key. It
    bites as soon as a gate has several owners, which §3 invites.
18. **Every realisation of a one-way offers its prompt.** §2 requires it of all of them; only the
    zipline's exists.
