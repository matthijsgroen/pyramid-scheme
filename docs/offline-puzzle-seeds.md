# Offline puzzle seeds — moving generation off the player's device

**Not built. This is the shape to verify before anyone writes code**, and it is deliberately a plan rather
than a design-doc section: when it ships, the durable parts move into the family docs and
`docs/instructions/puzzle-screens.md`, and this file is deleted (per `docs/instructions/documentation.md`).

The prior art is Block Sort, and the pattern is the owner's: **run generation and the solver offline against
the same seed, prove the pair works, and put the seed on a list.** One list per family per configuration. Play
time then starts from a seed that is guaranteed to produce a working, solvable board. The compute is large,
threaded, and happens on a development machine rather than on a phone.

---

## The problem is not speed, it is that speed has been vetoing design

This is the argument that matters, and it is the one that survives every optimisation.

Twice now a generation-time budget has decided a design question in this repo:

1. **Wizard lost a decoy to it.** §11.13 measured a three-stop mirror fork at 1511ms a board, noted that
   `lightbeamConfig.ts` "already calls 1400ms a trade not worth making", and concluded: _"something has to go,
   and dropping wizard's baseline decoy lands it at 655ms."_ A piece came off the board so the build would fit
   a budget.
2. **Branch depth was capped at 1 for the same reason.** Two turns a branch measured at 8508ms, so the tier
   table asked for one. Nothing about the design wanted one.

Both have since been lifted (§11.21) and the cost accepted, which is what makes this document urgent rather
than interesting: the top tier is now genuinely slow to build on the device that can least afford it.

Neither decision was recorded as a design decision. Both read, in the table, as the shape the family wanted.
That is the failure mode: **the cost of a rejected opportunity is invisible, because the thing that was not
built leaves no measurement behind.** It is the same shape as the world-authorship doom loop — a masked signal
driving the wrong decision, confidently.

A budget is the right instrument for a cost the player pays. It is the wrong instrument for a cost a build
machine could pay instead.

## What it costs today, measured

Generation, per board, mean/worst over 20 seeds a tier:

| family        | starter | junior | expert  | master   | wizard         |
| ------------- | ------- | ------ | ------- | -------- | -------------- |
| lightbeam     | 5/25ms  | 3/11ms | 3/6ms   | 41/165ms | **636/2372ms** |
| futoshiki     | 4/9ms   | 7/12ms | 20/30ms | 27/40ms  | 123/171ms      |
| sumplete      | 1/2ms   | 1/2ms  | 0/2ms   | 1/2ms    | 1/2ms          |
| balance-scale | 0/1ms   | 1/9ms  | 3/13ms  | 2/5ms    | 17/38ms        |

Lightbeam's top tier is measured **after** its generation-time budget was lifted (§11.21), which is what this
document exists to pay for: the dials are what the design wants and the build cost is the consequence. Before
the lift it was 360/1484ms with a smaller board.

One tier of one family is expensive today. That is not the argument for building this — **four families become
twenty**, and the point is that each new family will meet the same veto privately and quietly resolve it the
way the two above were resolved.

### Where the cost actually is, which decides what the list has to carry

On a lightbeam wizard board:

|                                                        | cost                   |
| ------------------------------------------------------ | ---------------------- |
| generation, total                                      | 636ms a board          |
| of which the technique solver, run as a gate           | **~97%**               |
| everything else — route, corridors, traps, uniqueness  | ~16ms                  |
| **one hint**, which is a full solve from a fresh board | **500ms+ (see below)** |

Two consequences:

- **A verified seed removes essentially all of generation** — 636ms to ~16ms — because a board already proven
  does not need re-proving. Play time keeps the construction and drops the gates. That is a ~40x saving at the
  top tier and it grows with every dial the design turns up.
- **It does not touch the hint**, which re-solves the board from scratch on every request — 617.6ms at the top
  tier on a development machine, and a mid-range phone is several times slower single-threaded. That is the
  strongest argument for the artifact carrying the solve as well as the seed, and the section below shows it
  costs about 400 bytes to do so.

## The shape

### The list is keyed by a hash of the generator's own inputs

