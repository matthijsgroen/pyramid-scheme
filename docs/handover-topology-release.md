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
| `feat/switch-fork`                | Current work. Tasks 1–4 done and reviewed; Task 5 remains.                                                                                                          |

Nothing is merged. The owner merges to `main` only when the release is complete and playtested.

## What is built on `feat/switch-fork`

A fork room knows its exits — each one's compass direction and what lies that way. A fork may carry an
encounter. The builder, not the author, chooses which of that fork's ways out to gate, and five stated
rules are enforced rather than merely written down.

Task 5 remains: prove the authoring end to end **in spec**, not in the shipped world. That reduction
is deliberate — see the rulings.

## Decisions taken on the owner's behalf

These are the ones that change how the code reads, with what each costs if wrong.

**Gate keys are keyed by section address, not compass direction.** A direction is chosen by the carve.
The deciding failure was not the lost key but its opposite: after a re-carve renames a branch, a stale
key finds the _new_ gate in that direction already open, without solving anything. A stale key that
silently unlocks a door is a soundness leak, not lost progress.

**A switch is a fork that carries an encounter.** The fork already knows where its ways out go, so a
switch needs no geometry of its own. This dissolved the hardest problem in the redesign rather than
solving it.

**The witness door's family must not join the generic puzzle pool.** Its output is _which branch
opens_; drawn into an ordinary room, a player would choose a shrine that opens nothing. It also kept
the world byte-identical, which the tag would have reshuffled.

**Keys accumulate; the cost of a choice is a walk.** A switch room is re-enterable, and that is an
invariant rather than a preference — without it a player who spends their choice on a side branch is
stranded behind the gate on the main path onward. This one was got wrong first: an implementer
reported re-choosing as a "design hole", it was accepted, and a further fix was ordered to close it
harder. It was the design. The reversal cost two rounds and made a junior mosaic piece briefly
unobtainable.

**The beam-physics kernel lives in `mods/core`.** The two copies had already diverged in the commit
that created them, and one divergence had dropped a gate clause that exists because the exploit was
found in play.

**Both resolvers build an `EncounterResolution` through one shared function.** Three separate bugs on
this branch came from a field reaching one of two parallel seams and not the other, with no type error
and no failing test. Collapsing the seam makes the divergence unrepresentable for every future field —
which is worth more than fixing any one of them.

## Answered by the owner

**A switch may stand at any fork, and hold as much of the floor as the carve gives it.** No cap, and
the main path onward is gateable like any other way out. The reason is the player's view: they have
not walked past the fork, so they cannot tell the main path from a side path, nor how much lies
behind either. There is no pacing to protect, because there is nothing to compare. The builder's
current behaviour stands.

**Fogging needs nothing.** Fog past a switch is unexplored ground, not a statement about the gates.

**`witnessDoor` becomes `lightbeamSwitch`.** It is already a beam-and-mirrors switch board; what it
lacks is reading the fork's real exits instead of hardcoded east and north. It moves into the
lightbeam mod, and the work on this branch carries over rather than being rewritten.

**The lightbeam mod owns two families, not one family with two roles.** `lightbeam` is the corridor
puzzle and stays in the generic pool; `lightbeamSwitch` is the fork board, stays out of the pool and
is `reEnterable`. They share the board, the mirrors and the rules voice, and not the generator —
which was already the reason for splitting them. Two families keep pool membership and re-enterability
per-family facts rather than per-room ones.

## Open questions the owner has not answered

- **What "playtested" means** for a release carrying six mechanics. Parked until the sixth feature
  lands.

## What comes next, in order

1. **Task 5** — the authoring, proved in spec. Done: `src/worldGen/switchForkAuthoring.spec.ts` walks
   a spec-local rule from the DSL through `constraintResolver`, `buildSite` and `assembleFloor` to the
   gated exits, and each assertion was proved red by mutating the link it covers rather than argued.

   **The trap for whoever un-reduces it.** Only the `.pyramid(n).floor(k, …)` chain is read. The
   scope-level builders — `global().floor()`, `tier(t).floor()`, `journey(j).floor()` — emit rules
   whose only consumer, `resolveFloorConstraint`, is called nowhere but its own spec. A `switchFork`
   authored that way is silently inert. Pre-existing and field-agnostic; every shipped spec file
   happens to use the chain that works.

2. **The solvability slice.** Reachability answers "can this be got to", never "is there enough of
   it" — and that gap is what let a junior mosaic piece become unobtainable while every check stayed
   green. The cheap version is a sum, and the owner settled what the sum counts:

   - **A collection is loot, not a lock.** A piece counts if it is reachable at _any_ point in time,
     so a hidden pocket counts and so does a branch behind an authored key. That is the design doc's
     permissive bracket, and it is the right question for a register: _is every piece ever
     obtainable?_
   - **A lock is the stricter case and is already held** — an opener must be reachable _before_ its
     blocker.
   - **A collection's target is per bucket, never one total.** Mosaic is not 252 pieces; it is a set
     per difficulty tier. A global sum would pass while junior ran short and wizard ran over.

   Measured on the shipped world before building: 252 placed against a target of 252 — **zero slack**,
   so any unreachable piece breaks the register — with 53 in hidden pockets and 2 behind the witness
   door's gates. Mosaic is the only capped currency, so it is the only customer.

   **The register's other unheld rule — that an authored gate's key is minted by whoever owns it —
   waits for a consumer.** It guards two gates in the whole world, both the witness door's, both
   already pinned by hand at `configBuilder.integration.spec.ts:125`, and the ruling above deletes
   that shape: once a switch fork mints its own gates, the assembler writes gate and key from one
   expression and a mismatch is unrepresentable rather than unchecked. `sequenceLock` is the first
   feature to author a door key by hand. It lands there.

3. **`lightbeamSwitch`** — the lightbeam mod's second family, sharing everything but the generator. The
   corridor generator reasons about _the_ shrine throughout its route search, uniqueness check and
   technique ladder, so a switch board is a different construction rather than the same one with a
   number changed. Seeded by fork shape and rotated to fit, because there are only four fork shapes up
   to rotation.
4. **The feature registry** — deferred while there was one feature and a guess. With all six coming it
   is worth building, and with two real features to generalise from rather than one.
5. **The remaining features**, then free-order journeys with cosmic dust, then the story layer.

## How this work goes best

**Dispatch narrow.** Three agents stalled carrying a full-suite-plus-world-generation tail. The one
told to make the edits and run four targeted specs finished cleanly, and the heavy checks — full
suite, `generate-world`, `validate-world`, `betterer` — take about three minutes to run from the
controlling session. Split it that way.

**"The world did not move" means the assembled-grid fingerprint**, not a byte-identical
`generatedWorld.ts`. The stored file holds configs; the damage lives in the grids. A change that
rewrote ~150 rooms passed the byte-identical check.

**Measure before arguing.** The most valuable findings in this slice all came from someone assembling
a few hundred floors and counting: a check that fired on zero of them, another that fired on 61 of
206, a guard whose branch was unreachable. Three separate claims that sounded right were wrong, and
two of those were mine.

**A test that cannot fail is the recurring defect here.** A loop that skips on failure and asserts
nothing; a test deriving its expectation from the code it tests; a spec path that does not exist,
which vitest skips silently while printing a pass. Ask of every new test what would make it go red.
