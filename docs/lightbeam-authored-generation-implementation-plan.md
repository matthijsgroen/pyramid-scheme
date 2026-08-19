# Lightbeam — authored generation, implementation plan

Everything a fresh context needs **beyond** the design doc. The design is deliberately not repeated here:
it lives in `docs/game-design/puzzles/lightbeam.md`, and duplicating it is how the two drift apart.

**Delete this file in the commit that ships the authored generator**, per `docs/instructions/documentation.md`
— and extract anything durable into the design doc first. The permanent record is the design doc and git
history.

---

## Read these, in this order, before touching anything

1. **§11.14 — where drafts actually die.** The measurement that motivates the whole thing.
2. **§11.15 — can authored branches carry uniqueness alone?** The answer is no, the counterexample board is
   there, and the rule that fixes it is there. **This is the section that decides the architecture.**
3. **§11.8 rule 2 and rule 6** — the two geometric constraints every authored stop list must satisfy.
4. **§5 and §6.4** — route-then-obstruct as it stands, and the vocabulary ladder the tiers are cut on.
5. `docs/instructions/puzzle-screens.md` **§5** — the house rule. A generated puzzle must be reachable by
   deduction alone. That is not negotiable and it is not this doc's to revisit.

**Do not read §11.3–§11.7 as instructions.** They are the record of how the mirror design was reached and
contain four recommendations later disproven; the corrections arrive after the claims.

---

## What is being built, in one paragraph

A second route builder that **authors the maze** instead of deriving wrong rays and walling them. Lay a
golden path from disc to shrine (cheap, cannot fail). Then, for every stop a golden mirror is _not_ set to,
build a corridor: choose where it goes, place its mirrors, terminate it in stone or at the frame. Emit the
same `LightbeamPuzzleData`, so the board, the solver, the hints and every existing gate keep working
untouched. It coexists with the current generator behind a dial rather than replacing it.

### The correctness rule, which is the whole risk

A branch may not share a `(cell, direction)` pair with the golden path, and may not reach the shrine. **And
that is not sufficient on its own** — §11.15 has a 5×5 board where all four single-piece deviations die and a
three-piece configuration wins by a second path. The sufficient rule:

> While authoring a branch, if it enters a cell any **tappable** piece can occupy, **recurse**: author every
> stop of that piece and require every continuation to die as well.

The §11.15 board is the regression test. A generator that can produce its shape is wrong.

---

## The knobs

| Knob               | Meaning                                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `size`             | grid width                                                                                                                                                                      |
| `turns`            | bends on the golden path                                                                                                                                                        |
| `legBudget`        | leg length range, as today                                                                                                                                                      |
| `angles`           | **the angle alphabet this tier may use.** Subsumes `cutMirrors` and `mirrorStops`: a tier that only has the two diagonals cannot bend diagonally and cannot fork past two stops |
| `crossings`        | golden path folds through its own line this many times                                                                                                                          |
| `interactive`      | **0..1, the share of mirrors that are the player's to tap.** Built. A density dial, not a difficulty one (§11.17)                                                               |
| `forkSize`         | stops per tappable mirror                                                                                                                                                       |
| `sliders`          | golden bends that slide rather than turn. Built — the cheapest fork, and what needed the occupancy model                                                                        |
| `branchDepth`      | turns per authored branch; 0 is a straight run to stone or the frame. Built, and it is what makes the cap bite                                                                  |
| `terminator`       | weights over frame / wall / shadow as a branch's ending                                                                                                                         |
| `modes`            | weights over wall-heavy, slider-heavy, switch-heavy — **these replace the goal pool**. All three built                                                                          |
| `shrineApproaches` | how many ways into the shrine stay alive. 1 lets `exitRun` fire; 2–3 silences it and moves the work to the exhaustive rungs                                                     |

### `interactive` is the knob that chooses the architecture, per tier

It looks cosmetic and is not. A **given** mirror costs a cell and reads as scenery; it contributes nothing to
the configuration space, and a branch may pass through it freely because its face is fixed, so
`(cell, direction)` still determines the future. A **tappable** mirror is the opposite on all three counts —
and every branch that touches one triggers the recursion above.

So `interactive` is a continuous dial between the two options §11.15 weighs, chosen per tier rather than once
for the codebase:

