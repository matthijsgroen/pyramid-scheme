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

`feat/site-map-sprites`, 216 commits, **working tree clean**. `yarn tsc -b` clean, `yarn lint` 0 errors
(19 pre-existing warnings), suite green, and `sh art/rebuild.sh` reproduces every painted tile from its
master byte for byte. Run that last one after touching `renderProp.py` or `importTile.ts`: it is the only
check that catches a geometry change silently invalidating a master.

**The merchant and the nobleman are DONE.** Every prop, wall item and scatter kind either rank authors is a
return painted over its own scaffold, stored 2x, cut to a mask, seated in a rendered translucent shadow,
and on a rebuild line. What is left of them is two museum scans — `junior/sarcophagus` (20 rooms) and
`junior/statue` (8).

`yarn art-census` is the authority and reports 59 placeholders: expert 18, wizard 20, master 17, junior 4.

### The three files that run the work

- **[repaint-queue.md](repaint-queue.md)** — **start here.** Every prompt still owed, with the two images to
  attach and the import line to run afterwards. 10 entries, all expert/master/wizard. `yarn repaint <key>`
  copies one to the clipboard and reveals its attachments in the Finder; `yarn repaint` lists the keys.
  Entries are DELETED as they land, so the file's length is the backlog.
- **[art-tasks.md](art-tasks.md)** — the ledger: what each remaining gap is waiting on, which a census
  cannot know. Also §3b, a costed choice left open, and §5b, the three things that were missing from every
  list until someone asked.
- **[prop-pipeline.md](prop-pipeline.md)** — **the laws of this projection**, then the five steps. Read the
  laws table before modelling anything: every entry cost renders, and several were re-discovered because
  they had only ever been written in the docstring of whichever primitive found them.

## What landed in the last session

Thirteen tiles painted, and the tooling that came out of doing it. `git log --oneline main..HEAD` is the
record; the parts a fresh context needs to know:

- **`--spin` is now a pipeline STEP** (Step 1b), not a per-prop whim. Every free-standing prop is rendered
  at an angle, because a room holds two props plus scatter now and square-on they read as a sticker sheet.
  Its hard constraint: **a painted tile's spin can never change** — the mask moves and the master no longer
  fits. Proved by setting it on an already-painted tile and watching the tile come out a smear.
- **`--mask-grow`** admits paint the repaint ADDED while refusing what it added as SHADOW. Written for the
  palm capital, where the generator painted fourteen fronds against a model with five, twice, unprompted.
- **`tileVariants`** picks `<name>-2.png` by cell position, so a kind can have two drawings. First user:
  the merchant sells off a table in some rooms and out of reed baskets in others.
- **`companionProps`** puts a second prop of the SAME purpose in a third of the rooms with space for it.
- **Conditions are real.** The Nile Delta Expedition is `overgrown`, graded 0.2 / 0.4 / 0.65 / 1 across its
  five pyramids, and growth draws in three places — tufts in floor joints, roots through the wall band,
  plants in chambers. `condition` had never reached a floor before this: four `buildFloor` calls passed
  `theme` and none passed `condition`.

## Traps, from the session that found them

Each of these cost real time and none is guessable from the code:

- **Never silence `yarn import-tile`.** It refuses `--contrast` below 1 ("would eat the alpha channel") and
  three sweeps in a row reported identical numbers because the import was failing into `/dev/null` and the
  tile on disk never changed. Stale output read as data.
- **Format with `yarn lint --fix`, not `npx prettier --write`.** Prettier runs inside ESLint here, so `npx`
  may resolve a different version that disagrees about the same file.
- **`sh art/rebuild.sh` takes about four minutes** and re-renders every scaffold in Blender. Do not run
  imports against a tile while it is running, and do not wait on it with `pgrep -f rebuild.sh` — that
  pattern matches its own wait-loop command line and deadlocks. Use a sentinel file.
- **Judge condition growth in `PropSheet`, never on the JourneyInspector.** At 20 units on a 3000-unit map
  the whole-floor view can confirm a sprite exists and nothing more; three ways of mapping an element to
  screenshot pixels disagreed with each other.
- **A claimed chamber cell is `type: "empty"` in the grid.** The claim is a render-time fact, so anything
  filtering cells by grid type silently drops a chamber's own floor. It has now bitten `floorScatter`,
  `art-census` and `MapGrowth`.
- **Gemini names every download after the first chat in the thread.** Identify returns by content, and by
  frame size: an edited scaffold comes back at the scaffold's own aspect — 1686x2528 for a 2:3 prop,
  2880x1440 for a 2:1 wall item — and **2048x2048 means it was generated fresh and the attachment was
  ignored**. That square is the one size worth checking before opening the file: the mask is the
  scaffold's silhouette, so a fresh square drawing is unimportable and no flag rescues it. Re-roll without
  measuring.

## Renaming a decoration kind is cheap; adding one is not

