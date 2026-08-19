# Handover — lightbeam cut mirror, step 4 (the generator routing diagonally)

Everything a fresh context needs **beyond** the design doc. The design itself is deliberately not repeated
here: it lives in `docs/game-design/puzzles/lightbeam.md`, and duplicating it is how the two drift apart.

**Delete this file in the commit that finishes step 4**, per `docs/instructions/documentation.md`. The
permanent record is the design doc and git history.

---

## Where things stand

Branch `claude/futoshiki-puzzle-notetaking-df1ro3`, PR **#201** (open, draft), base `main` at `ddabf8c`.

Read **§11.8** (the decided design) and then **§11.9**, **§11.10**, **§11.11** — what steps 1, 2 and 3
measured, in that order. Do **not** read §11.3–§11.7 as instructions: they are the record of how the design
was reached, the corrections arrive after the claims, and reading forwards hands you a design that does not
work. §11.8 rule 10's own step-3 line is struck through for exactly that reason.

§11.8 rule 10's build order:

| Step                                           | State                      |
| ---------------------------------------------- | -------------------------- |
| 1. The drawing at 36px, before any logic       | built — recorded in §11.9  |
| 2. The walk — 8 directions, diagonal steps     | built — recorded in §11.10 |
| 3. `blockWrongSettings` and the wrong rays     | built — recorded in §11.11 |
| 4. The generator routing diagonally on purpose | **this document**          |
| 5. Traps (§11.1)                               | parked                     |

## What step 3 left in the tree, so you do not re-derive it

- **`cutStops(bend)`** builds rule 2's stop set from the bend rather than a table: keep the quarter turn the
  route needs, add the half-step 67.5° off it leaning the other way. Four pairs over the four arrival
  directions, of which §11.8's table is the rightward two.
- **`wrongSettingRays(bend, angles, answer)`** is one ray per stop that is not the answer. This is the whole
  of step 3's fix, and it is what makes a three-stop piece work at all.
- **`cutMirrors`** is a dial on `LightbeamDials`, zero in `BASELINE` and drawn by no tier. It swaps a cut
  mirror in for an ordinary turn mirror at a route bend and leaves the route square (§11.8 rule 8), which is
  what let step 3 measure a diagonal wrong ray before any board routes diagonally. **Step 4 decides whether
  it survives** — once bends can be half-steps, the stop set may want to come from the route instead.
- Specs: `generateLightbeam.spec.ts` has a `cutMirrors: 1` block per tier (the piece keeps its quarter turn,
  its stops are 67.5° apart, the wrong setting is diagonal and never arrives, the board settles inside its
  cap, and no tier draws the dial). `techniques.spec.ts` has the two hand-authored boards — `[1, 6]` and
  rule 3's three-stop `[0, 2, 6]`.
- Story: `CutMirrorWrongRay` — the first **generated** boards with a cut mirror on the winning route, in the
  answer and in the wrong setting. It is also where the marker question below is visible.

## The gate, and it is still a gate

**No board any tier draws has a cut mirror.** Nothing authors a stop set other than `TURN_ANGLES` unless
`cutMirrors` is turned on by hand. So, until step 4 deliberately changes what a tier generates:

> Any change that alters a generated board is a bug.

Verified that way at every step so far, and it is worth the twenty minutes. Method: a throwaway spec that
walks `LIGHTBEAM_CONFIG`'s five tiers × 40 seeds, serialises each board (size, sun, shrine, `fixed`,
`movable`, `solution`, `initial`, `nodes`, `wirings`, `goals`) one line apiece to a file named by an env
var, then `git stash` and run it again against the old tree and `diff`. Two gotchas that cost real time:

- Give the `it()` an explicit timeout — 200 boards blow past vitest's 5000ms default.
- Compare with JSON keys sorted. Reordering a field in an object literal changes the serialised text
  without changing the board, and that reads as 120 differing boards when nothing differs at all.

Step 3's result: all 200 boards byte-identical, five tiers.

