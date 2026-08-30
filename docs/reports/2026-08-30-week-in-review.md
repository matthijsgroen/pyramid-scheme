# Week in review — Mon 2026-08-24 → Sun 2026-08-30

37 commits on `main`, releases `0.38.3` → `0.42.2`.
234 files changed, +20521 / −4920 (CHANGELOG alone is ~560 of those lines).

## Five new puzzle families

| Puzzle | What the player does | Design doc |
| --- | --- | --- |
| Hidato | Thread one unbroken run of numbers through a hex comb | `docs/game-design/puzzles/hidato.md` |
| Sudoku | Six chambers, played in figures or in hieroglyphic signs | `docs/game-design/puzzles/sudoku.md` |
| Canisters | Measure an exact amount by pouring between vessels that do not divide evenly | `docs/game-design/puzzles/canisters.md` |
| Rush hour / blockade | Shove sledges along their lanes until your own can leave | `docs/game-design/puzzles/rush-hour.md` |
| Procession | Place events on a day's hours from gap / before / never-together / must-coincide clues | `docs/game-design/puzzles/procession.md` |

The blockade also got a full second skin — the market street: painted grain-and-stone sledges, sun-to-shade
lighting down the lane, your own sledge the warm one. New art under `src/assets/rushHour/market`.

## Crocodile redesign shipped

The crocodile moved out of `mods/puzzle` and into `mods/trap`: it is now a pit to cross, and it bites.
Old compare-level implementation deleted (`crocodileState`, `generateCompareLevel`, its specs).
This closes the long-standing "crocodile needs a major redesign" item.

## World generation

- A room generates at the difficulty its **own section** asked for, not the floor's — side passages now
  serve the tier they were built for.
- No two rooms in the world hand out the same puzzle; rooms are dealt boards instead of drawing at random.
- Journeys are read against the catalogue they actually have; tomb journeys dress their puzzles as the tomb;
  the ibis migration draws water puzzles only; papyrus route authored; `prefer` weighting mode added.
- A role is only authored if its pool can dress it (`rolePools.spec`, `faces.spec` guard this).
- The Great Pyramid of Giza draws on every puzzle kind, with a lean toward trading puzzles.
- Seed pass keeps what it finds; `boardIndex` / `enumerateConfigs` added, and the suite stopped re-solving
  boards that already shipped.

## Presentation and platform fixes

- Hieroglyphs render everywhere: subsetted font shipped (`hieroglyphs.subset.woff2`) plus
  `scripts/generateFont.ts` and `scripts/hieroglyphUsage.ts` to regenerate it.
- WebKit/iPhone: grid squares sized off their track, so no row stands taller than the rest and no board
  hangs past the grid; encounters no longer open under the status bar.
- Star and sudoku walls draw on the grid lines, once, not inside the squares.
- Star boards state row/column/area counts above the board.
- Detector panel speaks Dutch again; canister claim button reads "this one" in both locales
  (`i18n/keys.spec` now guards locale parity).
- Blockade exit marked beside the board, not on its edge.
- Sledge shove no longer smears a copy of the sledge behind it.

## Housekeeping

- Security advisories cleared out of the lockfile (`yarn.lock`, +601/−…).
- Commit messages capped at a subject line (`docs/instructions/commit-messages.md`).
- Lightbeam exploration journal cut, and a rule written against writing the next one.
- Canister budget enforced; one role vocabulary across the mods.
