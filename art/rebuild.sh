#!/usr/bin/env sh
# Re-imports every map tile from its master in this directory. See README.md.
#
# Three renders per prop, none of them stored:
#   OBJ    the object alone, no shadow — the mask the repaint is cut to
#   SHADOW the footprint alone, in the same frame — laid back under the art at import, TRANSLUCENT, so
#          the rank's own paving shows through it. It is painted the rank's floor darkened, so --floor
#          has to name the rank being built: left at the default, the nobleman's props each sat in a
#          patch of the MERCHANT's floor, 62 luminance darker than the one they stand on.
# The scaffold that was handed to the generator is a third, and is not needed here.
#
# The shadow is rendered rather than painted because a repaint will not paint one: told to, the
# generator paints an invented floor across the footprint instead, and the tile arrives with nothing
# below 35 and sits on nothing. Keeping it out of the repaint's hands also makes it identical across
# the rank, which no amount of prompting would.
set -e
cd "$(dirname "$0")/.."
BLENDER=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
OBJ=$(mktemp -t propobj).png
SHADOW=$(mktemp -t propshadow).png
trap 'rm -f "$OBJ" "$SHADOW"' EXIT

# Renders the pair a prop is imported with. First argument is the primitive, the rest are passed on —
# and every one of them must match what the master was painted over, or the mask keeps a silhouette the
# paint no longer fills.
scaffold() {
  prim=$1
  shift
  # arg() returns the FIRST match, and the argument ORDER here is load-bearing in both directions.
  # --shadow=0 goes BEFORE "$@", so a per-prop --shadow passed for the footprint render cannot put a
  # footprint back into the mask. The rank's stone goes AFTER, so it is a DEFAULT: a prop that does not
  # name a colour gets the merchant's, and a rank that does gets its own out of `tierPalette`.
  "$BLENDER" -b -P scripts/renderProp.py -- --primitive="$prim" \
    --shadow=0 --background=none --out="$OBJ" "$@" --colour=#a49781 --floor=#6c6257 >/dev/null
  "$BLENDER" -b -P scripts/renderProp.py -- --primitive="$prim" \
    --only=shadow --background=none --out="$SHADOW" "$@" --colour=#a49781 --floor=#6c6257 >/dev/null
}

# starter — the merchant

# The merchant's SURFACES, matched back to their downloads and given rebuild lines for the first time.
# art/README recorded them as unidentifiable, and no distance metric could pick between the candidates:
# --flatten=0.65 washes two thirds of a floor toward one palette colour, so they converged to 5.5 against
# a next-best 6.2 on luminance and 0.43 against 0.40 on gradient correlation. Both noise.
#
# What settled it was importing each candidate through this pipeline and LOOKING at the result beside the
# shipped tile, which took one sheet per slot and was not close: the floor's slab scale, its scattered
# circles and incised marks; the face's pale whitewash patches in the same places; the sill's dished band
# and the rubbed ochre line along its edge. Reproduction identifies a master where a metric cannot.
#
# The flags are the docs' per-slot recipe (tile-art-brief, "The loop"), which is what those numbers were
# always meant to be.
yarn import-tile art/masters/surfaces/starter-floor.webp --tier=starter --name=floor --slot=floor \
  --filter=smooth --key=none --repeat=2.4 --flatten=0.65
yarn import-tile art/masters/surfaces/starter-wall-face.webp --tier=starter --name=wall-face --slot=face \
  --filter=smooth --key=none --headroom=0.14 --repeat=2
yarn import-tile art/masters/surfaces/starter-threshold.webp --tier=starter --name=threshold --slot=sill \
  --filter=smooth --key=none
scaffold shelf
yarn import-tile art/masters/props/starter/shelf.webp --tier=starter --name=shelf --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --saturation=1.45 --brightness=0.93

# No --saturation: masking away this repaint's invented floor leaves only wood and reed, which are
# already the warmest things in the rank. 1.3 put it at +38 against a target band of +22 to +25.
scaffold chest
yarn import-tile art/masters/props/starter/chestProp.webp --tier=starter --name=chestProp --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"