- **low** → branches are made of givens and cannot interact, uniqueness is nearly trivial, and the board
  fills with scenery. The fixed count grows as `mirrors × forkSize × branchDepth` while the tappable count
  stays at the golden path's, so three-stop forks with one turn a branch put two static mirrors on the board
  for every live one.
- **high** → branches reuse the pieces already on the board (a golden mirror's back face, a slider's vacated
  cell), the board stays dense and interactive, and the recursion does real work.

It is therefore also the **main lever on generation cost**, because it drives both the configuration space
and the recursion depth at once. Tune it before tuning anything else.

Enforce a floor regardless of the weight: **at least three tappable pieces**, which is where
`openingIsHonest` already puts the family's floor (§5, and the starter tier's comment explains why).

---

## Phases

Each phase ends green on `yarn check-types`, `yarn lint`, `yarn vitest run`, and with its measurement
recorded in the design doc as a §11.n section.

### Phase 1 — golden path plus straight branches

No reuse, no modes, no branch depth. Branches run straight from the wrong stop to stone or off the frame.
`interactive` at 1.0 (every mirror tappable), `forkSize` 2.

**Proves the architecture.** Run it through the **existing** gates, unchanged, and record:

- attempts a board, via `LightbeamOptions.reject` (already built — see §11.14)
- `routeIsUnique` pass rate and `solveLightbeamByTechniques` pass rate
- worst generation, cells occupied, pieces a board

Also **expose the dial in `PuzzleLab`** (`src/app/dev/PuzzleLab.tsx`, per `puzzle-screens.md` §6). Every
number in the bar below is quantitative and none of it says whether the boards are _good_, which is the whole
reason for the rework — so phase 1 ends with the authored boards playable, not only measured.

**Acceptance:** ~1 attempt a board, and the two gates passing at 100%. If uniqueness fails here, the
construction is wrong and no later phase matters.

This phase alone answers the deferred question — _can authoring carry the guarantees?_ — because the pass
rate **is** the answer. 100% over a few thousand boards is evidence; anything less hands you the
counterexamples.

**Done, and the answer is yes** — `generateAuthoredLightbeam.ts`, measured in §11.16. Over 2 000 boards:
1.00–1.30 attempts a board, `routeIsUnique` and `solveLightbeamByTechniques` at 100%, and `noRoute` never
fired once (against 92–97% of all rejections on the other generator). An independent check found exactly one
configuration lighting the shrine on every board, no branch sharing a golden `(cell, direction)` pair, and no
branch entering a tappable cell. The current generator's 200 boards are byte-identical, verified on every
commit; no tier draws the authored generator, and the lab reaches it through `FamilyMeta.variants`.

**What phase 1 did NOT buy, and it is now the main thing outstanding.** Every authored board at every tier
settles at cap `deadEnd` — 1 000 of 1 000 — while the shipped generator needs more than `deadEnd` on 18% of
expert, 48% of master and 75% of wizard boards. The configuration space is 64 at wizard against 37 350. With
every mirror tappable, two stops a piece and no reuse, **nothing stands in a wrong ray**, so the technique cap
is decorative and every tier solves the same way. That is §6.1's finding from the other direction, and it is
what phases 2 and 3 have to close — the guarantees came free, the difficulty did not.

### Phase 2 — branch depth, reuse, and the recursion

Branches may turn, and may pass through cells tappable pieces occupy. Implement the recursion. `interactive`
becomes meaningful here.

**Proves the correctness rule.** The §11.15 board is the regression test. Also measure how often a branch
meets a tappable cell — expected to be **common**, not rare, since an authoring generator aims branches at
interesting territory on purpose (§11.15 explains why the 1-in-949 figure is a floor).

**Acceptance:** uniqueness still 100%, and the recursion's cost measured against `routeIsUnique`'s. The claim
to test is that the reachable deviation tree is cheaper than the full product — wizard's product is 37 350
configurations today.

Phase 1 leaves the hook for it in one place: `NO_REUSE` in `generateAuthoredLightbeam.ts` is the constant that
makes a branch refuse a tappable cell, and `closeBranch` is where the recursion replaces that refusal. The
determinism key is still `(cell, direction)` and nothing has been keyed on anything narrower, so phase 3's
`(cell, direction, firedSet)` remains a widening rather than a rewrite. The 692 walls above are the measure of
how much board density the refusal is currently costing.

