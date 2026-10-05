# Handover: designing topology locks

Branch `topology/lock-sketch`, rebased on `main` after #311 (squash `64a72a1a`). Written 2026-10-04 to
resume the lock design work in a new session.

## What exists

**`yarn lock`** — a design tool for topology locks (levers, torches, keys, boards, drops, water, tiles,
stones). Write a lock as text, see it drawn as ASCII, proved sound, measured, and printed as the shared
`Lock` JSON.

```
yarn lock                          every lock in the catalogue
yarn lock src/game/locks/relay.lock
yarn lock my.lock --watch          design mode: redraws on save, no JSON; a new file starts with the notation
yarn lock --help                   the notation
```

What it reports, above the map: every region reachable · solvable · dead ends · gates open at the start ·
gates that must show what they wait for · what cannot be built yet. Below the map: the cheapest route,
and what the lock could do without (a piece that does nothing, a drop that is only a shortcut, a lock
one action solves).

| file | job |
| --- | --- |
| `src/game/lockNotation.ts` | text → shared `Lock` (`parseLock`, `LOCK_SYNTAX`); refuses by line |
| `src/game/lockWalkSpec.ts` | `Lock` → `LockSpec` for the soundness walk (`walkSpecOf`), plus start/face/buildable reports. NOT main's `lockCompile.ts`, which compiles a `Lock` to floor vocabulary for the carve |
| `src/game/lockReview.ts` | cheapest route, quality notes, unreached regions |
| `src/game/lockDraw.ts` | the ASCII drawing |
| `src/game/lockCatalogue.ts` | reads `src/game/locks/*.lock` and `locks/lessons/*.lock` |
| `scripts/lock.ts` | the CLI |
| `src/game/lockAuthoring.ts` (main) | the shared `Lock` type — the target; owned with the engine session |

Design docs: `docs/game-design/lock-curriculum.md` (the curriculum — read first), spec
`docs/superpowers/specs/2026-10-02-lock-text-notation-design.md`, the engine contract
`docs/mods/mechanic-contract.md`.

## The design so far

**Rule (`lock-curriculum.md`): a mechanic appears alone before it appears in company.** Junior teaches
single mechanics as plain floor content ("lessons", one action). Expert gets the first locks, with
doubleBack as capstone. Master gets the rest. **Wizard gets sand puzzles, not locks.** A lock is only for
multi-step items; a single board choice is a switch fork.

**18 locks** in `src/game/locks/`: dropHome, cellar, twoLamps, overlook, doubleBack, seesaw, lamplighter,
keyring, relay, clockwork, observatory, tide ⚠, sluice ⚠, plates ⚠, twoStones ⚠, masonsRamp ⚠,
counterweight ⚠. **9 lessons** in `locks/lessons/`. Each lock is held to a test that takes away its
load-bearing piece (`lockCatalogue.spec.ts`). ⚠ = needs engine work: region gates (water), sequences
(tiles), stones.

**Stones (prototype, this branch only).** A stone rests on a plate or is carried, one at a time; lifting
it empties the plate. A plate opens a way while weighted (`-[p]-`) or while empty (`-[p:empty]-`), or opens
nothing (a shelf); the player never presses a plate. A door
on two plates needs two stones (refused otherwise). `-[unladen]-` = empty hands only (narrow passage,
zipline). A stone never leaves its floor (the stairs and the way out take empty hands), so
return visits are proved by the walk. Carried beside the `Lock` as `weights` — **a proposal, not in the
shared contract yet.**

## Per-pyramid mapping by setting — PROPOSED, not yet in the curriculum doc

The curriculum doc holds the first placement. This later mapping follows each journey's setting (from
the world specs, `journeys.ts`, and the story branch `story/journey-beats`). It was not yet confirmed.

