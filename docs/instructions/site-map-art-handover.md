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

`feat/site-map-sprites`, 280 commits, **working tree clean**. `yarn tsc -b` clean, `yarn lint` 0 errors
(19 pre-existing warnings), suite green, and `sh art/rebuild.sh` reproduces every painted tile from its
master byte for byte. Run that last one after touching `renderProp.py` or `importTile.ts`: it is the only
check that catches a geometry change silently invalidating a master.

**THE STAIRS ARE THE LIVE WORK** — the map draws a flight at a stairhead, aimed by the room's one exit
and lit by its own torch. **All five flights are painted and shared** — `stair-down`, `stair-down-south`,
`stair-down-side`, `stair-up` and `stair-up-side` in `tiles/default/`, drawn at every rank, west mirrored
from east. Two of those five exist because a TURN WOULD NOT DO: the side pair is painted opposite-handed,
so they mirror on opposite approaches; and `stair-down-south` is `stair-down` flipped in Y with its
cresset left upright where it stands, which a flip in the renderer could not have given. What is left of
this section is nothing: the gate is built too.
The plan is ONE GENERIC SET in `tiles/default/` rather than five per-rank sets, and the whole of it is
in "Stairways and ward gates" below.

**The merchant is DONE** — every prop, wall item and scatter kind he authors is a return painted over its
own scaffold, stored 2x, cut to a mask, seated in a rendered translucent shadow, and on a rebuild line.

**The nobleman is DONE too**, the second rank of which that is true. His last four were `junior/statue`
and `junior/sarcophagus` — the ones everyone remembers as blocked on a museum scan, until `prim_statue`
settled both, a figure being a POSE with its face in paint — plus a plaster fall and a ledger board that
were ordinary unpainted work nobody had written a rebuild line for. This file called him DONE for
several sessions before he was.

**The priest is SIX keys from done** — `mat`, `lamp`, his flat `tallyBoard`, the
`rubbleSpill` his passages scatter, and his two patron variants `wallShrine-anubis` and `statue-anubis`.
A paste each. His figures landed long ago (`expert/statue`, the couchant Anubis, and `expert/sarcophagus`),
and his pool, censer, papyrus column, naos, robbed-out shaft and collapsed door plug are painted now too.
His niche, sconce, wallShrine, veil and hanging were already tiles. **He is the next release's headline**
— see "The order the work goes in" below.

**And the GODS are queued too, which is the block this file kept naming as the largest one left.** Their
two figures and five wall items were written down already; their ten chamber props are now written down
beside them, on primitives every other rank had already proved. Only `wizard/crystal` still needs
geometry.

**Modelling is no longer the bottleneck anywhere — generation is.** The queue is 60 entries, which is
everything left in the whole set bar one primitive, and none of it needs Blender again.

**Read `yarn art-census`, not this paragraph.** The count below is a snapshot and every summary of it in
this file has drifted at least once.

`yarn art-census` is the authority and reports 48 placeholders: wizard 20, master 17, expert 11.

### The three files that run the work

- **[repaint-queue.md](repaint-queue.md)** — **start here.** Every prompt still owed, with the two images to
  attach and the import line to run afterwards. 60 entries: the priest, the merchant's two stairs, the pharaoh, the gods, the shared scatter and conditions, and nineteen patron variants. `yarn repaint <key>`
  copies one to the clipboard and reveals its attachments in the Finder; `yarn repaint` lists the keys.
  Entries are DELETED as they land, so the file's length is the backlog.
- **[art-tasks.md](art-tasks.md)** — the ledger: what each remaining gap is waiting on, which a census
  cannot know. Also §3b, a costed choice left open, and §5b, the three things that were missing from every
  list until someone asked.
- **[prop-pipeline.md](prop-pipeline.md)** — **the laws of this projection**, then the five steps. Read the
  laws table before modelling anything: every entry cost renders, and several were re-discovered because
  they had only ever been written in the docstring of whichever primitive found them.

## What landed in the last session

Twelve tiles, the patron feature end to end, and four laws that each cost real rolls. `git log --oneline
main..HEAD` is the record; what a fresh context needs:

- **The nobleman is finished, patron art included** — 84 rooms of it. The priest's two figures landed
  too, which closes the museum-scan question for good.
- **Patrons are a real axis now.** `art-census` grew a PATRONS section that counts (kind, god) PAIRINGS
  rather than gods — nine gods across five kinds is forty-five files but only twenty-seven are
  reachable, because a god on a pyramid holding none of those kinds draws nothing. Eight are painted.
- **Every dedicated floor keeps a room for its god**, dressed with a god-bearing prop AND wall item, and
  a second statue beside the first. That pairing is also how the renderer recognises the room — no new
  field. `PATRON_PER_FLOOR` in `siteAssembler.ts`. A weighted pool was built and measured first and
  rejected: it raised the art debt more than the visibility.
- **ONE FRESH CHAT PER TILE**, which is in Traps below with the numbers. It is the single biggest cause
  of re-rolls and it hides as a prompt problem — four rolls of one statue went into rewriting a
  projection rule that was never the fault.
- **The scaffold is the projection.** Fourteen prompts stopped describing geometry in prose and now say
  only that the perspective, projection, angle and rotation are the reference's. `prop-pipeline.md` has
  the table of four wordings and the four different ways they failed.
- **An envelope is defined by its scaffold, not its name.** Anything rendered from `prim_statue` — the
  coffins included — releases the contour and cuts inward. `repaintQueue.spec.ts` holds it.

## Traps, from the session that found them

Each of these cost real time and none is guessable from the code:

- **Never silence `yarn import-tile`.** It refuses `--contrast` below 1 ("would eat the alpha channel") and
  three sweeps in a row reported identical numbers because the import was failing into `/dev/null` and the
  tile on disk never changed. Stale output read as data.
- **Format with `yarn lint --fix`, not `npx prettier --write`.** Prettier runs inside ESLint here, so `npx`
  may resolve a different version that disagrees about the same file.
- **`sh art/rebuild.sh` takes about four minutes** and re-renders every scaffold in Blender. Do not run
  imports against a tile while it is running, and DO NOT SPAWN A WAITER FOR IT AT ALL. Running it in the
  background already notifies on completion, so a wait loop is redundant — and `until ! pgrep -f
  "art/rebuild.sh"` never exits anyway, because the pattern matches the wait loop's own command line.
  Five of those were left running in one session before anyone counted the shells: the deadlock is
  invisible while the real notification keeps arriving on time.
- **Judge condition growth in `PropSheet`, never on the JourneyInspector.** At 20 units on a 3000-unit map
  the whole-floor view can confirm a sprite exists and nothing more; three ways of mapping an element to
  screenshot pixels disagreed with each other.
- **A claimed chamber cell is `type: "empty"` in the grid.** The claim is a render-time fact, so anything
  filtering cells by grid type silently drops a chamber's own floor. It has now bitten `floorScatter`,
  `art-census` and `MapGrowth`.
- **ONE FRESH CHAT PER TILE. A long thread is the single biggest cause of re-rolls, and it hides as a
  prompt problem.** Gemini names every download after the FIRST prompt in its thread, which makes the
  damage measurable after the fact: one session produced thirteen downloads named "Gouache Painting
  Sacred Pool" and nine named "Anubis False-Door Stela" — thirteen different tiles pasted into a thread
  that began with the priest's pool, and nine into one that began with a stela. Every paste after the
  first lands in a context already holding a dozen prompts AND a dozen scaffold images.

  What that produces, and nothing else explains: returns coming back 2048x2048 square because the model
  generates from accumulated context instead of editing the attachment (three in one session, a failure
  mode absent from every earlier one); returns re-staged into a PREVIOUS tile's projection — the
  merchant's Bastet shrine came back isometric in a thread whose earlier images were isometric shrines;
  and prompts that landed first-roll at one rank fighting for four rolls at another, thirteen prompts
  deep.

  Four rolls of `junior/statue-thoth` were spent rewriting a projection rule that was never the problem.
  Before touching a prompt because a return looks wrong, check how deep its thread is.