# --depth=0.65 must match what the master was painted over: a circular dish gives a top face so large
# under this shear that the thing reads as a round table. --saturation=2.2 is high because the repaint
# came back nearly achromatic (+1 warmth) and saturation SCALES existing chroma, so a grey prop needs
# multiples of what a brown one does. 2.7 reaches the +22 band and turns humble clay to brass.
scaffold brazier --depth=0.65
yarn import-tile art/masters/props/starter/brazier.webp --tier=starter --name=brazier --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --scale=0.7 --saturation=2.2 --brightness=0.95

# The stool's seat is 0.16 deep, not 0.26: at 0.26 its top face was 40% of the drawn height and read as
# a wall with legs. --brightness=0.85 clips a repaint that came back 9.3% over the light end — the
# palest of the four so far, because pale split timber is most of its surface.
scaffold lamp
yarn import-tile art/masters/props/starter/lamp.webp --tier=starter --name=lamp --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --scale=0.48 --saturation=1.6 --brightness=0.85

# No stone pad in the model: a wide flat slab at floor level casts a shadow of its own silhouette
# right under itself and reads as a second step. --saturation=1.7 because the repaint gave the trunk
# grey-green bark; the wedges are the only warm thing on it.
scaffold pillar
yarn import-tile art/masters/props/starter/pillar.webp --tier=starter --name=pillar --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --saturation=1.7 --brightness=0.9

# The mat is a flat rug and nothing else, and it is the only prop here whose identity is PAINT: under
# this projection a flat thing on the floor has no silhouette. Three shaped designs were rendered and
# rejected first — see prim_mat, which records why a fold at the NEAR edge is invisible.
#
# --spin=9 is the one thing geometry still owes it: a rug lying askew of the grid cannot be read as part
# of the paving, where an axis-aligned one can. --shadow=0.5 keeps the footprint faint, since a slab at
# floor level casts a copy of itself at any offset and reads as a second step (`prim_pillar`).
#
# --saturation BELOW 1, the only prop that needs it: the repaint came back photoreal straw at +51 warmth
# against a rank that sits at +22 to +25. The lever runs both ways, and the brazier is the other end of
# it at 2.2. --brightness=0.86 is a narrow window — 0.8 left the rug only 7 from the floor's own value
# and 0.9 put 2.4% of it over the light end.
scaffold mat --spin=9 --shadow=0.5
yarn import-tile art/masters/props/starter/mat.webp --tier=starter --name=mat --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.86 --saturation=0.6

# A hole casts nothing, and --sun=0 says so to the CAMERA as well as to the shadow. The frame leaves
# room under an object for the footprint the sun pushes toward the viewer; with no footprint that room
# is empty, and on a slot that does not re-seat — every wall slot — it just shifts the art up its band.
#
# --shadow=0 on the render and NO --seat at import: `make_shadow` flattens the
# object to z=0 and pushes it toward the viewer, so a pit's footprint is a second dark parallelogram
# lying in front of the first one and the tile reads as two holes.
#
# NO --saturation, and the reason is a measurement that was confidently wrong. `tile-stats` reports
# warmth as a WHOLE-SPRITE mean, and 43% of this sprite is black shaft; black has no chroma, so it
# drags that mean down, and tuning the whole tile to the painted band's +24 pushed the STONE to +75
# against a rank whose wall sits at +29. It shipped that way and was caught by eye, not by a number.
# The band belongs to the material being matched: measure the brick alone against the rank's own brick.
#
# --brightness=0.82 puts the spoil at #847561, +35 warmth and 119 luminance, against the niche's
# mudbrick at +35 and 112 and the wall face's +29 and 112. Seven lighter than the wall is right — the
# spoil is freshly broken faces where the wall is worn and sooted. 0.78 matched the wall exactly and
# took the pole and the ladder down with it, until the timber was as dark as the shaft.
scaffold pit --shadow=0 --sun=0
yarn import-tile art/masters/props/starter/pit.webp --tier=starter --name=pit --slot=prop \
  --filter=smooth --mask="$OBJ" --brightness=0.82

