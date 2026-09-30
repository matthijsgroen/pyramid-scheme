# Where the player is standing — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** pressing an arrow or a corner dot moves the character, and the test that is supposed to catch it failing asserts the real store.

**The bug.** `positionKey` does two jobs. It is the durable save address — the last authored PLACE, which is what a save resumes at after a re-carve — and it is also the live cell the map draws the explorer at (`useAssembledFloor.ts:390` derives `explorerPos` from it and nothing else; `position` is dead except for the V3 migration at `cellIdentity.ts:267`). `updatePosition` (`useJourneys.ts:409`) refuses any `~`-addressed cell, added deliberately in `035c80a6` *"a saved position names a place, not a bend in a corridor"*. So walking onto a corridor or a bare fork is revealed by `markCellExplored` and never recorded as a position, and the character stays where it was. Arrows and corner dots are one code path (`onCellClick` via `offeredTargets`), which is why all three sightings are this one fault.

**Why the guard is right and stays.** `cellAddress.ts` states it: a `~ordinal` *"resolves inside one carve and deliberately resolves to nothing after the floor moves"*. It is a within-carve identity, which is exactly what a LIVE position is and exactly what a durable one is not. The two jobs are already distinct in the design; only the field is shared.

**The shape, decided by the owner 2026-09-30:** a second field.

- `positionKey` keeps its meaning and its four tests untouched — the last authored place.
- `standingKey` records every cell the player walks onto, bends included.
- `explorerPos` reads `standingKey`, falls back to `positionKey` when the carve has moved under it, then the entrance.

## Global Constraints

- `yarn check-types` is the truth. **IDE diagnostics in this repo have been wrong on EVERY occasion.** Ignore them; run the command.
- `yarn eslint <paths>` only. **NEVER `yarn lint --fix <path>`** — it does not scope and rewrites the repo.
- **NEVER `git add` / `git commit` / `git stash`.** The controlling session commits.
- **NEVER `pkill` / `killall`.** Other worktrees and the owner's own playtest run dev servers on this machine. Kill only a PID you started.
- **NEVER run `INCLUDE_DEV=1 yarn generate-world`.** `yarn validate-world` is safe with the flag.
- `yarn generate-world && md5 -q src/data/generatedWorld.ts` must stay `7d07cfc0981759bbdd8c220bea6bfa57`. If you dirty it, restore it.
- This slice changes no carve behaviour, so it needs no carve baseline. If you find yourself touching `src/game/siteAssembler.ts`, stop and report — you are in the wrong slice.
- Comments state CURRENT state and why, never history.
- **Tests assert EVERY element of a collection, never a representative one.**
- **Every refusal is watched failing** — break the thing it guards, quote the red output.
- There are NO existing saves.
- Delete every scratch file you create.

---

### Task 1: The invariant asserts the store

**Do this FIRST, and watch it go red before Task 2 exists.** `movementInvariant.spec.ts` is exhaustive over `doubleBack`'s whole reachable state space and it came back green while the game was visibly broken. It is not that the fault is below the test — it is that the test's own fake is not the store. `buildHarness` writes

```ts
updatePosition: (_journeyId: string, address: string) => { store.positionKey = address },
```

with no `isPlaceAddress` guard, while its comment claims it replicates "exactly the two writes `useJourneys` makes ... rather than a mock that only records that a call happened". A fake that is kinder than the real thing cannot fail for the real thing.

**What to build:** the harness drives the REAL store. `createJourneysV3Api` (`useJourneys.ts:193`) takes `{ journeys, setJourneys, journeyData }` over plain mutable state — `useJourneys.spec.ts`'s own `run` helper shows the pattern, and `makeStoredJourney` / `makeJourneyData` are already there. Build the API over a single stored journey and let `markCellExplored`, `updatePosition`, `getMechanismStates` and `setMechanismState` all come from it, so the walk asserts what a player's save actually holds.

Keep `patch` working — the two "the guard actually fires" tests corrupt one write on purpose and must stay able to.

**Verify:** the doubleBack walk and the ordinary-floor walk BOTH go red, with a violation naming a corridor corner the explorer failed to follow to. **Quote that red output in your report** — it is the first time this bug has been visible to the suite, and it is the whole point of the task. Then stop; do not fix it.

---

### Task 2: A live standing cell

Only once Task 1 is red.

**`StoredJourneyStateV3` gains `standingKey?: string | null`.** Optional, so no `cellKeyVersion` bump and no migration — an absent one reads as "nowhere yet" and falls straight through to `positionKey`.

- `updatePosition` writes `standingKey` unconditionally and leaves the `positionKey` guard exactly as it is.
- **Every place that clears `positionKey` must clear `standingKey` in the same breath** — `useJourneys.ts` lines 257, 292, 305 and 323, where a journey starts, resets or advances a level. A new level that resumes standing on the old one's bend is this fix's own regression, so assert all four, not one.
- `useAssembledFloor` takes the standing cell alongside `positionKey` and resolves `standingKey` → `positionKey` → `grid.entrancePos`, keeping every existing reason the current code rejects a resolved cell (void, and `isSealedWayOut`) applied to whichever one it settles on.

**The design judgement this task owns** (state what you chose and why in the report): `SiteMapScreen.tsx:69` picks the floor with `floorOfPosition(journeyState?.positionKey, …)`. Decide whether that should read the standing cell first and say why. Both fields name a floor, and today they can only disagree in the window between a stair's arrival write and the next place — but "can only disagree today" is the kind of claim that stops being true.

**Verify:** Task 1's two walks go green. The four `updatePosition` tests from `035c80a6` still pass untouched — if you find yourself editing one, stop and report, because `positionKey`'s meaning was not supposed to move. `yarn check-types` clean, `yarn eslint` clean on every file you touched.

---

### Task 3: Watched failing, and played

- Re-assert that the strengthened invariant has teeth for THIS fault specifically: restore the old unguarded fake in a scratch edit, confirm the walk goes green again (proving the fake was the blindfold), then put it back. Quote both outputs.
- `INCLUDE_DEV=1 yarn validate-world` still valid, lock sweep unchanged.
- **Write playtest instructions for the owner**, naming what to try: walk `doubleBack`'s corner dots, cross the switch gate, walk to and from the lever, and leave and re-enter the site to confirm the resume still lands on a room rather than a bend.
