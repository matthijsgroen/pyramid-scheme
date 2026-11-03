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

State (2026-11-03): junior has 29 tiles, all in the old palette; no activities in code; no designed rooms; all 16
junior floors carry a lock (the three stand-ins are on expert floors). The new palette is in `tileMaterials.ts`.

## The queue

Owner **C** is Claude, **U** is the user.

### A. Surfaces — U paints, C lands

| #   | Owner | Task                                                                                    |
| --- | ----- | --------------------------------------------------------------------------------------- |
| A1  | U     | `junior/floor`, then `junior/wall-face`, then `junior/threshold` (prompts in the queue) |
| A2  | C     | Land each, measure, re-sample the junior tokens from the landed floor and face          |
| A3  | C     | Queue `junior/arch` in the new palette                                                  |

### B. Activities in code — C, moves the carve

| #   | Task                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | The six junior activities in `src/game/activities.ts` (banquet, dressing room, household shrine, garden court, bedroom, bakery-brewery)            |
| B2  | The nine new kinds with placeholders and footprints: banquetTable, harp, dressingTable, wigStand, pottedTree, bed, headrest, grindstone, breadOven |
| B3  | Re-bake; junior floors move, starter's freeze stays green                                                                                          |

### C. Designed rooms — C writes, U reviews, moves the carve

| #   | Task                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------- |
| C1  | At least one `.room` per junior activity in `src/game/rooms/junior/`, crisp and ordered, plus big rooms |
| C2  | Placements per junior journey in the world spec; a look per room in the journey inspector               |

### D. Props — C prepares, U paints

| #   | Owner | Task                                                                                                |
| --- | ----- | --------------------------------------------------------------------------------------------------- |
| D1  | C     | Scaffolds and queue entries for the nine new kinds (B2)                                             |
| D2  | C     | Queue entries for the 26 existing junior props in the new palette, each in its own material colours |
| D3  | U     | Paint them with `--land`                                                                            |

### E. Release — C prepares, U releases

| #   | Task                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------- |
| E1  | Freeze guard for junior: every junior floor's carve recorded, the same way `starterCarve.json` does        |
| E2  | `LAST_RELEASED_DIFFICULTY = "junior"`                                                                      |
| E3  | Release checks filed under junior in `review-camp-release.md` §0; playtest backlog for what was not played |

## Open

- Story: which junior beats the release needs (`story/review.md`).
- Perks: "junior's four blank floors" (`story/IMPLEMENTATION.md` §4) — the only tier with no new verb.
