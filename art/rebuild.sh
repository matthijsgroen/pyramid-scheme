#!/usr/bin/env sh
# Re-imports every map tile from its master in this directory. See README.md.
#
# Three renders per prop, none of them stored:
#   OBJ    the object alone, no shadow — the mask the repaint is cut to
#   SHADOW the footprint alone, in the same frame — put back under the art at import
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
    --only=shadow --background=none --out="$SHADOW" $SHADOW_EXTRA "$@" --colour=#a49781 --floor=#6c6257 >/dev/null
  # SHADOW_EXTRA is for a prop whose FOOTPRINT is not its whole self. `make_shadow` flattens everything
  # to z=0, so anything a prop merely HOLDS off the floor casts its own belly — the jar rack's three
  # amphorae came out as three fat ellipses in front of it, where the hand-painted merchant version has
  # one narrow band under the frame. It goes before "$@" so it wins arg()'s first-match, and it is reset
  # after so it cannot leak into the next prop.
  SHADOW_EXTRA=
}

# starter — the merchant
scaffold shelf
yarn import-tile art/props/starter/shelf.webp --tier=starter --name=shelf --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --saturation=1.45 --brightness=0.93

# No --saturation: masking away this repaint's invented floor leaves only wood and reed, which are
# already the warmest things in the rank. 1.3 put it at +38 against a target band of +22 to +25.
scaffold chest
yarn import-tile art/props/starter/chestProp.webp --tier=starter --name=chestProp --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"

# --depth=0.65 must match what the master was painted over: a circular dish gives a top face so large
# under this shear that the thing reads as a round table. --saturation=2.2 is high because the repaint
# came back nearly achromatic (+1 warmth) and saturation SCALES existing chroma, so a grey prop needs
# multiples of what a brown one does. 2.7 reaches the +22 band and turns humble clay to brass.
scaffold brazier --depth=0.65
yarn import-tile art/props/starter/brazier.webp --tier=starter --name=brazier --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --scale=0.7 --saturation=2.2 --brightness=0.95

# The stool's seat is 0.16 deep, not 0.26: at 0.26 its top face was 40% of the drawn height and read as
# a wall with legs. --brightness=0.85 clips a repaint that came back 9.3% over the light end — the
# palest of the four so far, because pale split timber is most of its surface.
scaffold lamp
yarn import-tile art/props/starter/lamp.webp --tier=starter --name=lamp --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --scale=0.48 --saturation=1.6 --brightness=0.85

# No stone pad in the model: a wide flat slab at floor level casts a shadow of its own silhouette
# right under itself and reads as a second step. --saturation=1.7 because the repaint gave the trunk
# grey-green bark; the wedges are the only warm thing on it.
scaffold pillar
yarn import-tile art/props/starter/pillar.webp --tier=starter --name=pillar --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --saturation=1.7 --brightness=0.9

# The mat is a flat rug and nothing else, and it is the only prop here whose identity is PAINT: under
# this projection a flat thing on the floor has no silhouette. Three shaped designs were rendered and
# rejected first — see prim_mat, which records why a fold at the NEAR edge is invisible.
#
# --spin=9 is the one thing geometry still owes it: a rug lying askew of the grid cannot be read as part
# of the paving, where an axis-aligned one can. --shadow=0.5 --sun=0.03 tucks the footprint tight, since
# a slab at floor level otherwise casts a copy of itself and reads as a second step.
#
# --saturation BELOW 1, the only prop that needs it: the repaint came back photoreal straw at +51 warmth
# against a rank that sits at +22 to +25. The lever runs both ways, and the brazier is the other end of
# it at 2.2. --brightness=0.86 is a narrow window — 0.8 left the rug only 7 from the floor's own value
# and 0.9 put 2.4% of it over the light end.
scaffold mat --spin=9 --shadow=0.5 --sun=0.03
yarn import-tile art/props/starter/mat.webp --tier=starter --name=mat --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.86 --saturation=0.6

# A hole casts nothing. --shadow=0 on the render and NO --seat at import: `make_shadow` flattens the
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
scaffold pit --shadow=0
yarn import-tile art/props/starter/pit.webp --tier=starter --name=pit --slot=prop \
  --filter=smooth --mask="$OBJ" --brightness=0.82

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
scaffold niche --contents=lamp --shear=0.5 --width=448 --height=224 --colour=#e0c193
yarn import-tile art/props/junior/niche.webp --tier=junior --name=niche --slot=wall \
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
yarn import-tile art/props/junior/stela.webp --tier=junior --name=stela --slot=wall \
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
scaffold sconce --shear=0.5 --width=448 --height=224 --margin=1.4 --colour=#e0c193
yarn import-tile art/props/junior/sconce.webp --tier=junior --name=sconce --slot=wall \
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
scaffold mat --spin=9 --shadow=0.5 --sun=0.03 --colour=#e0c193
yarn import-tile art/props/junior/mat.webp --tier=junior --name=mat --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.86 --saturation=0.6

# --lit=1: the nobleman's brazier burns where the merchant's holds cold ash.
scaffold brazier --lit=1 --colour=#e0c193
yarn import-tile art/props/junior/brazier.webp --tier=junior --name=brazier --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --scale=0.7 --brightness=0.92

# --shadow=0.6 --sun=0.05, and this is the FLAT-THING rule the mat already records: a plaster fall lies
# at floor level, so a footprint pushed the default 0.30 of its depth toward the viewer draws clear of
# the pieces and the whole tile floats. Only the SHADOW render takes those two — scaffold() passes
# --shadow=0 ahead of "$@" for the mask, so the mask cannot pick one up.
scaffold rubbleHeap --contents=plaster --shadow=0.6 --sun=0.05 --colour=#e0c193
yarn import-tile art/props/junior/rubble.webp --tier=junior --name=rubble --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.85 --saturation=1.25

# The jars are cast OFF the shadow: see SHADOW_EXTRA above. Safe only because they sit inside the
# frame's bounding box on all three axes, so both renders get the same camera.
SHADOW_EXTRA=--contents=none scaffold jarrack --colour=#e0c193
yarn import-tile art/props/junior/jarRack.webp --tier=junior --name=jarRack --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.92
