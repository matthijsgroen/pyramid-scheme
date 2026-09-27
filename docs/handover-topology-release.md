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
| `feat/switch-fork`                | Current work, and where slice 1 landed. Merged `main` in for the storage fix (#308) that was wiping a journey just started.                                         |

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

**And the walk.** `lockWalk.ts` verifies a lock — regions, gates each owned by one or more
mechanisms, mechanisms with states and transitions, one-ways, a way in and a way out — and answers
the two questions: can it be solved at all, and does every state a player can reach still reach the
way out. `floorLock.ts` compiles an assembled floor into that shape, and `findStrandingLocks` sweeps
the built world with both, stopping the build on a floor a player could be stranded on.

What it settled, which is why it went first: **junior_2 pyramid 2 floor 0 cannot strand a player.**
Its way out sits behind the switch's own main door, so the board is not decoration — arrive and both
ways are shut, and you leave by routing the beam. It is sound because the board can always be
re-routed, which is the re-enterability invariant verified rather than argued.

## Decisions taken on the owner's behalf

These are the ones that change how the code reads, with what each costs if wrong.

**Gate keys are keyed by section address, not compass direction.** A direction is chosen by the carve.
The deciding failure was not the lost key but its opposite: after a re-carve renames a branch, a stale
key finds the _new_ gate in that direction already open, without solving anything. A stale key that
silently unlocks a door is a soundness leak, not lost progress.

**A switch is a fork that carries an encounter.** The fork already knows where its ways out go, so a
switch needs no geometry of its own. This dissolved the hardest problem in the redesign rather than
solving it. It is the shape a _wished-for_ switch takes; an authored lock puts a mechanism anywhere
and gates any boundary, and the fork is the common case rather than the only one.

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

For the solver this is the permissive bracket: every branch is reachable, because the player can walk
back and choose it. That argument holds exactly as long as the way back is open, which is the fact
the walk establishes floor by floor rather than the rule anyone assumes.

_The earlier reading — that a switch mints keys and keys accumulate, so each visit wins another door
for good — is wrong and was built on before it was settled. It was already an expensive one: an
implementer reported re-choosing as a design hole, it was accepted, a further fix was ordered to
close it harder, and a junior mosaic piece was briefly unobtainable. The doors are state, not
winnings._

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
satisfies the original ruling exactly — the danger was always a name the _carve_ chooses, which a
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

It matters because it decides what a switch _means_. Where the ground behind two shut ways connects,
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

**The target has moved, and it is worth understanding why before reading the list.** Slice 1 proved
the feature; the design conversation that followed turned the feature into a vocabulary. A mechanism
is a thing with states that owns gates, and four of the six catalogue features are that with
different clothes on — including `waterline`, which now buys no primitive at all. Only `cosmicDust`
and `hourglass` stay separate, and both reach past a single floor, which is a satisfying place for
the boundary to fall.

So the weight of the release has moved off the features and onto the vocabulary. A lock becomes
twenty lines of authoring and a walk over its states, and the real destination is **master and wizard
authored as locks** — 58 floor-key gates across the world, 56 of them in those two tiers, all doing
the shallowest form of floor-as-puzzle there is. `mods/floor-topology-design.md` carries the whole
design; it is the single source of truth.

**The walk is built**, so the list below starts at what was item 2. Four things it learned that the
next slice inherits:

- **Leaving the floor is a move only from the way out.** A save is `"floor:row,col"`, so re-entering
  a site puts the player back where they stood; only a position on another floor falls back to the
  entrance, and reaching another floor means reaching the staircase. A player sealed into a chamber
  does not get to walk out of it by leaving. Getting this wrong in the permissive direction hides
  exactly the traps the walk exists to find.
- **The compiler seals what it cannot model.** A room carrying `requiredKeyIds` (a tableau wanting
  several hieroglyphs) and a ward gate both compile to a door that never opens, because the container
  must be sound with an off-floor key assumed shut. So **the first lock authored beside a tableau on
  its main path will report `unsolvable`** — that is the rule working, not a bug, and it is the thing
  most likely to surprise whoever authors lock number two.
- **A guard holds the sweep's reach.** The build stops if the sweep walks zero locks while the configs
  authored a switch, so the check cannot quietly stop reaching the floor it was written for.
- **The state space has a flat ceiling** (`MAX_LOCK_STATES`). A container is a handful of regions and
  mechanisms; anything near it is an authoring mistake, and failing loudly beats hanging the build.

1. **One-ways (P2).** The carve placing a directed edge and the art drawing a passage that reads as
   unclimbable from below. The movers need nothing: `reachableFrom`, `findPath`, `walkableFrom` and
   `completeCell` all move on the source cell's `dirs` and none check the target for a reciprocal.
   Independent of the walk.

2. **The mechanism vocabulary.** Regions, gates on any boundary, containers with ports, and the
   builder laying a region tree into a carve. The substantial piece, and the one that pays for
   everything after it. The walk now exists, so a lock is verified as it is built.

   **Author locks; do not write a spec per puzzle.** A lock's soundness is a property of the container
   between its own ports, so it is verified once by the build sweep rather than once per floor and
   never by a hand-written test. `lockWalk.spec.ts` tests the walk itself — the moves, the owner fold,
   the two questions, the ceiling — on small synthetic locks, and must not grow a case per authored
   floor. The worked example currently sits on the wrong side of that line: `doubleBack` is a fixture
   in that spec only because there is no `topologyLock({ … })` to place it on a floor with. **When the
   vocabulary lands, move it into authoring and let the sweep walk it.**

   That move also closes a defect this release has now hit twice: a design doc and a fixture are two
   lists that must agree by hand. The worked example's second drop existed in the owner's design and
   in neither list, and nothing could tell — which is how a floor that reads as sound was recorded as
   a trap. Authored, there is one source.

3. **Handles.** A family with states and no generator. Small, and it turns the catalogue's "a lever
   elsewhere opens a door here" into authoring.

4. **Locks as content.** The owner's own `doubleBack` first — a fork whose right way starts open,
   shut behind the player, with a drop landing _between_ two gates — then a ladder of them, then
   master and wizard re-authored off their key chains.

5. **Derive the board from the open door.** Decided, not built: a switch's mirrors are computed from
   the way out standing open, unique because the generator allows one route per shrine, so nothing is
   stored and `stateIsTheMechanism` goes with it. Genuinely unblocked — the way back is settled, and
   the floor it turns on is walked and sound.

6. **`cosmicDust` and `hourglass`**, the two that genuinely need new primitives, then free-order
   journeys, then the story layer.

### The two decisions that were waiting are made

Both are written into `mods/floor-topology-design.md`, which is where they belong; they are noted
here because floors will be authored against them.

- **A gate may answer to more than one mechanism**, and `mode` says how they combine: `all` (the
  default) opens it only while every owner opens it, `any` while one does. One owner stays the common
  case. This is not the claim rule reopening — a multi-owner gate is one authored door naming both,
  wearing the mark of each, rather than two features arriving at one boundary unaware of each other.
  The compiler already leans on it: a boundary several key ids speak for folds `all`, which is what
  `reachableFrom` has always done with `requiredKeyIds`.
- **A mark is a glyph on a coloured ground.** The ground groups, the glyph says which one, and a
  mechanism and every gate it owns wear the same pair. `KeyColor`'s five values are the grounds,
  shared with key doors; the glyphs are the alphabet `sequenceLock`'s markers already want, bought
  once for both. Two levers on one floor may be green and still be told apart.

### What the walk left open

None of these gives a wrong answer, and none fires on the world as it stands. They are all about how
a failure reports itself, which is why they were parked rather than fixed — but the first is worth
doing before anyone leans harder on the walk.

- **A test held by wording rather than by the thing it guards.** The check that a switch's door agrees
  with the key the switch names is proved by a test matching the word "misspelled" in an error string;
  delete the comparison and a different throw still fires, just worded differently. Assert the
  distinguishing phrase instead. This is the "could it ever fail" class, which this release keeps
  producing.
- **A throw names the journey, not the floor.** `floorLock` throws on a gated way out it cannot
  resolve, but `grid.siteId` carries the bare journey id, so the build says which site and not which
  level or floor. Worse, the throw escapes `findStrandingLocks` before the unassembled report prints,
  so a doubly-broken world dies on a stack and prints neither list. Catching around the `floorLock`
  call and pushing the message as a reported failure fixes both.
- **A switch authored onto a ward boundary reports the wrong reason** — "borders no region the walk
  can enter it from", when the truth is that ward doors are deliberately held out of the switch index.
  The design already forbids the shape; the message should say so.
- **The spec's independent witness no longer mirrors the compiler.** `floorLock.spec.ts` builds its
  own region flood to check the compiler against, and its comment claims it makes the same split. It
  no longer does — the compiler reads `requiredKeyIds` as well. Inert today, untrue as written.
- **The sweep-reached-a-switch guard is world-wide and binary.** With N switch floors it fires only
  when all N are missed. A per-floor pairing wants a stated exemption for a reserved junction that
  carves no closable exit.
- **Two adjacent door cells would produce two gates the walk can cross either way.** Pre-existing
  shape, unreachable while assembled floors put their nodes two cells apart.

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

The sharper version, learned three times in one slice: ask whether the check could **ever** have
failed, not whether it passes. A gate proved blocking against world-gen's walk while the player
strolled through it, because those are different code paths. A mosaic guard stayed green when
authored capacity moved, because it is goal-seeking. An exemption excused something that was never
there. Each looked like coverage and was scenery.

**Taking an encounter out of a room takes its guarantees with it.** Three playtest findings in this
slice were the same shape. The block on a locked door was _the family refusing to solve_. A switch's
configuration was _the family's board_. Seeing a junction's ways out was _marking a bare fork
explored_. None was written down as the mechanism; each was a side effect of the room being one kind
of thing, and each vanished silently when it became another. When a room stops carrying an encounter,
ask what the encounter was quietly doing.

**A subagent's report is not a completion signal if it was messaged mid-run.** One slice was
committed while its agent was still writing the specs that proved it, because a hand-back arrived and
then the agent kept working on instructions sent after it started. The work was sound and the commit
had to be completed by a second one. Wait for the notification, not the prose.

**A design doc and a fixture are two lists that must agree by hand.** The worked example's second
drop — the one that makes the floor sound — was in the owner's design and in neither list, and
nothing could tell: the walk faithfully reported a trap in a floor that does not have one. The same
shape as the two parallel resolvers, one size up. Where a design doc carries an example the code also
carries, the two will drift; the fix is to make the code's copy the authored one and let the doc cite
it, which is what item 2 above is for.

**Verify a measurement before believing it.** Two of this session's measurements were wrong in ways
that would have changed a decision: one compared cell _type_ where it should have compared `dirs`,
and counted a gate being placed as a wall moving; another used a regex that silently matched nothing,
so a check appeared not to fire when it had never been exercised. A measurement that confirms what
you expected deserves the same scrutiny as one that surprises you.

## Saves reset for this release

The owner has ruled that all saves reset for the topology work and the story layer above it. So a
save-format change inside this release owes no migration, and a slice that would otherwise need a
double-write and a backfill can simply change the shape.

What that does NOT excuse: an identity that is ambiguous **inside one playthrough**. A reset gives a
player a clean save, not a correct one, and two cells sharing a key are wrong on the first visit.

---

# Session handover — the walk, one-ways, and what a drop is

44 commits on `feat/switch-fork`, `85ee986..7f0577b1`. Nothing merged. Tree clean at handover.
Full gate green throughout: `yarn test` 3571, `yarn lint` 0 errors, `betterer` unchanged,
`generate-world` byte-identical.

## What got built

**The walk** (handover item 1, now done). `src/game/lockWalk.ts` verifies a lock — regions, gates with
owners, mechanisms with states and transitions, one-ways, a way in and out — answering _can it be
solved_ and _does every reachable state still reach the way out_. `src/game/floorLock.ts` compiles an
assembled floor into that shape; `findStrandingLocks` sweeps the built world and stops the build.

**It settled the shipped switch:** junior_2 pyramid 2 floor 0 cannot strand a player. Its way out sits
behind the switch's own door, so the board is load-bearing, and it is sound because the board can
always be re-routed — the re-enterability invariant, verified rather than argued.

**One-way edges** (roadmap step 1). A floor authors `oneWays: [{ from, to }]` naming two sections; the
carve places a directed passage or refuses the attempt. Four refusals, each of which cost a fix round
to find: a drop goes where the maze never joined, never where gate isolation deliberately cut; never
on the exit node; never into a gate the player has not earned; and an end naming no section is refused
before any attempt rather than re-carved sixty times.

**Half of step 2.** The reveal runs through a drop from the source; the landing sees the mouth and
nothing past it; a refused movement marker stands a cell out, the same arrow at half strength with a
bar across it. What remains of step 2 is the art.

## In flight when this session ended

**An art-prep agent** was still running: adding a zipline `--contents` to `prim_pit`, rendering three
expert scaffolds, and writing `yarn repaint` entries. Its report lands at
`.superpowers/sdd/one-way-edges-implementation-plan/art-prep-report.md`. **Check whether it committed
before assuming anything** — `git log` is the truth. If it queued entries, the owner runs
`yarn repaint <key>` and pastes by hand; the loop is manual on purpose.

## What the owner decided

- **A gate may answer to several mechanisms**, `owners` + `mode` of `all` (default) or `any`.
- **A mark is a glyph on a coloured ground** — `KeyColor` grounds, the hieroglyph alphabet already
  shipped as a webfont for the glyphs.
- **All saves reset** for the topology work and the story layer above it. So a save-format change owes
  no migration — but a reset gives a clean save, never a correct one, and an identity that is
  ambiguous _within one playthrough_ is still a bug.
- **A one-way is a place, not a sign.** Drawn as a fissure with a line over it; the rule is carried by
  the movement markers, at the moment the player tries.
- **What it does from each side** is now the contract in `mods/floor-topology-design.md`.
- **Three drawings per rank**: horizontal is one asset mirrored, the two verticals each need their own,
  because a vertical flip breaks the projection's up-facing-band rule.
- **An ingredient is held to a higher bar than a floor** — its mistakes repeat everywhere it is used.
  Do not trade ingredient quality for a shorter road to `doubleBack`; it is the first consumer, not
  the point.

## What is next

1. **Step 4 — the handle, with marks.** The biggest piece needing nothing from the owner. Its state
   model is what all 56 master and wizard gates get rebuilt on, so it is the highest-leverage
   ingredient left. `key-gate` is the no-generator precedent; the part most likely to be
   underestimated is persisted mechanism state — the shipped switch stores the CONSEQUENCE
   (`openWaysOut`), not the state.
2. **Step 2's art**, once the owner has run the repaint loop.
3. **Step 5 — the lock container.** Still blocked on five design questions, listed in
   `authored-locks-roadmap.md`. The region tree does NOT fit the existing section model: that tree is
   two levels, single-parent, one gate per section at its entrance, always starting shut.

## Things that will bite

- **Stale IDE diagnostics, constantly.** They reported missing exports, unreachable code and unused
  components that were all present and correct. `yarn check-types` is the truth; the diagnostics were
  wrong every single time this session.
- **`lint --fix` BEFORE `betterer`.** Betterer records a content hash per file, so formatting after it
  invalidates the results and CI fails where local passed.
- **`INCLUDE_DEV=1 yarn generate-world` writes the develop journey into `src/data/generatedWorld.ts`.**
  Regenerate without it afterwards or the tree stays dirty with a world nobody ships.
- **A subagent's "lint clean" is not evidence.** Several reported it while the repo gate was red.
- Parked, and written up in `authored-locks-roadmap.md`: `doorsToEnter` is not every door (a room with
  `requiredKeyIds` is a real barrier nothing records); the gate table mints a two-way gate across a
  drop's first edge when the source is itself a door; `sealed` isolation is recorded as a door though
  nothing there is earned; `walkPosition` returns NaN for a drop connector's ordinal.

## How this session actually found things

Four defects were green in a passing suite and were caught by looking, not by reading: the verifier
could be fooled on exactly the floors it exists for; a drop could tunnel past a gate; a marker was
hidden behind the player's boots with an invisible bar; and a "no floor under the gap" turned out to
be fog at 0.75 opacity. **A measurement that confirms what you expected deserves the same scrutiny as
one that surprises you** — one probe here was too coarse and had to be redone, and one conclusion
about art legibility was retracted entirely because the marks had been drawn in the wrong place.
