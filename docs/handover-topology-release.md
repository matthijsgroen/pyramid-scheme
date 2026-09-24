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

## Open questions the owner has not answered

- **How much of a floor may sit behind one switch?** The builder gated the main path onward in every
  measured seed where that exit was free, so a switch early in a floor can put every later puzzle, the
  goal chest and the exit behind one puzzle's key. A pacing decision, not a correctness one.
- **Fogging.** A switch fogs everything past it until solved, including the ways out it did not close.
  The gates now say something narrower than the fog does.
- **Does `witnessDoor` retire** when lightbeam gains the switch role, or linger as a second family?
- **What "playtested" means** for a release carrying six mechanics.

## What comes next, in order

1. **Task 5** — the authoring, proved in spec.
2. **The solvability slice.** Two rules in the design doc's register are still held by nothing, and
   both are world-shaped: that an authored gate's key is actually minted by whoever owns it, and that
   every collection's target count is _reachable_. Reachability answers "can this be got to", never
   "is there enough of it" — and that gap is what let a junior mosaic piece become unobtainable while
   every check stayed green. The cheap version is a sum. Do this before more features land, not after.
3. **Lightbeam's switch role** — one family, two roles, sharing everything but the generator. The
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
