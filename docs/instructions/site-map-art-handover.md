# Site-map art — where this stands, and what to do next

Handover for the art work on `feat/site-map-sprites`. The design docs are canonical; this says what state
the branch is in and how to run the next step.

- **[tile-art-brief.md](../game-design/tile-art-brief.md)** — every file the map can draw, the camera, the
  two-plane rule, and **"Writing a prompt"**, which is the list of rules a generation keeps breaking. Read
  that section before authoring any prompt: it is where the cost of the first eight files is banked.
- **[spritesheet-renderer-prep.md](../game-design/spritesheet-renderer-prep.md)** — how the renderer works
  and why. Its "Decisions taken" section exists so they are not reopened.
- **[starter-art-prompts.md](../game-design/starter-art-prompts.md)** — the merchant prompts, the loop, and
  the import commands. Per-rank prompts are written fresh from the brief; this file is the worked example.

## Branch state

`feat/site-map-sprites`, **not pushed**, `yarn tsc -b` clean, suite green (254 files, 2843 tests).

**30 of the brief's ~224 files exist.** All five ranks have real surfaces — `floor`, `wall-face`,
`threshold`, `arch` — plus five whole-wall panels for the tableau, and TEN merchant props: `jarRack`,
`statue`, `offeringTable`, `basin`, `shelf`, `chestProp`, `brazier`, `lamp`, `pillar`, `mat`. Every one
of the last six is a parametric primitive in `renderProp.py` and rebuilds from its master with
`art/rebuild.sh`. Everything else is `generate-dummy-tiles` placeholder, which never breaks a floor.

Four of the five arches are `make-arch` output cut from their own wall; the merchant's is painted timber
and samples nothing.

Sources for everything imported live in `~/tile-previews/`, meshes in `~/tile-previews/meshes/` —
re-import with different flags without regenerating.

**Roughly 40 of the remaining files cannot be used even if drawn today**, because §5 of the brief lists
two things nobody has built: `breach` and `plug` are missing from `WallDecorationKind` (tiny), and the
variant resolver that picks `rubble-2.png` by positional hash does not exist (small). Art first; those
when a rank is otherwise done.

**Floor scatter now has a layer** — `src/app/SiteMap/floorScatter.ts` — so §4's six kinds per rank are
drawable. It uses the PROP box and `--slot=prop`, needs no authoring, and places by rule: sand and
rubble anywhere walkable, a mat in a room. Only `sand` has art (a placeholder), and `mat` and `rubble`
have the merchant's. That is 30 files of §4 the pipeline can now reach.

## What to do next

**The six parametric merchant props are done.** The five remaining merchant props need what the pipeline
cannot yet give them: `shrine`, `sarcophagus` and `crystal` want museum scans, and `hanging` and
`rubble` are cloth and scatter, which Step 0 lists as unsolved. The four merchant WALL ITEMS are the
next thing the pipeline can actually reach, and they are a different slot — see below.

**Where the throughput actually goes, measured on the first two.** Not the repaint: both took ONE roll.
The cost is MODELLING — `shelf` needed five renders and `mat` four before either read as its object at
56 units, and every one of those was caught by looking at a scaffold rather than by spending a roll.
Batching several scaffolds into one repaint sheet would therefore save the cheap half of the loop and
leave the expensive half alone; it is still untested and no longer the obvious lever.

What modelling keeps getting wrong is written into each primitive's docstring, because the rules are
geometric and general: an opening holds `0.35 * depth` less than its gap (the shelf above draws its front
lip that much lower than its own z), nothing may point at the viewer (a spout modelled along -Y draws as
a cone hanging straight down), a flat thing lying on the floor is ALL top face and has no silhouette to
read, and a part set beside another rather than overlapping it reads as a separate object with its own
shadow.

Then the four merchant wall items, which are a DIFFERENT slot — 56x28, painted onto the wall band, no
floor and no shadow. The pipeline has never been run against that slot and may need a mode of its own in
the renderer. Note that `--seat` and `--sun` have nothing to do there: a wall item hangs, so the whole
shadow half of Step 4 is skipped.

Judge a rank in **Storybook → App/SiteMap/PropSheet**, which stages every kind of a rank on that rank's
floor with the explorer beside it for scale, and says `(none)` where art is still missing.

## The tomb puzzle's walls — a second consumer, and a different shape

A tableau puzzle is played against a wall of its own rank, in `src/assets/tombWall/<tier>.webp`, wired
through `src/ui/atoms/tombImageMap.ts`. Those are NOT the map's files and must not be shared with them:

- **The map's `wall-face.png` is a 448x56 strip** drawn at 8:1 and shown at 16:1. The puzzle's is a
  1200x1200 PANEL, a whole wall from ceiling to floor, laid with `cover`. Same rank, same generation
  session, different drawing.
