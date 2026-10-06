# Handover — story/journey-beats

For whoever picks this up next. Start with `game-design/story/IMPLEMENTATION.md` for what the story layer
is and what is built; this file is only where the branch stands.

Delete this file when the branch lands.

---

## Where it stands (2026-10-04)

- `main` with topology (#311) is merged in; CI passes. PR #304.
- The branch is **waiting**. Puzzle placement goes first, on a separate branch. Story lands after it.

## Next, once puzzle placement is on main

1. Merge `main` into this branch.
2. Rebake: `yarn generate-world` (do not hand-merge `src/data/generatedWorld.ts` or `carveLedger.json`).
3. Update `src/data/tierFingerprints.json`. All five tiers move because of story, on purpose: its spec
   authoring in every tier, plus the `s1` sign joining the master and wizard loot spread. Check that the
   puzzle branch did not move them for another reason (rebake with `main`'s `src/worldGen/spec` to compare).
4. `yarn verify`, then push and check `gh pr checks 304`.

## Not visible in a diff

- Topology's handle and torch buttons call `() => onSolved()`: on this branch `onSolved` takes an
  outcome argument, so passing it straight to `onClick` fails the type check.
