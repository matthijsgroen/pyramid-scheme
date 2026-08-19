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
| `interactive`      | **0..1, the share of mirrors that are the player's to tap.** See below — it is the load-bearing one                                                                             |
| `forkSize`         | stops per tappable mirror                                                                                                                                                       |
| `sliders`          | golden bends that slide rather than turn                                                                                                                                        |
| `branchDepth`      | turns per authored branch; 0 is a straight run to stone or the frame                                                                                                            |
| `terminator`       | weights over frame / wall / shadow as a branch's ending                                                                                                                         |
| `modes`            | weights over wall-heavy, slider-heavy, switch-heavy — **these replace the goal pool**                                                                                           |
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

**Acceptance:** ~1 attempt a board, and the two gates passing at 100%. If uniqueness fails here, the
construction is wrong and no later phase matters.

This phase alone answers the deferred question — _can authoring carry the guarantees?_ — because the pass
rate **is** the answer. 100% over a few thousand boards is evidence; anything less hands you the
counterexamples.

### Phase 2 — branch depth, reuse, and the recursion

Branches may turn, and may pass through cells tappable pieces occupy. Implement the recursion. `interactive`
becomes meaningful here.

**Proves the correctness rule.** The §11.15 board is the regression test. Also measure how often a branch
meets a tappable cell — expected to be **common**, not rare, since an authoring generator aims branches at
interesting territory on purpose (§11.15 explains why the 1-in-949 figure is a floor).

**Acceptance:** uniqueness still 100%, and the recursion's cost measured against `routeIsUnique`'s. The claim
to test is that the reachable deviation tree is cheaper than the full product — wizard's product is 37 350
configurations today.

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

### Phase 4 — the tier table

Tune to reproduce the measured envelopes below, then move deliberately rather than by accident. §6.4's
one-new-thing rule still applies: each tier adds one word to the vocabulary.

---

## Baseline to beat, measured over 40 seeds a tier

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

### Decisions this doc makes, absent an objection

**`thinWalls` does not run** on authored boards, because every wall it places has a reason by construction and
a pruner can only remove load-bearing stone. **`piecesAreSpaced` becomes a placement constraint** the branch
walker respects as it goes, rather than a gate at the end — otherwise rejection has just moved one level down.

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
