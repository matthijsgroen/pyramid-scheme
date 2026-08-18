# Handover — lightbeam cut mirror, step 3 (`blockWrongSettings`)

Everything a fresh context needs **beyond** the design doc. The design itself is deliberately not repeated
here: it lives in `docs/game-design/puzzles/lightbeam.md`, and duplicating it is how the two drift apart.

**Delete this file in the commit that finishes step 3**, per `docs/instructions/documentation.md`. The
permanent record is the design doc and git history.

---

## Where things stand

Branch `claude/futoshiki-puzzle-notetaking-df1ro3`, PR **#201** (open, draft), base `main` at `ddabf8c`.
Head **`d8709f0`** — 4/4 CI check runs green.

Read **§11.8** (the decided design), **§11.9** (what step 1 measured) and **§11.10** (what step 2 measured).
Do **not** read §11.3–§11.7 as instructions — they are the record of how the design was reached and contain
recommendations that measurement later overturned; the corrections arrive after the claims, so reading
forwards hands you a design that does not work.

§11.8 rule 10's build order:

| Step                                             | State                                |
| ------------------------------------------------ | ------------------------------------ |
| 1. The drawing at 36px, before any logic         | done — `d1dc694`, recorded in §11.9  |
| 2. The walk — 8 directions, diagonal steps       | done — `d8709f0`, recorded in §11.10 |
| 3. `blockWrongSettings` learns conditional stone | **this document**                    |
| 4. The generator routing diagonally on purpose   | parked                               |
| 5. Traps (§11.1)                                 | parked                               |

## What step 2 left in the tree, so you do not re-derive it

- **`Direction` is an index `0..7`** into the eight multiples of 45°, anticlockwise from rightward. `DIR`
  names them, `DIRECTIONS` is all eight, `SQUARE_DIRECTIONS` the four.
- **`MirrorFace` is gone.** A mirror is one `MirrorAngle` in eighth-turns; `SLASH` is 2, `BACKSLASH` is 6,
  `TURN_ANGLES` is `[2, 6]`. `isHalfStep(angle)` is the parity flip, `isCut(angles)` is the species.
- **`reflect(angle, travel)` is `(angle - travel) mod 8`.** A `Blocker` mirror carries `{ angle, cut }` and
  `mirrorBlocker(angle, stops?)` builds it — `cut` is a fact about the piece's whole stop set, not the stop
  it stands on.
- **`travelledDirections(puzzle)`** returns eight only when some mirror can stand at a half-step, otherwise
  the four the disc shines along. This is the thing keeping `exitRun` from quietly weakening on every board
  in the family, and step 3/4 will produce the first boards where it returns eight.
- Renderer: `sidePoint` returns a **corner** for a diagonal and an edge midpoint for a square direction;
  `NOSE` is computed for all eight; `Mirror` takes `{ angle, cut }`.
- Stories: `DiagonalBeam` (step 2's, and the only one that shows diagonal light), plus `CutMirrorStops` and
  `CutMirrorDensity`, which are kept for the drawing questions they answer and show no diagonal light.

## The invariant to hand over, and it is a gate rather than a nicety

**No board the generator makes has a cut mirror until step 4.** Nothing authors an `angles` array other
than `TURN_ANGLES`. So:

> Any change in step 3 that alters a generated board is a bug.

Step 2 was verified that way and it is worth the twenty minutes. Method: a throwaway spec that walks
`LIGHTBEAM_CONFIG`'s five tiers × 40 seeds, serialises each board (size, sun, shrine, `fixed`, `movable`,
`solution`, `initial`, `nodes`, `wirings`, `goals`) one line apiece to a file named by an env var, then
`git stash` and run it again against the old tree and `diff`. Two gotchas that cost real time:

- Give the `it()` an explicit timeout — 200 boards blow past vitest's 5000ms default.
- Compare with JSON keys sorted. Reordering a field in an object literal changes the serialised text
  without changing the board, and that reads as 120 differing boards when nothing differs at all.

Step 2's result: all 200 boards byte-identical across all five tiers.

