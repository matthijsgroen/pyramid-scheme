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

## What the first four files cost, and what stops it costing that again

Four surfaces took most of a day. The art was never the slow part; these were.

1. **Check where an asset APPEARS before generating it.** A sill exists only where the rank changes: over
   the generated world, 36 sampled floors have none at all and the rest have one or two. The story we were
   judging against is single-tier, so it could never show one. A census beats an opinion — render the real
   floors and count.
2. **Check what the renderer actually FILLS, not what the brief says.** The brief called a sill 56x12. The
   renderer fills a 56x28 gap between rows and a 14x56 gap between columns, from one stretched pattern, so
   the art arrived a twelfth of a cell tall and was shown lying on its side. A slot size is a claim about
   code, and has to be read out of the code.
3. **State the camera once, in the renderer's own numbers.** `WALL_H` is half a `CELL`, so a vertical
   surface images at half height and everything with height shows its top. Until that was written down
   each prompt invented its own angle, and the arch came back flat.
4. **Draw a thing as an OBJECT when the slot is an object.** Three arch rolls fought the wall the model
   insisted on drawing around the doorway — jambs a third of the frame when a sixth was asked for, twice.
   Asked for a free-standing gateway on magenta there is no wall left to get wrong, and the import trims
   to the timber.
5. **A number a model cannot see is not an instruction.** "Slabs roughly 64x32 pixels", "jambs a sixth of
   the frame": ignored, repeatedly. Fix scale at import (`--repeat`, the arch trim) and ask for counts.
6. **`yarn tsc --noEmit` checks NOTHING here** — the root tsconfig is solution-style, so it compiles an
   empty file list. `yarn tsc -b` is the real check, and it found an error already committed. Same class:
   `npx prettier` resolves to a different major than the project's and silently reformats unrelated code.
   Use `yarn` for every tool.
7. **Report a file as written only after reading it back off disk.** Twice a chosen variant was described
   as imported when the command had never run, so the next Storybook look was of stale art.

8. **Draw a thing as an OBJECT when the slot holds an object.** The arch took eight rolls, and the turn
   came when it stopped being "a doorway in a wall" and became "a wooden frame alone on magenta". A wall
   drawn around the subject is a wall whose proportions the model chooses, and it chose wrong every time.
9. **This world has exactly TWO planes: facing the viewer, and facing up.** No sides, no third plane, no
   diagonals. Side walls have no side face, so an archway with a shaded inner reveal was more dimensional
   than everything around it — which is why it looked wrong even while measuring fine. Say this in the
   prompt before the subject; it governs every prop still to come.
10. **Never ask for a surface that is physically hidden.** A post's top face is under the beam that rests
    on it. Asked for it anyway, the model resolved the contradiction by inventing capitals.
11. **Check a proportion at SLOT size, not at generation size.** "The beam's top band is a third of a
    fifth" is 3px in a 42-tall slot: invisible. The sill made the same mistake at 12px. Do the arithmetic
    down to the slot before writing the fraction.
12. **Proportions belong to the OBJECT, not the canvas.** The import trims to the drawn thing, so the
    frame's own aspect is what reaches the slot — a 2:1 canvas with margin gives a frame that is not 2:1.
    State the ratio as "measured from the outer edge of one post to the other".
13. **A proxy metric is worthless until it has agreed with a case you can already judge by eye.** Two
    different automatic measurements of the beam's top-to-front ratio both gave confident wrong answers —
    one thresholded on brightness and missed a textured top face, the other found the underside shadow
    instead of the top edge. Both were reported as fact before being checked against the picture.

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