The one decision everything else falls out of. A bucket key is **not** `family + tier` — it is a hash of the
resolved options object the generator actually receives:

```ts
const configHash = (options: unknown) => hashString(stableStringify(options))
```

This is Block Sort's `settingsHash`, and it is worth stating why it beats the obvious key:

- **It is the drift guard, for free.** Turn a dial in `lightbeamConfig.ts` and the options object changes, so
  the hash changes, so the lookup misses and play time falls back to live generation. There is no version
  number to remember to bump and no checksum to maintain — the key _is_ the checksum. A stale bucket cannot
  silently serve a board that was verified against different dials, because a stale bucket is unreachable.
- **It is exactly as fine-grained as generation is.** Two tiers whose tables coincide share a bucket, which is
  correct rather than wasteful. Star Battle and Twin Stars ship different tables and get different buckets
  from one generator; if a future family's `expert` and `master` collapse to the same options, they get one
  list, and nobody has to notice.
- **It ignores what generation ignores.** `theme` picks a skin and never reaches the generator, so it must not
  reach the key. `variant` does reach it, through the options. Normalising by "what the generator is handed"
  gets both right without a hand-maintained include/exclude list.

### What a family declares, and the three things that have to be true first

Core enumerates, verifies and emits; a mod only declares. The declaration is one optional field on
`FamilyMeta` — functions on `FamilyMeta` are already the established pattern, since `resolveKeyRequirements`
is one:

```ts
export type SeedableFamily<Options, Puzzle> = {
  /** ctx -> the options object generate() is handed. Pure, no RNG. Its hash is the bucket key. */
  resolveOptions: (ctx: FamilyContext) => Options
  generate: (seed: number, options: Options, attempts?: number) => Puzzle
  /** The generator's own acceptance gate, exported. null means this board would have been rejected. */
  grade: (puzzle: Puzzle, options: Options) => Grade | null
}
```

Three preconditions, each a small mechanical change, and each load-bearing:

1. **`resolveOptions` has to exist separately from `generate`.** Today the two are fused in the plugin —
   `generate: (seed, ctx) => generateStarBattle(seed, STAR_BATTLE_CONFIG[ctx.difficulty ?? "starter"])`. Split
   the table lookup out into `<family>Config.ts` beside the table it reads. It is a two-line move per family
   and it is what lets a React-free build script compute the same key the app will.
2. **`generate` takes an attempt cap.** Today the cap is a module constant (`MAX_ATTEMPTS`, 400 to 20 000
   depending on family). It becomes a parameter defaulting to that constant, so the offline pass and play time
   can both ask for exactly one attempt.
3. **`grade` has to be the generator's own gate, extracted — not a second implementation of it.** This is the
   subtle one. Star Battle, Constellation and Eclipse return a **nearest-miss board** when no attempt hits the
   tier's required rungs, so "did it throw" is not a usable test of acceptance. If the offline pass graded with
   a reimplementation that drifted from the generator's internal `settles()`, it could admit a seed the
   generator itself would have rejected, and play time would hand the player the fallback board. Export the
   predicate the generator already calls, and both sides are the same code by construction.

### Only seeds clean on the first attempt get on the list

Keeping the existing recommendation, but it needs re-checking against families that did not exist when it was
written, because they use a different RNG shape.

Sumplete, Balance Scale, Futoshiki and Lightbeam reseed per attempt (`mulberry32(seed * 7919 + attempt)`), so
attempts are independent streams. Star Battle, Constellation and Eclipse build **one** stream outside the loop,
so attempt _N_ depends on every draw made before it. That kills the `(seed, attempt)` option outright — you
cannot jump to an attempt on those families without replaying the ones before it — and it leaves
**clean-on-first-attempt** as the only contract that works for both shapes. Which is fine, because
"run the loop body once" is well-defined and identical under either shape.

What changes is the yield, not the contract. Star Battle at wizard reports roughly one draw in a hundred
solvable and `spanning` firing on two boards in five, so the clean-on-first rate there is well under 1% —
against the 43–58% the doc measured on Lightbeam. That is affordable, and the reason is worth being precise
about: **the work is the same work.** A full `generateStarBattle` call at wizard already grinds through those
same hundreds of rejected attempts to return one board; the offline pass does the identical grinding, just
spread across hundreds of one-attempt calls instead of inside one. It costs nothing extra to insist the
survivor be attempt zero.