## What step 3 is — and read §11.8's one-line reason as a hypothesis

§11.8 rule 10 says `blockWrongSettings` "has to learn that a wall no longer stops diagonal light at its
corner, so stone is conditional for the first time."

**That sentence may not survive contact, and finding out is the first job.** Reading the code: a wall still
absorbs any light that _lands_ in its cell, diagonal included, and `blockWrongSettings` walls exactly the
cell the wrong ray lands in first. So the unconditional part of stone is intact. What changed is narrower —
stone no longer seals a _corner_, so a barrier built of separate walls is conditional on the beam's parity —
and where that actually bites in the generator is a thing to measure rather than assume. Measure, do not
assert: every claim in §11 that survived was measured, and the ones that were reasoned through were
overturned.

### What is concretely wrong today

Read `blockWrongSettings` and `placeShadows` in `src/mods/puzzle/game/lightbeam/generateLightbeam.ts`.

1. **`wrongRays` is hard-wired to a two-diagonal mirror**, and this is the change step 3 cannot avoid. A
   turn mirror pushes exactly one wrong ray, built as _the other diagonal_:
   `reflect(bend.angle === SLASH ? BACKSLASH : SLASH, bend.enter)`. Two things are wrong with that for a cut
   mirror, and they are separate:
   - **The direction is computed from the wrong pair.** A cut mirror stopping at `[1, 6]` set wrongly is at
     1 or 6, never at "the other of `SLASH`/`BACKSLASH`". The count is still one for a two-stop piece, so
     this fails silently rather than obviously — the ray points somewhere the light never goes, so stone
     lands in the wrong cell and `deadEnd` has nothing to say about the setting that is actually wrong.
   - **A three-stop piece has two wrong rays.** §11.8 rule 3 allows `{0°, 45°, 135°}`, and the loop pushes
     one ray per bend regardless. The fix is to derive the rays from the piece's stop set — every stop that
     is not the solution's — rather than from a hard-coded pair.
2. **A diagonal wrong ray's first cell is diagonally adjacent to the mirror**, so the wall goes on the
   mirror's shoulder. Permitted today — `spacedFrom` and `piecesAreSpaced` guard _movable_ pieces only — but
   nothing has ever put stone there on purpose, so look at it before believing it.
3. **Yield.** `if (draft.taken.has(key)) return false` throws the whole draft away when a wrong ray's first
   cell is on the route. Two wrong rays per cut piece roughly doubles the exposure per piece. §11.8 rule 8
   says to spend the cost by swapping a cut mirror in for an ordinary one, and if yield collapses, that
   number is what decides which tier can afford one.
4. **The `draft.rays` scan is already direction-agnostic** — it steps with `stepCell` and only reads cells
   the ray lands in, so it needs nothing once the rays themselves are right.
5. **`placeShadows` steps two cells along the ray**, which for a diagonal ray is a diagonal offset. Its
   comment reasons about "the shoulder of the very mirror it shadows" in square terms; check whether two
   diagonal steps still clears the shoulder.
6. **`spacedFrom` and `piecesAreSpaced` use the four square neighbours.** That is a _tap-accuracy_ rule, not
   a beam rule, and diagonally adjacent tap targets already touch at their corners today — so do not widen
   it to eight reflexively. What is new is that one diagonal beam can now reach two diagonally adjacent
   movable pieces, which is a _deduction_ question and may want its own gate rather than a change to this
   one.

### A hypothesis worth testing early, because it points the opposite way

A diagonal ray leaves the grid **sooner** than a square one from the same cell: `stepsToEdge` takes the
`min` over both axes, so a diagonal ray from a mid-board cell dies at the frame in far fewer steps. If that
dominates, `blockWrongSettings` may have _less_ stone to place for a cut mirror rather than more — the frame
already does the walling. That would invert the expected cost of the whole step, so measure it before
designing anything.

### And the gap step 2 knowingly left