# The market table was one of the four made by PROMPTING alone, before the pipeline existed, so its
# shadow was painted into the art and it had no scaffold, no mask and no rebuild line — which is how it
# missed the translucent seat that shelf, chest, brazier, lamp, pillar and mat all got. Re-rolled over
# prim_market, it joins them.
#
# --saturation=1.3 is the documented repaint drift, not a choice: a generator copying a render
# desaturates toward grey, and this came back at +14 warmth against a rank whose hand-painted props sit
# at +22 to +25. 1.3 lands it at +24, beside the jar rack at +22 and the ka-statue at +22.
scaffold market
yarn import-tile art/masters/props/starter/offeringTable.webp --tier=starter --name=offeringTable --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --saturation=1.3

# The jar rack, the second of the four prompted props to be re-rolled over its primitive. Its scaffold
# marks the frame `body` and every piece of every jar `pottery`, so the repaint is told which lump is
# timber and which is clay instead of inferring it from silhouette.
#
# --brightness=0.82 --saturation=1.7, and 1.7 is the highest in this file after the brazier's 2.2 for the
# same reason: a generator copying a render desaturates toward grey, and split pale timber has little
# chroma to begin with, so there was almost nothing to multiply. It came back at +7 warmth and lands at
# +23, inside the hand-painted band of +22 to +25.
#
# The dark-end fault tile-stats prints — 8.3% below 35 — is the clay and the shadow, and the painted
# basin sits at 23.8%. It is the LIGHT end that matters on this one: untouched, the timber put 12% of the
# tile over the clamp.
scaffold jarrack
yarn import-tile art/masters/props/starter/jarRack.webp --tier=starter --name=jarRack --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.82 --saturation=1.7

# The standing rubble: `rubble` is two objects and this is the one a ROOM is dressed with, resolved
# through SiteMapView's STANDING_VARIANT. The scatter layer's flat spill shares the name and not the art.
#
# --brightness=0.82 --saturation=1.45. Untouched it measured 6 LIGHTER than the slab, which tile-stats
# faults outright — under 10 either way a prop does not read against the floor it stands on. Down at 0.82
# it separates by 15 the other way, and the saturation brings +11 warmth back to +22, the bottom of the
# hand-painted band.
scaffold rubblePile
yarn import-tile art/masters/props/starter/rubblePile.webp --tier=starter --name=rubblePile --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.82 --saturation=1.45

# --brightness=0.70 is the deepest clip in this file, and it is a WHITEWASH problem rather than the usual
# repaint drift. Told the shrine is whitewashed, the generator painted it white: untouched, 54.7% of the
# tile sat over the rank's 152 light end and the sprite measured 60 LIGHTER than the floor.
#
# It is still meant to be the brightest thing the merchant owns, and it is — the whitewash lands at 146
# with a max of 161, against a floor at 99 and a wall face whose own worn whitewash tops out at 120. What
# 0.70 buys over 0.74 is the tail: 4.0% of the sprite over the clamp instead of 19.4%.
#
# Judge that number on the WHITEWASH and not on the sprite. This tile is a pale box, a near-black recess
# and a shadow, so its whole-sprite mean sits near the floor's own value however bright the box is, and
# tile-stats' "1 lighter than the slab" at 0.65 said nothing about whether the shrine reads.
scaffold shrine
yarn import-tile art/masters/props/starter/shrine.webp --tier=starter --name=shrine --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --scale=0.85 --brightness=0.70 --saturation=1.5

# The first CLOTH in the set, and the one the pipeline's own table said could not be made. --sun=0.16
# because an awning is a sheet, and a sheet flattened to z=0 is prim_pillar's slab: at the default the
# footprint slides out from under and reads as a second sheet on the floor. The posts are what it is
# really cast by.
#
# --saturation=1.5 is the repaint drift again, on linen: it came back at +7 warmth against a rank whose
# hand-painted props sit at +22 to +25. Judge that on the CLOTH and not on the sprite — a fifth of this
# tile is shadow, and the whole-sprite mean put it 9 from the floor when the cloth itself is 18 lighter
# and 21 warmer.
scaffold hanging
yarn import-tile art/masters/props/starter/hanging.webp --tier=starter --name=hanging --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.92 --saturation=1.5

