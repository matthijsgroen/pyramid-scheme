# Lock-first carve: the plan

A floor with locks is carved from its locks outward. The lock graph — the drawing the lock-design tool
prints — is laid into real space first; the rest of the floor grows around what is already laid. A
floor without locks has nothing to lay first, so it carves exactly as it does today.

This replaces, for lock floors only, the way they are carved now: a generic floor is carved first (maze,
main path, side paths grown at random), the lock's regions are dealt onto it afterwards, and the result
is checked and thrown away until a seed happens to fit. The designer's doubleBack fits on 1 seed in 300
that way, and only with four side paths authored as ballast. Laid first, it fits by construction.

## The model

```
  [s2 · S2]           [s1 · S1]
      │    ╭╌╌╌╌╌╌╌╌╌╌╯   │
      ■S1:b╎              □S1:a
      │    ╎              │
 [leftLower]        [rightLower]
  ╎   │                   │
  ╎   ■Y                  ■Y
  ╎   ├───────────────────┘
  ▼   │
→ [in · Y]──────────────■S2:b───────────────[out] →
```

1. **Plan.** From the expanded lock (regions, connections and what stands on them, drops, junctions,
   seats) derive what space each part needs: a region is a stretch long enough for what stands in it —
   its mechanic's seat, its barrier doors, its tiles; a connection is a corridor; a fork-switch region is
   one junction cell with one corridor per seam; a drop is a straight run from its launch region to its
   landing region.
2. **Lay.** Embed that plan on the node lattice: the route `entrance → … → exit` and every arm off it.
   The fork's exits ARE the seams, because the seams are the corridors laid out of the junction. A drop's
   two regions are laid next to each other in space because the drop needs it. Nothing is checked
   afterwards; it is placed right or the floor is refused by name (it does not fit at this size → the
   grid grows, and past the ceiling the refusal names what did not fit).
3. **Fill.** The content the floor's side paths carry lands in the corridors already laid, where they are
   long enough to take it. Where they are not, the carve lengthens corridors — whichever lengthening costs
   least — rather than growing new branches for it.
4. **Grow.** The existing carve continues around the laid structure: further side paths (gated ones too)
   go elsewhere, the maze fills the rest — on top of claimed cells it may not change, and never with a
   passage that joins two regions the lock keeps apart.

The drawing the lock-design tool prints is a picture of the topology, not a placement: the carve owes it
the regions, joins and barriers, never which region lies left of which.

**The main path is the whole route.** Locks chained at the top level are laid in sequence, `entrance →
lock1.in … lock1.out → lock2.in … lock2.out → exit`, and the main path runs that entire route, so the exit
lies behind the last `out`. A nested lock is laid inside its host's region and is not on the top-level
sequence.

Today's `carveAgreement` checks (regions joined only where the layout joins them, gate doors between two
regions, drops landing beside their gates) stay on. For a laid floor they can no longer fire; if one
does, it is a bug, not a seed to retry.

## Tasks

Same house rules as `topology-tasks.md`. Acceptance criteria are the brief; a criterion with no test is
not done.

### C1 — The plan of a lock floor

**Acceptance**
1. A pure function turns a floor's expanded locks into a plan: per region its minimum stretch (from what
   stands in it), per connection a corridor with its barriers in order, per fork-switch region one
   junction with its arms, per drop its launch and landing region.
2. The plan of the designer's doubleBack lists exactly the parts the drawing above shows.
3. A floor without locks has no plan.

**Carve moves: no** (nothing consumes it yet).

### C2 — Lay the plan on the lattice

**Acceptance**
1. Every region becomes a stretch of claimed nodes, every connection a corridor between them, in a grid
   of the size the floor asks for.
2. A fork-switch region is one junction cell whose side exits are exactly its seams.
3. A drop is a straight run of the drop's length from a cell of its launch region to a cell of its landing
   region.
4. No two regions touch except where a connection or a drop joins them.
5. Deterministic for a seed. When the plan does not fit, the grid grows; past the ceiling the refusal names
   the part that did not fit.
6. The doubleBack lays on every one of 40 seeds.

**Carve moves: no** (pure, not wired in).

### C3 — The carve grows around a laid floor

**Acceptance**
1. With a plan, the carve starts from the laid structure instead of a maze-first floor: route, arms,
   junction, drops and regions are read from it, not derived.
2. The content of the floor's side paths lands in laid corridors that are long enough; where none is,
   the carve lengthens the corridor whose lengthening costs least, and says which it chose in a test. The
   floor's authored side paths are content, not ballast the lock's arms consume.
3. The main path runs the whole top-level route and the exit lies behind the last `out`.
4. The maze fill never joins two regions the lock keeps apart, and never adds a way round a barrier.
5. Content lands in the regions whose appetite takes it.
6. `carveAgreement` never fires on a laid floor (asserted over every seed tried, not retried).
7. A floor without locks takes today's code path: same draws, same cells.

**Carve moves: YES, lock floors only.** Baseline: every floor's `dirs` before and after — only lock floors
may differ. `generatedWorld.ts` byte-identical for every floor without locks.

### C4 — The doubleBack, playable without ballast

**Acceptance**
1. The designer's doubleBack, authored with no extra side paths, carves on attempt 0 on at least 30 of 40
   seeds, and every carve walks sound.
2. Dev pyramid 2 drops its ballast side paths and its pin is searched afresh.
3. The fork's exits are its seams and the drops land between the gates the drawing shows, on every carve.

**Carve moves: YES** (dev pyramid 2 only).

## What the tests freeze

- Non-lock floors: identical `dirs` for all 215 floors, and a byte-identical serialized world without dev.
- Lock floors: the plan (C1) as data; the laid geometry's invariants (C2 1–4) over every seed; the carve's
  invariants (C3 2–6) over every seed; the doubleBack's rate and soundness (C4).
- Not frozen: exact cell positions of a lock floor. They are the carve's to choose.

## Settled with the designer (2026-10-03)

1. The tool's drawing is topology only; the carve does not follow its placement.
2. Locks first — chained in sequence and nested in their hosts — then the content of side paths goes into
   the corridors that exist; corridors are lengthened only where they cannot take it, the cheapest
   lengthening first.
3. The main path is the whole top-level `in → out` route; the exit lies behind the last `out`.
4. The carve decides every length — regions, corridors, the stretch between barriers. The author never
   counts cells.
