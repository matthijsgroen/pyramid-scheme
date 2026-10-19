# Handover — the starter release

The next release is **starter only, finished**: the new opening with Fez met on floor 0, the vivid starter art,
and themed rooms. This is the task queue for getting there, written so a session can pick it up cold and work
it with subagents while the user paints.

Read first, in this order:

1. [game-design/visual-direction.md](game-design/visual-direction.md) — ground plus metal, the light/dark floor
   rule, the 25 L\* steps, the readability research and its sources.
2. [game-design/themed-rooms.md](game-design/themed-rooms.md) — activities, precedence, every room dressed, who
   does what.
3. [game-design/story/review.md](game-design/story/review.md) — the opening and Act I tasks (the story half).
4. [instructions/prop-pipeline.md](instructions/prop-pipeline.md) — how a prop is made; and
   [instructions/repaint-queue.md](instructions/repaint-queue.md), which `yarn repaint` reads.

State at handover (2026-10-18), all on PR #322 (`story-and-artstyle`):

- The metal palette is built (`src/ui/tokens/metalPalette.ts`) and the interface wears it.
- `yarn rank-colour` measures every rank against master: wall face and props at least 25 L\* off the floor.
- Starter's **floor** and **wall face** are repainted and landed; its night is 0.3, its lamp 0.3 of full, its
  faces shadowed with `faceNight` 0.55. The room the explorer stands in is never dimmed (`drawnAsCurrent`).
- Starter's **props** are still the cellar's — the biggest readability gap (14 L\* off the floor against 25).
- The release gate stays `expert` in main; it is set to `starter` when releasing.

## The queue

Owner **C** is Claude (run with subagents, one task per subagent with a review, per the user's preference);
**U** is the user. Work top to bottom; tasks in one phase may run beside tasks in another when they touch
different files.

### A. Tooling, so painting needs no round trip — C

| #   | Task                                                                                                                                                                                                                                                                                                                                                | Done when                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| A1  | `yarn repaint <key> --land`: take the newest file in `~/Downloads`, save it as the entry's master (webp, under `art/masters/`), run `make-seamless` for a floor (both axes) or a face (`--axis=x`), import with the entry's own `**Import:**` line, then print `tile-stats` and the rank's `yarn rank-colour` row with an import-or-re-roll verdict | a spec on made-up files; one real landing by the user    |
| A2  | A Storybook story per rank, "<rank> on the floor": the new floor with every prop of the rank and one room per activity, so a batch is judged in one look                                                                                                                                                                                            | the starter story renders with the landed floor and wall |
| A3  | Develop-mode jumps to the story rooms: the meeting room on `starter_1` floor 0, Ipi's tomb room, Henut's wall                                                                                                                                                                                                                                       | a dev panel button lands the explorer in the room        |

### B. Starter art that needs no new geometry

| #   | Owner       | Task                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1  | U           | `yarn repaint starter/threshold`, then `starter/arch` — prompts are in the queue                                                                                                                                                                                                                                                                                                                                         |
| B2  | C           | Rewrite the queue entries for every existing starter prop and wall item for the light-rank rule: at least 25 L\* darker than `#d8c8a8`, saturated terracotta / wood / red ochre / turquoise, a dark base or contact shadow. Scaffolds exist. Kinds: jarRack, shelf, basin, mat, hanging (the striped awning), lamp, brazier, offeringTable, offeringTable-2, statue, shrine, pillar, rubblePile; wall: niche, tallyBoard |
| B3  | U           | Paint B2's entries in short sessions with `--land`                                                                                                                                                                                                                                                                                                                                                                       |
| B4  | U, optional | Re-roll `starter/wall-face` as shadowed warm mudbrick if the `faceNight`-darkened face reads too grey                                                                                                                                                                                                                                                                                                                    |

### C. Themed rooms in code — C

Start with the writing-plans skill on `themed-rooms.md`, then subagent-driven execution.

| #   | Task                                                                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | The activity table in `src/game/`, `PROP_ROLES` derived from it; the 6 new `DecorationKind`s (scale, weightsTable, basketStack, bales, counter, scribeDesk) with placeholders                       |
| C2  | The carve: purpose by precedence (story, mechanism, patron, treasure/shop, activity); every room with free cells dressed; props out of the node's cell; lead and companion from the room's activity |
| C3  | Story rooms borrow activities: the meeting room is `selling`, Ipi's room `ledger`                                                                                                                   |
| C4  | Re-bake `generatedWorld.ts` and the tier fingerprints (`yarn generate-world`); confirm saves untouched                                                                                              |

### D. New starter props — C models, U paints

| #   | Owner | Task                                                                                                                                   |
| --- | ----- | -------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | C     | Scaffolds per `prop-pipeline.md` (steps 0–2) for scale, weightsTable, basketStack, bales, counter, scribeDesk, and their queue entries |
| D2  | U     | Paint them with `--land`                                                                                                               |

### E. The opening (story) — from `story/review.md` § The opening

| #   | Owner                | Task                                                                                                                                                                                                                                |
| --- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | C                    | The meeting room on `starter_1` p1 floor 0: `pathPuzzles: 1`, `nodes: [{ where: "last", encounter: "conversation", activity: "selling" }]` (its set, C3); `sceneFor` for `starter_1`; a line with no portrait (a voice in the dark) |
| E2  | C drafts, U approves | The meeting scene; `arrival.starter_1` rewritten explorer-only; `pyramidIntro` as the explorer's exterior hint; `mapPiece*` as Fez's                                                                                                |
| E3  | C                    | The tap-hint atom; explorer portrait mirrored on the right (re-crop if the cut map shows)                                                                                                                                           |
| E4  | C                    | Copy: `welcome*`, cut `chooseExpedition`, one word for journey/expedition, "tik" not "klik", the arrival fired where its place is                                                                                                   |

### F. Release — C prepares, U releases

| #   | Task                                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------- |
| F1  | The reshape release steps in [instructions/world-reshape-release.md](instructions/world-reshape-release.md) — it resets saves |
| F2  | `LAST_RELEASED_DIFFICULTY = "starter"` on the release                                                                         |
| F3  | Changelog, and `docs/playtest-backlog.md` for whatever was not played                                                         |

## How a session works

- **C** keeps the repaint queue stocked in the order that matters and lands a whole painting batch in one pass:
  commit, tokens, docs, playtest backlog.
- **U** paints whenever there is a moment: `yarn repaint` → generate → `yarn repaint <key> --land` → look in the
  "<rank> on the floor" story → a bad roll gets a `**Re-roll:**` line in its entry.
- Story is tested in Storybook's story beats and, in the game, through the develop-mode jumps.

## After the release

- **A rank skin for the narrow passage** (`-[unladen]-`, drawn as `default/narrowAcross` and `narrowAlong`).
  A ward pocket keeps the rank it belongs to, so a starter pocket on an expert floor can hold a lock with a
  narrow passage standing in the merchant's storehouse. Starter's skin is crates stacked to leave the gap.
  This is the one deliberate exception to "mechanic art is the same at every rank": the passage reads by its
  SHAPE — an opening you only just fit through — and stacked crates keep that shape, where a torch or a lever
  is read by the object itself. Needs a scaffold with the default passage's footprint and opening, and the
  renderer picking `<rank>/narrowAcross` with `default/` as the fallback.