- **A panel is decorated TOP TO BOTTOM.** Three of them were first drawn with the decoration in one band
  and the lower two thirds plain; that reads as a hat on an empty wall, and worse, the tableau card
  covers the top of the leaf, so the empty part is the part a player sees. Real tomb walls are worked
  floor to ceiling — registers of scenes, or columns of sunk relief, running down to the base band.
- **Nothing in a panel may be a doorway.** The finish animation swings the leaf open to make a secret
  passage through it, so the wall must be unbroken; every prompt says so explicitly.
- The face grader's `cap` and `base` bands are cut for the map's strip. On a panel those are a ceiling
  ledge and a dusty floor line and never match. Only the FIELD number carries between the two formats.

Sources are `~/tile-previews/<tier>-wall-panel.png` at 2000x2000.

## The prop pipeline

Four steps with a gate on each, written out in [prop-pipeline.md](prop-pipeline.md): decide the object
and where its mesh comes from, render the geometry, hand a scaffold to the generator for MATERIAL only,
import through the render's own alpha and seat it on a rendered shadow. The expensive step is the
repaint, so nothing reaches it that a measurement could have rejected first.

The shadow is on the Blender side of that line for a reason worth knowing before writing a prompt: no
wording makes a generator paint one. Told in words, told as a hex, told that it is part of the picture,
it paints an invented floor across the footprint instead, and the first two props both arrived with
nothing below 35 where the hand-painted set sits at 2% to 11%.

It exists because geometry is not a thing to ask for. Cavalier oblique is one matrix — a shear under an
orthographic front view — and eighteen rolls went into asking for it in words before that was accepted.

## The loop, per file

```
# 1. write the prompt from tile-art-brief.md — the rank's row in the material table, its palette from
#    tierPalette, and every rule in "Writing a prompt"
# 2. measure what comes back, BEFORE importing
yarn tile-stats ~/Downloads/gen.png --tier=expert            # floor, threshold
yarn tile-stats ~/Downloads/gen.png --tier=expert --slot=face  # wall face: graded as three bands

# 3. import it
yarn make-seamless ~/Downloads/gen.png                 # floor: both axes
yarn make-seamless --roll=0.15 ~/Downloads/gen.png     # ...and move the middle out of the way first
yarn make-seamless --axis=x ~/Downloads/gen.png        # wall face: horizontal only
yarn import-tile ~/Downloads/gen.png --tier=expert --name=floor --slot=floor \
  --filter=smooth --key=none --repeat=2.4 --flatten=0.65
yarn import-tile ~/Downloads/gen.png --tier=expert --name=wall-face --slot=face \
  --filter=smooth --key=none --headroom=0.14 --repeat=2
yarn make-arch --tier=expert

# 4. read the numbers back OFF DISK, then look at it in Storybook
```