### An entry is a seed, and nothing else

This is where I would depart from the plan above, and it is a bundle-size argument rather than a
disagreement about the measurements.

An entry that is a bare integer costs about ten bytes. With 58 reachable configurations today and a cap in the
low hundreds per bucket, the whole artifact lands in the tens of kilobytes. Shipping the ordered reasons
alongside it, at the measured ~400 bytes a board, puts the same artifact near a megabyte — three times
`generatedWorld.ts`, which is 328KB and is the largest thing in the bundle today. That is a real cost paid by
every player on every load.

Against it: the solve is already amortised to once per board at play time, so the actual saving is ~800ms,
once, on a top-tier board, behind a deliberate hint tap where a spinner is an honest thing to show — and it is
~2ms at the three tiers that hold most of the world. The seed alone already removes 97% of the problem this
document was written about, because 97% of generation _is_ the solver run as a gate.

So: **ship seeds, measure, and revisit hints as their own question with their own numbers.** The format should
leave the door open rather than walk through it now — `type SeedEntry = number | [seed: number, ...extra]`
costs nothing today and does not have to be redesigned later.

The grade is still computed — every admitted seed is solved and graded during verification. It goes in the
CLI's report, where a designer tuning a tier reads it, rather than in the shipped artifact, where nothing at
play time would read it.

### Play time indexes the bucket with the seed it already has

```ts
seeds[hashString(journeyId + edgeId) % seeds.length]
```

A room's seed today is `hashString(journeyId + edgeId)`, computed in `useEncounter`. It keeps being computed
exactly as it is; it just stops being fed to the generator and starts being an index into the bucket. No new
state, no new persistence, and every property the current scheme has — deterministic per room, stable across
sessions, stable across saves — survives untouched.

**This is what makes the whole thing tractable, and it is a simplification over the framing above.** The doc
argues the seed space is bounded because the world is fixed-seed, so the set of `(family, difficulty, seed)`
a player can meet is enumerable. It does not need to be. Once the room hash is an _index_, the offline pass
never has to know which rooms exist or where they sit — only which **configurations** exist. Floor assembly,
maze layout, and regenerating the world all stop being able to invalidate the list. The thing most likely to
have gone wrong later is designed out.

A miss — no bucket, or an empty one — falls through to live generation with the full attempt loop, i.e.
precisely today's behaviour. That is the dev loop answered: the puzzle lab rerolls arbitrary seeds and a
designer turning a dial gets a bucket miss and a live board, with no build step in the way. Both paths run the
same generator on the same options, so "both paths produce the same board" is true by construction rather than
by assertion.

All of this is one core helper. The family plugins get smaller, not bigger.

### Enumeration walks the baked world

Block Sort cross-products 21 producers × 11 difficulties and then dedupes. Here the world is already baked and
finite, so the reachable set can be read rather than guessed: walk `generatedWorldConfigs`, and for every floor
build the same context the app would and resolve the same options. Today that yields **58 distinct
(family, floor difficulty) pairs** across ~2023 encounter rooms — the honest target, with nothing spent on the
tier tables families fill in for tiers no room ever reaches.

It also sizes the buckets for free: **the target seed count for a bucket is the number of rooms that land in
it**, capped so a hot bucket cannot dominate the artifact. No hand-maintained per-tier count table, and it
re-tunes itself when the world changes.

One prerequisite: the ctx-from-cell derivation currently lives inside `useEncounter`'s `useMemo`. It is already
a pure object build, so it extracts to a plain function that both the hook and the script call. Worth doing on
its own merits.

Note while enumerating that `RoomCell` carries no difficulty of its own — every room generates at its
_floor's_ tier, including rooms in side sections authored at a different tier. That is existing behaviour and
not this document's to change, but the enumeration has to mirror it exactly or it will fill buckets nobody
visits and miss buckets everybody does.

### Threading, and the build step that is not needed

Embarrassingly parallel across seeds. Each `generate` call builds its own `mulberry32` internally, so there is
no shared stream and no order dependence between seeds — the within-call ordering that the single-stream
families rely on stays inside one call, on one thread.

