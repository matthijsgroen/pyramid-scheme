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
- **It does not touch the hint**, which re-solves the board from scratch on every request. Measured at 500ms on
  a 20 000-configuration board; the top tier now carries 72 000, and a mid-range phone is several times slower
  single-threaded. So it is plausibly multiple seconds of blocked main thread, per hint, at the top tier — which
  is the strongest argument for the artifact carrying the solve as well as the seed.

## The shape

### The list must pin the attempt, or only admit clean seeds

The subtlety that decides whether the guarantee holds. Generation loops attempts, and **rejection is what
selects which attempt wins** — a seed's board is the first draft that passed the gates, not the first draft.
If play time skips the gates it takes attempt 0, which need not be the attempt that was verified.

Two ways out:

- **Store `(seed, attempt)`** and have play time jump straight to that attempt.
- **Only admit seeds whose attempt 0 passes everything**, and let play time run exactly one attempt with no
  gates at all.

Measured share of seeds clean on attempt 0: **starter 43%, junior 38%, expert 45%, master 58%, wizard 55%.**
So the second option costs about half the candidate seeds, which is free when the compute is offline — and it
is much the simpler contract, because play-time generation becomes a straight line with no loop and no reject
path.

**Recommendation: only admit clean seeds.** The attempt counter is a generation implementation detail and
baking it into shipped data welds the list to the current control flow.

### Ship the solve with the seed

The offline pass has to solve the board to verify it. Throwing that away and re-deriving it on the player's
phone for the first hint is the waste that is easy to miss. The solve is deterministic from the board, so the
artifact should carry the hint sequence too — which removes the _other_ play-time cost for approximately
nothing.

That makes the artifact per entry: **the seed, and the ordered reasons the ladder found.** Both small; both
already computed.

### Where it lives, for twenty families

Harness level, beside the family registry — not inside each mod. The precondition is already universal and
already asserted: every family declares `generate(seed, ctx)` and a technique solver, and every family's spec
already asserts generation is deterministic in its inputs.

So the split is the one `docs/mods/TARGET.md` argues for generally: **core enumerates, verifies and emits;
a mod only declares.** A family that wants in provides its generator, its solver and its configuration set. It
does not learn anything about lists, build steps or artifacts.

The seed space is **bounded**, which is what makes this tractable rather than an unbounded cache: the world is
fixed-seed, so the set of `(family, difficulty, seed)` a player can ever meet is enumerable in advance.

### What the offline pass can afford that play time cannot

The reason this is worth more than its speed, and `futoshiki.md` §10 already makes the argument: an offline
pass is free to be as thorough as we like. Gates that are currently unthinkable become ordinary:

- **Every board demands its cap** — rather than being merely solvable within it, which is all the current gate
  checks.
- **Difficulty grading** by which rungs a board actually needed, which `puzzle-screens.md` §5 names as the
  honest difficulty signal and which nothing currently measures per board.
- **Duration sampling** — how long a board takes a model player, which no family has ever measured.
- **Variety** across a tier's list, so two adjacent rooms are not the same puzzle wearing different pieces.

## Open questions for the session that finalises this

1. **Where do the lists live, and in what form?** Generated TypeScript, JSON in `public/`, or something the
   build inlines. This decides diff noise and bundle size, and it is the question with the most opinions in it.
2. **How many seeds per family per configuration?** Bounded by the world, but the world is regenerated when
   world-gen changes. Does the list cover the current world exactly, or a comfortable surplus?
3. **What happens when the list and the code disagree?** A dial changes, and every seed on the list is now a
   seed for a different board. Fail the build? Fall back to live generation? A checksum over the
   configuration is the obvious guard, and it needs deciding rather than discovering.
4. **Does the dev loop keep live generation?** It has to — the puzzle lab rerolls arbitrary seeds, and a
   designer turning a dial cannot wait for an offline pass. So live generation stays and the list is a
   play-time optimisation, which means **both paths must produce the same board** and something has to assert
   it.
5. **Threading.** Embarrassingly parallel across seeds, so a worker pool over `os.cpus()`. Worth checking
   whether anything in generation is accidentally order-dependent first; it should not be, since every
   generator is seeded and pure.
6. **Is the artifact per configuration or per tier?** A tier draws modes per board, so "the wizard list" and
   "the wizard-with-a-trap list" are different questions.

## What this does not change

Generation stays deterministic and seeded, which is the whole precondition, and nothing about a family's
construction changes. The player-visible behaviour is identical by design: the same board, arrived at without
the search.