**Done, and the correctness rule holds** — measured in §11.17. Over 2 800 boards uniqueness stayed at 100%, and
the reachable deviation tree agreed with `routeIsUnique` on every board. §11.15's counterexample is in the spec
and the gate reports its two routes at exactly one reuse fan-out. The tree costs **0.04ms against the gate's
38.38ms** on the most expensive dials tried, a factor of about 960, and the ratio in walk steps grows with the
configuration space — 13x with straight branches, 143x at one turn, 836x at two — because a dead beam's
downstream settings are never enumerated.

**Two things it found that the plan did not predict.**

1. **Reuse is manufactured by branch depth, not found by aiming.** With straight branches, not one branch in
   1 000 boards entered a tappable cell — the refusal phase 1 relied on was costing nothing, and §11.15's
   1-in-949 floor was effectively zero on that construction. One turn a branch takes it to 4.7 fan-outs a
   board, and the mechanism is that **a branch that turns needs a mirror, and that mirror is another piece for
   some other branch to walk into.**
2. **The cap now bites, and that closes phase 1's open item.** A branch mirror is off the golden path by
   construction, so it is a decoy, and a shadow where it stands in a wrong ray — which §6.1 measured as the
   only thing that stops every board being a chain of `deadEnd` eliminations. Boards needing more than
   `deadEnd` went from **0 of 400 to 400 of 400**, with `onlySurvivor` firing on 267. The reverse is a hard
   constraint for phase 4: **a tier capped at `deadEnd` cannot carry a branch mirror at all** — starter's dials
   with one turn fail `notSettled` on every attempt of every seed.

**And it moves the bottleneck rather than removing it.** Generation on the two-turn board is 98.97ms and
`solveLightbeamByTechniques` is 97.65ms of it: the uniqueness gate is free and the exhaustive rung is now the
whole cost, because `onlySurvivor` enumerates exactly the product the tree learned to avoid. §11.14's honest
target was `buildRoute`, then the uniqueness gate, and now it is `onlySurvivor` — and the same trick applies.

### Phase 3 — the three modes

Weights, combinable, per the owner's sketch:

- **wall-heavy** — prefer wall terminators; on a diagonal leg, place a _pair_ of walls the beam visibly
  passes between, which is §11.8 rule 4's corner slip used as a feature rather than a rule to learn.
- **slider-heavy** — prefer sliders on the golden path. Cheapest fork in the family: a slider's wrong setting
  is usually _"as if the piece were not there"_, so the branch is the beam's own line continuing and needs no
  authored corridor at all.
- **switch-heavy** — doors and sockets, and §11.1's traps, which this architecture is what makes buildable.
  Follow §11.1's recipe rather than decorating a wrong ray: author a branch that **reaches the shrine**, then
  put the socket on it and the stone further along. Assert the load-bearing property directly — remove the
  trap and the board must stop being a puzzle. Generalise the key to `(cell, direction, firedSet)` here.

**Proves variance.** Measure that the three produce measurably different boards (piece mix, branch shape,
rungs demanded) rather than three names for the same board.

