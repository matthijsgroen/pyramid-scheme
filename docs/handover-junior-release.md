# Handover — the junior release

Junior ships shortly after starter (designer, 2026-11-03): starter alone is little content. This is the task queue
for getting there, written so a session can pick it up cold while the user paints.

Read first:

1. [game-design/visual-direction.md](game-design/visual-direction.md) — junior is light orange and crisp; props
   wear their own colours, copper only as accent.
2. [game-design/themed-rooms.md](game-design/themed-rooms.md) § Junior — the six activities and their props.
3. [instructions/room-prefabs.md](instructions/room-prefabs.md) — how a designed room is written.
4. [instructions/repaint-queue.md](instructions/repaint-queue.md) — what `yarn repaint` reads.

## What decides the order

After the starter release saves are never reset again. No player reaches a junior floor before junior is released,
so **junior's carve may change freely until then** — and not after. Everything that moves a wall (activities, new
prop kinds, designed rooms, the bake) lands before the release; painting moves no wall and can land any time.

State (2026-11-10): the six activities, the nine new kinds and the junior rooms are on `main` (#355); the junior
art waits in PR #383; Henut's rooms, her wall's Hathor answer and the scribes at Thoth wait in PR #382, which moves
starter's and wizard's loot by one chest each and needs the designer's choice before it merges. A money-fill PR is in
flight too. The release checks are filed (`review-camp-release.md` §0, Junior) and the unplayed junior work is in
`playtest-backlog.md`.

## The queue

Owner **C** is Claude, **U** is the user.

### A–D. Surfaces, activities, rooms, props — done or in review

- B (activities, kinds, re-bake) and C (designed rooms, placements) are on `main` (#355).
- A and D (surfaces, the 26 props in the new palette, the nine new kinds, the tall wall items) are in PR #383.

### E. Release — C prepares, U releases

| #   | State                            | Task                                                                                                       |
| --- | -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| E1  | Tooling ready, record at release | Freeze guard for junior: every junior floor's carve recorded, the same way `starterCarve.json` does        |
| E2  | U, at release                    | `LAST_RELEASED_DIFFICULTY = "junior"`                                                                      |
| E3  | Done                             | Release checks filed under junior in `review-camp-release.md` §0; playtest backlog for what was not played |

**Recording E1.** `yarn junior-freeze` runs in `yarn verify` and in CI's build job, and is skipped while
`src/data/juniorCarve.json` does not exist. Record it right before the release, after the last junior bake (PR #382,
the money fill and anything else that moves a junior wall merged and baked): run `yarn junior-freeze:record` on a
clean, up-to-date `main`, check the file names every junior floor, and commit it with the release. From then on
`yarn junior-freeze` fails whenever a junior floor carves differently, and the file changes only with a save
migration, as `starterCarve.json` does. Both tiers share `src/app/SiteMap/tierCarveFreeze.testing.ts`.

## What remains

- PR #382: the designer's choice on the moved starter and wizard chest, then merge and re-bake.
- PR #383 and the money fill merged.
- The last junior bake, then E1's recording and E2, then `yarn release`.
- The checks in `review-camp-release.md` §0, Junior, ticked; the designer choices listed there decided.

## Open

- Story: which junior beats the release needs (`story/review.md`).
- Perks: "junior's four blank floors" (`story/IMPLEMENTATION.md` §4) — the only tier with no new verb.