**When step 4 does change generated boards, that is the moment the mechanic reaches a player** — so it is
also the moment the `mirrors` rules text in `public/locales/{en,nl}/common.json` stops being true, and the
first commit in this whole sequence that earns a CHANGELOG entry (a whole feature is one bullet,
`docs/instructions/changelog.md`).

## What step 4 actually has to do, and the square assumptions in its way

`angleFor(enter, exit)` returns a mirror only when `enter + exit` lands on one of the two diagonals, and its
own comment names itself as the place that has to learn otherwise. It is not the only one. Everything below
assumes a leg runs along a row or a column:

- **`perpendicular(direction)`** answers "the two ways across this beam" with a three-way conditional on
  up/down, so a diagonal direction silently gets `[up, down]`. It is called from `buildRoute` (picking each
  leg's exit), `trackRuns`, `fittingTrack` and `placeWiredDoors`. This is the single most load-bearing
  square assumption in the file.
- **`axisOf(direction)`** maps a direction to `"h" | "v"`, and `buildRoute` uses it to keep a crossing
  perpendicular — a diagonal leg has neither axis, and two diagonals cross perpendicularly only if they are
  the two different diagonals. `crossedBeams` as a goal rides on this.
- **`trackRuns`** builds a contiguous run of cells across the beam. A track across a diagonal beam is either
  a diagonal run of ghosts or a decision that tracks stay square, and that is a drawing question (§9) before
  it is a generation one.
- **`MIN_LEG`** exists to stop two bend mirrors touching. Diagonal steps make "touching" mean corner-to-
  corner, which `piecesAreSpaced` deliberately allows (see below), so the reason for the number changes even
  where the number does not.
- **`stepsToEdge`** already takes the minimum over both axes and needs nothing — and that `min` is why a
  diagonal wrong ray costs _less_ stone than a square one (§11.11).

## Four decisions §11.11 leaves on the table

1. **`exitRun` goes quiet, board-wide, from one piece.** `travelledDirections` opens all eight directions as
   soon as any half-step stop exists anywhere on the board, and the rung then fires on 13 of 40 master
   boards instead of 33. The numbers are in §11.11; the lever it names is §11.5's parity counting, which is
   the one place that argument is useful rather than dangerous. Decide this before turning a tier on: it is
   what the family pays for the mechanic, and it is paid in the clearest hint sentence it has.
2. **The absorbed marker lands on a corner for a diagonal death**, which is the one point §11.8 rule 4 gives
   the opposite meaning to. It reads anyway, because the beam ends inside the brick — but marking the cell
   centre for a diagonal end would settle it, and the escape marker has had the same question open since
   §11.10. Both are in `BeamLayer` in `LightbeamBoard.tsx`, four lines apart. Look at `CutMirrorWrongRay`
   before deciding; changing it changes no board that ships today, because none of them has a diagonal end.
3. **Rule 3's edge-on stop set is not authorable from a table.** The angle lying along the beam is
   `2·travel`; put a flat stop in front of a beam arriving down a column and it retroreflects back up the
   route, where no wall may go and the draft dies. If step 4 wants rule 3's `{0°, 45°, 135°}`, it has to be
   built from the bend's arrival direction.
4. **Two diagonally adjacent movable pieces can now be reached by one beam**, which step 2 flagged and step 3
   did not touch. `spacedFrom` and `piecesAreSpaced` use the four square neighbours on purpose — it is a
   tap-accuracy rule, and diagonal tap targets already touch at their corners — so do not widen them
   reflexively. What is new is a _deduction_ question and may want a gate of its own.

## Repo conventions that will otherwise cost you an hour

- `AGENTS.md` is the entry point (`CLAUDE.md` points at it).
- **yarn needs a registry override here:**
  `COREPACK_NPM_REGISTRY=https://registry.npmjs.org corepack yarn <cmd>`
- Before committing: `yarn prettier --write` on what you touched, `yarn check-types`, `yarn lint`,
  `yarn vitest run src/mods/puzzle`.
- Seeded determinism only — `mulberry32` / `shuffle` from `src/game/random.ts`. Never `Math.random()`.
  A new `shuffle` call on a path a board already takes changes every board downstream of it: guard it
  behind the dial it belongs to, the way `cutMirrors` guards its own.
- Hints and rules live in `public/locales/{en,nl}/common.json` and must stay in sync.
- **When the doc turns out to be wrong, fix it and say so in the same commit.** Corrections stay visible.
  That is why §11 reads as it does, and §11.11 against §11.4 is the current example.
- Status words do not belong in the design doc (`docs/instructions/documentation.md` has the smell test) —
  measurements do. That is the line between what goes in §11.n and what goes in a file like this one.

## Known traps

- **`yarn vitest run` is flaky here and it is not you.** The full suite intermittently reports 2–4 failures
  in `generateLightbeam.spec.ts`, all `Test timed out in 5000ms`. Pre-existing and load-dependent —
  reproduced on a stashed clean tree. Run that file alone to confirm before treating it as a regression.
- **`console.log` inside a vitest test is swallowed.** A probe has to write its output to a file —
  `appendFileSync` to a path from an env var — or you will stare at an empty terminal twice.
- **A node script that imports `playwright` must live in the repo root, not a scratch directory.** ESM
  resolves bare specifiers from the script's own directory, so a script under `/tmp` cannot see
  `node_modules` no matter what is symlinked into it. Write it to the project root and delete it afterwards.
- **A percentage padding resolves against the containing block's width, not the element's own.** `p-[8%]` on
  a fixed-size cell blows the cell up to the padding. Put the inset on a `size-full` child, as
  `LightbeamBoard` already does and comments about.
- **Generation is measured in attempts, not seconds.** A change that halves the yield can still look fast on
  a starter board and only show up as a 1400ms wizard board. `attemptGeneration`'s loop counter is two lines
  of temporary instrumentation and the honest way to read a yield change (§11.11's table is built that way).

## Screenshot harness (Storybook + Playwright)

```bash
COREPACK_NPM_REGISTRY=https://registry.npmjs.org corepack yarn storybook   # serves on 6006
ln -sfn /opt/node22/lib/node_modules/playwright node_modules/playwright
ln -sfn /opt/node22/lib/node_modules/playwright-core node_modules/playwright-core
```

- Chromium is at **`/opt/pw-browsers/chromium`** (a symlink to the binary, not a directory). Never run
  `playwright install`.
- Set `NO_PROXY=localhost` or the agent proxy eats the request.
- Story ids take the `Mods/` prefix from `.storybook/main.ts`, e.g.
  `mods-puzzle-lightbeamboard--cut-mirror-wrong-ray`. Confirm against `http://localhost:6006/index.json`.
- `deviceScaleFactor` changes render resolution, **not** CSS layout — so shooting at 6× or 8× is "true size,
  magnified for inspection", which is the right way to judge a 35.3px cell.
- The frame stories put one board per `<figure>`, so `page.locator("figure").nth(n)` crops one frame, and
  dividing that box by the grid size gives a cell — which is how to crop the four cells an argument is
  actually about instead of reading a whole 9-wide board.

## Real geometry

The encounter modal is 360×640, the board is **318px**, so a 9-wide wizard grid is **35.3px a cell** and its
tap target 46px. §9's legibility bar is **36px** (the cell) — 44px is the _tap target_, and a glyph is drawn
inside the cell.

## Do not start without being asked

- **Step 5** (traps, §11.1).
- **The difficulty-metric swap**, which is separate and must not be bundled with the mirror work:
  `generateLightbeam.spec.ts` still asserts the configuration-space growth curve, which counts moves rather
  than thinking. §6.3 has the replacement — the share of wrong turns dismissable without following them.
  It passes as "never rises"; a strict "falls" trips on master and wizard tying.
- **The PR body still does not mention the cut mirror at all** — none of steps 1, 2 or 3, so a reviewer has
  no idea that three of #201's commits are a different mechanic. A section for it was drafted twice and
  deliberately not posted: the body is the repo owner's prose, rewritten twice by them. Ask before editing
  it.