- **Gemini names every download after the first chat in the thread.** Identify returns by content, and by
  frame size: an edited scaffold usually comes back at the scaffold's own aspect — 1686x2528 for a 2:3
  prop, 2880x1440 for a 2:1 wall item — where a fresh generation comes back 2048x2048 square.
  **A square return does NOT prove the attachment was ignored**, and this file claimed it did for a while:
  the priest's altar came back square having edited the scaffold faithfully, floating spout and all. What
  a square DOES mean is unimportable as it stands, because the import scales the master to the slot and a
  1:1 master in a 2:3 slot is a third out. Look at it, then re-roll or re-frame — never import it.

- **A square return in a FRESH chat with both files attached is the prompt missing its frame sentence,
  and it is fixed in the entry rather than in the thread.** The priest's naos came back 2048x2048 with a
  vanishing point, a diagonal cord and none of the scaffold's `-19` turn — a painting made from the words
  with the attachment sitting unread beside them. Its entry was one of the ones with no frame line; adding
  "Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square.
  Paint over the reference image itself." landed the next roll at 1696x2528, on the scaffold. That
  sentence is the ONE non-material line allowed in a repaint — naming the canvas is not naming the
  projection — so check an entry carries it before blaming a thread or a spin.

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
  The plaques are FLAT wall items, so most of it is straight to the generator; and the statues need no
  scan either now that `prim_statue` exists — `couchant` is Anubis or Sobek, `lioness` is Sekhmet or
  Bastet, and Horus, Ra and Ma'at are `standing` with a different head and attribute.
  **A rank's GENERIC kind is its default god, and that is decided.** The priest's `statue` is an Anubis
  and it lives at `expert/statue.png`, not at `statue-anubis.png` — so every statue in his tomb is Anubis
  until a second god is painted for that rank. Chosen over duplicating the file under a patron name
  because it needs no work now, forecloses nothing, and leaves the generic slot filled for rooms no
  patron ever reaches. The consequence to expect: `PatronSheet` honestly reads 0 of 45 until someone
  paints a SECOND god for a rank, which is the point at which patrons start being visible in play.

  **`App/SiteMap/PatronSheet` is the sheet to judge them on**, and it works before any of the code does:
  it stages all nine crossed with all five on a rank's floor, reads `<kind>-<patron>.png` straight off
  the filesystem, dims a cell that is falling back to the generic art and counts how many of the
  forty-five are real. Today it says 0 of 45, which is the honest number.

  `yarn art-census`'s PATRONS section is the other half and the one to plan from: the sheet shows all
  forty-five because it cannot know which are reachable, and the census shows the nineteen that the
  world actually pairs, in room order, with the art state of the generic each one would replace.
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
yarn repaint                  # the 60 keys still owed
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

## The order the work goes in, and it is a decision

Not "ranked by rooms waiting" any more. The next release ships the priest's rank finished and the two
things the map cannot draw at all, and the last two ranks come after it:

1. **Finish the priest** — seven keys: `mat`, `chestProp`, `lamp`, `tallyBoard`, `rubbleSpill`, and his
   two patron variants `wallShrine-anubis` and `statue-anubis`. That closes the third rank of five.
2. **The plants** — `default/overgrown`, `-wall` and `-plant`. Shared art, one paste each, and the only
   condition the world authors: the Nile Delta Expedition carries it across four pyramids graded 0.2 to 1,
   and every one of them draws a 22x22 three-colour placeholder today. Judge them in `PropSheet`.
3. **Stairways and ward gates** — NEW work, not in the queue and not in the brief's ~224. See the section
   below for what it costs and the one decision it needs first.
4. **Release.**
5. **The pharaoh and the gods**, 51 keys between them, plus `wizard/crystal`'s primitive.

**The open work**, ranked by rooms waiting on it. **Everything the map can draw is now IN the queue** — every
placeholder the census counts, and every patron variant the world pairs. `yarn art-census` and
`yarn repaint` reconcile exactly, with four differences and each one written down in the entry that
carries it:

