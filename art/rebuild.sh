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

# The one prop whose shadow is dialled DOWN, and the one that needs no --saturation at all.
#
# A mat LIES ON the floor, so it has no gap to cast into: the standard --shadow=0.8 --sun=0.30 puts a
# dark slab of the sheet's own silhouette right beneath the sheet and reads as a second step, the same
# failure as a stone pad. Turning it off entirely is worse — the sheet then measures 2 from the floor's
# own value, which is the vanishing the pipeline's floor-gap number exists to catch, and its warmth runs
# to +46 with nothing neutral left in the frame. 0.55 at 0.12 is the tuck that passes both.
#
# --scale=0.9, high for this set, because the SPIRAL on the roll's end and the weave on the sheet are
# what say mat rather than log, and at 0.63 both are finer than a tenth of the object and gone.
scaffold mat --shadow=0.55 --sun=0.12
yarn import-tile art/props/starter/mat.webp --tier=starter --name=mat --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --scale=0.9 --brightness=0.78
