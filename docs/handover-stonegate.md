# Handover: stoneGate, art and engine

Branch `topology/mechanics` (worktree `portal-zinc`), main merged up to #315. A fresh session can carry on from
here. Read the roadmap first: `docs/superpowers/plans/2026-10-06-stonegate-roadmap.md`, then the spec
`docs/superpowers/specs/2026-10-04-stones-acceptance.md`. Trust `git log` and the ledgers in `.superpowers/sdd/`
over memory.

## Where things stand

| Phase                          | State                                                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Stones in the engine         | **Done.** Plan: `docs/superpowers/plans/2026-10-06-stonegate-phase-1-engine.md`.                                                             |
| 2 Play with stones             | **Done.** Plan: `docs/superpowers/plans/2026-10-07-stonegate-phase-2-play.md`.                                                               |
| 3 Narrow passage               | **Done.** Plan: `docs/superpowers/plans/2026-10-08-stonegate-phase-3-narrow-passage.md`.                                                     |
| 4 Gate loops and nested stones | **Ready to run, not started.** Plan: `docs/superpowers/plans/2026-10-08-stonegate-phase-4-gate-loops.md` (14 tasks, every question settled). |
| 5 Art                          | **Landed** (see below). The brazier stays as decor.                                                                                          |
| 6 Djoser                       | **Not planned.** After phase 4: stoneGate on an `expert_4` floor through `floorLocks`; save impact settled.                                  |
| 7 Zipline glide                | **Done.** Poses in `src/app/SiteMap/ridePoses.ts`, 200 ms a cell. Story `Topology/Zipline ride`.                                             |

Phase 4 covers gate loops in the carve (`topologyFaults`, `gateBypassed`, the fork seams), loops inside one region
in every carve, stoneGate on dev pyramid 12, the squeeze starting from the nearer side, one nest spot per lock
(`a -&> b`), and stones in nested locks (pass through, contained, shared). Its "Decisions (settled)" D1–D17 and
"Rulings made without the designer" are binding: a task that meets something unexpected stops and reports, it never
re-decides.

### Built on top of phase 3

- **Squeeze choreography.** Head-on (N–S): the sprite is drawn over the opaque wall, fades behind it going north and
  emerges going south, 700 ms. Sideways (E–W): the wall is drawn over him, 2000 ms, lifted 10. Story
  `App/Topology/Squeeze`.
- **Water covers every cell it bars.** A seen cell shows water, an unseen one fog; the playground conceals like the
  game.
- **Region gates are buildable.** waterMoves, sluice and tide play in the Lock playground; story
  `Topology/Region barrier`.
- **`yarn verify-content` is fully green.**

### Art that landed

- **Plate:** raised, pressed, and pressed with a stone.
- **Torch:** a standing torch, painted, with a lit pool of light and no shadow.
- **Sequence tile:** sandstone with a plain top; the glyph is drawn on it and its colour carries the state.
- **Narrow passage walls:** `narrowAcross` and `narrowAlong`.
- **Explorer squeeze frames:** east and south drawn; north reuses south, west mirrors east.
- **Water texture:** a caustic painting, recoloured at import.

The art plan is `docs/superpowers/plans/2026-10-06-stonegate-phase-5-art.md`; its ledger is
`.superpowers/sdd/2026-10-06-stonegate-phase-5-art/progress.md`.

## Next work, in order

1. **Develop-mode "Solve" for puzzles.** Develop mode already has "Unlock everything" (`src/app/dev/useDevActions.ts`,
   `src/app/dev/devActionContributions.ts`, `src/contexts/DevelopMode.tsx`). Add a way to skip or solve any
   encounter board in develop mode, so the designer can start any journey or pyramid and walk straight to the locks.
   Small: a brief plan, TDD, and show it working by looking (screenshot), not by reading code.
2. **Run phase 4** with superpowers:subagent-driven-development: per task an implementer subagent and a task review,
   then a final whole-branch review on the most capable model. Ledger in
   `.superpowers/sdd/2026-10-08-stonegate-phase-4-gate-loops/progress.md` (create it with the skill's sdd-workspace
   script). Commit and push freely on this branch.
3. **Then phase 6 (Djoser placement).** Not planned yet; write its plan against what phase 4 built.

## Designer decisions to keep

- **Stones** (spec, "The rules"):
  - a stone is always on a plate or in the hand; stones have no ids; one in hand, no swapping;
  - a plate is written `p plate @r [stone]`; its states `-[p]-` and `-[p:empty]-` combine freely with other owners;
  - **the explorer's weight presses a plate** while he stands on it; it never lets him through, and route-finding
    treats a door held only by his weight as shut;
  - a plate has three looks: raised, pressed, and pressed with a stone.
