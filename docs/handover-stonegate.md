# Handover: stoneGate, art and engine

Branch `topology/mechanics` (worktree `portal-zinc`), main merged up to #315. A fresh session can carry on from
here. Read the roadmap first: `docs/superpowers/plans/2026-10-06-stonegate-roadmap.md`, then the spec
`docs/superpowers/specs/2026-10-04-stones-acceptance.md`. Trust `git log` and the ledgers in `.superpowers/sdd/`
over memory.

## Where things stand

| Phase                          | State                                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 1 Stones in the engine         | **Done.** Plan: `docs/superpowers/plans/2026-10-06-stonegate-phase-1-engine.md`.                                           |
| 2 Play with stones             | **Done.** Plan: `docs/superpowers/plans/2026-10-07-stonegate-phase-2-play.md`.                                             |
| 3 Narrow passage               | **Done.** Plan: `docs/superpowers/plans/2026-10-08-stonegate-phase-3-narrow-passage.md`.                                   |
| 4 Gate loops and nested stones | **Done.** Plan: `docs/superpowers/plans/2026-10-08-stonegate-phase-4-gate-loops.md`.                                       |
| 5 Art                          | **Landed** (see below). The brazier stays as decor.                                                                        |
| 6 Djoser                       | **Done.** Plan: `docs/superpowers/plans/2026-10-09-stonegate-phase-6-djoser.md`. stoneGate on expert_4 pyramid 5, floor 0. |
| 7 Zipline glide                | **Done.** Poses in `src/app/SiteMap/ridePoses.ts`, 200 ms a cell. Story `Topology/Zipline ride`.                           |
| Torch and flood                | **Done.** Plan: `docs/superpowers/plans/2026-10-09-torch-douse.md`. Story `Topology/Lock playground` → Torch and flood.    |