| journey | p1 | p2 | p3 | p4 | p5 |
| --- | --- | --- | --- | --- | --- |
| junior_1 Sacred Ibis (water, Thoth) | leverOpensADoor | **waterMoves** | dropDown | — | — |
| junior_2 Artisans | leverOpensADoor | boardPicksTheWay (existing switch fork) | torch | leverSwapsDoors | — |
| junior_3 Temple of Thoth (writing) | leverOpensADoor | **tilesInOrder** | dropDown | boardPicksTheWay | — |
| junior_4 Lighthouse (light) | torch | boardPicksTheWay | dropDown | **doorWaitsForTwo** | leverSwapsDoors |
| expert_1 Valley of the Kings | twoLamps | dropHome | cellar | **doubleBack** (Anubis) | — |
| expert_2 Karnak (sun) | dropHome | twoLamps | overlook | **doubleBack** | — |
| expert_3 Nile Delta (flood, overgrown 0→1) | cellar | **sluice** | overlook | doubleBack | **tide** (Sobek) |
| expert_4 Djoser (building site) | dropHome | cellar (has a floor key) | **plates** | overlook | **doubleBack** |
| master_1 Giza | relay (portcullis) | lamplighter | keyring (replaces KEY_CHAIN) | clockwork (Horus) | — |
| master_2 Book of the Dead | lamplighter | **plates** (spells) | keyring | **seesaw** (weighing) | observatory |
| master_3 Curse of the Pharaohs | relay | lamplighter | keyring | seesaw | clockwork (Sekhmet) |
| master_4 Nefertari | observatory | clockwork | keyring | relay | seesaw |

Stone locks were designed after this table: natural homes are Djoser (masonsRamp), Giza (counterweight),
Book of the Dead (twoStones, the weighing). Check master_2: the story arc's decoy and real seals sit on
its floors 1 and 3.

## Mechanic pitches — not decided

| pitch | what | fits | cost |
| --- | --- | --- | --- |
| **weight** | carried stones on plates | Djoser, Giza, Book of the Dead | **prototyped here** |
| **ferry** | a boat that crosses with you, only from its side | Nile Delta, Ibis, solar barque | walk move that also changes state |
| **water levels** | the Nile rising in steps; some gaps only crossable flooded | Delta, Ibis | a stepping control; builds on the flooded art |
| **turntable** | a room that faces one exit, turns one way only | Thoth, Giza, Nefertari | cyclic control, cheap |
| **crumbling floor** | a passage that becomes one-way after you cross | Curse of the Pharaohs | same walk move as ferry |

Sokoban-style pushing was rejected: players move by tapping nodes, and a pushed stone can be cornered for
good.

## Open decisions for the owner

1. Confirm the per-pyramid mapping above, then fold it into `lock-curriculum.md` (replacing its first
   placement) and add the pitches section.
2. **Place doubleBack in a real pyramid** (suggested expert_1 p4). It is the one lock the engine builds
   today (`src/worldGen/spec/dev.ts:93`, bound to lightbeamSwitch / handle / zipline). Caveats: its region
   appetites did not carve on the dev floor (all regions `free` there), and changing an existing floor's
   shape affects saves — follow the save-migration rule or ship with the world reshape release.
3. **One source for doubleBack.** Main holds it as TypeScript (`src/worldGen/spec/locks/doubleBack.ts`),
   this branch as `src/game/locks/doubleBack.lock`. Check whether the bake runs in Node so the world spec
   can read the `.lock` file; otherwise they will drift.
4. Pitch the stone proposal to the engine session: acceptance criteria in
   `docs/superpowers/specs/2026-10-04-stones-acceptance.md`.
5. Integrate the branch: PR or keep designing first.

## Working with the engine session

Another Claude session owns the runtime (worktree `sundowner-jasper`). The shared `Lock` type is the
contract; disagreements go through the owner, never a variant. Settled with it: every-gate `and` is
honoured by the runtime; toggles are `a`/`b`; keys are activators; a plain corridor is a `connections`
pair; one-ways are barriers with ids. Their open items that affect this work: T15 (two regions joined by
a bare corridor are merged in their solver), a region only drops reach does not carve, region gates and
sequences are `built: no`, the realisation binding (`realisations` at pyramid level, as dev.ts shows).

## Deferred findings from the branch review

- a fork gate written last on its join (`hall >> -[Y]- in`) — an engine reading `barriers[0]` refuses it
- a sequence tile in the region it bars is not refused by the parser
- a drop's quality note removes its whole join, gate included
- report order differs from the spec (✓ solvable printed before ✗ a dead end)
- a join carrying a drop and gates draws as a bare drop, gates in a note
- the sequence test checks transitions, not reachable behaviour
- a region's appetite written twice: the last silently wins

## Loose ends

- `topology/lock-sketch-backup` — the branch before the rebase; delete once the rebase is trusted.
- `circle.lock` in the worktree root — the owner's own sketch, untracked, left alone.
- Verify after resuming: `yarn vitest run src/game/lock*.spec.ts && yarn lock` (full suite was 4921/4921).