- `wizard/crystal` — an entry with no prompt, because there is no primitive to render a scaffold from.
- `default/flooded` — not queued: no site in the world authors a flooded condition, so a painted tide
  line would be drawn nowhere.
- `wizard/niche` — queued, but no room at that rank draws a niche until the gods' wall pool includes one.
- **`<rank>/chestProp` — queued at three ranks and counted by the census at NONE of them**, because no
  pool authors a chest any more. It is the TREASURE NODE's art now: a treasure room draws its rank's
  chest beside the marker (`NodeChest` in `SiteMapView.tsx`), so every rank needs the file and the census,
  which counts dressing slots, reports zero. Do not read that zero as "not needed" and do not put the kind
  back in a `decorations` pool — a chest that opens and a chest that is furniture cannot be the same
  picture, which is the whole reason it left the pools.

1. **Work the queue** — 60 entries and every one is a paste rather than a modelling job. `yarn repaint`
   lists them GROUPED BY RANK, poorest tomb first, which is how a rank actually gets finished and how
   the material reference stays the same between pastes.

   The largest single block is the gods' rank — two figures, ten chamber props and five wall items,
   about 257 rooms — and its section preamble carries what is peculiar about it — a brief full of absences, which three of its prompts answer by painting a part OUT
   in the background's own magenta so the import keys it away.
2. **`wizard/crystal`** — 27 rooms, authored, and the only kind in the set with no primitive to build on.
   Needs a model from nothing; everything else at those ranks is `--contents` on something that exists.
   Its queue entry says what the geometry has to be.
3. **Patron art — nineteen entries left, and two of them can be rolled today.** `yarn art-census` grew
   a PATRONS section for this, because it was invisible in exactly the way the floor scatter and the
   conditions were: the resolver is live, the world names gods on sixty-odd pyramids, and every one of
   them silently drew the generic art with nothing anywhere reporting it. A patron tile is ABSENT rather
   than a placeholder, so nothing on the map is wrong without them — they are the difference between a
   rank whose every tomb looks the same and one where the god is legible from the corridor.

   The census counts PAIRINGS rather than gods. Nine patrons across five kinds is forty-five files; only
   twenty-seven are reachable, because a god authored on a pyramid holding none of those five kinds draws
   nothing. Between them they cover 379 rooms; eight are painted and 219 rooms are still owed. That count
   went up rather than down when the shrine rooms landed, which is the trade named there: the world
   shows more gods, so more gods have to be painted.

   **Two still owed have a painted generic under them and can be rolled today**: `expert/wallShrine-anubis`
   (4 rooms) and `expert/statue-anubis` (1). Eight have landed — 88 rooms, the two largest pairings in
   the world among them, and the nobleman's patron art is now complete.

   The other fourteen sit on a placeholder — `master/mask-osiris` at 33 rooms,
   `master/mask-maat` at 32, `wizard/wallShrine-maat` at 19, `master/statue-osiris` at 13 — and each
   entry names what it waits on. That is where the remaining value is, and it is behind items 1 and 2.

   **Two gods per rank is the floor for any of it to show**, because a patron tells one pyramid from
   another WITHIN a rank. The nobleman had only Thoth until the Noble's Hidden Vault was dedicated to
   Anubis, and that one line in `spec/junior.ts` is what turned his patron tiles from 11 rooms of
   decoration into 79 — 84 now that the Sacred Ibis Migration is Thoth's too, the ibis being his bird
   and that journey the only one in the world named for a god's attribute rather than the god. All of it
   is painted: his rank is the first whose patron art is finished as well as its generics.

   The merchant is still in the old position: Bastet is his only visible god, so his `statue-bastet` is
   his generic statue under another name until a second god is authored at his rank.
   Check the census before painting for a rank. Judge the axis in **Storybook → App/SiteMap/PatronSheet**.

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

## Stairways and ward gates — HALF BUILT, and where to pick it up