Phase 4 gives gate loops in the carve on laid floors (`topologyFaults`, `gateBypassed`, the fork seams), loops
inside one region in every carve, stoneGate on dev pyramid 12, the squeeze starting from the nearer side, one nest
spot per lock (`a -&> b`), and stones in nested locks (pass through, contained, shared: `stoneNestings`,
`poolStones`, the walk's `emptyHands`, `pooled`). The playground stories `Stone Passes Through`,
`Stone Stays Inside` and `Stones Shared` show one case each. What it leaves open is the roadmap's "Open after
phase 4"; its ledger is `.superpowers/sdd/2026-10-08-stonegate-phase-4-gate-loops/progress.md`.

### Built on top of phase 3

- **Squeeze choreography.** Head-on (N–S): the sprite is drawn over the opaque wall, fades behind it going north and
  emerges going south, 700 ms. Sideways (E–W): the wall is drawn over the explorer, 2000 ms, lifted 10. Story
  `App/Topology/Squeeze`.
- **Water covers every cell it bars.** A seen cell shows water, an unseen one fog; the playground conceals like the
  game.
- **Region gates are buildable.** waterMoves, sluice and tide play in the Lock playground; story
  `Topology/Region barrier`.
- **`yarn verify-content` is fully green.**

### The torch and the flood

The torch is a core control kind, `flame` (`.lock` keyword `torch`, `B torch @hall lit` for one burning from the
start). The player only lights it; a region barrier covering its region douses it, and it can be lit again once
uncovered. One pure function, `douseTorches` (`src/game/mechanismDoors.ts`), serves the lock walk, the floor's
solver and play; play writes a move and every douse it causes in one journeys write (`useDousedJourneys`). Four
locks light torches: `lessons/torch`, `lessons/doorWaitsForTwo`, `relay` and `stoneGate`, bound `flame: "torch"`.
The contract is `docs/mods/mechanic-contract.md` §3.3; the ledger is `.superpowers/sdd/2026-10-09-torch-douse/`.

The migration of the four locks (plan task 8) touched `src/game/locks/lessons/torch.lock`,
`src/game/locks/lessons/doorWaitsForTwo.lock`, `src/game/locks/relay.lock`, `src/game/locks/stoneGate.lock`,
`src/worldGen/spec/dev.ts`, `src/worldGen/spec/expert.ts`, `src/mods/topology/index.ts`,
`src/mods/topology/game/torch/meta.ts`, `src/app/SiteMap/SiteMapView.tsx`, `src/data/generatedWorld.ts`,
`src/data/carveLedger.json` and `src/data/tierFingerprints.json`. The plain bake changed stoneGate's floor
(`expert_4` pyramid 5, floor 0) and the hashes, nothing else.

### Every region stays reachable

`walkLock` refuses `regionLost` after `strands`: from every reachable state, every region some state stood in is
reachable again, leaving and coming back at `in` included (doused configs are reachable states like any other). The
floor walk refuses it per level (`nestedFree`), `yarn lock` prints `✗ a region is lost`, and the bake refuses it with
the stranding floors. The catalogue, the table, the world and the tests skip a `<name>-blocked.lock` file
(`lockTextsIn`); `yarn lock src/game/locks/<name>-blocked.lock` still draws one.

- **doubleBack** (designer, 2026-10-09): the old shape is `src/game/locks/doubleBack-blocked.lock`, unchanged, for
  the designer to fix or bring back. `doubleBack.lock` adds one line, `s2 >> s1`: S1 shuts the way into s1 and stands
  in s1, so s1 was sealed for good. A drop from s2 back into s1 keeps the lever shutting the way you came and the
  drop onto the branch. The cost: after the drop back the player can throw S1 back and walk home by rightLower, so
  "the drop is the only way home" no longer holds once s2 is reached. `out >> s1` would have kept it strict, but it
  carves worse (the world floor's seed had to be re-searched and the laid carve dropped below 30 of 40 seeds). The
  TypeScript twin `src/worldGen/spec/locks/doubleBack.ts` carries the same drop (`dropToS1`); the bake moved only
  doubleBack's floor (expert_1 pyramid 4, floor 0: the lock's one-ways, same seed and packing).
- **Claude's five:** cellar (lost `ledge`), clockwork (`west`), dropHome (`leverRoom`), relay (`r1`, and `r2` once r1
  had a way back) and seesaw (`west`) each lost the room their lever or torch stands in. Each now drops from `out`
  back into it (relay into `r1` and `r3`): the way back opens only after the lock is solved, so each trick and its
  shortest solution are unchanged. None of them is placed.

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

1. **Fold doubleBack's twin** once the designer answers how a drop beside a gate compiles (below).

Each runs with superpowers:subagent-driven-development: per task an implementer subagent and a task review, then a
final whole-branch review on the most capable model. Commit and push freely on this branch.

## Designer decisions to keep

- **Stones** (spec, "The rules"):
  - a stone is always on a plate or in the hand; stones have no ids; one in hand, no swapping;
  - a plate is written `p plate @r [stone]`; its states `-[p]-` and `-[p:empty]-` combine freely with other owners;
  - **the explorer's weight presses a plate** while the player stands on it; it never lets them through, and
    route-finding treats a door held only by their weight as shut;
  - a plate has three looks: raised, pressed, and pressed with a stone.
- **Every `>>` (drop, zipline) takes empty hands**, with nothing written; so do the stairs and the floor's way
  out. A stone never leaves its floor.
- **`-[unladen]-` is a keyword: the narrow passage.** It stands alone on its gate. Beside `>>` it is refused
  `unladenOnDrop`, beside another owner `unladenCombined`, when the lock is read.
- **The passage prompt** is "Squeeze through" / "Wurm je er door".
- **Nested locks:** pass through, contained, shared (spec, "Nested locks", 2026-10-08). A stone may leave a
  nested lock by its way out: that is not a floor exit (2026-10-09).
- **Nest spot:** `a -&> b` on any connection, one per lock (`nestSpotsRepeated`). On a busy connection (a gate, drop
  or barrier on it) it is ignored, with a `yarn lock` note. An unused spot is a plain corridor.
