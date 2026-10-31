# Whole Rooms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** No room on a floor is bitten: two floor-claiming rooms stand one lattice node apart only when they merge.

**Architecture:** One placement rule in `hangBranches` (generalising seatChambers' NEAR rule) keeps floor-claiming
rooms apart unless they merge; one helper `roomsMerge` decides "merge" for both the carve and the map
(`roomClaims`); a retry guard in `finishAttempt` is the backstop. Ported from the approved spike.

**Spike (reference, port, do not copy blindly):** worktree
`/private/tmp/claude-501/-Users-matthijsgroen--warp-worktrees-pyramid-scheme-prickly-gila/345327e8-6237-4038-b062-d691e79b5e33/scratchpad/no-bites`,
its diff `scratchpad/no-bites.diff`, report `scratchpad/no-bites-report.md`, diagnosis `scratchpad/bitten-rooms.md`,
classifier `scratchpad/bites/bites.verify.ts`.

## Designer rulings (2026-10-31)

- Rooms of different sections (or gated/sealed) never stand one node apart: no bite, no merge.
- Same-section rooms one node apart merge only if already joined: ortho by a passage; diagonal by a corner node
  with a passage to each (the shared pillar opens). Unjoined same-section pairs are kept apart; no connector is carved
  (it would be a shortcut past what stands between them).
- The spike's look is approved ("het ziet er wel echt goed uit").

## Global Constraints

- One rule everywhere, no per-tier/per-floor exception. Deterministic from the address seed.
- Mod off = same carve. Core never names a mod. Tests use made-up floors; never pin authored content.
- Comments describe current state only. Commits one line + the two attribution lines. Changelog one line.
- `yarn test` green at the end of each task; bake and verify only in Task 2, each under `timeout 900`.

## Review Focus

1. Two floor-claiming rooms of different sections one node apart (ortho or diagonal) never occur on a carved floor.
2. A diagonal merge opens the shared pillar only when a corner node joins both; otherwise the pair is kept apart.
3. The same seed carves the same floor twice; mod off carves the same floor.
4. A floor the rule cannot satisfy falls to the retry guard, and the guard's refusal names the two rooms.

---

### Task 1: The rule, the merge helper, the backstop

**Files:** `src/game/carve/hangBranches.ts`, `src/game/carve/roomFootprint.ts` (`roomsMerge`),
`src/app/SiteMap/roomClaims.ts`, `finishAttempt` (backstop), their specs.

- [ ] Failing tests (made-up floors): `"two rooms of different sections never stand one node apart"`,
  `"diagonal same-section rooms merge through the pillar only when a corner joins them"`,
  `"an unjoined same-section pair is kept apart"`, `"the backstop refuses a bitten room naming both rooms"`,
  `"a bitten floor carves the same twice"`.
- [ ] Implement from the spike.
- [ ] Update the six specs that pinned old layouts (reserveRooms ×3, reserveJunctions, seatChambers, SiteMapView
  raster size) so they assert behaviour on a made-up floor, not a layout.
- [ ] Explain why starter floors claim 126 floor rooms instead of 143 (report it; fix only if it is a bug).
- [ ] `yarn test` green, check-types, lint 0 errors. Commit `fix: rooms are never bitten`.

### Task 2: Rebake, gates, look

- [ ] `timeout 900 yarn generate-world`; `yarn verify-content` split per file under `timeout 900`; `yarn test`;
  `yarn lock`; lock-placement "Placed N of N" not lower. Bites classifier: 0 on starter floors.
- [ ] Re-snapshot `starterCarve.json` and the starter hash in `tierFingerprints.json`.
- [ ] CHANGELOG `## Unreleased`: `Rooms keep their full shape`.
- [ ] Screenshots of all 25 starter floors; STOP for the designer. After approval commit
  `chore: rebake with whole rooms` and push.

Parked: 12 master/wizard floors climb to ~31 attempts and ~51×51 grids under the rule (spike). Those tiers ship later;
revisit with the room authoring loop.
