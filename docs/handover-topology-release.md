# Handover — the topology release

For whoever picks this up next. The commits are the record of _what_ changed; this is the reasoning
that is not visible in a diff, and the decisions taken on the owner's behalf.

Delete this file when the release lands.

---

## The target

One major release: **all six topology features, plus a storytelling layer**, plus a save reset. The
owner has ruled that the reset is justified for a slice this size, and that it should ride the
reshape release already planned rather than being a second one.

The features are the catalogue in `game-design/floor-as-puzzle-brainstorm.md`. The architecture is
`mods/floor-topology-design.md`. The story half is a parallel thread on `docs/story-quests` (PR #284),
built by another session — the two are independent except at wizard tier.

## Where the work is

| Branch                            | State                                                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/floor-as-puzzle-brainstorm` | PR #305, docs only. Body describes only its first commit and needs rewriting before merge.                                                                          |
| `feat/witness-door`               | PR #307, draft, **not for merge**. A complete, reviewed slice-1 built before the design moved on. Superseded in shape, kept because most of its core work survives. |
| `docs/node-actions`               | The node-actions design plus the revised topology design. No PR yet.                                                                                                |
| `feat/switch-fork`                | Current work, and where slice 1 landed. Merged `main` in for the storage fix (#308) that was wiping a journey just started.                                          |

Nothing is merged. The owner merges to `main` only when the release is complete and playtested.

## What is built on `feat/switch-fork`

**The whole of slice 1, in the shipped world.** A fork room knows its exits — each one's compass
direction and what lies that way — and a floor authors the forks it needs (`forks`) separately from
what stands in them (`switches`). The builder chooses which ways out to shut and keys them from the
floor's authoring address. `lightbeamSwitch` generates a board per fork shape, turned to face the
real ways out, and the doors are a function of that board. junior_2 pyramid 2 floor 0 stands one.

Also here: the solvability slice (every mosaic register held to its reachable count, per tier), the
`topology` mod holding the features that change where a player may walk, and a develop-only journey
with a floor per topology feature, built only under `INCLUDE_DEV=1`.

Gone: `witnessDoor` entirely, and the runtime owned-key registry it was the only user of.

## Decisions taken on the owner's behalf

These are the ones that change how the code reads, with what each costs if wrong.

**Gate keys are keyed by section address, not compass direction.** A direction is chosen by the carve.
The deciding failure was not the lost key but its opposite: after a re-carve renames a branch, a stale
key finds the _new_ gate in that direction already open, without solving anything. A stale key that
silently unlocks a door is a soundness leak, not lost progress.

**A switch is a fork that carries an encounter.** The fork already knows where its ways out go, so a
switch needs no geometry of its own. This dissolved the hardest problem in the redesign rather than
solving it.

**A switch's family must not join the generic puzzle pool.** Its output is _which way out opens_;
drawn into an ordinary room, a player would route a beam that opens nothing. `lightbeamSwitch` carries
its own tag for that reason, the way the crocodile capstone does.

**There is no key. The state of the puzzle is the switch.** A fork's ways out are a function of the
board standing in it: route the beam north and north is open and the rest are shut; come back, route
it east, and east opens as north closes. One solve, one configuration. Nothing is minted, nothing is
held, nothing accumulates.

That is why the gate has nothing to enter, and it removes a whole layer rather than replacing it: no
minted key, no owned-key source for a switch, no key id to derive or keep unique, and no question of
a stale key fitting a door after a re-carve, because no key outlives the board.

The switch room stays **re-enterable**, and that is still the invariant — it is what lets a player
change their mind. They cannot strand themselves, because a door only ever changes while they are
standing in the fork; walking away leaves the configuration as they set it.

For the solver this is the permissive bracket and nothing new: every branch is reachable, because the
player can always walk back and choose it.

*The earlier reading — that a switch mints keys and keys accumulate, so each visit wins another door
for good — is wrong and was built on before it was settled. It was already an expensive one: an
implementer reported re-choosing as a design hole, it was accepted, a further fix was ordered to
close it harder, and a junior mosaic piece was briefly unobtainable. The doors are state, not
winnings.*

**The beam-physics kernel lives in `mods/core`.** The two copies had already diverged in the commit
that created them, and one divergence had dropped a gate clause that exists because the exploit was
found in play.

**Both resolvers build an `EncounterResolution` through one shared function.** Three separate bugs on
this branch came from a field reaching one of two parallel seams and not the other, with no type error
and no failing test. Collapsing the seam makes the divergence unrepresentable for every future field —
which is worth more than fixing any one of them.

## Answered by the owner

**A floor authors the forks it must have. A mod authors what stands in them.** These are two
separate statements at two separate scopes, and splitting them is what keeps a map stable when a mod
is toggled off.

```
forks:    [{ exits: 2, count: 1 }]                       core, cascades tier → journey → pyramid → floor
switches: { encounter: "lightbeamSwitch", min: 1, max: 1 }   mod-owned, same cascade
```

The floor is carved to satisfy the fork requirement, then the switches are placed into the forks it
produced. Anything that cannot be satisfied stops the build — these are constraints, not wishes.

**Why, measured rather than argued.** `switchFork` today does both jobs in one mod-owned field, and
the assembler's carve loop rejects an attempt that offers no gateable fork. So authoring a switch
changes which attempt is accepted: of the 97 authored floors that can host one, **68 carve
differently** and only 29 are unchanged. Dropping that field with its mod would therefore redraw 70%
of those floors and invalidate every save written against them. With the requirement authored in
core the retry predicate is identical whether the mod is registered or not, so the walls stand and
only the puzzle and its gates come and go.

This is the design doc's own `needs`/`places` split finally reaching the authoring: `needs` is what
the floor must provide and belongs to core; `places` is the encounter and its gates and belongs to
the mod.

**A switch's gate carries no encounter. The way is simply shut, or open.** It is drawn as a gate,
the way a ward gate is, and it holds nothing to enter or tap. A door a player opens by tapping is a
door the switch does not control, and the switch is already the thing that opens it. Nor does it need
a node hosting its key: that node is the fork.

Small, because the map already reads a gate off the cell's tags rather than off what stands in it —
`nodeKinds` calls a cell a gate when its `tags` say so, and calls it blocked when it also has a
`requiredKeyId` the player does not hold. Neither asks for a `family`. So the gate cell keeps
`tags: ["gate"]`, `requiredKeyId` and `gateVariant`, and simply stops carrying a family: it draws as
a ward gate does, it shuts the walk, and there is nothing behind it to open. A familyless fork is
already walked onto rather than entered, so the behaviour has a precedent rather than needing one.

**A switch's key stem is derived from the authoring address, never hand-written.**
`switch:<journeyId>#<levelIndex>#<floorIndex>#<switch index>`, with the gate's own section address
appended as before. A count cannot hand-author a name per switch, and deriving from the authoring
satisfies the original ruling exactly — the danger was always a name the *carve* chooses, which a
re-carve could hand to the wrong door. An authoring address cannot move under a re-carve. Uniqueness
stops being something a check enforces and becomes something the id cannot violate.

**There is a `topology` mod, and it is the home for every feature that changes where a player can
walk.** It holds the lightbeam corridor puzzle and the fork switch together, and `sandSlide`,
`waterline`, `sequenceLock`, `cosmicDust` and `hourglass` join it as they land. The two lightbeam
families live in one mod so that the board, the mirrors and the rules voice are shared by an
ordinary intra-mod import rather than promoted into core — a sibling import is forbidden, so two
mods would have forced the board into core to share it. `mods/puzzle` was the other candidate and
loses on being a root mod: it has no toggle-off proof, and a switch living there would have an
authored gate nothing could drop.

`useCelebration.ts` moves to `mods/core/app/` with the move, and belongs there on its own merits:
**a board finishing itself is part of the puzzle frame**, the same concept as `PuzzleFamilyShell`
and `useHintAvailability`, which are already there. The tableau and the crocodile do not celebrate
yet and should; both live in other mods, so core is the only place either could reach it from.
Nothing puzzle-specific follows it.

**A switch closes every way out that is available to it, and the board answers three fork shapes.**
Measured by forcing a switch into all 206 authored floors: 109 offer no fork with two closable ways
out, 92 give exactly two (68 adjacent, 24 opposite), 5 give three, and **none ever gives four**. So
`four` is not built — it would be a board for a floor that does not exist. `three` is built despite
being five floors, because the alternative was capping a switch at two gates and that would have
changed what a switch means to save a generator.

The three-door board is not the two-door one with a number changed: one mirror is one bit, so three
doors need a small routing gadget of two mirrors at the fork, and the sun placement is solved per
shape rather than parameterised.

**Toggled off, a switch fork becomes a bare junction.** `switchFork` is stripped to `undefined`, the
fork carves with every way out open, and nothing stands in the room — exactly how an ungated fork
already behaves. The slice table's "an ordinary puzzle" would have been new behaviour nothing builds.

**Whether a fork's ways out may rejoin behind it is authored, and by default they may.**
`forks: [{ exits: 2, count: 1, separate: true }]` demands a carve whose branches do not meet again
out of sight; saying nothing accepts one where they do.

It matters because it decides what a switch *means*. Where the ground behind two shut ways connects,
opening either one eventually reaches both branches' content — the choice paces the floor rather than
partitioning it, and what lies behind the door not chosen is still gettable without ever opening it.
With `separate`, the choice really does divide the floor.

Measured before deciding: of the authored floors that can host a switch, **95 already carve separate
branches and 8 rejoin**, so the condition is cheap where it is wanted — the assembler simply takes
another attempt. Default-off keeps every existing carve exactly as it is, at the cost that the
meaningful reading has to be asked for each time, and forgetting it is invisible until somebody walks
the floor. The dev journey should author it so a playtest exercises the partitioning version.

**A switch may stand at any fork, and hold as much of the floor as the carve gives it.** No cap, and
the main path onward is gateable like any other way out. The reason is the player's view: they have
not walked past the fork, so they cannot tell the main path from a side path, nor how much lies
behind either. There is no pacing to protect, because there is nothing to compare. The builder's
current behaviour stands.

**Fogging needs nothing.** Fog past a switch is unexplored ground, not a statement about the gates.

**`witnessDoor` becomes `lightbeamSwitch`, and then goes.** Its board already routes a beam to one of
two shrines; what it lacks is taking its shrines from the fork's own exits instead of a hardcoded
east and north. The work carries over into `lightbeamSwitch` rather than being rewritten, and once
that family stands, every trace of `witnessDoor` is removed: the family, its folders, its locale
strings, and the hand-authored gates and key ids in `junior_2`.

That last part re-authors a shipped pyramid with `forks` and `switches`, which moves real world data —
fine, and expected. See the note on what the byte-identical check is actually for.

**The lightbeam mod owns two families, not one family with two roles.** `lightbeam` is the corridor
puzzle and stays in the generic pool; `lightbeamSwitch` is the fork board, stays out of the pool and
is `reEnterable`. They share the board, the mirrors and the rules voice, and not the generator —
which was already the reason for splitting them. Two families keep pool membership and re-enterability
per-family facts rather than per-room ones.

## Open questions the owner has not answered

- **What "playtested" means** for a release carrying six mechanics. Parked until the sixth feature
  lands.

## What comes next, in order

**Slice 1, `LightSwitchFork`, is done and in the shipped world.** A junior pyramid stands one: junior_2,
pyramid 2, floor 0. The authoring is `forks` plus `switches`, the board is generated per fork shape and
turned to face the real ways out, and the doors are a function of the board with nothing minted or
held. The witness door it grew out of is gone entirely, along with the runtime key registry it was the
only user of. Seven findings came back from walking it and all seven are closed.

The solvability slice is done too: every mosaic register is held to its reachable count, per tier, over
a permissive final walk.

1. **The seed list.** Nothing declares offline demand for the switch's `{difficulty, forkShape}`
   buckets, so a switch board is generated live in the player's session. It plays correctly, which is
   why this has not bitten — but the ruling was that the switch role stays **seeded**, and right now
   that ruling is quietly untrue with nothing able to notice. `enumerateConfigs.ts:83` and
   `boardIndex.ts:84` both call `resolveOptions({ difficulty })` and never visit `switches`.

2. **The way back, and the soft-lock behind it.** Undecided, and it gates what follows. A switch
   controls every way out whose boundary is clear and whose neighbour is not another fork — but the
   way the player arrived by is never in that set, so on **36 of 103 floors** a junction has a way out
   the switch cannot shut and the player walks on without working the board. Letting it shut the way
   back fixes that and opens a trap: shut it, take a staircase, come back, and the player stands on
   the entrance side of a door only the fork can open. `explorerPos` falls back to the entrance when a
   saved position belongs to another floor, so that is ordinary play rather than a corner. The design
   doc's own answer is per-visit state — a switch's configuration discarded on leaving the site —
   which costs the feel of a floor you have configured.

3. **Derive the board from the open door.** Decided, not built: the mirrors are computed from the way
   out standing open — unique, because the generator allows one route per shrine — so nothing is
   stored and `stateIsTheMechanism` goes with it. Waits on the way-back decision, which changes what
   the default door is.

4. **`sequenceLock`**, then the four features after it. It is the first to author a door key by hand,
   so the register's last unheld rule — an authored gate's key is minted by whoever owns it — lands
   with it.

5. **The feature registry** — deferred while there was one feature and a guess. With a second real
   feature to generalise from, it is worth building.

6. **Free-order journeys with cosmic dust**, then the story layer.

## How this work goes best

**Dispatch narrow.** Three agents stalled carrying a full-suite-plus-world-generation tail. The one
told to make the edits and run four targeted specs finished cleanly, and the heavy checks — full
suite, `generate-world`, `validate-world`, `betterer` — take about three minutes to run from the
controlling session. Split it that way.

**"The world did not move" means the assembled-grid fingerprint**, not a byte-identical
`generatedWorld.ts`. The stored file holds configs; the damage lives in the grids. A change that
rewrote ~150 rooms passed the byte-identical check.

**The world is allowed to move in this release, and saves are expected to be lost.** The reset is
already the plan; moving rooms, retiring the witness door and re-authoring a pyramid are all fair.
So the byte-identical check is not a rule about the world — it is a way of proving a claim, and which
claim depends on the slice:

- a slice that says it changes nothing — a refactor, a move, a new unreferenced module — is proved by
  the file coming out identical, and a diff means the claim was wrong;
- a slice that means to change the world is proved by **only the intended thing moving**, compared
  before and after rather than argued.

What stays forbidden is a slice moving the world without noticing, which is how ~150 rooms once got
rewritten under a green check.

**Measure before arguing.** The most valuable findings in this slice all came from someone assembling
a few hundred floors and counting: a check that fired on zero of them, another that fired on 61 of
206, a guard whose branch was unreachable. Three separate claims that sounded right were wrong, and
two of those were mine.

**A test that cannot fail is the recurring defect here.** A loop that skips on failure and asserts
nothing; a test deriving its expectation from the code it tests; a spec path that does not exist,
which vitest skips silently while printing a pass. Ask of every new test what would make it go red.
