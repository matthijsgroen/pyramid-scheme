# Regionless battle and pair puzzle — design

Three new puzzle families for the higher tiers. The two puzzles they are modelled on were shown by the user as
screenshots from a phone app ("Ninjas", "Pandas").

## Intent

More puzzle variety above starter. Both mechanics are well known outside the game, so their solving literature can
feed the deduction ladders and hints directly:

- **Ninjas** is a regionless Star Battle with blocked cells. Known as *Star Battle (Regionless)* on Logic Masters and
  as *Battle Star* in the UK Puzzle Association guides. The two-per-line form on 10×10 is the regionless twin of
  *Two Not Touch*.
- **Pandas** is *Tents* (also *Tents and Trees*, *Campsites*; Simon Tatham's collection calls it Tents).

The funerary role is the biggest gap in rooms reached (`journeys.md` §9). These families add funerary pool depth.

## Goals

1. **`regionless-battle`**: regionless star battle, one piece per row and column.
2. **`regionless-twin-battle`**: the same with two per row and column, its own family — the twin stars precedent
   (`docs/game-design/puzzles/star-battle.md` §11: a tier may make reasoning harder, it may not change the task).
3. **`pair-puzzle`**: Tents.

Family ids name the puzzle type, never a skin element (user's rule). Scarabs, mummies and sarcophagi are skins.

## Non-goals

- The starter tier. Starter has enough puzzles; these are for the higher tiers.
- Deciding the exact entry tier per family. That is a separate session reviewing which families enter at which
  tier, across all families (user's request). Until then see "Entry tier" below.
- More skins. Each family ships with one skin; skins get extended later (user's words).
- Painted art. Pieces are drawn in code like `Star` and `Farmstead` (`src/mods/puzzle/app/starBattle/glyphs.tsx`).
- Authoring these families into specific worlds/locks. They join pools through their tags; the world bake decides.
- Changing star battle. Its neighbour shading stays (see "Spent squares").

## Anti-goals

- A first board that hands over the answer. The lowest tier each family has must still need a deduction
  (`feedback_starter_must_deduce`).
- One mechanic's skin reused by another. Mummies belong to pair puzzle only.

## Rules

### Regionless battle / regionless twin battle

- Square grid. Some cells are walls: nothing can be placed in them.
- Each row and each column holds exactly **N** pieces (N = 1 for regionless battle, 2 for regionless twin battle).
- No two pieces touch, diagonals included.
- Walls only block their own cell. They do not split a row or column into separate stretches. A row's count is over
  the whole row.
- Player marks: piece, and "not here" (the dark mark star battle already has).

### Pair puzzle

- Square grid with anchors printed on some cells. Row and column counts printed outside the grid.
- Every anchor gets exactly one piece orthogonally next to it, and every piece belongs to exactly one anchor (a
  one-to-one pairing).
- Each row and column holds exactly the number of pieces its count says.
- No two pieces touch, diagonals included.
- Player marks: piece, and "not here".
- Count clues read as open, met, or broken (the original shows dark, blue and red).
- Uniqueness is over piece positions only, as in standard Tents. Which anchor a piece belongs to may be ambiguous,
  and a finished board does not show the pairing. (Claude's call.)

## Skins (one each)

- **Regionless families:** scarabs, on a pyramid-floor look (sandstone tiles; walls as raised stone blocks).
- **Pair puzzle:** sarcophagi as anchors, mummies as pieces.

## Spent squares

The eight squares around a placed piece are drawn as spent (receded), exactly as star battle does with
`ruledOutByStars` (`src/mods/puzzle/game/starBattle/starBattle.ts:159`), in all three families. So `touch` stays
propagation, not a step: free in grading and never answered by a hint (star-battle.md §3, T0).

The user first wanted star battle's shading removed as too easy, then kept it once it was clear that removing it
also turns `touch` into a hint answered after every star. The same reasoning applies to the new families.

## Entry tier

Not starter. One new family per empty tier (user approved, 2026-10-30), so no tier introduces more than one new rule
set. The tier session may still move them.

| family                   | enters | boards                                                                  |
| ------------------------ | ------ | ----------------------------------------------------------------------- |
| `regionless-battle`      | expert | about 7×7 at expert → 9×9 at wizard; fewer walls as tiers rise           |
| `pair-puzzle`            | master | about 8×8 at master → 10×10 at wizard; harder through ambiguous pairings |
| `regionless-twin-battle` | wizard | 10×10                                                                   |

Walls are the regionless families' gifts, the way small regions are in star battle §5. The first tier a family
enters at is its teaching tier: easiest settings of that family, whatever the tier's name.

Why these tiers, measured on `camp/home-and-loot` at `f9a63d65` (every pyramid floor carved, keyed by the floor's own
difficulty):

| tier    | pyramid floors | walkable cells/floor | rooms/floor | rooms | puzzle families | new |
| ------- | -------------- | -------------------- | ----------- | ----- | --------------- | --- |
| starter | 15             | 47                   | 5.5         | 82    | 5               | 5   |
| junior  | 20             | 74                   | 7.8         | 155   | 13              | 8   |
| expert  | 25             | 104                  | 14.9        | 373   | 13              | 0   |
| master  | 42             | 133                  | 10.9        | 457   | 13              | 0   |
| wizard  | 69             | 115                  | 10.8        | 745   | 13              | 0   |

Rooms include reflex traps. Junior already introduces 8 rule sets; expert to wizard introduce none while rooms per
family grow from about 29 to 57. Tombs stay at 5–6 rooms per floor at every tier and do not scale.

Build every family so its tier table can start at any tier, and keep each tier's settings in one config table (like
`starBattleConfig.ts`), so the tier session only edits `minTier` and the table.

## Claude's calls (check while reading)

- **Board reuse.** Regionless families reuse star battle's board, marks, drag, spent squares, completion run and hint
  plumbing. The family's puzzle type gains walls instead of regions; read how far regions reach in the star battle
  code (`groupsOf`, `regionCells`, the `boundary` strokes in `StarBattleBoard.tsx`) and decide whether a shared core
  with two puzzle shapes or a separate family module is cleaner. Pair puzzle gets its own module and board.
- **Tags.** Regionless families: `["puzzle", "funerary", "cosmos"]` (the scarab is the sun beetle). Pair puzzle:
  `["puzzle", "funerary"]`. Confirm against the role pools and `rolePools.verify.ts`.
- Display names (en + nl) follow the skin, the way star battle's sentences are keyed on the skin's `name`/`token`;
  only the ids are generic.

## Deduction ladders (starting points)

Each family gets a technique ladder that drives both generation (grading) and hints, ordered by how well the reason
explains itself, as `techniques.ts` does for star battle. These rungs come from the published literature and are
where to start, not a fixed list; measure them on generated boards as star-battle.md §3.4 did.

### Regionless battle / twin

From star battle, minus everything region-based:

- `touch` — propagation (spent squares), not a step.
- `lineFull` — a row/column at its quota rules out its other cells.
- `lineTight` — a row/column with exactly as many usable cells as it still owes takes them all.
- `onlyWay` / `everyWay` — every remaining placement for a line hits the same cell (place it / rule it out).
- `lineBlock` — N adjacent rows whose usable cells all sit in N columns claim those columns (the regionless
  equivalent of `regionLine`/`spanning`; walls are what make this bite).
- `wouldStrand` — a placement that leaves some line with too few usable cells is ruled out (hypothesis rung).

### Pair puzzle

From the Tents guides (pzzl.com walkthrough, UKPA Tents guide):

- `touch` — propagation, not a step.
- `zeroLine` — a line with count 0 is all "not here".
- `noAnchor` — a cell with no orthogonal anchor is "not here".
- `lineFull` / `lineTight` — as above, on the printed counts.
- `onlyWay` (pairing) — an anchor with one usable neighbour takes its piece there.
- `claimed` — a cell whose every neighbouring anchor is already paired is ruled out.
- `lineBlock` — compare a block of lines' total count with the anchors inside it; a surplus must pair with an anchor
  just outside the block (the pzzl.com "six tents, five trees" argument).
- `between` — a line owing one piece cannot place it between two anchors it would serve ambiguously (UKPA tip);
  prove soundness before keeping.
- `wouldStrand` — hypothesis rung.

`claimed` and `lineBlock` reason about pairings existing, not about which pairing; that stays sound with
position-only uniqueness.

## Constraints the builder must hold

- Follow `docs/instructions/puzzle-screens.md` and the star battle family as the template: meta, generator with
  uniqueness proof, grader, techniques, hint engine, board, rules screen, skin, en + nl copy.
- Each family gets its own design doc under `docs/game-design/puzzles/` (rules, ladder, generation, knobs, hints),
  following `star-battle.md`'s outline. The twin is a section of the regionless battle doc, like twin stars is §11.
- Soundness: property-test the rungs from player-reachable states and against a line's legal fillings, not only on
  generated boards (`project_eclipse_solver_soundness`).
- Generation and solvability checks live in `*.verify.ts`, not unit tests (`project_board_fixtures`).
- Solve-time budget: 10 s floor, under 6 min at wizard, soft target (`project_puzzle_solve_time_budget`).
- No wall-clock assertions in tests; count work (`feedback_count_work_not_wall_clock`).
- Name every element and say what each clue means on the rules screen (`feedback_flavor_text_allowed`).
- **Built in isolation, baked later (user's decision).** Each family is a complete plugin — game module, meta, app
  plugin (board, rules, hints, skin), copy — but its meta is NOT added to `puzzleMod.families`
  (`src/mods/puzzle/index.ts`). That list is the world switch: a family left out is playable in the puzzle lab and
  nowhere else. So this project leaves `generatedWorld.ts`, `carveLedger.json` and `tierFingerprints.json`
  byte-identical, and needs no rebake.
- Integration is a separate later step: add the metas to `puzzleMod.families`, rebake with `yarn generate-world`,
  update `tierFingerprints.json` (`feedback_bake_freely_before_release`; check for an uncommitted playtest bake
  first). No family enters starter.
- CHANGELOG `## Unreleased` entry, one line per user-facing change (lab-only families are dev-facing; add the entry
  at integration).

## Left to the builder

- Wall density curves per tier, and the generator approach (walls first then fill, or solution first then walls).
- Exact rung list after measuring.
- SVG drawings for scarab, mummy and sarcophagus, and the sandstone floor palette.
- Order of work. Suggested: regionless battle → regionless twin battle → pair puzzle.
- This branch is forked from `camp/home-and-loot`, where the measurements were taken.

## Follow-up (not this project)

- Tier session: which families enter at which tier, across all families. Junior introducing 8 rule sets at once is the first thing to look at.
- Bake integration: add the three metas to `puzzleMod.families` and rebake.
- More skins for all three families.

## Sources

- Tents techniques: [pzzl.com walkthrough](https://www.pzzl.com/wp-content/uploads/2021/01/tents.pdf),
  [UKPA Tents guide](https://www.ukpuzzles.org/ukpl/library/Tents%20Puzzle%20Guide.pdf),
  [Puzzle Baron tips](https://forum.puzzlebaron.com/forum/puzzle-baron/campsites/140-tips-and-tricks),
  [BrainBashers Tents](https://brainbashers.com/tents.asp).
- Regionless star battle: [UKPA Star Battle guide](https://www.ukpuzzles.org/ukpl/library/Star%20Battle%20Puzzle%20Guide.pdf)
  ("Battle Star"), [GM Puzzles, Battlestar](https://www.gmpuzzles.com/blog/?p=1521),
  [Logic Masters, Star Battle (Regionless)](https://logic-masters.de/Raetselportal/Raetsel/zeigen.php?id=000E3V).