- **Carve flexibility:** as much freedom as the layout allows; the only constraint is that a corridor's obstacles
  keep their order. A loop inside one region is fine in any carve; a loop that goes round a gate is `gateBypassed`.
- **Gate loops are allowed by design** (2026-10-06).
- **The dev floor is for testing lock mechanisms.** stoneGate takes dev pyramid 12.
- **Placement of stoneGate is Djoser, `expert_4`** (2026-10-06).
- **One source for a lock:** `src/game/locks/<name>.lock`, read at bake time through `parseLock`. No TypeScript copy.
  Every `.lock` file names its designer on its first line (`// designed by: Matthijs` or `// designed by: Claude`).
  The designer's headers (doubleBack, stoneGate) are their text; a stale header on a lock Claude designed may be
  corrected.
- **The torch is a control kind of its own** (2026-10-09): a flood douses it; an activator is a floor key or a prize
  and no flood touches it. Plan: `docs/superpowers/plans/2026-10-09-torch-douse.md`.
- **Every mechanic piece is shared `default` art,** the same at every difficulty, with rank-neutral prompts. The
  brazier stays as decor; the torch is a standing torch.
- **The sequence tile is sandstone,** plain top; its state is the glyph's colour: dark when not walked, light blue in
  order, red out of order.
- **Art method:** a variant (lit, pressed, with a stone) is a Gemini EDIT of the painted master, not a fresh roll.
  Imports are unmasked with `--seat` when the scaffold mask clips the paint.
- **No unit tests on authored content.** `yarn lock` checks the locks; tests use made-up locks.
- **Stable world:** without `INCLUDE_DEV=1` the bake stays byte-identical. Saves are migrated, never reset.

## Waiting on the designer

- **The stone pipe:** a hole in a wall where a stone is posted, another elsewhere where it comes out. Open: one-way
  or both; where it lands (a shelf plate, refused if full); telling paired holes apart. masonsRamp waits for it
  (unsolvable now: its chute sends a stone down a drop).
- **Fog of a room-free lock region:** a lock region with no mechanism, plate or door (stoneGate's `hall3`) comes back
  fogged after a re-carve, because it has no room to carry the fog mark. No loot, state or key lives there. Options: a
  door stands in a bare region it leads out of (changes lock-walk counts, `nestedLocks.spec.ts`), or a room-free
  region's fog is restored with its neighbours'.
- **Lock placement:** where stones, the narrow passage, water and sequences enter junior and expert, and variety for
  repeats. Worked from `docs/game-design/lock-placement.md` (and `lock-curriculum.md`). stoneOnAPlate before Djoser's
  capstone (site 3 or 4): no stone lesson stands before it yet.
- **doubleBack-blocked:** `src/game/locks/doubleBack-blocked.lock` is the old doubleBack, kept for the designer.
- **doubleBack's TypeScript twin cannot fold yet.** `catalogueLock("doubleBack")` does not compile for the carve:
  `.lock` writes `leftLower >> in` as a connection of its own beside `in -[Y]- leftLower`, and `compileLock`
  refuses the pair `connectionRepeated` (the twin's drops join no connection). The world and the dev floor still
  read `doubleBackLock()` from `src/worldGen/spec/locks/doubleBack.ts`. Open: should `parseLock` write a drop beside
  a gate as a drop with no connection, or should `compileLock` take a pair joined by a gate and a drop?
- **Unanswered:**
  - correct the header comment of `stoneGate.lock` ("not placed yet, not buildable yet") now it stands in Djoser?
  - should `yarn lock` show every `checkLock` fault (e.g. `connectionRepeated`)?
  - delete the "nothing else moved" test in `src/mods/puzzleSeeds.verify.ts`? It pins authored counts.
- **Not asked yet:** the corner squeeze, still the old two-leg slide.
- **A lit torch in the dark:** in fog a lit torch differs from an unlit one only by its pool of light; the torch
  tile's flame icon looks the same either way. An art question. A doused torch is drawn by its unlit drawing.
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