- **Every `>>` (drop, zipline) takes empty hands**, with nothing written; so do the stairs and the way out. A stone
  never leaves its floor.
- **`-[unladen]-` is a keyword: the narrow passage.** It stands alone on its gate. Beside `>>` it is refused
  `unladenOnDrop`, beside another owner `unladenCombined`, when the lock is read.
- **The passage prompt** is "Squeeze through" / "Wurm je er door".
- **Nested locks:** pass through, contained, shared (spec, "Nested locks", 2026-10-08).
- **Nest spot:** `a -&> b` on any connection, one per lock (`nestSpotsRepeated`). On a busy connection (a gate, drop
  or barrier on it) it is ignored, with a `yarn lock` note. An unused spot is a plain corridor.
- **Carve flexibility:** as much freedom as the layout allows; the only constraint is that a corridor's obstacles
  keep their order. A loop inside one region is fine in any carve; a loop that goes round a gate is `gateBypassed`.
- **Gate loops are allowed by design** (2026-10-06).
- **The dev floor is for testing lock mechanisms.** stoneGate takes dev pyramid 12.
- **Placement of stoneGate is Djoser, `expert_4`** (2026-10-06).
- **One source for a lock:** `src/game/locks/<name>.lock`, read at bake time through `parseLock`. No TypeScript copy.
  Header comments in `.lock` files are the designer's text.
- **Every mechanic piece is shared `default` art,** the same at every difficulty, with rank-neutral prompts. The
  brazier stays as decor; the torch is a standing torch.
- **The sequence tile is sandstone,** plain top; its state is the glyph's colour: dark when not walked, light blue in
  order, red out of order.
- **Art method:** a variant (lit, pressed, with a stone) is a Gemini EDIT of the painted master, not a fresh roll.
  Imports are unmasked with `--seat` when the scaffold mask clips the paint.
- **No unit tests on authored content.** `yarn lock` checks the locks; tests use made-up locks.
- **Stable world:** without `INCLUDE_DEV=1` the bake stays byte-identical. Saves are migrated, never reset.

## Waiting on the designer

- **Paint sand:** `yarn repaint default/regionSand`, then import it the way water was.
- **The stone pipe:** a hole in a wall where a stone is posted, another elsewhere where it comes out. Open: one-way
  or both; where it lands (a shelf plate, refused if full); telling paired holes apart. masonsRamp waits for it
  (unsolvable now: its chute sends a stone down a drop).
- **Lock placement:** where stones, the narrow passage, water and sequences enter junior and expert, and variety for
  repeats. Worked from `docs/game-design/lock-placement.md` (and `lock-curriculum.md`).
- **Unanswered:**
  - should `yarn lock` show every `checkLock` fault (e.g. `connectionRepeated`)?
  - correct the stale header comments in `waterMoves`/`sluice`/`tide`/`stoneOnAPlate`/`twoStones` `.lock` files?
    (They are the designer's text: do not touch without a yes.)
  - delete the "nothing else moved" test in `src/mods/puzzleSeeds.verify.ts`? It pins authored counts.
- **Not asked yet:** the corner squeeze, still the old two-leg slide.
- **`docs/playtest-backlog.md`:** the stoneGate phase 2 and 3 entries (plate icon clipping a door face's ring, the
  explorer washed out in the exit's light shaft while carrying, tapping a wall whose near side is a node).
- **Roadmap "Open after phase 2/3" lists** for the rest (barred regions under the explorer's weight, stale saves
  and stone-held doors, sequence locks on the playground bench, counterweight on a floor).

## How to work here

- **PATH:** put `~/.asdf/shims` first; `/usr/local/bin/node` is broken.
- **Tests:** vitest only as `yarn vitest run <files>`.
- **Looking at stories:** the Playwright MCP may be down. Start Storybook on a spare port and screenshot with
  `npx playwright` (1.61.1 matches the cached browsers). A Storybook on port 6006 is the designer's: leave it.
  Stories to judge: `Topology/Lock playground`, `Topology/NarrowPassage`, `App/Topology/Squeeze`,
  `Topology/Region barrier`, `Topology/Zipline ride`.
- **Content checks:** `yarn verify-content` (green); `yarn lock <name>` checks one lock.
- **Untracked `circle.lock` and `stoneGate.lock` at the repo root are the designer's.** Never stage them; stage by
  path, never `git add -A`. Other sessions commit to this branch: check `git status --short` first.
- **Dispatch subagents for implementation** to spare context. Ledgers and screenshots of past work live in
  `.superpowers/sdd/` (git-ignored).
