# Masters

The high-resolution image each map tile was made from, and the command that turned it into one.

Nothing here is imported by the app: `art/` sits outside `src/`, so Vite never sees it and none of it
reaches the bundle. What ships is `src/assets/tiles/<tier>/<name>.png` at slot size — 56x84 for a prop,
448x448 for a floor — plus `src/assets/tombWall/<tier>.webp` for the tableau, and those stay the only
copies the game loads.

```
art/masters/props/<tier>/<name>.webp   a prop's painted return, ~1334x2000
art/masters/surfaces/<tier>-<slot>.webp  floor 2000x2000, wall-face 2000x240, threshold ~2000x900
art/masters/tombWall/<tier>.webp       the tableau's whole-wall panel, 2000x2000
art/rebuild.sh                 re-imports from the masters, with the flags each tile was imported with
```

**What is stored, and what is not.** A generator's return cannot be reproduced: the same prompt and the
same reference give a different picture every time, so the painted master is the one irreplaceable file
and it is kept. A scaffold and its mask are the output of `scripts/renderProp.py` on fixed arguments and
come back byte for byte, so they are not kept — `rebuild.sh` carries the argument list instead, which is
smaller than the images and also says how the tile was imported.

**Take the master from the generator's own DOWNLOAD, never from a pasted image.** Gemini returns
1686x2528 and the paste path resizes it to 1334x2000 on the way through — a fifth of the resolution gone
before anything measured it. It costs nothing to notice and cannot be recovered later; every master here
was re-made from `~/Downloads` once that turned up.

A master that arrived as a SHEET is stored as the sheet — `basin-sheet.webp` is three frames and the tile
is the middle one via `cut-sheet`. The sheet is what the generator actually returned, and a crop guessed
after the fact would be a master under a name claiming more than it knows.

Masters are `.webp` at quality 92. A 1334x2000 painted return is 3.3MB as PNG and about 140KB this way,
which is the difference between a repository that can hold the brief's ~224 files and one that cannot.

`rebuild.sh` re-imports every tile it covers from its master. Run it after changing an import flag, or to
see whether a change to `importTile.ts` moved a tile that is already approved.

## The other four ranks' surfaces cannot be recovered, and should be re-rolled

Twelve files — `floor`, `wall-face` and `threshold` at junior, expert, master and wizard. They have
masters and no recorded flags, so the obvious move is to re-derive the flags by reproduction, the way the
merchant's were. It was tried and it does not close, and the narrowing is worth keeping so nobody spends
the afternoon again:

- **`--repeat=1`, not the docs' 2.4.** On the nobleman's floor, 2.4 scores 0.02 against the shipped tile
  and 1.0 scores 0.71. The per-slot recipe in the brief is not what these were imported with.
- **`--flatten` is not a discriminator at all.** It lays a uniform wash, which preserves gradients: 0
  through 0.8 moved the score 0.709 to 0.669. Do not tune with it.
- **`make-seamless` and `--roll` both make it worse** — 0.54 and negative respectively. So the master is
  already past whatever seamless pass it had.
- **The masters carry artifacts the shipped tiles do not.** `junior-floor.webp` has the ochre band the
  brief asks for running across it and along its edges; re-imported at repeat=1 the pattern matches the
  shipped tile slab for slab, and an orange band appears at top and bottom that the shipped tile has
  not. The handover records why: "a nobleman's ochre band across the paving became a red stripe every
  eight cells". Whatever removed it is not in this repository.

So these masters are the right LINEAGE and not the shipped tiles' direct input, exactly as the note
below says of post-processing copies. The route to 2x for them is a re-roll, not archaeology: generate
each surface again, import it through the recipe, keep the return as the master. That also gets the four
ranks something the merchant now has and they do not — a master that is a return.

## How a master is matched back to its return, and why the fingerprint is the weaker test

Everything generated is in `~/Downloads`, under names the generator chose — `Cavalier Oblique Market
Table Render (3).jpeg` — so the job is matching a return to the tile it made. Six were unmatched here and
five are now matched: the merchant's `niche`, `tallyBoard`, `floor`, `wall-face` and `threshold`.

**The fingerprint is the weaker test and it failed on all five.** It downscales both to 48x48 greyscale
and takes the smallest RMS, and it works on the four props made by prompting because their returns look
like their tiles. It cannot work where the pipeline transforms the source:

- A MASKED tile's return is mostly magenta, so a grey thumbnail of it cannot resemble the finished tile.
  The niche scored 34 against a field of 35 — indistinguishable from absent. Keying and trimming first
  got 26 against 43: better, still a judgement call.
- A FLOOR is imported with `--flatten=0.65`, which washes two thirds of the tile toward one palette
  colour, and `--repeat=2.4`, which shrinks and re-tiles it. Candidates converged to 5.5 against a
  next-best of 6.2 on luminance, and 0.43 against 0.40 on gradient correlation. Both noise.