# The merchant's two wall items, matched back to their downloads and given rebuild lines for the first
# time. art/README recorded them as masters that could not be identified; they were `Mudbrick Recess
# Image` and `Mudbrick Recess Image (1)`, and the fingerprint could not see it because a masked wall
# item's raw return is mostly magenta — a grey thumbnail of that cannot resemble the finished tile. What
# identified them was CONTENT: only one candidate is a recess holding two jars and a bundle, and only one
# is a plank of tally strokes with a chalk stub on it. Reproduction is the proof: imported with these
# flags they come back at the shipped tiles' own numbers, lum 61 warmth +20 and lum 111 warmth +35.
#
# --sun=0 on both: a wall item hangs, so the frame leaves no room under it (see the pit).
scaffold niche --shear=0.5 --width=448 --height=224 --sun=0
yarn import-tile art/masters/props/starter/niche.webp --tier=starter --name=niche --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18

# FLAT — a plank hanging against the surface, so no mesh and no mask, the same route as the nobleman's
# stela. --brightness=0.85 clips a return that came back over the light end, which the handover already
# recorded as 10.3% before anyone had the flag written down.
yarn import-tile art/masters/props/starter/tallyBoard.webp --tier=starter --name=tallyBoard --slot=wall \
  --filter=smooth --headroom=0.18 --brightness=0.85

# shared — one desert blows into all five tombs
#
# Sand is the only tile whose SHAPE this repository generates. It is not an object: a drift has no
# silhouette, only an edge, and asked for one on magenta a generator returns a rim feathered over a
# hundred pixels that keys to a violet halo. So the return is a full-bleed TEXTURE with no shape at all —
# nothing it can get wrong — and `drift-mask` supplies the alpha, which `--mask` composites with dest-in
# so a soft rim stays soft. Same split as every prop: geometry ours, material theirs.
#
# --key=none because there is no background to key. The mask IS the shape.
#
# --peak=0.5 with --brightness=0.78, and the transparency is doing most of that work. SAND LIES THIN:
# only the deepest part of a drift hides the stone, and at full opacity the tile stopped being sand on a
# floor and became a pale shape ON it — it read as light spilled across the passage. Under 1 the floor's
# own value comes through everywhere, which dulls the drift by the stone it lies on rather than by a
# knob, and dulls it by the right amount at each rank without being tuned per rank: more over the
# pharaoh's dark granite, less over the nobleman's pale sandstone.
#
# DO NOT TUNE THIS BY THE NUMBERS. Composited, the drift shifts the nobleman's floor by -2 luminance —
# his sandstone is very nearly sand's own colour — and by that measure it is invisible there. It is not:
# what reads is the RIPPLE against his slabs, and a mean over the tile cannot see texture. Look at it on
# all four floors instead; that check is one command (`yarn on-floor`) and it has now caught three
# measurements in this file that were confidently wrong.
yarn drift-mask --out="$OBJ" --seed=fan --size=504 --peak=0.5
yarn import-tile art/masters/surfaces/sand.webp --tier=default --name=sand --slot=drift \
  --filter=smooth --key=none --mask="$OBJ" --brightness=0.78

# junior — the nobleman
#
# The bay is `prim_niche`; only --contents changes between ranks. --width and --height are the SLOT'S
# aspect and not the prop frame's: the default 2:3 frames a 2:1 object to its width, and the import
# trimmed the strip and delivered a tile a third of its height.
#
# --saturation=1.3 --brightness=0.85 put the surround at +81 warmth and 107 luminance against the junior
# wall face's +77 and 108. Measured over a FIXED region of the surround, not over pixels above a
# luminance threshold: as the tile darkens, fewer pixels clear the threshold and the mean of the
# survivors barely moves, so the knob reads as dead. The threshold called this same file +96 and 151.
scaffold niche --contents=lamp --shear=0.5 --width=448 --height=224 --colour=#e0c193 --sun=0
yarn import-tile art/masters/props/junior/niche.webp --tier=junior --name=niche --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18 --saturation=1.3 --brightness=0.85