**The deduction ladder has never been run on a board with a cut mirror on its route.** `techniques.ts`
compiles against the new shape and `travelledDirections` opens eight shrine entries when a half-step exists,
but nothing proves such a board _deduces_. The cheapest first move in step 3 is a `techniques.spec.ts` case
on a hand-authored cut-mirror board — `beam.spec.ts`'s `diagonal` fixture is a 5×5 starting point. §11.8's
own closing paragraph names this as one of the two remaining risks; it is not step 4's alone.

## Repo conventions that will otherwise cost you an hour

- `AGENTS.md` is the entry point (`CLAUDE.md` points at it).
- **yarn needs a registry override here:**
  `COREPACK_NPM_REGISTRY=https://registry.npmjs.org corepack yarn <cmd>`
- Before committing: `yarn prettier --write` on what you touched, `yarn check-types`, `yarn lint`,
  `yarn vitest run src/mods/puzzle`.
- Seeded determinism only — `mulberry32` / `shuffle` from `src/game/random.ts`. Never `Math.random()`.
- Hints and rules live in `public/locales/{en,nl}/common.json` and must stay in sync. The `mirrors` rule
  still says "a quarter turn, off either of its faces", which is true of every board that ships; a cut
  mirror will need something, and §11.8 rule 5 says its stops are discovered by tapping, not drawn.
- **Step 3 gets no CHANGELOG entry, for the same reason step 2 did not**: nothing reaches a player until the
  generator authors a cut mirror. A whole feature is one bullet (`docs/instructions/changelog.md`).
- **When the doc turns out to be wrong, fix it and say so in the same commit.** Corrections stay visible.
  That is why §11 reads as it does, and §11.10 is the current example.

## Known traps, three of them new

- **`yarn vitest run` is flaky here and it is not you.** The full suite intermittently reports 2–4 failures
  in `generateLightbeam.spec.ts`, all `Test timed out in 5000ms`. Pre-existing and load-dependent —
  reproduced on a stashed clean tree. Run that file alone to confirm before treating it as a regression.
  (It happened to pass clean on `d8709f0`: 1824/1824.)
- **`console.log` inside a vitest test is swallowed.** A probe has to write its output to a file —
  `appendFileSync` to a path from an env var — or you will stare at an empty terminal twice.
- **A node script that imports `playwright` must live in the repo root, not the scratchpad.** ESM resolves
  bare specifiers from the script's own directory, so a script under `/tmp` cannot see `node_modules` no
  matter what is symlinked into it. Write it to the project root and delete it afterwards.
- **A percentage padding resolves against the containing block's width, not the element's own.** `p-[8%]` on
  a fixed-size cell blows the cell up to the padding. Put the inset on a `size-full` child, as
  `LightbeamBoard` already does and comments about.

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
  `mods-puzzle-lightbeamboard--diagonal-beam`. Confirm against `http://localhost:6006/index.json`.
- `deviceScaleFactor` changes render resolution, **not** CSS layout — so shooting at 4× or 8× is "true size,
  magnified for inspection", which is the right way to judge a 35.3px cell. `page.screenshot({ clip })`
  against a `boundingBox()` is how to crop one cell pair out of a nine-wide board.

## Real geometry

The encounter modal is 360×640, the board is **318px**, so a 9-wide wizard grid is **35.3px a cell** and its
tap target 46px. §9's legibility bar is **36px** (the cell) — 44px is the _tap target_, and a glyph is drawn
inside the cell.

## Do not start without being asked

- **Step 4** (the generator routing diagonally) and **step 5** (traps, §11.1).
- **The difficulty-metric swap**, which is separate and must not be bundled with the mirror work:
  `generateLightbeam.spec.ts` still asserts the configuration-space growth curve, which counts moves rather
  than thinking. §6.3 has the replacement — the share of wrong turns dismissable without following them.
  It passes as "never rises"; a strict "falls" trips on master and wizard tying.
- **The PR body does not mention the cut mirror at all** — neither step 1 nor step 2, so a reviewer has no
  idea that two of #201's commits are a different mechanic. A section for it was drafted and deliberately
  not posted: the body is the repo owner's prose, rewritten twice by them, and it would have had to be
  reconstructed from an HTML-escaped copy. Ask before editing it.