One **pull-based** pool over `os.cpus().length - 2`, with the `task` / `result` / `idle` / `shutdown` protocol —
a worker announces itself idle on boot and after every result, and the main thread either hands it the next
task or tells it to shut down. Block Sort ended up with two pools, a `workerData`-driven fire-and-forget one
for generation and a proper queue for verification; only the second shape is worth copying. It load-balances
naturally, which matters more here than there because clean-seed yield varies by two orders of magnitude
between buckets.

Block Sort needs a Rollup config to bundle its workers because TypeScript will not load in a worker thread.
That step is avoidable — a worker booted from a three-line `eval` shim registers the `tsx` loader and then
imports the real `.ts` entry, `@/` path aliases and all:

```ts
const boot = `import("tsx/esm/api").then(t => { t.register(); return import(${JSON.stringify(target)}) })`
new Worker(boot, { eval: true, workerData })
```

Verified against this repo's domain layer. No bundler, no build artifact, nothing to gitignore.

### Where it lands, and what fails the build

`src/data/puzzleSeeds.ts`, following the `generatedWorld.ts` precedent exactly: generated by a script, one
`JSON.parse` of a single string (cheaper to parse than an object literal), keys sorted, Prettier'd on the way
out. At tens of kilobytes it is a plain static import — Block Sort code-splits its 210KB seed file, and at this
size that machinery would not earn itself.

```ts
export type SeedEntry = number | [seed: number, ...extra: unknown[]]
export const puzzleSeeds: Record<string, SeedEntry[]> = JSON.parse('{"21655753":[212043153,884201], ...}')
```

**The runtime never fails on a missing bucket — CI does.** A `yarn verify-seeds` step enumerates the reachable
configurations, asserts each has a non-empty bucket, and samples entries to confirm they still generate a
graded board on attempt one. It fails with the bucket, the family and the tier, and the command to run. Play
time meanwhile always falls back silently, so a work-in-progress branch is never bricked by a list that has not
caught up with a dial.

The CLI is `scripts/puzzleSeeds.ts` with `generate`, `verify`, `info` and `trim`, following the existing
`scripts/generateWorld.ts` conventions. `info` is where the offline pass's grades surface.

## What the offline pass can afford that play time cannot

The reason this is worth more than its speed, and `futoshiki.md` §10 already makes the argument: an offline
pass is free to be as thorough as we like. Gates that are currently unthinkable become ordinary:

- **Every board demands its cap** — rather than being merely solvable within it, which is all the current gate
  checks.
- **Difficulty grading** by which rungs a board actually needed, which `puzzle-screens.md` §5 names as the
  honest difficulty signal and which nothing currently measures per board. Both solvers already return
  `{ steps, deepest }` and both callers already throw it away.
- **Duration sampling** — how long a board takes a model player, which no family has ever measured, and which
  §3.2 of `PUZZLE_FAMILIES.md` needs in order to say anything about the solve-time budget.
- **Variety** across a tier's list, so two adjacent rooms are not the same puzzle wearing different pieces.

None of these are needed for the first cut. All of them become one-line additions to a pass that is already
solving and grading every candidate — which is the argument for building the pass before anyone needs them.

## Build order

Smallest thing that proves the shape, then breadth:

1. The three preconditions on **one** family — Sumplete, because it is the cheapest to iterate against and its
   1ms generation means a bug shows up as a wrong board rather than a slow one.
2. `configHash`, the bucket lookup, and the live-generation fallback, wired through the core helper. At this
   point the artifact can be an empty object and nothing has changed for the player.
3. The CLI with `generate` single-threaded, over Sumplete only. Prove a seed round-trips: offline-graded board
   equals play-time board, byte for byte.
4. The worker pool.
5. The remaining families, one preconditions-commit each. Lightbeam and Star Battle last — they are the ones
   that pay for the work, and the ones most likely to surface a wrinkle in `grade`.
6. `verify` in CI.

## What this does not change

Generation stays deterministic and seeded, which is the whole precondition, and nothing about a family's
construction changes. The player-visible behaviour is identical by design: the same board, arrived at without
the search.