# NO scaffold: a false-door stela is FLAT — a slab hanging against the surface — so it skips the mesh
# and the mask both, and the generation's own silhouette is the tile. Step 0's table is the triage:
# depth is modelled, flat goes straight to the generator.
#
# --brightness=0.74, which is the deepest clip in this file. Dressed limestone against mud plaster comes
# back the palest thing in the rank: untouched it measured 171 against a wall face at 108. 0.74 puts the
# jamb stone at +73 warmth and 123 luminance against the wall's +77 and 108 — fifteen lighter, which is
# the separation the hand-painted market table already uses, and reads as stone set into plaster.
#
# NO --contrast, though the incised columns beg for it. The carving does not survive 28 pixels either
# way, and 1.35 bought nothing but chroma: the jamb went from +74 warmth to +100 while its luminance
# never moved. Contrast is not free on a warm rank.
yarn import-tile art/masters/props/junior/stela.webp --tier=junior --name=stela --slot=wall \
  --filter=smooth --headroom=0.18 --brightness=0.74

# --margin=1.4 is the whole reason this one is legible: `SLOTS.wall` is `seat: false`, so the import
# scales the FRAME into 56x28 rather than trimming and re-seating. A niche fills the band by design; a
# sconce is one bracket on a broad wall and keeps only the air the render gave it.
#
# NO --brightness and NO --saturation, the only tile here with neither. Nothing is over the rank's 197
# clamp, and the bracket separates from the wall by being DARK — the bronze arm measures 79 against a
# wall face at 108 — rather than by being warm. It reads 15 cooler than the wall (+62 against +77) and
# that is the patina the prompt asked for, not a fault to correct.
#
# The mask is doing real work on this one. The repaint feathered the flame's glow out into the
# background and it keyed VIOLET, and it drew the lamp larger than the render; cutting to the render's
# own alpha removed the halo by construction and pinned the lamp back to its modelled size.
scaffold sconce --shear=0.5 --width=448 --height=224 --margin=1.4 --colour=#e0c193 --sun=0
yarn import-tile art/masters/props/junior/sconce.webp --tier=junior --name=sconce --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18
# junior — the nobleman
#
# All four are the merchant's primitives at the nobleman's colour, so they cost a repaint and no model.
# --brightness on three of them and --saturation on two: the rank's own stone is #e0c193 against the
# merchant's #a49781, so a repaint that would have been in-palette one rank down comes back over the
# clamp here.

# The rug has to SEPARATE from the paving or it is paving. Untouched it measured 1 lighter than the slab
# and vanished; 0.86/0.6 puts it 23 darker, which is the merchant mat's own pair of numbers — the same
# repaint failure at both ranks, straw drawn far warmer and lighter than the floor it lies on.
scaffold mat --spin=9 --shadow=0.5 --colour=#e0c193 --floor=#c39c68
yarn import-tile art/masters/props/junior/mat.webp --tier=junior --name=mat --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.86 --saturation=0.6

# --lit=1: the nobleman's brazier burns where the merchant's holds cold ash.
scaffold brazier --lit=1 --colour=#e0c193 --floor=#c39c68
yarn import-tile art/masters/props/junior/brazier.webp --tier=junior --name=brazier --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --scale=0.7 --brightness=0.92

# --shadow=0.6 keeps a flat fall's footprint faint. Only the SHADOW render takes it — scaffold() passes
# --shadow=0 ahead of "$@" for the mask, so the mask cannot pick one up.
scaffold rubblePile --contents=plaster --shadow=0.6 --colour=#e0c193 --floor=#c39c68
yarn import-tile art/masters/props/junior/rubblePile.webp --tier=junior --name=rubblePile --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.85 --saturation=1.25

scaffold jarrack --colour=#e0c193 --floor=#c39c68
yarn import-tile art/masters/props/junior/jarRack.webp --tier=junior --name=jarRack --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.92