**REPRODUCTION is the test that works.** Import each candidate through this pipeline and look at the
result beside the shipped tile. It took one contact sheet per slot and none of the five was close: only
one candidate is a recess holding two jars and a bundle, only one is a plank of tally strokes with a
chalk stub, only one floor has that slab scale with those scattered circles and incised marks, only one
face has the pale whitewash patches in the same places, only one sill has the dished band with a rubbed
ochre line along its edge. Where the numbers matter they agree exactly — the niche came back at lum 61
warmth +20 and the tally board at lum 111 warmth +35, both the shipped tiles' own.

**One orphan is left: the merchant's `arch`.** Its master is not in `~/Downloads` under any name, and it
is not a variant of the candidates that are — the shipped lintel is a single flat plank where every
candidate has a stepped one with a dark reveal, and it is paler than all of them at any flatten. Left
unmatched on purpose: guessing would put a wrong master in the repository, which is worse than a gap.

## Stored resolution: 2x, and the one seam in it

`importTile`'s `SPRITE_SCALE` is how many stored pixels a tile carries per map unit, and it is 2. The
renderer draws every tile as `<image width={CELL}>` in SVG user units, so stored resolution is
independent of layout — nothing about placement, seating or the wall band moves when this changes. What
it buys is real pixels for a zoomed map and a retina display, where a 1:1 tile has none.

Every slot dimension goes through `px()`. Scaling `TILE` alone would desynchronise it from `WALL_H`,
`ARCH_W` and `ARCH_H`, which come from `mapScale` in map units.

**It reaches everything with a rebuild line**, which is now every prop, every wall item, and the
merchant's three surfaces. The other four ranks' floors, faces and thresholds have masters but no
recorded flags, so they are still 448 and 1x — the remaining seam. The merchant's closed once his
returns were matched, and closing the rest is the same move: re-import with the docs' per-slot recipe and
check the result against the shipped tile, which is exactly how his were identified. Cost, measured on
the nobleman's floor: 232K at 1x against 388K at 2x.

## What rebuild.sh covers, and what it does not

Only the props made through [the prop pipeline](../docs/instructions/prop-pipeline.md) have a rebuild
line, because the pipeline records the flags as it goes. At the merchant that is `shelf`, `chestProp`,
`brazier`, `lamp`, `pillar`, `mat`, `pit`, `offeringTable` and `jarRack`; at the nobleman all four props and all
three wall items.

**A prompted tile cannot simply be GIVEN a rebuild line, which is why `offeringTable` had to be re-rolled
to get one.** Its shadow was painted into the art, so there is nothing to mask it against and nothing to
seat under it, and the painted table was never drawn over a scaffold in the first place — the mask would
have cut a shape the art does not fill. `statue` and `basin` are the last two in that position: one roll each over their
primitive, and they join the script — though `statue` needs a scan and `basin` has no primitive yet. Until then they keep the opaque painted shadow, where
everything on a rebuild line now shades the floor instead of replacing it.

The four earlier merchant props were matched back to their downloads by fingerprint rather than by
filename, which is the only reliable way once a name like `Gemini_Generated_Image_ifyf61ifyf61ifyf.jpeg`
is in play: downscale both to 48x48 greyscale and take the smallest RMS. The right file scores 0.6 to 1.5
against a next-best of 18 to 26, so the match is not a judgement call. `basin` is the exception and the
reason `basin-sheet.webp` is named as a sheet: a frame cut on gutters does not fingerprint against a
naive third of its sheet, and the middle frame's 30.4 against 41 and 43 is corroboration, not proof.

The masters backfilled from `~/tile-previews/` are the irreplaceable half WITHOUT their flags: the tiles
they made were imported before there was anywhere to write the command down, and the docs record the
recipe per SLOT rather than per file (`--repeat=2.4 --flatten=0.65` for a floor, `--headroom=0.14
--repeat=2` for a face). Re-importing one means reading its numbers back with `tile-stats` and finding
the flags again, which is why they are not in the script pretending to be reproducible.

**A master is the generator's RETURN, and where the return could not be identified the file here is a
processed copy instead.** Fingerprinting works on a prop because the shipped tile is a scaled crop of the
return. It fails on anything `make-seamless` touched: that rolls the source and lays its centre back over
the seam cross, so a floor is not a scaled copy of anything and every one of the four scores 9 to 15 with
a runner-up within 1. `*-floor.webp`, the remaining thresholds, `master-wall-face.webp` and
`tombWall/junior.webp` and `expert.webp` are therefore the 2000px post-processing copies, kept because
they are what exists, and not to be treated as returns. The rest are the returns, at 2048x2048 for a
square generation and 5856x704 for a wall strip.

**The merchant's own surfaces are missing and should stay missing until someone knows which file it was.**
`~/tile-previews/` holds two 2000x2000 floor candidates (`floor15.png`, `floor16.png`) and two sill
candidates (`sill.png`, `sillbig.png`), and the shipped tiles cannot decide between them: the import's
`--repeat` and `--flatten` alter a source further than the candidates differ from each other, so the
closest match by RMS is 13.6 against 14.5 and means nothing. Guessing would put a wrong master in the
repository under a right-looking name, which is worse than the gap.
