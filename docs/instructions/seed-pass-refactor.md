# Seed pass — planned refactor: seeds that stand on their own

**Status: planned, not built.** Agreed 2026-08-28. The current pass
(`scripts/puzzleSeeds.ts`) works and is resumable, batched and verifiable as of that date; this document is
the next step, which changes how a run decides a seed COUNTS. Read `docs/instructions/puzzle-screens.md`
§6.1 first — it is the contract the artifact serves.

## 1. Why

The pass cuts the seed space into fixed ascending windows of `CHUNK` seeds and gives each bucket only its
**retired prefix**: windows 0..k that have all come back. A find in window 9 is worth nothing until 0–8
land.

That rule buys one thing — **a reproducible artifact**. Same code, same dials, byte-identical list on any
machine, whatever the thread count. It was written down deliberately (`findSeeds`'s own comment).

It costs more than it buys once a family's generator has to SEARCH for a board. Rush hour's climbs: at 500
seeds a window that was six minutes of work per window, ten threads all sat on the most expensive bucket,
and one interrupted run threw away 260 CPU-minutes because no prefix had retired. The mitigations already in
place (128-seed windows, round-robin task order, checkpoint on fill/16 seeds/2 minutes, resume above the
highest seed a bucket holds) are all working around the prefix rule rather than removing it.

**The model to adopt is block-sort's** (`~/projects/personal/block-sorting/src/modules/SeedGenerator/`),
where every seed stands on its own: a worker produces candidates from its own start offset, the main thread
verifies each and appends it, order is irrelevant, duplicates are filtered and excess is trimmed. Nothing
waits for anything.

## 2. What changes

- **Drop the window/prefix bookkeeping.** `Bucket.byChunk` and `retired()` go. A bucket is an array of
  found seeds plus its target.
- **A task becomes "produce candidates from offset X"** rather than "test seeds X..X+127". Workers keep
  producing until told to stop; the main thread counts what it has and stops the pool when every bucket is
  satisfied or the batch is spent.
- **A find counts the moment it lands**, so the checkpoint logic already in place (fill / N seeds / minutes)
  needs no ordering caveat.
- **Resume needs no trick.** Today a bucket resumes above the highest seed it holds, which is only sound
  because windows are ascending. With standalone seeds, a run simply appends to what is on disk, and
  `Bucket.resumeFrom` disappears.

## 3. What to keep from the current design

- **Determinism where it is free.** Derive each worker's start offset from a fixed constant and its index
  (`START + index * STRIDE`), never `Math.random` — block-sort uses randomness here and does not need
  reproducibility. Sort seeds before writing. A full one-shot regeneration is then still reproducible; a
  resumed or interrupted run may hold a different valid set, and that difference shows up in the diff
  rather than hiding.
- **Coverage is the invariant, not the contents.** `src/mods/puzzleSeeds.spec.ts` checks that every bucket
  the baked world asks for clears its floor and that a room builds from the list. It never asserts specific
  seeds — which is what makes this change safe.
- **The floor/target split** (`seedFloor` vs `seedTarget`), the unwanted-hash drop, and `--family`,
  `--batch`, `--tries`, `--parallel`, `--rebuild` all stay as they are.
- **`verify`** stays as built: a sample per bucket (`--sample`, `--all` for every entry), and a bucket whose
  sample rots is dropped whole, because what invalidates a listed seed is a change to the generator and that
  breaks the bucket rather than one entry.

## 4. Worth considering while in there

- **Store the grade with the seed.** Block-sort keeps `[seed, moves]`. Here the grade is printed and thrown
  away, so `seeds-info` cannot say how hard a bucket's boards are without rebuilding them. The artifact
  format would change (`Record<string, number[]>` → `Record<string, [number, number][]>` or similar), which
  touches `generatePuzzle`, `boardIndex`, and the spec.
- **A trim step.** Block-sort caps each bucket and slices the excess; here a bucket can only overshoot by
  one window, so this matters less once windows are gone.
- **Progress that shows the expensive bucket.** Block-sort prints a progress bar plus a spinner with a
  try-counter, so a slow bucket looks slow rather than hung. The current `\r` line reports buckets and
  windows scanned; with windows gone it should report seeds found per bucket.

## 5. Acceptance

1. `yarn generate-seeds --rebuild --family=<cheap family>` twice from scratch produces the same artifact.
2. Killing a run mid-bucket and rerunning it fills the bucket without re-earning what it held.
3. `yarn verify-seeds` passes on the result; `yarn vitest run src/mods/puzzleSeeds.spec.ts` passes.
4. Filling rush hour's wizard bucket from empty is one batched command per sitting, and no sitting loses
   work.