**Done, and they are different boards** — measured in §11.18. Over 200 seeds a case against identical dials:
wall-heavy takes stone from 1.80 to 10.76 a board and branches-into-stone from 447 to 959 of 1 200;
slider-heavy puts 2.00 sliding pieces on and drops the configuration space from 959 to 724; switch-heavy leaves
the space untouched (a driven piece is not the player's) and takes `onlySurvivor` from 138 boards in 200 to 175.
They combine. Note the direction: **wall-heavy makes a board easier** (`onlySurvivor` 138 → 77) because stone
that closes a branch also settles it, while switch-heavy makes it harder.

**The trap is built, and it is load-bearing.** §11.1's recipe followed exactly — route a wrong setting to the
shrine on purpose, then put the socket on that corridor and the stone further along — with §11.1's acceptance
test applied as a generation gate rather than a hope. **60 of 60 traps load-bearing**, against the 0 of 23 §11.1
measured for the decorate-a-wrong-ray approach; `trapIdle` rejects the decorative ones (6 in 60) so none ships.
The winning beam never fires every wiring, so one socket is always one to dodge, which is the classification
§11.1 wanted. `wiringDead` is demanded on every board, confirming §11.1's other prediction.

**The key is generalised**, as this phase said it would be: both walks are keyed on
`(cell, direction, firedSet)`, well founded because firing is monotone. Switch-heavy is also the first thing in
this construction to make `notUnique` fire at all — 1 to 3 boards in 200 — so the uniqueness gate is a filter
again rather than an assertion.

**Two findings for phase 4.**

1. **Wall-heavy undermines traps.** With both on, `trapIdle` goes from 6 in 60 boards to 58 and attempts a board
   from 2.13 to 3.97, because wall-heavy's extra stone kills the trap corridor before the trap does. Combinable,
   but not free together.
2. **Slider-heavy needed the resolver generalised** from a mirrors-only map to an occupancy model, because a
   sliding piece's absence from a cell is itself information. Both walks share it now.

### Phase 4 — the tier table

Tune to reproduce the measured envelopes below, then move deliberately rather than by accident. §6.4's
one-new-thing rule still applies: each tier adds one word to the vocabulary.

Constraints §11.17 and §11.18 measured, which the table has to respect rather than discover:

- **`branchDepth` >= 1 requires a cap above `deadEnd`.** A branch mirror is a shadow and a shadow defeats
  `deadEnd` by design, so starter and junior cannot carry one at their current caps — generation refuses, it
  does not silently produce an easier board.
- **`interactive` and the cap are not independent.** Dropping the share from 1.0 to 0.7 takes boards needing
  more than `deadEnd` from 400 of 400 down to 358 of 400, so the two have to be set together.

- **wall-heavy pulls the opposite way to the other two.** It buys legibility and spends uncertainty
  (`onlySurvivor` 138 of 200 → 77), so it is not a difficulty dial and should not be used as one.
- **wall-heavy and traps fight.** Both on takes `trapIdle` from 6 in 60 boards to 58. Give a trap board little
  or no wall-heavy weight.
- **A trap needs `branchDepth` >= 1** and a cap that reaches `wiringDead`, which every trap board demanded.

And one optimisation worth taking first: `onlySurvivor` is now the whole of generation cost, and it enumerates
the product the deviation tree already knows how to avoid.

**Done as a comparison, not a cutover** — `authoredConfig.ts`, measured in §11.19. The share of mirrors that are
the player's turned out to be the whole ramp (0.85 / 0.9 / 1.0 at expert / master / wizard); nothing else needed
to move, because a given costs a cell, contributes nothing to the configuration space and authors no corridor, so
one dial thins a board on all three counts.

| tier    | pieces (shipped → authored) | configurations | rejects a board | worst gen     |
| ------- | --------------------------- | -------------- | --------------- | ------------- |
| starter | 3.0 → 3.0                   | 8 → 8          | 1.3 → **0.0**   | 14ms → 10ms   |
| junior  | 4.0 → 4.0                   | 16 → 16        | 3.0 → **0.1**   | 16ms → 7ms    |
| expert  | 5.9 → 5.5                   | 109 → 80       | 70.5 → **2.3**  | 26ms → 20ms   |
| master  | 7.0 → 7.0                   | 230 → 228      | 355.7 → **1.1** | 45ms → 19ms   |
| wizard  | 8.3 → 9.8                   | 934 → 1 741    | 226.0 → **1.7** | 550ms → 616ms |

Faster at four tiers of five, level at wizard, and the boards demand deeper rungs at every tier — `neverReached`
36–40 of 40 against 14–32, `onlySurvivor` 28/32 against 13/27, and `wiringDead` on exactly the 17 wizard boards
that carry a trap. **So the condition this doc sets for retiring the current generator is met on the table above
at four tiers, and level at the fifth** — but retiring it is still the owner's call and is listed below as
something not to start without being asked.

Two gaps left, both small and both the same fix: expert is thinner than the tier it replaces (5.5 pieces against
5.9), and wizard is the one tier that is slower, because `onlySurvivor` enumerates the whole product on a board
that is now bigger. The optimisation named above would close it.

---

## Baseline to beat, measured over 40 seeds a tier

**Re-measured in phase 4, and the configurations column needed correcting: it is the total across all 40 boards
rather than one board's.** Per board the shipped generator makes 8 / 16 / 109 / 230 / 934, which is what an
authored tier has to be compared against — tuning against 37 350 configurations on a single wizard grid would be
absurd, and it is what the column invites. The piece and reject columns were always per board. The corrected
per-board table, measured rather than copied:

| tier    | pieces a board | on the route | configurations | rejects a board | worst gen |
| ------- | -------------- | ------------ | -------------- | --------------- | --------- |
| starter | 3.0            | 3.0          | 8              | 1.3             | 14ms      |
| junior  | 4.0            | 4.0          | 16             | 3.0             | 16ms      |
| expert  | 5.9            | 5.4          | 109            | 70.5            | 26ms      |
| master  | 7.0            | 5.5          | 230            | 355.7           | 45ms      |
| wizard  | 8.3            | 6.8          | 934            | 226.0           | 550ms     |

The original table, as written, with its sums:

| tier    | pieces a board | configurations | branch legs | rejects a board | worst gen |
| ------- | -------------- | -------------- | ----------- | --------------- | --------- |
| starter | 3.0            | 320            | 2.96        | 1               | 10ms      |
| junior  | 4.0            | 640            | 3.48        | 3               | 19ms      |
| expert  | 5.9            | 4 368          | 4.09        | 70              | 31ms      |
| master  | 7.0            | 9 216          | 4.42        | 356             | 55ms      |
| wizard  | 7.1            | 37 350         | 5.56        | 226             | 655ms     |

Distinct authored stop lists today: 1 at starter/junior/expert, 5 at master, 23 at wizard.

---

## Decisions, settled

**1. The modes replace the goal pool.** They are what gives a puzzle its flavour and its uniqueness, which is
the job §7's goals were doing. So `GOAL_DIALS`, `drawGoals` and the goal fallback ladder retire with them, and
a board records the mode it was built to the way it records its goals today — `clearTheWay` becomes wall-heavy
and `orderOfOperations` becomes switch-heavy rather than sitting beside them.

**2. Switch-heavy lands in phase 3, and it is the thing the architecture unlocks rather than a bolt-on.**
§11.1 already worked out what a trap needs: the trap must be the _only_ reason a wrong setting fails, so that
setting has to otherwise **reach the shrine** — a would-be second route. §11.1 calls finding one "fishing in a
pond stocked against you", because route-then-obstruct is built to reject exactly that. **An authoring
generator does not fish: it builds the branch to reach the shrine and then puts the door on it.** That is a
better supply than the retracted mirror state §11.3 proposes, which would only produce second routes as a side
effect on half of wizard's boards.

Two things §11.1 hands this phase for free:

- **The acceptance test.** Take the trap out and the board must stop being a puzzle — the same shape as §5.1's
  assertion about walls. Load-bearing by construction, asserted directly.
- **The failure mode, already measured.** A socket placed on a wrong ray the way shadows are placed produced
  **23 traps across 120 boards, every one of them decoration**, because that setting was already dead. Do not
  repeat it.

What it costs the proof: phase 1 proves _no branch reaches the shrine_; a trap branch deliberately does and
dies on a shut door, so the invariant generalises to _no branch reaches the shrine with the doors in the state
that branch itself produces_ — key on `(cell, direction, firedSet)` rather than `(cell, direction)`. Well
founded, because firing is monotone: a wiring fires once and never un-fires, so a walk cannot cycle through
door states. **Phase 1's only obligation is not to make that key impossible to add.**

**3. The shrine stays on the frame by default, and how many approaches are alive becomes a knob.** Measured
over 40 seeds a tier: the shrine is on an edge on 40/40 boards at every tier, in a corner on a third of
starter and junior boards, the frame alone kills 3.1–3.7 of the eight approaches, and the board's own pieces
finish the job — **exactly 1.00 live approach, every board, every tier**. That is why `exitRun` fires at all,
and it is free, so an interior shrine should be what a high `shrineApproaches` buys rather than the default.

The knob is the real prize: with authoring you can wall the approaches deliberately, so a count that used to
fall out of geometry becomes a dial with a known effect on **which rung fires** — one approach and `exitRun`
speaks, two or three and the work moves to the exhaustive pair. That is difficulty in the currency
`docs/instructions/puzzle-screens.md` §5 names.

### Settled working assumptions

Confirmed with the repo owner, so do not re-derive or diverge from these:

- **"Turns/nodes" on the golden path means mirrors**, not sockets. Sockets arrive with switch-heavy in phase 3.
- **Phase 1 ships nothing.** No tier uses the authored generator, and all 200 boards the current generator
  makes stay byte-identical. It is measured behind a dial only.
- **A new file** — `generateAuthoredLightbeam.ts` beside the existing generator, not a mode inside it.
- **The disc keeps today's placement convention**: on an edge, never a corner, because a corner disc gives the
  first leg only one way to go and that is a turn the player reads off the frame instead of the board.
- **`MIN_LEG` carries over** — two cells between consecutive bends, which is what keeps two tappable pieces off
  each other's shoulder.
- **The opening machinery is reused unchanged** — `drawOpening`, `openingIsHonest`, `resistsGreedyPlay`. How a
  board was _built_ is orthogonal to _where it starts_, and that logic is load-bearing: it is what stops
  "tap every piece once" solving the game (§5, and the exploit that made it necessary).
- **Puzzle progress is ephemeral.** Boards are generated from `(difficulty, seed)` at play time and the
  player's state lives in React state, not a store — so swapping generators can never corrupt a saved board.
  There is no migration to design, and the eventual cutover in phase 4 can be clean.

### Decisions this doc makes, absent an objection

**`thinWalls` does not run** on authored boards — **and the reason this doc gave for it was wrong.** It said
every wall has a reason by construction and a pruner can only remove load-bearing stone. Measured over 1 000
boards (§11.16): all 722 walls do stop a branch, but removing one breaks uniqueness on only **30** of them and
stalls the ladder on none. The other 692 are holding a branch out of a cell a tappable piece occupies. So
`thinWalls` would happily strip them — it re-checks uniqueness and the ladder, both of which still pass — and
hand §11.15's hazard to phase 2. The pruner is not too weak to be trusted; it tests the wrong property.

**`piecesAreSpaced` becomes a placement constraint** the branch walker respects as it goes, rather than a gate
at the end — otherwise rejection has just moved one level down. Done (`mirrorMayStand`), and it is part of why
a draft costs one attempt; the shipped gate is still run behind it and has not rejected a board.

## A separate question this planning turned up

**Doors may be a second, independent reason `exitRun` is quiet at wizard**, alongside the eight-direction
opening §11.12 blames. `exitRun` walks back over `knownGrid`, where an unfired door is conservatively
`unknown` — which is not a death, so every candidate direction survives and "exactly one survives" cannot
hold. The ladder loops, so `exitRun` gets another chance once `wiringFires` has pinned the door open, but how
often that completes is **unmeasured**. Worth its own probe before anyone attributes wizard's 11-in-40 to the
diagonal alone. (Noticed because a probe tracing backward over a static `configGrid` reported zero live
approaches at wizard, which is impossible on a solved board — the static grid parks the door on the route.)

---

## A live defect in the current generator, unfixed

`clearTheWay` asks for a sliding wall and mostly does not get one — **17 asked, 0 placed at master; 17 asked,
3 placed at expert; 13 asked, 2 placed at wizard** — and the board still records the goal as drawn. Same shape
in `placeShadows`: wizard asks for 85 decoys-plus-shadows and places 60.

The cause is `slice(0, n)` applied **before** the validity filter:

```ts
for (const cell of straights.slice(0, options.slidingWalls)) {
  const stops = fittingTrack(...)
  if (!stops) continue        // nothing left to try — only one candidate was sliced
```

`placeWiredDoors` already does it the right way round (`for (const c of candidates) { if (enough) break }`),
so there is an in-repo precedent for the fix. It is a few lines. **Decide whether to fix it in the current
generator or let the authored one make it moot** — but note it ships today, and `goals.ts`'s own comment warns
about exactly this: _"a silent fallback that fires often would make the whole pool decorative while every
measurement still looked fine."_

---

## Method — how every claim in this file was produced, and how to add to it

- **Throwaway probe specs.** A `probe*.spec.ts` beside the family, `appendFileSync` to a path from an env
  var, deleted in the same session. `console.log` inside vitest is swallowed; a probe that logs to stdout
  will look like it did nothing.
- **The byte-identity harness.** Serialise every board the five tiers make over 40 seeds, one line each with
  JSON keys sorted, to a file named by an env var; `git stash` the change, run again, `diff`. Any change that
  alters a board it should not have altered shows up immediately. Two gotchas that cost real time: give the
  `it()` an explicit timeout (200 boards blow past vitest's 5000ms default), and sort the keys or a reordered
  object literal reads as 200 differing boards.
- **Rejection attribution.** `LightbeamOptions.reject` names the gate. Use it for every before/after, or the
  comparison is a comparison of impressions.
- **Generation is measured in attempts, not seconds.** A change that halves the yield still looks fast on a
  starter board.

---

## Repo conventions that will otherwise cost an hour

- `AGENTS.md` is the entry point (`CLAUDE.md` points at it).
- **yarn needs a registry override:** `COREPACK_NPM_REGISTRY=https://registry.npmjs.org corepack yarn <cmd>`
- Before committing: `yarn prettier --write` on what you touched, `yarn check-types`, `yarn lint`,
  `yarn vitest run src/mods/puzzle`.
- Seeded determinism only — `mulberry32` / `shuffle` from `src/game/random.ts`. Never `Math.random()`.
- Hints and rules live in `public/locales/{en,nl}/common.json` and must stay in sync.
- **When the doc turns out to be wrong, fix it and say so in the same commit.** Corrections stay visible.
- **Status words do not belong in the design doc** — measurements do. Phase numbers, "done", "byte-identical",
  PR references and build plans belong in _this_ file. `docs/instructions/documentation.md` has the smell
  test, and the design doc currently fails it in a few places that predate this plan: §11.8 rule 10 carries
  "done, §11.n" markers and §11.12/§11.13 carry status language. Worth a cleanup pass; do not add more.

---

## Known traps

- **`Direction` is an index and `DIR.right` is `0`.** Never test a direction for truthiness. This shipped
  twice in one file: the beam was drawn with holes in it for every rightward cell, and a beam escaping
  rightward drew no marker. `MirrorAngle` has the same hazard at `0` (flat). Specs assert the zero case now;
  keep it that way.
- **The random stream is positional.** One `mulberry32` per attempt, consumed in call order — insert a
  `shuffle` anywhere and every board downstream re-rolls. Guard any new draw behind the dial it belongs to so
  a tier that does not use it consumes nothing, and run the byte-identity harness on every change.
- **Decoys and shadows have free settings by construction.** The light never reaches them, which is what
  `neverReached` proves. Never assert "every wrong setting fails" over all mirrors — scope it to the ones the
  winning beam crosses.
- **`yarn vitest run` is intermittently flaky here and it is not you.** The full suite occasionally reports
  timeouts in `generateLightbeam.spec.ts`. Pre-existing and load-dependent; run that file alone to confirm
  before treating it as a regression.
- **The Bash working directory persists between calls.** A `cd` in one command silently applies to the next.
- **A node script importing `playwright` must live in the repo root**, not a scratch directory — ESM resolves
  bare specifiers from the script's own directory. Chromium is at `/opt/pw-browsers/chromium`; never run
  `playwright install`; set `NO_PROXY=localhost` or the agent proxy eats the request; symlink
  `/opt/node22/lib/node_modules/playwright{,-core}` into `node_modules`.
- **A percentage padding resolves against the containing block's width, not the element's own.** Put the inset
  on a `size-full` child, as `LightbeamBoard` already does and comments about.

---

## Do not start without being asked

- **Traps** (§11.1) outside phase 3 — switch-heavy is the door into them and phase 3 is where they belong.
- **Retiring the current generator.** It coexists behind a dial until the authored one has beaten it on the
  table above, tier by tier.
- **Rule 3's three-stop edge-on set** (§11.8) — needs the stop set built from the bend's arrival direction.
- **The difficulty-metric swap** (§6.3). "Seen from the door" is already retired as the ramp
  (`lightbeamConfig.ts` says why); replacing it with something better is separate work.
