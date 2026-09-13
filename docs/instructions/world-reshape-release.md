# The World Reshape Release

**Apply when picking up the second half of the exploration migration, or when touching
`siteAssembler`'s shuffles.** The first half has shipped; this says what the second must contain, in
what order, and what breaks if it is assembled differently.

---

## The defect being fixed

`siteAssembler` shuffles with `sort(() => rand() - 0.5)` in several places. A comparator that draws
from the seeded stream advances it once per comparison, and **how many comparisons a sort makes is the
engine's choice** — V8 sorts with TimSort, JavaScriptCore with a merge sort, and the count differs
even between V8 versions. The seed is identical everywhere; the number of draws taken from it is not.

So the floors a player walks on an iPhone are not the floors this repository tests. Proven on Valley of
the Kings, pyramid 3: floor 0 assembles differently under another sort. It is also why three exhaustive
sweeps of the world came back clean while a player kept crashing on a room those sweeps never built.

The fix is mechanical — `shuffle()` in `src/game/random.ts` is a proper Fisher–Yates and is immune.
What is not mechanical is the cost: **every floor is carved somewhere else afterwards.**

---

## What must be in the release, and why together

| Change | Why it cannot be split off |
| --- | --- |
| The `siteAssembler` shuffles | The reshape itself |
| Exploration read switched to ordinals | Reading coordinates against moved floors is the bug this whole migration exists to avoid |

The constraint is **asymmetric**. Shipping the read switch without the reshape is harmless — ordinals
describe the current carve perfectly well. Shipping the reshape without the read switch restores saved
coordinates onto floors that have moved, which marks rooms explored that were never opened, including
ones holding keys. So if these are ever split, the read switch goes first. Never the reverse.

**The read must not fall back to coordinates.** A save carrying no ordinals gets no exploration. The
fallback would fire precisely for the players the migration missed — the ones who skipped the capture
release — and give them the mis-restore instead of a clean slate.

---

## Why the ordinals still fit after the reshape

A section hash is computed from the authored spec, not from where the section was carved. That is what
made coordinates unsafe: a section keeps its hash while landing somewhere else entirely. It is also
what makes this migration work — the hash does not move when the carve does, so the ordinals captured
before the reshape are still valid keys after it.

A section whose internal shape genuinely changes is caught by the kind in the key
(`<ordinal>@<kind>`): the kinds disagree, the entry is skipped, and that cell reads as unexplored
rather than as a lie. See `docs/game-design/world-stability.md`.

---

## What else the reshape drags with it

Layout decides these, so they are regenerated in the same release, not assumed:

- **Board dealing.** Room counts per bucket shift, so seed lists can fall short of the rooms that draw
  from them. Re-run `yarn generate-seeds`, then `yarn verify-seeds`.
- **The world's own validity.** `yarn validate-world`, and the full floor sweep in
  `worldFloorAssembly.spec.ts` — including the sweep that builds every board, which is the only thing
  that catches a room whose generator throws on open.

---

## The loot hole, if it is still open

Fragments (`id:index`) and tomb keys are idempotent and survive any reset. **Map pieces are a per-tomb
count and money is a balance**, so both can be collected twice by a section that resets. This is not
caused by the reshape — any legitimately restructured section does it today — but the reshape is the
first change that could reset many sections at once. Key them to the reward's identity, the way
fragments already are, before the reshape ships.

---

## Before starting

The capture release has to have been live long enough for players to have launched it once — a launch
is all the backfill needs. There is no signal for this in the game today; if one is wanted, report how
many saves still lack ordinals.
