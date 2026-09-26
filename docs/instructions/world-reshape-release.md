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

| Change                                                         | Why it cannot be split off                                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| The `siteAssembler` shuffles                                   | The reshape itself                                                                                            |
| Exploration read switched to slots, keyed by authoring address | **Already shipped.** Reading coordinates against moved floors is the bug this whole migration exists to avoid |

The constraint is **asymmetric**. Shipping the read switch without the reshape is harmless — slots
describe the current carve perfectly well, which is why it went first. Shipping the reshape without the
read switch restores saved coordinates onto floors that have moved, which marks rooms explored that were
never opened, including ones holding keys.

**The read does not fall back to coordinates, or to the hash.** A save carrying no slots gets no exploration. The
fallback would fire precisely for the players the migration missed — the ones who skipped the capture
release — and give them the mis-restore instead of a clean slate.

---

## Why the slots still fit after the reshape

Nothing in a save's identity is read off the carve any more. A section is named by its **authoring
address** (`main`, `s0`, `s0.1`) and a room by its **slot** (`p2`, `xtreasure-chest`, `stair:s1`) — both
of which come from the authored spec, so they are still valid keys after every floor has moved.

**The structural hash is deliberately NOT the identity, and this release is why.** It covers the floor's
own `packing` and `corridorStraightness`. If the compaction pass turns either — and turning them is the
obvious way to compact — every hash in the world moves at once and every run resets. Keying by address
is what makes the reshape survivable; if you find yourself reaching for `sectionHash` to decide whether
something is the same place, that is the bug.

**Do not reach for the ordinal here.** `cell.ordinal` is the step along the CARVED walk, and the carve
decides how many steps that is: re-carving one expert floor at a neighbouring seed took it from 685
cells to 668 and renumbered everything past the first divergence. An ordinal survives a re-shuffle, not
a re-length, and a compaction is a re-length. `cellIdentity.ts` carries the measurements.

Corridors and forks have no authored identity at all, so their keys DO go stale — by design. Their fog
is rebuilt from the high-water mark of the rooms instead, which is the one thing about a corridor that
outlives the carve. A section whose rooms genuinely change is caught by its hash moving: the entries are
skipped and it reads as unexplored rather than as a lie. See `docs/game-design/world-stability.md`.

---

## What else the reshape drags with it

Layout decides these, so they are regenerated in the same release, not assumed:

- **Board dealing.** Room counts per bucket shift, so seed lists can fall short of the rooms that draw
  from them. Re-run `yarn generate-seeds`, then `yarn verify-seeds`.
- **The world's own validity.** `yarn validate-world`, and the full floor sweep in
  `worldFloorAssembly.verify.ts` — including the sweep that builds every board, which is the only thing
  that catches a room whose generator throws on open.

---

## What happens to a save that skipped the capture release

**It is thrown away, deliberately, and in full.** Decided 2026-09-16.

A player who never launched the capture release arrives here with coordinates and no current
`cellKeyVersion`. Re-keying them now would translate those coordinates against the RESHAPED carve —
the original bug, arriving through the migration's own front door. So the reshape release does not try:

1. Delete `exploredSections`, `position`, `sectionHash`, `legacySectionHash`, the re-key
   (`migrateJourneyToCarveIndependent`) and the hook that runs it. The archive only means anything
   while the carve it was written against is still the one the code produces; the moment the floors
   move it is garbage. Repoint `floorExploration.ts` to `sectionAddress` first — it is the last
   non-migration reader of the hash.
2. On launch, **any save not carrying the current `cellKeyVersion` is reset in full** — journeys,
   `pyramid-scheme-progression-v4`, `inventory-v2`, `levelAnswers`, `puzzleState`. Not a storage-version
   bump: that resets everyone, including the players this whole migration exists to protect. It is
   per-save, and the stamp is what decides.

`cellKeyVersion` outlives the re-key it was built for: after this release nothing re-keys anything, but
the stamp is still the exact record of which saves came through, which is what the reset reads. Every
save carries it — journeys with nothing explored are stamped too, precisely so "has not walked into a
pyramid yet" cannot read as "never migrated".

**Why a full reset rather than a partial restore.** A partial restore is what opens the loot hole
below: sections reset while progression is kept, so a per-tomb map-piece count and a money balance are
collected twice. A full reset keeps nothing, so nothing is collected twice — the player re-earns from
zero. The loot that would actually hurt to duplicate is idempotent anyway (fragments are `id:index`,
tomb keys are ids), so it cannot double even by accident.

**Why this is acceptable at all.** The game is in alpha and says so on the first screen. The players
who lose something here are the ones who tried it once and stopped. The ones who play daily will have
launched the capture release within a week of it shipping, and keep everything.

---

## The loot hole — no longer this release's problem, still a problem

Fragments (`id:index`) and tomb keys are idempotent and survive any reset. **Map pieces are a per-tomb
count and money is a balance**, so both can be collected twice by a section that resets while the
player's progression is kept.

**The reshape no longer triggers it.** A save that comes across keeps everything — no section resets,
because the identity is authored and the authoring has not moved. A save that does not come across is
reset in full, progression included, so it re-earns from zero rather than collecting anything twice.

It remains open for ordinary re-authoring, which is where it actually bites: relabel a path, or take a
section out and put one back, and that section's chests are new ground again while the money already
banked stays banked. Keying both to the reward's identity, the way fragments already are, is still the
fix — it is just no longer gated on this release.

---

## Before starting

The capture release has to have been live long enough for players to have launched it once — a launch
is all the re-keying needs. **A week is the agreed wait**, on the basis that the players worth
protecting play daily; there is no telemetry for it and none is being built, because the failure mode
for everyone else is a clean start rather than a corrupted one.

Once the reshape ships, `exploredSections` and `position` have done their job as the archive the
re-keying reads, and both go — along with the ability to re-key at all. Until then they are what makes
a change to the key format cost one launch instead of a player's run; it has already paid for itself
twice, at `cellKeyVersion` 2 and 3. After the reshape, a further change to the key format costs a
reset, and that is the accepted trade.