Slots: `floor` 448² · `face` 448×56 (drawn into 448×28 — see the brief's contract table) · `sill` 56×28 ·
`arch` 84×49 · `prop` 56×84 · `wall` 56×28 · `explorer` 40×70.

Import flags that exist because a generation could not be talked into them: `--repeat` (fractional, shrinks
and re-tiles), `--flatten` (blends toward the slot's own material — a corrective, not a step),
**A PROP comes back too light, every time.** The brief says it and the first two proved it: an object
is drawn lit for a gallery rather than for a cellar, and a merchant's Bes statue arrived with 27% of
itself above the palette's light end. `--brightness=0.75` fixes that at import in one pass, and it is the
flag to reach for before considering a re-roll — no wording has ever prevented it. It modulates
brightness rather than scaling linearly, so the alpha, and with it the object's silhouette, survives.

**Judge a prop composited on its own floor at 56x84, not by looking at the generation.** The Bes statue
came back with a plinth drawn in perspective, against every rule in the prompt; at slot size that plinth
is twelve pixels and nobody can see it. What DOES show at that size is value, which is why the light-end
number decides a prop and the projection rarely does.

`--headroom` (a face's top is covered by the wall's top band; give the art that room), `--contrast`
(the inverse of `--flatten`, for carving too shallow to read; it refuses values below 1, which would eat
an object's alpha), `--slot=arch` (fits jamb : opening : jamb to 14 : 56 : 14 whatever the drawing did).
`--repeat` divides both axes except on a face, which repeats across only.

`make-seamless --roll=0.15` shifts a source before the seamless pass. Its patch lays the original's
CENTRE back over the seam cross, so a subject sitting in the middle of a generation is drawn twice: a
pharaoh's one alabaster panel arrived as four, a priest's single libation ring as two. Roll until the
middle is plain stone. Too far and the patch swallows the subject instead — 0.3 erased that panel
altogether — so it is a knob to look at, not a constant.

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
   code, and has to be read out of the code. The face slipped through the same check twice over: it is
   stored 448x56 and drawn into 448x28, so three ranks of wall shipped stretched to twice their width
   before anyone said so out loud. The cheap way to see it is to resize a face to what the renderer fills
   and look at THAT, which is one line of sharp.
3. **A preview must compose the way the RENDERER composes.** The arch previews drew a continuous wall face
   behind the gateway; the renderer puts an arch in a GAP, where that band is floor and the faces are only
   to its left and right. Every judgement made against that preview was made against a picture the game
   never draws.
4. **A proxy metric is worthless until it has agreed with a case you can already judge by eye.** Two
   automatic measurements of a beam's top-to-front ratio both gave confident wrong answers — one
   thresholded on brightness and missed a textured top face, the other found the underside shadow instead
   of the top edge. Both were reported as fact before being checked against the picture.
5. **Profile the input before scoring it.** The arch builder samples a band of the rank's wall for its
   stone, and the band picker was guessed wrong three times: scoring by how much ROW MEANS differ called a
   procession frieze plain (a row of figures averages out like the row above it), scoring by variation
   ALONG a row picked the dado (a solid painted stripe is the most uniform thing on a wall), and scoring by
   both still missed because the search window was wider than the one clean strip and the cap/base
   exclusion put that strip out of reach. Printing every row's colour distance and variation answered it in
   one command. Same lesson as the beam metric: measure the thing, then write the rule.
6. **`yarn tsc --noEmit` checks NOTHING here** — the root tsconfig is solution-style, so it compiles an
   empty file list. `yarn tsc -b` is the real check, and it found an error that had already been committed.
   Same class: `npx prettier` resolves to a different major than the project's and silently reformats
   unrelated code. Use `yarn` for every tool.
7. **Report a file as written only after reading it back off disk.** Twice a chosen variant was described as
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
- **Every built arch is the same silhouette.** `make-arch` has one layer stack — lintel two fifths of
  the height, jambs always `SIDE_W` wide, no cornice, no batter — so four of the five gateways differ
  only in the stone band they sample and read as one shape recoloured. The brief's arch column asks for
  distinct shapes (a small cornice, a cavetto, a battered pylon, an opening with nothing holding it), and
  the cheap route is a per-rank geometry table in the builder rather than a generation per rank. Deferred
  on purpose: a gateway is 84x49 and sits in an empty chamber today. Judge it again once wall items and
  props are in and a doorway has something to be seen among.
- **Whether the merchant's arch should be rebuilt too.** Four of five arches are built from their rank's
  wall; the merchant's is painted timber and stays, because its adze marks and split grain are half of why
  it works. They have never been seen side by side across a seam — the RankSeams story is where to look.
- **Whether `reachable` should be the brightest state at all.** The torch now makes the place the player
  stands the brightest thing on a floor, but `stateWash` still leaves an unvisited room unwashed and dims
  a visited one, so brightness reads as a call to action rather than as light. Changing that is a
  `stateWash` conversation, not a lighting one.
- **The pharaoh's winged disc**, and whatever the gods' "opening with no visible structure" turns out to
  be. Both are `make-arch --ornament` inputs rather than whole gateways.

## Two things not to trip over

- **`yarn generate-dummy-tiles` no longer overwrites art it did not write.** Real art lands at the same
  paths. `--force` when you do want the placeholders back (that is also how to restore one file: delete it,
  regenerate).
- **The explorer is drawn near-front-on**, in a flatter projection than the walls now use, and he is
  `tiles/default/` so he cannot be fixed per rank. Nobody has judged whether that reads wrong yet.
- **The explorer is committed real art now** — 4 front frames, 4 back, 3 side, at 40×70, walking on
  distance (`walkCycle.ts`). `tiles/default/` is shared art, never per rank: one person walks all five.

## Where the masters live

The high-resolution image each tile was made from lives in `art/`, laid out in [its own
README](../../art/README.md):

```
art/props/<tier>/<name>.webp     a prop's painted return
art/surfaces/<tier>-<slot>.webp  floor, wall-face, threshold
art/tombWall/<tier>.webp         the tableau's whole-wall panel
art/rebuild.sh                   re-imports from the masters, with each tile's flags
```

`art/` sits outside `src/`, so Vite never sees it and none of it reaches the bundle — what ships is still
only `src/assets/tiles/<tier>/<name>.png` at slot size and `src/assets/tombWall/<tier>.webp`.

Scaffolds and masks are NOT stored: they are `renderProp.py` on fixed arguments and come back byte for
byte, so `rebuild.sh` carries the argument list instead, which is both smaller and the only record of how
a tile was imported. A generator's return cannot be reproduced, which is why that half is kept. Masters
are webp at quality 92 — a 1334x2000 return is 3.3MB as PNG and about 140KB this way, which is the
difference between a repository that can hold the brief's ~224 files and one that cannot.

Two holes, both named in `art/README.md`: the backfilled masters have no rebuild lines, because their
tiles were imported before there was anywhere to write the command down; and the MERCHANT's floor,
wall-face and threshold have no master at all, because `~/tile-previews/` holds two candidates for each
and the shipped tiles cannot decide between them.

`~/tile-previews/` is still the scratch directory for work in progress. Nothing there is depended on once
a tile is approved and its master is in `art/`.
