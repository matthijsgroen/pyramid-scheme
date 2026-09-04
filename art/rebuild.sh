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
  # --shadow=0 goes BEFORE "$@": renderProp's arg() returns the FIRST match, so a per-prop --shadow
  # passed for the footprint render cannot put a footprint back into the mask.
  "$BLENDER" -b -P scripts/renderProp.py -- --primitive="$prim" --colour=#a49781 --floor=#6c6257 \
    --shadow=0 --background=none --out="$OBJ" "$@" >/dev/null
  "$BLENDER" -b -P scripts/renderProp.py -- --primitive="$prim" --colour=#a49781 --floor=#6c6257 \
    --only=shadow --background=none --out="$SHADOW" "$@" >/dev/null
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
