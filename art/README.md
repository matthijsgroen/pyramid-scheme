# Masters

The high-resolution image each map tile was made from, and the command that turned it into one.

Nothing here is imported by the app: `art/` sits outside `src/`, so Vite never sees it and none of it
reaches the bundle. What ships is `src/assets/tiles/<tier>/<name>.png` at slot size — 56x84 for a prop,
448x448 for a floor — plus `src/assets/tombWall/<tier>.webp` for the tableau, and those stay the only
copies the game loads.

```
art/props/<tier>/<name>.webp   a prop's painted return, ~1334x2000
art/surfaces/<tier>-<slot>.webp  floor 2000x2000, wall-face 2000x240, threshold ~2000x900
art/tombWall/<tier>.webp       the tableau's whole-wall panel, 2000x2000
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

## What is still missing a master, and why fingerprinting cannot find it

The merchant's `niche` and `tallyBoard` were recorded here as unidentifiable and are not: they are
`Mudbrick Recess Image` and `Mudbrick Recess Image (1)` in `~/Downloads`. **The fingerprint could not see
it, and the reason generalises to every masked tile.** A wall item's raw return is mostly magenta, so a
grey thumbnail of it cannot resemble the finished tile — the method needs the key and the trim applied
first, and even then a mask plus unknown brightness leaves it a judgement call at 26 against 43.

What identified them was CONTENT. Only one candidate is a recess holding two jars and a bundle; only one
is a plank of tally strokes with a chalk stub on it. And the proof is REPRODUCTION: imported with the
flags now in `rebuild.sh`, they come back at the shipped tiles' own numbers — lum 61 warmth +20, and lum
111 warmth +35. That is a stronger test than any distance metric, and it is the one to use next time.

**The merchant's `floor`, `wall-face` and `threshold` still have no master, and comparison cannot find
them.** A floor goes through `make-seamless` BEFORE import, which patches the source's own centre over
its seam, so the shipped tile's real input is a make-seamless OUTPUT and no download can match it. Worse,
`--flatten=0.65` lays a uniform wash over two thirds of the tile: candidates converged to 5.5 against a
next-best of 6.2 on luminance, and 0.43 against 0.40 on gradient correlation. Both are noise. The
candidates are in `~/Downloads` as `Egyptian Merchant Tomb Tile` and friends; picking one means
re-importing and accepting that the merchant's surfaces shift, which is the only way they get rebuild
lines and 2x.

## Stored resolution: 2x, and the one seam in it

`importTile`'s `SPRITE_SCALE` is how many stored pixels a tile carries per map unit, and it is 2. The
renderer draws every tile as `<image width={CELL}>` in SVG user units, so stored resolution is
independent of layout — nothing about placement, seating or the wall band moves when this changes. What
it buys is real pixels for a zoomed map and a retina display, where a 1:1 tile has none.

Every slot dimension goes through `px()`. Scaling `TILE` alone would desynchronise it from `WALL_H`,
`ARCH_W` and `ARCH_H`, which come from `mapScale` in map units.

**It reaches only what has a rebuild line**, which is every prop and wall item and none of the surfaces:
floors, faces and thresholds were backfilled without their flags (below), so they are still 448 and 1x.
That is a seam, and a mild one — a floor is a repeating pattern seen mostly at 1:1, and the objects a
player looks at are the ones that doubled. Measured on the nobleman's floor, re-imported from its master
with the docs' per-slot recipe: 232K at 1x against 388K at 2x, and the five surfaces are 1.2M of the
2.5M that ships. Doubling them is not expensive; what it costs is that their flags would be re-derived
rather than recorded, and that changes approved art.

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