Both were treated as the same cost for a long time and they are not close. `pickDressing` is
`pool[hash(siteId, roomKey) % pool.length]`, so what moves every room's prop is a change of LENGTH —
adding a name or dropping one. Renaming one in place keeps the length and the index: `rubble` →
`rubblePile` regenerated the world with 698 pool entries changed and NOT ONE placement moved, verified by
diffing the artifact (the only other line to change was `worldContentHash`, which is derived).

Nothing is baked either way. The generated world stores the POOLS; the choice is made at assemble time
from a hash of the site id and the room key, and zero per-room decorations are stored. So `sheaf` and
`tideLine` are still the expensive kind of change, and only because they are NEW.

## Decided but NOT built

- **Patron gods** — Anubis, Horus, Sobek, Bastet, Ma'at, Ra, Sekhmet. The design is a variant selector on
  five existing kinds (`statue`, `shrine`, `wallShrine`, `stela`, `mask`), resolved like `STANDING_VARIANT`:
  `statue` becomes `statue-anubis.png` where that file exists and falls back to the generic art where it
  does not. No new kinds, no pool edits, no world regeneration, and art can be added one file at a time.
  The plaques are FLAT wall items, so most of it is straight to the generator; only the statues need scans.
- **A steerable patron, as opposed to a varied one.** `tileVariants` already picks `<kind>-2.png` by cell
  position, which buys variety and cannot be aimed. Patron needs the other half: an authored field on the
  pyramid, purely drawn and therefore free, plus a resolver that prefers `<kind>-<patron>.png`. The
  condition field is the worked example of exactly that shape — see `spec/expert.ts`.
- **New wall kinds to close the purpose gaps** — `sheaf` (agriculture) and `tideLine` (water) proposed.
  These DO need pool edits in `spec/*.ts` and `yarn generate-world`, which reshuffles every room's dressing,
  so it is a large reviewable diff. Deliberately not started. Note the dummy generator has its own
  hardcoded `WALL_KINDS` list and a per-kind drawing, so each new name needs a line there too.

## Where the art is thinnest, and why it shows

`yarn art-census` ranks the gaps by rooms waiting on them. The one that is not obvious from it: a room is
dressed for a PURPOSE — the assembler picks one role its pools share and draws the prop and the wall item
from it — and several purposes have almost nothing to draw with. `water`, `agriculture` and `light` have NO
wall item at all, and `logistics`, `judgement`, `scribe` and `sky` have exactly one each, which is 336
rooms that can only ever hang the same thing. Until that is filled the pairing can do very little: it
moves agreement from 58.2% to 62.8% and costs two floors of extra repetition, because the rule only fires
where a purpose has two wall items to choose between.

## What to do next

**The loop, per tile.** It is manual on purpose: driving Gemini's web UI is against Google's terms and the
API bills per image, so the paste is done by hand and the tooling only saves the searching.

```sh
yarn repaint                  # the 10 keys still owed
yarn repaint master/mask      # prompt to the clipboard, both attachments revealed in the Finder
# attach the two, paste, generate, download to ~/Downloads
```

Then the import half, which is where the judgement is:

```sh
# 1. store the return as the master, .webp at quality 92
# 2. render the pair the tile is imported with — the entry's `scaffold` line
# 3. import through the mask, then MEASURE and LOOK
yarn tile-stats src/assets/tiles/<tier>/<name>.png --tier=<tier> --slot=prop
yarn on-floor src/assets/tiles/<tier>/<name>.png <tier> /tmp/look.png
# 4. add the rebuild line to art/rebuild.sh, then `sh art/rebuild.sh` and confirm nothing else moved
```

**What the numbers have to reach**, from every tile in `art/rebuild.sh`:

- **At least 10 luminance of separation from the floor, in EITHER direction.** Under 10, tile-stats refuses
  it outright and it is right to: the nobleman's palm column measured ONE and vanished into his sandstone.
- **Warmth in the rank's band** — about +22 to +25 at the merchant. Cooler than the floor is fine and
  several of the nobleman's props are: what matters is the separation, not its sign.
- **A tail under roughly 4%** over the light clamp or under the dark one.

**Which way the knob goes is a property of the RANK, and this is the part worth carrying forward.** The
merchant's floor is dark, so nearly everything of his needed clipping DOWN. The nobleman's is pale
sandstone at 161, so three of his tiles needed a LIFT above 1 — his cedar chest 1.12, his bronze lamp 1.6.
Expect master and wizard to behave like the nobleman on their dark stone and unlike him on their pale.

**One tile in the file is squeezed from both ends** and is the shape to recognise: the nobleman's hanging,
white linen against oiled timber, where no setting clears both clamps. `--contrast` below 1 is NOT the
escape — the importer refuses it. Pick which end matters and say so in the rebuild line.

**After the queue empties**, the open work in rough order of value:

1. **`wizard/crystal`** — 27 rooms, authored, and the only kind in the set with no primitive to build on.
   Needs a model from nothing; everything else at those ranks is `--contents` on something that exists.
2. **Paint the condition sprites** — `overgrown` is authored and drawn in three places, and all five files
   are placeholders. They live in `tiles/default/`, so one set serves every rank. Judge in `PropSheet`.