**Route 1 was taken and the stairs are DONE**: art under the marker, and at a stairhead the marker is
turned OFF entirely rather than eased — a painted flight says "stairs" better than a symbol does, and
the stair is the one node whose art IS the node. The shape still renders at `opacity: 0`, because it is
what gives the group its clickable area. A stairhead draws `stair-up` at the floor's own `entrancePos`
and `stair-down` anywhere else, takes `stair-down-south` where its one exit faces south, takes the SIDE
file where that exit faces east or west, and mirrors the side file in x for the other hand. The ward
GATE is untouched — still the vector `<rect>` and three bars — and is what remains of this section.

**What is painted: all five**, in `tiles/default/`. A stairhead reads from any approach.

**Only the DESCENDING flights carry a cresset**, so only they are given a light pool. A climbing flight
is lit by the room it stands in.


### One generic set, not five — and the renderer already does it

**`tileUrl` falls back `<tier>/<name>` → `default/<name>`** (`tileAssets.ts:20`), which is how the
explorer and the sand are already shared. So the cheap shape is THREE files in `tiles/default/`, serving
every rank, with a rank overriding one later by dropping its own file in — no code, no manifest.

Two reasons to prefer that here, beyond the arithmetic of 3 files against 15:

- **A stair is mostly absence.** The tile is a dark shaft with two or three treads and a small cresset;
  the stone that says which tomb this is surrounds it on the map and is not in the sprite.
- **It is navigation, not furniture.** The explorer is shared for the same reason — one person walks all
  five ranks — and a way down reads the same in any tomb.

Where it will show and want an override first: the GODS, whose floor is lit calcite with no dust in it
and whose every other tile glows, and the PHARAOH's gilding. Take those two when the rest is done, and
leave the merchant's three as `default/` for the middle ranks.

**The count that sizes the work**: 443 stairheads, and every rank has plenty —

| rank | stairheads | go up | face east/west |
| --- | --- | --- | --- |
| merchant | 30 | 15 | 20 |
| nobleman | 68 | 34 | 36 |
| priest | 61 | 31 | 34 |
| pharaoh | 126 | 63 | 69 |
| gods | 158 | 79 | 74 |

Half of every rank's stairheads are the way back UP, so `stair-up` is not an optional third file — it is
half the doors in the game.

### What is left, in order

1. ~~Roll the flights~~ — done, all four.
2. **They already live in `tiles/default/`** — an import writes them there, so a roll is drawn at every
   rank the moment it lands.
