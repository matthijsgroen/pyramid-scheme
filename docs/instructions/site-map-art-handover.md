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

## What the TOOLS get wrong, from real returns

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
6. **What a generation gets wrong about the ART** — the value clamp, outlines, anything crossing the
   frame, detail below the slot's resolution — is in [tile-art-brief.md](../game-design/tile-art-brief.md)
   under "Writing a prompt". The five above are about the TOOLS: what a sheet does, what keying does, what
   the import will and will not fix.

## What the first files cost, and what stops it costing that again

The rules a PROMPT has to follow moved to [tile-art-brief.md](../game-design/tile-art-brief.md), under
"Writing a prompt" — that is the document open when a prompt is written, and keeping them here meant
writing the nobleman's arch from the brief alone and repeating a mistake already recorded. What stays here
is the workflow: how to check, and how the checking has gone wrong.

1. **Check where an asset APPEARS before generating it.** A sill exists only where the rank changes: over
   the generated world, 36 sampled floors have none at all and the rest have one or two. The story we were
   judging against was single-tier, so it could never show one. A census beats an opinion — render the real
   floors and count.
2. **Check what the renderer actually FILLS, not what the brief says.** The brief called a sill 56x12. The
   renderer fills a 56x28 gap between rows and a 14x56 gap between columns, from one stretched pattern, so
   the art arrived a twelfth of a cell tall and was shown lying on its side. A slot size is a claim about
   code, and has to be read out of the code.
3. **A preview must compose the way the RENDERER composes.** The arch previews drew a continuous wall face
   behind the gateway; the renderer puts an arch in a GAP, where that band is floor and the faces are only
   to its left and right. Every judgement made against that preview was made against a picture the game
   never draws.
4. **A proxy metric is worthless until it has agreed with a case you can already judge by eye.** Two
   automatic measurements of a beam's top-to-front ratio both gave confident wrong answers — one
   thresholded on brightness and missed a textured top face, the other found the underside shadow instead
   of the top edge. Both were reported as fact before being checked against the picture.
5. **`yarn tsc --noEmit` checks NOTHING here** — the root tsconfig is solution-style, so it compiles an
   empty file list. `yarn tsc -b` is the real check, and it found an error that had already been committed.
   Same class: `npx prettier` resolves to a different major than the project's and silently reformats
   unrelated code. Use `yarn` for every tool.
6. **Report a file as written only after reading it back off disk.** Twice a chosen variant was described as
   imported when the command had never run, so the next Storybook look was of stale art.

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
