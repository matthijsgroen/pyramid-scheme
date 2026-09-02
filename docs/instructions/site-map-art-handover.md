# Site-map art — where this stands, and what to do next

Handover for the art-generation work on `feat/site-map-sprites`. The design docs are canonical; this
says what state the branch is in and how to run the next step.

- **[spritesheet-renderer-prep.md](../game-design/spritesheet-renderer-prep.md)** — how the renderer works
  and why. Its build order says what is done; its "Decisions taken" section exists so they are not
  reopened.
- **[tile-art-brief.md](../game-design/tile-art-brief.md)** — every file the map can draw, named. Which
  god each statue is, what the rubble is rubble of, the slot sizes, ~224 files in total.
- **[starter-art-prompts.md](../game-design/starter-art-prompts.md)** — the 23 merchant-rank prompts, the
  palette to quote, and the import commands. **This is the next thing to work through.**

## Branch state

`feat/site-map-sprites`, ~36 commits, **not pushed**, tree clean, suite green (2837). Renamed off the
placeholder branch name already, so a push is safe whenever.

## The generation loop

```
# 1. generate from a prompt in starter-art-prompts.md — floor FIRST, then reuse it as a
#    reference image so 23 files come out of one tomb

# 2. a sheet of frames (characters):
yarn cut-sheet ~/Downloads/sheet.png --out=/tmp/frames --rows=front,back,side --min=0.8

# 3. measure it against the palette before importing:
yarn tile-stats ~/Downloads/gen.png

# 4. one file into its slot:
yarn import-tile /tmp/frames/front-1.png --tier=default --name=explorer-s-1 --slot=explorer --filter=smooth
yarn import-tile ~/Downloads/gen.png --tier=starter --name=jarRack --slot=prop --filter=smooth

# 5. megatiles only:
yarn make-seamless src/assets/tiles/starter/floor.png
yarn make-seamless --axis=x src/assets/tiles/starter/wall-face.png

# 6. look at it
yarn storybook   # App/SiteMap/SiteMapView → World Floor Starter (a real generated floor)
                 # App/SiteMap/ExplorerDot → Facings (every facing × 4 steps, two grounds)
yarn generate-dummy-tiles --preview    # five ranks side by side
yarn generate-dummy-tiles --palettes   # candidate palettes + a contrast table
```

Slots: `floor` 448² · `face` 448×56 · `sill` 56×12 · `arch` 84×56 · `prop` 56×84 · `wall` 56×28 ·
`explorer` 40×70. `import-tile` keys the background to alpha, despills the magenta that soaked into the
art, re-seats props and characters on their floor line, and resizes.

## What generation actually gets wrong, from three real returns

1. **The frame count is not negotiable with the model.** Ask for four, six come back. Don't fight it —
   `cut-sheet` takes the sheet apart by its GUTTERS (a generated sheet is never on an even pitch) and you
   pick what you want.
2. **The last frame of every row gets clipped by the canvas edge.** Ask for margin around the whole sheet.
   `--min=0.8` reports and skips them.
3. **Facings come back at different heights** (side 465px vs front 382px). `cut-sheet` pads every frame to
   one box, bottom-centred, or the character changes size when it turns around.
4. **Magenta comes back as `#fd25fd`,** not `#ff00ff`, and about half of a sprite's outline pixels are part
   background. The default tolerance handles the first; the despill handles the second. Under 1% magenta
   cast survives import.
5. **Aspect is the one thing import cannot fix** — it stretches to the slot on purpose, so a wrong shape is
   visible rather than silently cropped. Generate at the slot's aspect.
6. **The value clamp is dropped before the subject is.** The first starter floor kept every element the
   prompt asked for and none of its palette: lum 36–179 where the palette spans 88–114, white whitewash
   flakes and a near-black outline around every slab. `yarn tile-stats` measures it before import.
7. **Anything crossing the whole frame tiles into wallpaper.** That same floor had one crack corner to
   corner. At 448² it repeats in every cell, and `make-seamless` has to fight a feature touching two edges.
8. **Detail below the slot's resolution is wasted.** At 40×70 a compass, vest pockets and the X on a map are
   all gone. Simplify rather than embellish.

## Open, and worth deciding while generating

- **`SIDE_W` reads thin** against a full-cell face. Free to widen; `WALL_H` is not (it must divide `CELL`).
- **Floor scatter** (planks, sand drifts, sherds, plunder, stains, tilework) has no renderer slot yet — the
  brief §4–§5 says what it needs. Nothing is generated for it on purpose.
- **Prop variants** (`rubble-2.png`, three statues per rank) need the hash-picked resolver from brief §5.
  Not built.
- **Whether a rank draws the kinds its own pool never authors.** Two starter-difficulty pockets sit inside
  junior pyramids, so `starter/sarcophagus.png` really can be asked for. A shared `default/` set would
  cover every such hole in one place.

## Two things not to trip over

- **`yarn generate-dummy-tiles` no longer overwrites art it did not write.** Real art lands at the same
  paths. `--force` when you do want the placeholders back (that is also how to restore one file: delete it,
  regenerate).
- **The explorer is committed real art now** — 4 front frames, 4 back, 3 side, at 40×70, walking on
  distance (`walkCycle.ts`). `tiles/default/` is shared art, never per rank: one person walks all five.