3. ~~The ward gate~~ — **BUILT AND DRAWN**, `prim_gate` with `--contents=shut` and `--contents=open`,
   on rebuild lines like everything else. It is the only pair in the set IMPORTED FROM ITS OWN RENDER:
   there is no painted master, so the render is the tile, and sending it through a repaint later changes
   one source path and nothing else. Unlike the stairhead's, the gate's marker STAYS — its colour is the
   only thing that says which key — so the leaf sits under a vector eased to `NODE_OVER_ART_OPACITY`.

   **A GATED BRANCH DOES NOT BEGIN AT ITS GATE**, which is what the material has to hide. World-gen
   authors the whole branch at the tier it guards, gate included, and the gate can sit well down it — so
   the corridor leading TO the ward was built of the pocket's stone and drawn in it. The map said
   starter, expert, starter gate, expert: three changes to convey one, on 693 cells across 59 floors.
   The seam is placed by TOPOLOGY now (`cellsThisSideOfAWard`): this side of a ward is the pyramid's own
   stone, beyond it is the rank it guards. The walk stops at a gate whatever STATE it is in — stopping
   only at shut ones would flatten a floor to one tier the moment a gate was opened.

   **The bars stand on the SILL, at the gate's far side.** Wherever one rank's stone meets another's
   across a way the player walks, the map lays a threshold in the tier being entered (`tileRegions`), and
   a ward gate is exactly such a seam — the pocket it shuts is authored at another tier. A shut gate's
   own square wears the FLOOR's stone rather than the pocket's (`cellFloorAt`, which is what stops the
   next tier being read off the paving early), so the seam falls beyond it: the gate's square is the
   ground you stand on to work the gate, and the bars are its far wall. `approachCells` is how the
   renderer knows which side that is. 489 gates, every one of them a cut — nothing behind one is
   reachable another way, median 34 cells sealed and up to 124.

   **A clip built from cell rects has a seam in it**, which this is the first thing to straddle. Cells
   are `SIDE_W` apart across and `WALL_H` down, and `footprintPath` bridged neither, so the strip holding
   the gate's bars was cut away and its two jambs drew as separate posts. It bridges them now, between
   cells that are both in the same footprint.

   **THE BARS FACE THE POCKET, and that is not the same as facing away from the player.** Only `ns` and
   `ew` gates run straight through; `es`, `sw`, `nw` and `en` are CORNERS, where the way in and the way
   that is sealed are at right angles — so aiming them opposite the approach hung **331 of the 489** on a
   wall the pocket was not behind. The sealed side is the neighbour whose own approach is the gate
   itself, which `approachCells` already knows, and that settles three-way cells too.

   **The side view is ONE bar, 14 units wide.** A portcullis's uprights stand in a row across the
   passage, so edge-on they line up behind one another and the rank draws as a single upright — a second
   bar beside it would be a second gate. Five went to three, three to two, and each was still the face-on
   gate at a smaller size; one is the count the view actually has, and with one there is nothing to be
   wide for, so the panel is `SIDE_W`, the wall's own thickness.

   **It is drawn AFTER the archways**, with them rather than among the furniture. A gate is hung IN a
   doorway: the arch is the masonry of the opening and the gate is what has been fitted into it, so the
   gate is the nearer of the two. Sorted by floor line with the props, its own head came out behind the
   beam of the arch it stands in.

   **It stands ON the band and fades like an archway.** A horizontal seam is `WALL_H` of wall seen face
   on: feet on its LOWER edge hang the whole grille below the opening, in the room rather than in the
   doorway, so the gate comes down on the band's TOP edge where an arch's jambs do. And because a gate is
   drawn across a way through, the player passes BEHIND it — a barrier that hid him would be a wall — so
   it takes `ARCH_FADE` for the two cells it spans, exactly as a doorway does.

   **Two drawings per state, because a gate is aimed the way a flight is.** Walked ACROSS, the grille's
   own plane is the y-z one and this projection draws that as a line, so `-side` keeps the bars facing
   the viewer and moves the JAMBS into depth: a pier above and a pier below, where the face-on gate has
   one either side. Turning the tile was never an option — a reflection is a real oblique view and a
   rotation is a skew (`NodeSprite`), which is `prim_stair`'s law one axis over. Four files:
   `gate`, `gate-open`, `gate-side`, `gate-open-side` — though the two OPENED ones are the same drawing,
   because an opened gate has gone down frame and all and a slot has no facing to collapse.

   **The seam arithmetic is the thing to get right.** `cellLeft`/`cellTop` put the gap BEFORE each cell,
   so the gap AFTER cell c starts at `cellLeft(c) + CELL` and the band after row r at `cellTop(r) + CELL`.
   Written as if the gap came before, the gate stood a whole `SIDE_W` west of its own seam and rested on
   the TOP edge of the band below it, hanging 28 units clear of the sill it is supposed to stand on.

4. **Overrides for the gods and the pharaoh**, if the generic set reads wrong on their stone.
### Two facts that decided the shape

- **A node is a quarter the area of a prop.** `NODE_RADIUS_LARGE` is `CELL * 0.34`, so a node occupies
  about 38x38 against a prop's 56x84 — which is why the art is a full prop-box sprite UNDER the marker
  rather than a painted marker.
- **A node's COLOUR carries state, and paint cannot.** `stairFill`, `stairStroke` and `stairIcon` are
  keyed on `CellState`, and a floor-key gate is tinted by its key colour on top of that. That is why the
  marker eases to `NODE_OVER_ART_OPACITY` over a chest rather than going out — and why the GATE's marker
  will have to stay when its art lands, where the stair's could go. A stairhead is the exception because
  a stair has no key and no state a player reads off its colour.
**Three things the two flights cost, and none is guessable from the code:**