3. **The patron field** — see "Decided but NOT built". `tileVariants` is half of it already; what is
   missing is an authored value so a pyramid can say which god it belongs to.
4. **`junior/sarcophagus` and `junior/statue`** — museum scans, and read `prop-pipeline.md`'s Gate first.
   `horus.stl` in `~/tile-previews/meshes/` is a REJECT, not a head start: that folder is a download
   history, not a library.

`yarn on-floor <tile> <tier> <out.png>` puts one tile on its rank's floor at CELL size and blows the result
up, which is the only picture worth judging a repaint against. The pit's shaft was mid-grey and perfectly
legible in a 448-wide render and measured the floor's own value at 56 across, so no hole read at all. It
was invisible in the render and obvious in this one.

Judge a rank in **Storybook → App/SiteMap/PropSheet**, which stages every kind of a rank on that rank's
floor with the explorer beside it for scale, says `(none)` where art is missing, stages scatter twice (once
under his boots, once alone), and carries the conditions row at the bottom.

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

Sources are `~/tile-previews/<tier>-wall-panel.png` at 2000x2000. **Do not attach those to a prop
repaint** — that is the trap `repaint-queue.md` explains: a sparse scaffold pulls the reference's content
into the picture, and the nobleman's lamp niche came back as his wall panel redrawn. Every queue entry
references `<tier>-plain.png`, a crop of that rank's own floor, which is a seamless texture with nothing in
it to copy.

## The prop pipeline

Five steps now — Step 1b, the SPIN, was added between geometry and the scaffold — with a gate on each and
a **laws of this projection** table before all of them, written out in
[prop-pipeline.md](prop-pipeline.md): decide the object
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

**The flags a FRAME of an animation needs, and why each one bites.** The explorer's walk cost a round
trip on every one of these:

- `--filter=smooth` — the default is `nearest`, which renders painted art crunchy against a set that is
  smooth everywhere else. Not optional for this set.
- `--no-trim` — `seatOnFloorLine` trims each file to its own content and rescales it into the slot, which
  throws away the common box `cut-sheet` padded the frames into. Frames that vary in height then each get
  a different scale factor and the character grows and shrinks: the side row came back 487–505px tall and
  the head bobbed. A frame that came through `cut-sheet` is already boxed — import it untrimmed.
- Pad a lone frame to the sheet's box before importing it. Re-cutting one frame later gives its own tight
  bounding box, and importing that shifts the body a pixel against the frames beside it.
- `--gamma=0.65` — a later drawing session comes back at a different exposure. The explorer's side row
  arrived at HALF the luminance of the front and back, and the error was not a uniform factor: the shadows
  were out by 2.2x where the highlights were out by 1.5x, so `--brightness` blows the highlights out before
  the midtones arrive. A power curve fits the whole range at once.

**A WALL ITEM is two different jobs, and the split is whether it has DEPTH.** The band is not a flat
elevation: it is the same oblique world as everything else at HALF depth (`mapScale`'s SIDE_W 14 of wall
thickness images as 7 of drawn height, so k = 0.5 — cabinet, where a prop is cavalier at k = 1).

- **With depth** — a niche, anything standing off the wall — is MODELLED like a prop and rendered with
  `--shear=0.5`. A recess drawn by a generator comes back receding to a vanishing point, which is
  photographically correct and wrong for this map; modelled, its floor draws ABOVE its front lip, which is
  what makes it read as a hole. Size on the DRAWN shape: drawn height is `h + k*d`, so a 0.62-tall,
  0.34-deep bay draws 0.79 against its own width.
- **Flat** — a plaque, a stela, a tally board hanging against the surface — goes straight to the generator
  with no mesh and no mask.
- `--headroom` on both. A wall item that fills the band to the pixel breaks the wall's own top line and
  reads as a block stuck on rather than a thing hung up. 0.15–0.22 is the range so far. The cap is
  transparent on every slot but `face`, because a face IS the wall and everything else merely hangs on one.
- `--brightness` bites here too. The merchant's tally board came back 10.3% above the palette's light end;
  the sweep was 1.0 → 8.6%, 0.9 → 2.0%, 0.85 → 0%.

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
6. **A measurement can be as confidently wrong as an opinion.** Judging the explorer's legs by clustering
   luminance said one leg was 31 apart when the sample was a four-pixel boot tip, and called a real edit a
   2.5-point change where a pixel diff showed 9.1 — the filter excluding boots had excluded exactly the
   pixels that were darkened. What told the truth immediately: diff the edited file against its original
   and report changed-pixel count, mean luminance before and after, and the rows touched. For animation,
   diff ALPHA ONLY: that separates "the pose moved" from "the colour changed", and colour diff alone
   called a 46% change on a frame whose silhouette had barely moved.
7. **What a generation gets wrong about the ART** — the value clamp, outlines, anything crossing the
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
art/masters/props/<tier>/<name>.webp     a prop's painted return
art/masters/surfaces/<tier>-<slot>.webp  floor, wall-face, threshold
art/masters/tombWall/<tier>.webp         the tableau's whole-wall panel
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