- **They are not mirror images.** Drawn height is `z + k*y`, so a flight RISING as it recedes separates
  twice over — each tread gains its own rise and 0.7 of its going — while one DESCENDING as it recedes
  cancels: 0.10 of rise against 0.12 of going leaves 0.016 on the page and the treads smear into one
  band. A descending flight comes TOWARD the viewer, where rise and going add again.
- **A flight head-on is a striped wall.** There is no third plane for a staircase's side profile, so
  pale tread, dark riser, pale tread is all the geometry says — and a course of masonry says the same.
  The PARAPETS are what separate them: a wall each side climbing with the flight gives it a silhouette
  that rises to one end, which a wall has not. The first render without them filled the frame with
  stripes.
- **A tread below the near lip is a slab on the floor.** `prim_pit`'s law, met again: the descending
  flight's rise and going are set so the last tread still draws above `-k*d/2`, or it is drawn in front
  of its own hole.

**AIMING ONE IS GEOMETRY, NOT `--spin`.** A stairhead is a dead end — 431 of the world's 443 — and its
one exit is which way the player came from, spread almost evenly: n 107, e 108, s 102, w 114. So a
flight wants to face four ways, and the obvious move fails: `--spin=90` turns the shaft's far wall
EDGE-ON, and since that wall is the whole of the dark it collapses to a black line with the treads
standing beside it as vertical slabs. `--contents=down-side` is the sideways flight built instead,
treads walking across X with the far wall still facing the viewer. East and west are that one MIRRORED
in x, which is a real oblique view of the mirrored object and costs a transform rather than a tile —
rotating a sheared sprite is the thing that is forbidden, not reflecting it.

**DEPTH IS VALUE, because a hole gets no light.** Its walls stand in the y-z plane and draw as lines,
so no lamp reaches down it and `--sun` has nothing to bite on. The descending flights hand the
generator the falloff already built: tread one is paving (`body`), tread two is stone in shade
(`deep`, new in `PART_COLOURS`), tread three is the shaft's own `VOID`. Three values say "going down"
before a word of the prompt does — which is the same argument `prim_pit` makes about a rack's gap.

**FRAME THE SCAFFOLD LIKE THE PICTURE YOU WANT, because scale is what two rolls were lost to.** The
merchant's descending stair came back twice with its treads masked away, and neither time was the
painting bad: both were CLOSE-UPS. The scaffold had a tall cresset beside a low opening, so the camera
fitted the torch and the hole sat in the middle third — and a painter handed that draws the stairs, not
the empty half. The mask then kept thin bars where the paint had shaft.

**And the way out was to move the MODEL, which is the opposite of everything else in this file.** The
third roll never happened: the FIRST painting was the best of them, so the geometry was tuned to it
instead — opening 0.98 x 0.92, treads spread to a 0.17 going, cresset at 1.35 — and the same master went
from one tread visible to two with its torch lit. A mask is ours to change and a return is not, so where
a painting is good and the alignment is wrong, move the mask.

`_stair_torch` takes its scale as an argument rather than being edited in place, because the flight that
walks ACROSS was painted over the full-height cresset and a painted tile's mask can never move.

**A TORCH AT THE MOUTH IS WHAT MOTIVATES THE FALLOFF.** Graded treads on their own are shading nobody
asked for; a cresset beside the opening makes the top tread the one the light reaches and every one
below it further away. `_stair_torch` stands it OFF to one side — anything crossing the mouth reads as a
lintel, which `prim_pit` paid four renders to learn — and SHORT, at 0.30: `seat_and_normalise` scales the
whole object to one unit tall, so a cresset at head height is simply the tallest thing in the frame and
shrinks the hole it was added to light. The first one took the sprite to 77 units and left the stair a
band at the bottom.

It also buys real light rather than painted light: `LIT_DECORATIONS` already lays a `LightPool` under a
lamp, so a stair node can light its own floor the way a lamp lights a chamber.

**And the pit is retired, which is half of why the stair can exist** — a hole in the floor now means a
way down and nothing else. See the brief's §2 note.

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
