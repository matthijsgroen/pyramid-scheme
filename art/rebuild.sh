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

# The same pair for a prop whose subject is a MUSEUM SCAN rather than a primitive. Step 0's table sends
# statues and coffins here; everything downstream is identical, because the pipeline only ever wanted a
# mesh and does not care where it came from.
#
# The scans are IN the repository, DECIMATED, and that took a licence check to settle: CC BY-NC-SA 4.0 is
# fine for a non-commercial project, and redistributing the mesh under the same terms with attribution is
# what CREDITS.md is for. `art/masters/` exists precisely so a rebuild does not read from a download
# folder, and a scan is no exception.
#
# 1.38M faces to 27.6K — a 2% decimation, 69MB of STL to 2.2MB of GLB. That is not a compromise at this
# size: the decimated silhouette differs from the full one by 76 pixels of 70,706 at render resolution,
# 0.11%, which is edge noise before the tile is even scaled down to 112 wide. What a scaffold needs from a
# scan is a shape at 56 units, and a million faces is four hundred times more than that can carry.
MESHES=${MESHES:-art/masters/meshes}
meshscaffold() {
  mesh=$1
  shift
  "$BLENDER" -b -P scripts/renderProp.py -- --mesh="$MESHES/$mesh" \
    --shadow=0 --background=none --out="$OBJ" "$@" --colour=#a49781 --floor=#6c6257 >/dev/null
  "$BLENDER" -b -P scripts/renderProp.py -- --mesh="$MESHES/$mesh" \
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
# The STATUE, and it needed no re-roll at all — which is worth recording, because art-tasks had it filed
# under "waiting on a scan" and the scan had already been used. `statue-shabti.webp` is a repaint over a
# scaffold rendered from `shabti.stl` at these very defaults: no --scale, no --spin, no --margin, which is
# how the mask lines up with the paint on the first try.
#
# What kept it out of the pipeline was not the geometry but the two things the repaint added — a soft grey
# field behind the figure and a painted black shadow at its foot. Those are what --mask and --seat are
# for. Masking to the render's own alpha removes an invented background by construction, which is the
# whole argument of prop-pipeline.md, and the rendered seat is translucent where the painted one was not.
#
# --brightness=0.96 --saturation=1.4. Pale limestone came back at +13 warmth, under the rank's band, with
# 6.1% of the sprite over the 152 light end. 1.4 brings warmth to +25 and 0.96 takes the tail to 0.6%,
# and it stays 13 LIGHTER than the slab: a shabti is meant to be pale against mudbrick, the same argument
# the whitewashed shrine makes at the other end of the file.
meshscaffold shabti.glb
yarn import-tile art/masters/props/starter/statue-shabti.webp --tier=starter --name=statue --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.96 --saturation=1.4

# The merchant's trade room, SECOND DRAWING. `tileVariants` picks between this and offeringTable.png by
# the cell's own position, so some of his trade rooms sell off a table and others out of baskets on the
# floor — which is what tomb painting shows at least as often, and both are the same statement, so they
# share a KIND. A variant is not a pool entry: adding this file moved no furniture anywhere.
#
# --brightness=0.86 --saturation=0.7, and the saturation is the second in this file to go BELOW 1 — the
# mat is the other. Dry straw and palm-leaf come back as the warmest thing the generator can paint: +44
# warmth untouched, against a rank that sits at +22 to +25, with 17.4% of the sprite over the 152 light
# end. 0.7 pulls it to +24 and 0.86 takes the tail to 2.4%, leaving it 14 lighter than the slab. The
# lever runs both ways and this end of it is as real as the brazier's 2.2.
scaffold market --contents=baskets
yarn import-tile art/masters/props/starter/offeringTable-2.webp --tier=starter --name=offeringTable-2 \
  --slot=prop --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.86 --saturation=0.7

# The merchant's BASIN, re-rolled over its geometry, which is what took it out of art-tasks §3. The tile
# it replaces was a prompted return with a painted opaque shadow and no scaffold behind it, so a mask
# would have cut a shape the art did not fill.
#
# --brightness=0.90 --saturation=1.45. Untouched the pale buff jar put 12.7% of the sprite over the
# rank's 152 light end and measured only +12 warmth, well under the hand-painted band; 0.90 takes the
# tail to 2.6% and 1.45 brings warmth to +24. It ends 31 darker than the slab, which is more separation
# than most props here need and is honest — the stand is dark timber and only the jar is pale.
scaffold basin --contents=jar
yarn import-tile art/masters/props/starter/basin.webp --tier=starter --name=basin --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.90 --saturation=1.45

# The scatter layer's SPILL, and the one tile in this file whose repaint ignored the scaffold's layout:
# the return came back as forty of its own fragments spread over the frame instead of the modelled
# fourteen. --mask is what makes that survivable — it cuts brick material into the modelled silhouettes,
# so the shape, the footprint and the shadow are all still ours and only the paint is the generator's.
# Some fragments are cut through the middle of a brick; at 23 drawn units that reads as brick.
#
# --brightness=0.80 --saturation=1.0, and the brightness is doing the whole job. Untouched, broken pale
# brick measured 45 LIGHTER than the slab with 28.6% of it over the light end. 0.70 was the other
# failure: it lands the sprite at exactly the floor's own value, and tile-stats faults under 10 either
# way, because a prop that measures level with the floor does not read against it. 0.80 gives 14 lighter,
# +26 warmth and a 1.5% tail. NO saturation lift, unlike the standing pile — this return came back warm
# already, and 1.45 would have taken it to +38.
scaffold rubblePile --contents=spill
yarn import-tile art/masters/props/starter/rubbleSpill.webp --tier=starter --name=rubbleSpill --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.80 --saturation=1.0

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

# The hole casts nothing and the BRICKS ROUND IT DO, which took two goes to get right. The tile shipped
# with --shadow=0 and no --seat, on the rule that a hole casts nothing — true of the hole, false of the
# broken mudbrick lying at its mouth, which sits on the floor like any other prop and came out with no
# footprint, reading as pasted on. `make_shadow` now drops VOID faces before flattening, so an absence
# casts nothing on its own and the pit takes a normal seat.
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
scaffold pit
yarn import-tile art/masters/props/starter/pit.webp --tier=starter --name=pit --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.82

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
# --spin=45, and the master is painted over it — the two arrived together, which is the only order Step 1b
# allows. Against the OLD square-on master this same flag cut the frontal cloth with a diagonal mask and
# the tile came out a smear with a loose diagonal shadow beside it; that is why the flag waited.
#
# WHY IT IS TURNED, which is a placement argument and not a drawing one. An object askew of the paving
# cannot be read as part of it (`prim_mat`'s --spin=9), and at 45 degrees the pole runs back INTO the
# picture instead of lying across it, so the depth the shear draws is depth the object has. Square on, the
# pole was one horizontal line and both posts were the same height.
#
# WHY IT IS A SCREEN and no longer an awning. `hanging` is tagged funerary and cosmos in dressingTags, so
# world-gen only ever puts it where someone prayed or watched the sky — and the brief's merchant row
# describes a market awning, the one object those rooms have no use for. The mesh was never the problem: it
# is a sheet hanging DOWN off a pole, a drape and not a canopy. So the fix was the paint, and this master is
# the same cloth on the same pole described as a screening cloth: patched, mended in dull red thread, hem
# frayed and one corner torn away.
#
# --brightness=0.88 --saturation=2.3. Bleached linen came back ACHROMATIC — +0 warmth, with 29.8% of the
# sprite over the rank's 152 light end — and saturation scales existing chroma, so a grey prop needs
# multiples of what a brown one does: 2.3 here against 1.45 for the basin, the same argument the brazier
# makes at 2.2. It lands at +25 warmth and 11 lighter than the slab, which is the separation a pale cloth
# should have against mudbrick, with a 4.3% tail — the widest in this file after the shrine's whitewash,
# and for the same reason: the thing is meant to be pale.
scaffold hanging --spin=45
yarn import-tile art/masters/props/starter/hanging.webp --tier=starter --name=hanging --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.88 --saturation=2.3

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

# THE STAIRS, and they are SHARED: `tiles/default/`, drawn at every rank. `tileUrl` falls back
# <tier>/<name> to default/<name>, the way the explorer and the sand already do, so three files serve
# all five tombs and a rank overrides one later by dropping its own file in.
#
# Measured on every rank's own floor before it was shared: 49, 111, 101, 33 and 69 of separation
# against slabs from 83 to 161, where 10 is the floor.
#
# THE GEOMETRY WAS TUNED TO THE PAINTING, not the other way round, which is the opposite of every
# other line in this file and is why it is written down. Two re-rolls came back as CLOSE-UPS because
# the scaffold framed a tall cresset beside a low opening; the third kept the first roll's painting
# and moved the model to meet it — opening 0.98 x 0.92, treads spread to a 0.17 going, cresset at
# 1.35. A mask is ours to change while a return is not, and the first roll was the best picture of
# the three. A stair is mostly ABSENCE — a dark shaft, two
# or three treads, a small cresset — so the stone that says whose tomb this is surrounds it on the map
# rather than being in the sprite.
#
# They are also why a hole in the floor means a way down and the `pit` was retired.
#
# NO --seat on either: a hole casts nothing, exactly as a pit did not.
#
# --contents=down-side is the SAME hole walked across, for a stairhead entered from the east or the
# west; the renderer mirrors it in x for the other side, which is a real oblique view where turning a
# sheared sprite would be a skew. 0.9 for its top tread, the palest thing in the frame: 7.7% over the
# light clamp untouched, 2.0% here.
scaffold stair --contents=down --shadow=0
yarn import-tile art/masters/props/default/stair-down.webp --tier=default --name=stair-down --slot=prop \
  --filter=smooth --mask="$OBJ"

scaffold stair --contents=down-side --shadow=0
yarn import-tile art/masters/props/default/stair-down-side.webp --tier=default --name=stair-down-side --slot=prop \
  --filter=smooth --mask="$OBJ" --brightness=0.9

# The flight CLIMBING away, between its parapets, and the one stair that seats: it stands on the floor
# rather than being cut into it.
#
# 0.7, and SHARED ART IS WHY IT IS THAT LOW. Whitewashed mudbrick is nearly the merchant's own slab —
# untouched it measured FOUR from his floor, which tile-stats refuses outright, and 14.2% over his light
# clamp. A tile drawn at every rank has to clear the darkest floor in the game as well: the pharaoh's
# slab is 83, so the sweep was read on his too. At 0.7 the five ranks measure 33, 95, 85, 17 and 53.
scaffold stair --contents=up
yarn import-tile art/masters/props/default/stair-up.webp --tier=default --name=stair-up --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.7

# The climb walked ACROSS, which completes the four facings — west is east mirrored, so four flights
# cover every approach. 0.7 for the same whitewash as the flight above, and the five ranks measure 34,
# 96, 86, 18 and 54.
#
# ONE parapet, at the BACK. Modelled with one at either end, the front parapet drew LOWER than the
# treads it was meant to frame and laid a pale band across the whole flight; behind, it draws higher and
# reads as the wall the stair is cut against.
scaffold stair --contents=up-side
yarn import-tile art/masters/props/default/stair-up-side.webp --tier=default --name=stair-up-side --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.7

# THE WARD GATE, and the only pair in the set IMPORTED FROM ITS OWN RENDER rather than from a painted
# master — which is why these two lines name "$OBJ" where every other names a .webp. There is no return
# to reproduce: the render IS the tile. Send it through a repaint later and the only change here is the
# source path, because the mask and the seat are already the ones a repaint would be cut to.
#
# No --brightness and no --gamma, and that was measured rather than left out. Every tile in this set
# trips `tile-stats` — stair-down-side spans 130 and reads 65 dark — and the gate untouched lands at
# 47/63/128 with a span of 81, the tightest of the flights and chests it stands beside. A correction
# fitted to the warning rather than to the set would have been the only thing putting it out of place.
scaffold gate --contents=shut
yarn import-tile "$OBJ" --tier=default --name=gate --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"

scaffold gate --contents=open
yarn import-tile "$OBJ" --tier=default --name=gate-open --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"

# THE SAME GATE IN A WALL THAT RUNS UP THE PAGE, for a passage walked across — `prim_stair`'s four
# facings, one axis over. The grille's own plane is the y-z one and this projection draws that as a
# line, so the bars go on facing the viewer and the JAMBS move into depth instead: a pier above and a
# pier below, where the face-on gate has one either side.
scaffold gate --contents=shut-side
yarn import-tile "$OBJ" --tier=default --name=gate-side --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"

scaffold gate --contents=open-side
yarn import-tile "$OBJ" --tier=default --name=gate-open-side --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"

# The nobleman's FLOOR, re-rolled to the current standard: this master is a return, where the one it
# replaces was a post-processing copy whose flags could not be recovered (art/README).
#
# The master is stored AFTER `make-seamless`, because that pass is not reproducible from a flag list —
# it rolls the source and lays its centre back over the seam cross. Storing the pre-seamless return
# would make this line un-runnable.
#
# --repeat=1.6 and the reason matters for every surface after this one. The prompt asked for "sixteen
# slabs across the width" and got about eight, so the shrink is what closes the gap. The FIRST attempt
# asked for "a texture drawn at eight cells across" — a generator has no idea what a cell is — and came
# back at brick scale needing --repeat=4.5, which multiplies every distinctive mark four or five times
# and turned the brief's ochre banding into a lattice. Count the features, and forbid strong ones.
#
# --flatten=0.45: it is the ground the props stand on. At these numbers the tile measures #bc9667, lum
# 156 warmth +84, against the tile it replaces at 156 and +86 — so every prop keeps its separation, 26
# to 33 darker.
yarn import-tile art/masters/surfaces/junior-floor.webp --tier=junior --name=floor --slot=floor \
  --filter=smooth --key=none --repeat=1.6 --flatten=0.45

# The nobleman's SILL, re-rolled. A sill is not a tiling texture and takes neither a slab count nor a
# repeat: it is one band four times wider than it is tall, dished where feet cross it. No make-seamless
# either — it butts against thresholds rather than tiling.
#
# --saturation=2.2 --brightness=1.28, and brightness ABOVE 1 is the only one in this file. The return came
# back pale cool grey where the rank is warm limestone, and on a near-grey source saturation has almost no
# chroma to multiply — it converts brightness into colour and drove the tile from lum 143 down to 107
# before it was warm enough. Lifting and warming together lands #b48d64, lum 148 warmth +80, against the
# tile it replaces at 143 and +82.
yarn import-tile art/masters/surfaces/junior-threshold.webp --tier=junior --name=threshold --slot=sill \
  --filter=smooth --key=none --saturation=2.2 --brightness=1.28

# The nobleman's WALL FACE, re-rolled, and the one re-roll that had to be asked for twice. The first
# prompt described worn plaster over mudbrick and got a good tile of the WRONG THING: the brief gives
# this rank "full plaster, procession murals (banquet, hunt, granary), painted dado band", and the tile
# it would have replaced already had that. Naming the registers explicitly — offering bearers, then
# cattle and geese, then a banquet, about thirty figures across — got all three.
#
# --repeat=1, not the docs' 2. The return is already one wall's height at 8:1 with the figures at the
# right size; doubling it halves them and puts the whole procession on the strip twice.
#
# It sits at lum 98 against the floor's 156, which is 58 darker — the wall being darker than the floor in
# front of it is where the map's depth comes from, and it is worth checking on every face.
yarn import-tile art/masters/surfaces/junior-wall-face.webp --tier=junior --name=wall-face --slot=face \
  --filter=smooth --key=none --headroom=0.14
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

# The nobleman's FLOOR, re-rolled to the current standard: this master is a return, where the one it
# replaces was a post-processing copy whose flags could not be recovered (art/README).
#
# The master is stored AFTER `make-seamless`, because that pass is not reproducible from a flag list —
# it rolls the source and lays its centre back over the seam cross. Storing the pre-seamless return
# would make this line un-runnable.
#
# --repeat=1.6 and the reason matters for every surface after this one. The prompt asked for "sixteen
# slabs across the width" and got about eight, so the shrink is what closes the gap. The FIRST attempt
# asked for "a texture drawn at eight cells across" — a generator has no idea what a cell is — and came
# back at brick scale needing --repeat=4.5, which multiplies every distinctive mark four or five times
# and turned the brief's ochre banding into a lattice. Count the features, and forbid strong ones.
#
# --flatten=0.45: it is the ground the props stand on. At these numbers the tile measures #bc9667, lum
# 156 warmth +84, against the tile it replaces at 156 and +86 — so every prop keeps its separation, 26
# to 33 darker.
yarn import-tile art/masters/surfaces/junior-floor.webp --tier=junior --name=floor --slot=floor \
  --filter=smooth --key=none --repeat=1.6 --flatten=0.45

# The nobleman's SILL, re-rolled. A sill is not a tiling texture and takes neither a slab count nor a
# repeat: it is one band four times wider than it is tall, dished where feet cross it. No make-seamless
# either — it butts against thresholds rather than tiling.
#
# --saturation=2.2 --brightness=1.28, and brightness ABOVE 1 is the only one in this file. The return came
# back pale cool grey where the rank is warm limestone, and on a near-grey source saturation has almost no
# chroma to multiply — it converts brightness into colour and drove the tile from lum 143 down to 107
# before it was warm enough. Lifting and warming together lands #b48d64, lum 148 warmth +80, against the
# tile it replaces at 143 and +82.
yarn import-tile art/masters/surfaces/junior-threshold.webp --tier=junior --name=threshold --slot=sill \
  --filter=smooth --key=none --saturation=2.2 --brightness=1.28

# The nobleman's WALL FACE, re-rolled, and the one re-roll that had to be asked for twice. The first
# prompt described worn plaster over mudbrick and got a good tile of the WRONG THING: the brief gives
# this rank "full plaster, procession murals (banquet, hunt, granary), painted dado band", and the tile
# it would have replaced already had that. Naming the registers explicitly — offering bearers, then
# cattle and geese, then a banquet, about thirty figures across — got all three.
#
# --repeat=1, not the docs' 2. The return is already one wall's height at 8:1 with the figures at the
# right size; doubling it halves them and puts the whole procession on the strip twice.
#
# It sits at lum 98 against the floor's 156, which is 58 darker — the wall being darker than the floor in
# front of it is where the map's depth comes from, and it is worth checking on every face.
yarn import-tile art/masters/surfaces/junior-wall-face.webp --tier=junior --name=wall-face --slot=face \
  --filter=smooth --key=none --headroom=0.14
#
# All four are the merchant's primitives at the nobleman's colour, so they cost a repaint and no model.
# --brightness on three of them and --saturation on two: the rank's own stone is #e0c193 against the
# merchant's #a49781, so a repaint that would have been in-palette one rank down comes back over the
# clamp here.

# The rug has to SEPARATE from the paving or it is paving. Untouched it measured 1 lighter than the slab
# and vanished; 0.86/0.6 puts it 23 darker, which is the merchant mat's own pair of numbers — the same
# repaint failure at both ranks, straw drawn far warmer and lighter than the floor it lies on.
# The nobleman's SHRINE: a false-door stela with an offering table before it, on `prim_falsedoor`.
#
# NO --brightness and NO --saturation, which is rare in this file and is what the numbers ask for.
# Dressed limestone against his warm sandstone comes back COOLER than the rank — -18 warmth against a
# slab of #c39c68 — and 31 darker than the floor with only 0.4% over the light end. tile-stats passes it
# as it arrives. The stela at this rank makes the same argument from the other direction, being the palest
# thing in it: what matters is the SEPARATION, not the sign of it.
#
# --spin=6 and no more, because its back belongs flat against a wall. Pipeline Step 1b's table: a false
# door turned thirty degrees reads as furniture that has fallen over.
# The nobleman's CHEST, on `prim_sealedchest` — one sealed chest, not the merchant's baskets and crate.
#
# --brightness=1.12, and it is the FIRST lift above 1 in this file. Cedar against pale sandstone is the
# widest natural gap in the set: untouched the sprite sat 74 luminance below a slab of 161, with 9.3% of
# it under the rank's dark clamp, where detail stops existing. 1.12 keeps 62 of separation — still the
# darkest thing the rank owns — and halves the clipped tail. The knob runs both ways and every other use
# of it in this file happens to go down.
# The nobleman's LAMP STAND, on `prim_lamp --contents=stand` — bronze, where the merchant's is a pottery
# lamp on a wooden stool. LIT_DECORATIONS keys the map's light pool by KIND and not by rank, so this tile
# gets the same pool on the floor the merchant's does, for nothing.
#
# --brightness=1.6, the largest lift in this file by a distance, and it is the same story as the chest one
# rank up. Dark patinated bronze against pale sandstone arrived 97 luminance below a slab of 161 with 38%
# of the sprite under the dark clamp — more than a third of it flattened to one value. 1.6 leaves 58 of
# separation and 10.4% clipped, which is as far as it goes before the patina starts to grey out.
# The nobleman's LINEN PRESS, on `prim_shelf --contents=linen` — the merchant's carcass with folded cloth
# in it instead of pots, and a mirror case on the top course.
#
# --brightness=0.80 --saturation=2.0. Whitewashed mudbrick holding white linen is the palest thing this
# rank owns: untouched it measured 14 LIGHTER than a slab of 161 with 28.5% of the sprite over the light
# clamp, and nearly achromatic at -73 warmth. 0.80 clears the clamp outright and 2.0 pulls the cool cast
# back to -58, which stays cooler than the floor on purpose — the stela makes the same argument at this
# rank, and what matters is the 24 of separation, not its sign.
# The nobleman's PALM COLUMN, on `prim_palm` — a dressed column with a painted capital, not the
# merchant's leaning timber prop.
#
# --mask-grow=100 is the flag this tile invented, and the reason is worth the words. The model gives the
# capital FIVE fronds; the generator painted a rosette of fourteen, twice and unprompted, which is what a
# palm capital actually looks like. Cut to the model, nine of them are thrown away and the tile is a
# five-spoke star. Keyed instead of masked, they all survive and so does the repaint's own opaque shadow,
# which is the thing --seat exists to replace. Growing the mask keeps both, because the growth admits
# added paint but refuses added SHADOW — see `growMask` in importTile.ts, which has a spec.
#
# --brightness=0.82 --saturation=1.5. Pale limestone on pale sandstone is the worst pairing in the set:
# untouched the sprite measured ONE luminance from the floor and tile-stats refused it outright — under 10
# a prop does not read against the ground it stands on. 0.82 puts it 33 darker, and 1.5 brings the warmth
# from -43 to -23, which is where the rank's other dressed stone sits (its stela is -18).
scaffold palm --spin=22
yarn import-tile art/masters/props/junior/pillar.webp --tier=junior --name=pillar --slot=prop \
  --filter=smooth --mask="$OBJ" --mask-grow=100 --seat="$SHADOW" --brightness=0.82 --saturation=1.5

scaffold shelf --contents=linen --spin=5
yarn import-tile art/masters/props/junior/shelf.webp --tier=junior --name=shelf --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.80 --saturation=2.0

# The nobleman's LAID TABLE, on `prim_market --contents=laid` — a meal set out, where the merchant's is a
# balance and a heap of grain. The jar stands in a RING for prim_basin's reason: `jar()` tapers to a point.
#
# NO --brightness and NO --saturation. Timber against pale sandstone arrives 67 darker with 0.1% under the
# dark clamp and 1.1% over the light one, and tile-stats passes it as it comes. The chest one line up is
# the same object class and needed a lift only because cedar is darker still.
# The nobleman's LINEN HANGING, on `prim_hanging --contents=linen` — a made hanging with a dyed border,
# where the merchant's is a patched screen. His dyed band is the whole tile, which is why the border is a
# marked part and not left to the paint.
#
# --brightness=0.88 --saturation=1.4, and this tile is SQUEEZED FROM BOTH ENDS — the only one in the file
# that is. White linen runs into the light clamp and oiled timber into the dark one, so there is no
# setting that clears both: at 0.92 it is 13.7% over the light end, at 0.84 it is 22.4% under the dark.
# 0.88 puts one tail at 0.2% and leaves 18.5% clipped in the timber, which flattens the pole and the posts
# and is the cheaper loss — the linen is what the tile is for.
#
# --contrast is NOT the answer and the importer says so: below 1 it would eat the alpha channel, and it
# refuses. Compressing a squeezed tile means --flatten, which is for surfaces.
# The nobleman's ABLUTION BASIN, on `prim_basin --contents=bowl` — the merchant's stand carrying an open
# bowl instead of a water jar. It took two rolls and BOTH faults were in the scaffold, not the return:
#
# The water was marked VOID. That marker means a HOLE and renders near-black, the prompt then called it
# the darkest thing in the picture, and the repaint obliged — a black disc that read as a hole punched in
# a bowl, which is the one failure a mask cannot reach, being inside the silhouette. It is a `water`
# material now (`nocast`, since it lies above the floor and the bowl already casts the footprint), and the
# geometry did not move, so that first master would still have fitted.
#
# The LEGS MET NOTHING. The 15 degree splay pulls their tops to radius 0.194 and the bowl's cone is 0.155
# across at that height, so they passed outside it — three struts beside a bowl. The hub is a drum they
# meet, which is how a ring stand is built and what the jar variant already had in its collar.
#
# --brightness=1.2, a lift for the same reason as the chest and the lamp: dark timber legs under a pale
# bowl arrived 87 below a slab of 161 with 15.2% of the sprite under the dark clamp. 1.2 keeps 71 of
# separation — it is still one of the darkest things the rank owns — and takes the clipped tail to 11.1%.
scaffold basin --contents=bowl --spin=14
yarn import-tile art/masters/props/junior/basin.webp --tier=junior --name=basin --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=1.2

scaffold hanging --contents=linen --spin=38
yarn import-tile art/masters/props/junior/hanging.webp --tier=junior --name=hanging --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.88 --saturation=1.4

scaffold market --contents=laid --spin=-16
yarn import-tile art/masters/props/junior/offeringTable.webp --tier=junior --name=offeringTable \
  --slot=prop --filter=smooth --mask="$OBJ" --seat="$SHADOW"

scaffold lamp --contents=stand --spin=8
yarn import-tile art/masters/props/junior/lamp.webp --tier=junior --name=lamp --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=1.6

scaffold sealedChest --spin=-27
yarn import-tile art/masters/props/junior/chestProp.webp --tier=junior --name=chestProp --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=1.12

scaffold falseDoor --spin=6
yarn import-tile art/masters/props/junior/shrine.webp --tier=junior --name=shrine --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"

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

# expert — the priest
#
# His three surfaces, re-rolled to the current standard, and the prompts are junior's with the priest's
# row swapped in — the six lessons in art-tasks.md held, so this rank cost three rolls and no retries.
#
# --repeat=1.4 on the floor: the return came back at about five slabs across where the rank draws seven.
# No repeat on the face, which arrives as one wall's height at 8:1 with its hieroglyph columns already
# the right size.
#
# --brightness=1.32 on the SILL, for the opposite reason to the nobleman's. Basalt returned very dark —
# lum 94, level with the wall face — and a sill has to sit BETWEEN the floor and the wall or it reads as
# a hole in the paving rather than a step across it. 1.32 puts it at 124 between the face's 98 and the
# floor's 138. The nobleman's needed lifting because it came back too pale; this one because it came
# back too dark. The rule is the ordering, not the number.
yarn import-tile art/masters/surfaces/expert-floor.webp --tier=expert --name=floor --slot=floor \
  --filter=smooth --key=none --repeat=1.4 --flatten=0.45
yarn import-tile art/masters/surfaces/expert-wall-face.webp --tier=expert --name=wall-face --slot=face \
  --filter=smooth --key=none --headroom=0.14
# THIS MASTER IS STORED CROPPED, 4128 wide down to 2384, and that is not tidying. The return came back
# with a bright frame ramping from 244 at the edge to the picture's own 90 — and a sill REPEATS, once
# per cell along a run, so the two ramps met and drew a pale bar every 56 units. It measured 99 between
# edge and middle where every other rank sits between 2 and 15.
#
# THE RAMP IS LONG, which is the part that has to be measured rather than eyeballed: it does not settle
# until 938px in on the left and 583 in from the right, and it is ASYMMETRIC, so a symmetric crop leaves
# one edge still climbing. A first attempt at 230 each side looked fixed and still butted 128 against
# 117. The bounds here are the pair that both settle AND match each other — 1058 and 3441, 90.4 against
# 90.0 — found by walking the column means rather than by looking.
#
# `make-seamless` is the wrong tool and was tried twice: it makes the edges MATCH, which they then did
# to within 1, but it does that by wrapping the frame into the picture, so the bar simply moved inboard
# — and with --roll it came back as two bright wedges instead of one. A FRAME IS NOT A SEAM. Top and
# bottom are untouched: that ramp is the sill's own registration, light step edge over dark base, which
# every rank shares and which a vertical pass would destroy.
yarn import-tile art/masters/surfaces/expert-threshold.webp --tier=expert --name=threshold --slot=sill \
  --filter=smooth --key=none --brightness=1.32

# His WALL ITEMS. Both are modelled and rendered with --shear=0.5, because both stand off the wall: the
# band is the same oblique world at HALF depth, so a niche's own floor draws ABOVE its front lip and that
# is what makes it read as a hole rather than a painted rectangle.
#
# No --brightness on either, which is the first pair in this file to need none. A prop comes back lit for
# a gallery; these two came back dark, and the priest's floor is the palest of the five at 151, so what
# would be a defect at the merchant is the separation here — the niche lands 80 under its floor and the
# sconce 103, against a minimum of 10.
#
# The niche's cord and clay seal are the only pale things in it and carry the whole read at 56x28: the
# doors go to near-black at that size and the bar across them is what says "sealed".
scaffold niche --contents=sealed --shear=0.5 --width=448 --height=224 --colour=#a7b2be --sun=0
yarn import-tile art/masters/props/expert/niche.webp --tier=expert --name=niche --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18

# --margin=1.4 must match: the arm reaches a long way right of the wall plate and a tighter frame clips
# the lamp off the end of it.
#
# +33 warmth, outside the +22 to +25 the merchant's props were held to, and left alone. That band is a
# property of a rank, not of the set: green-black bronze against cool grey-blue basalt cannot help
# reading warm, and junior's same sconce measures -35 against his sandstone and ships. Separation is the
# gate; warmth's SIGN is a rank's own business.
scaffold sconce --contents=chain --shear=0.5 --width=448 --height=224 --colour=#a7b2be --sun=0 --margin=1.4
yarn import-tile art/masters/props/expert/sconce.webp --tier=expert --name=sconce --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18

# Three rolls, and the two that failed both failed by being TOLD the projection: called raked it drew a
# vanishing point, handed the brief's flat-orthographic block it drew an elevation with no top face, no
# inner floor and two matching doors. The block is for generating a whole tile, where nothing else
# carries the view. Against a scaffold it competes with the picture and wins. What landed says only that
# the frame is 2:1 — the canvas, which the attachment cannot defend on its own — and nothing else.
#
# The return still slants a little where the mask does not. It survives because the silhouette is what
# gets cut: the paint covers the mask everywhere but a one-pixel edge, and at 56x28 the slant is gone.
scaffold wallShrine --contents=ajar --shear=0.5 --width=448 --height=224 --colour=#a7b2be --sun=0
yarn import-tile art/masters/props/expert/wallShrine.webp --tier=expert --name=wallShrine --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18

# --brightness=0.78, and this rank's first tile clipped DOWN. Bleached linen on pale basalt is the worst
# pairing in the set: untouched it measured ONE from a floor of 151 and 32% of itself over the light
# clamp — the palm column's failure exactly, and tile-stats refuses it. The sweep was 1.0 -> 11 lighter
# and 37.3% clipped, 0.88 -> 10 darker and 18.4%, 0.80 -> 24 and 4.9%, 0.72 -> 37 and 0.0% but 6.9%
# under the dark end. 0.78 is where the two tails meet at about four apiece and it keeps 27 of separation.
#
# No --saturation, unlike the nobleman's linen at 1.4: his is warm and wants the lift, this one is cool
# white and its only colour is the hem band, which is two pixels at slot size either way.
#
# --alpha-cloth=0.6 makes the PRIEST's linen see-through, and only his: fine bleached temple cloth, where
# every other rank's is a heavier weave and stays opaque. It costs nothing at import — the mask is the
# render's alpha and `dest-in` multiplies — and it moves no edge, so the master stays valid. The rail,
# brackets and hem band are separate parts and stay solid. Where the cloth doubles in the gathers the two
# layers multiply to 0.84, so the bundle reads denser than the sheet without anything asking it to.
scaffold hanging --contents=rail --shear=0.5 --width=448 --height=224 --colour=#a7b2be --sun=0 \
  --alpha-cloth=0.6
yarn import-tile art/masters/props/expert/veil.webp --tier=expert --name=veil --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18 --brightness=0.78

# The priest's one PROP, and his second see-through cloth — same --alpha-cloth=0.6 as his veil, because
# it is one rank's linen and not one tile's effect.
#
# The alpha reaches the SHADOW render too, since scaffold() passes its arguments to both, and it changes
# nothing: make_shadow projects a footprint rather than tracing light, so the pair came back byte for
# byte against an opaque render. A thin veil therefore darkens the floor exactly as much as its cedar
# posts do. Left alone deliberately — the footprint is meant to be identical across the rank, and
# --shadow is the knob if that ever needs revisiting.
#
# --brightness=0.82, clipped for the light end alone: the return had 32.4% over the light clamp, and the
# dark tail it leaves at 10.7% is posts and seated shadow, which belong there. Junior's hanging shipped
# at 0.2% light and 24.3% dark, so this is the same trade made further. His veil took 0.78 on the same
# linen at the same rank: a wall item has no posts and no shadow under it, so the two ends sit
# differently and the number does not carry between them.
scaffold hanging --contents=veil --spin=42 --colour=#a7b2be --alpha-cloth=0.6 --floor=#8d98a5
yarn import-tile art/masters/props/expert/hanging.webp --tier=expert --name=hanging --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.82

# The priest's ALTAR, and the first of his chamber props. No --brightness and no --saturation, which makes
# it the cleanest return in the file: 67 under its floor, 0.0% over the light clamp and 0.9% under the
# dark one, straight out of the generator. Dark basalt against pale basalt does not need help.
#
# Three rolls, and the first two were the MODEL's fault rather than the generation's — a spout that
# overlapped its cornice by a 0.025 sliver and drew as a cube flying beside the altar, and a libation
# channel "sunk flush" 0.013 under the slab's face, which buried it in solid stone. Both are laws in
# prop-pipeline.md now, and Step 2's gate counts the pieces so neither can ship again unseen.
#
# The third return sits a little higher in its frame than the mask does, so about 8% of the mask has no
# paint over it along the base. It cost nothing: the import keys magenta BEFORE it masks, so an uncovered
# region goes transparent instead of leaving the pink halo that a moved part usually gives — 8 pixels of
# cast in the whole tile. The silhouette is then the paint's rather than the model's, which is only safe
# because the shadow is seated from the same render and the difference is an edge.
scaffold market --contents=altar --spin=-11 --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/expert/offeringTable.webp --tier=expert --name=offeringTable \
  --slot=prop --filter=smooth --mask="$OBJ" --seat="$SHADOW"

# His CANOPIC JARS, and the reason this one matters beyond the tile: the four gods are recognisable at
# 56x84 and NOT ONE FACE IS MODELLED. The scaffold gives four stopper PROFILES — a dome, a taller dome,
# two pointed ears, a low round — and the repaint put a human wig, a baboon's muzzle, a jackal's snout and
# a falcon's eye markings on them unprompted by any geometry. Profile is enough to aim a face.
#
# --brightness=0.85: creamy alabaster is the palest thing this rank owns and came back 20.4% over the
# light clamp. 0.85 takes that to 0.6% and leaves 62 of separation.
#
# +58 warmth, left alone and more than twice the merchant's band. It is the same argument as the sconce's
# one rank over: warm cream against cool grey-blue basalt cannot measure otherwise, and pulling it into
# the band with --saturation would take the alabaster with it. Separation is the gate.
scaffold jarrack --contents=canopic --spin=16 --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/expert/jarRack.webp --tier=expert --name=jarRack --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.85

# ANUBIS, and the tile that proved a statue needs no museum scan. Step 0's table sent statues to a scan
# for as long as it existed; the canopic jars broke that row's other half, and this broke the rest.
#
# No --brightness and no --saturation. Black resin against pale basalt lands 88 apart with 1.7% over the
# light clamp untouched. The 35.9% under the DARK clamp is the statue being black and is not a defect —
# the value is the subject here, where every other prop's dark tail is shadow and posts.
#
# THREE ROLLS, and each failed somewhere different, which is the record worth keeping. The first was
# carved beautifully and re-staged into three-quarter isometric, because the sentence every other prompt
# ends with holds shape AND rotation and this one had dropped it to free the carving. The second held the
# frame, the projection and the facing and shrank the jackal onto a grown pedestal, because a rough slab
# of body flush on a rough slab of plinth in ONE material is a single mass and the generator read the
# body as base. The third holds because the prompt writes out the five things that sentence used to cover
# and the figure is marked a different part from its plinth.
#
# The lesson under all three: the freer the paint, the less ambiguity the geometry may contain.
scaffold statue --contents=couchant --spin=-8 --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/expert/statue.webp --tier=expert --name=statue --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"

# His PAPYRUS LIBRARY. --brightness=0.9 for pale straw papyrus against basalt: 9.5% over the light clamp
# untouched, 0.3% at 0.9, and it keeps 73 of separation.
#
# The rolls read at 56x84 because they LIE ALONG X and show their cut ends. Stood on end they would be
# discs, and this primitive's own docstring records what a disc in a dark opening reads as: a hole.
scaffold shelf --contents=papyrus --spin=-14 --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/expert/shelf.webp --tier=expert --name=shelf --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.9

# The priest's SACRED POOL, and the only tile in this file whose scaffold was handed over with a FLOOR
# under it. A hole cannot be a product shot: an object on magenta is a thing you could pick up, and the
# early rolls came back a tank, a tray, a flat plan and a panel because that is the only question the
# picture asked. `--context=1.04x0.74` on the handed-over render alone puts the rank's paving round it
# with a hole of exactly that size cut in it, running off all four edges of the frame. The mask below is
# rendered WITHOUT it, so none of the floor reaches the tile — see the entry in repaint-queue.md and the
# `--context` laws in prop-pipeline.md.
#
# NO --seat, alone in this file. The coping is bedded FLUSH with the paving, so nothing on this prop
# stands above the floor and there is nothing to cast. It was imported with one first, and the footprint
# arrived a fifth of the tile BELOW the coping that cast it: `make_shadow` flattens to the lowest point
# that survives the void-drop, which here is the bottom of the deepest submerged step, three quarters of
# the object down. A bar of shadow under a hole is the one thing that makes a hole read as a slab.
#
# 0.9 for the NATRON. The crust along the waterline and on the dry treads is the whitest thing the priest
# owns and put 11.5% over the light clamp untouched; at 0.9 it is 3.2%. The dark tail goes the other way
# and is left alone on purpose — it is the water, and a hole is supposed to be dark. `pit`, shipped and
# correct, measures 93% under the dark clamp.
scaffold basin --contents=pool --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/expert/basin.webp --tier=expert --name=basin --slot=prop \
  --filter=smooth --mask="$OBJ" --brightness=0.9

# His CENSER, hanging on its stand. No --brightness and no --saturation: green-black patina against pale
# basalt lands 83 apart with nothing over the light clamp, and the ember carries +31 warmth on its own.
#
# The 31.7% under the dark clamp is the bronze, and it sits between the statue's 35.9% and the coffin's
# 22.7% at this rank — the value IS the subject, as it is on every dark-metal prop here.
#
# The arm reaches in X and the chains hang from it, which is prim_sconce's law one primitive over: a
# bracket built in the y-z plane draws as a vertical stack and disappears at slot size.
scaffold brazier --contents=censer --spin=22 --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/expert/brazier.webp --tier=expert --name=brazier --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"

# His PAPYRUS-BUNDLE COLUMN. Nothing to grade: 63 of separation, nothing over either clamp, and +10
# warmth, which is the low end of this rank and where dressed basalt belongs — the jar rack's +58 is
# alabaster, not the stone.
#
# --spin=6 because its back belongs to the wall it holds up, which is Step 1b's against-a-wall band. The
# sunk relief on the ribs drops below slot resolution and is not what the tile reads by; the scalloped
# edge of the bundle is, so the ribs stay separate ribs in the prompt.
scaffold palm --contents=papyrus --spin=6 --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/expert/pillar.webp --tier=expert --name=pillar --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"

# His NAOS, doors shut and cord-sealed. No grading flags: 54 of separation, 0.2% over the light clamp and
# +20 warmth, which is the cedar doing the work against basalt that carries none.
#
# The cornice's top face is the palest thing on the prop and is meant to be — it is the one up-facing
# plane the object has, and it is what tells a shut cabinet from a slab at 56 units.
scaffold shrine --contents=sealed --spin=-19 --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/expert/shrine.webp --tier=expert --name=shrine --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"

# His ROBBED-OUT SHAFT. --brightness=0.85 for the ROPE: bleached hemp is the palest thing in the frame and
# put 7.9% over the light clamp untouched, 1.7% here. 0.8 reaches 0.2% and is not taken — the rope is the
# thing that CROSSES THE LIP, which is the whole of why a hole reads as a hole, and dimming it into the
# stone spends the tile to buy a number.
#
# --spin=0, like every pit: the mouth is a parallelogram cut to the cell and a turned one stops agreeing
# with the paving around it. The 19% under the dark clamp is the shaft, and a shaft is meant to be dark.
#
# Its top lip is painted as a TIMBER BAULK where the brief's row says a broken lid slab. Kept on purpose:
# at 84 units it is a two-pixel band that reads as a beam across the mouth, and the ladder and the spoil
# are what carry the tile.
scaffold pit --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/expert/pit.webp --tier=expert --name=pit --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.85

# His CEDAR RELIC BOX, cord-bound with the seal unbroken. No grading flags at all.
#
# +76 WARMTH, the highest anything of his measures, and left alone for the jar rack's reason one prop
# over: red cedar against grey-blue basalt cannot measure otherwise. Pulling it toward the rank's band
# was tried — 0.9 gives +71, 0.8 gives +67, 0.7 gives +62 — so the saturation knob buys four points a
# step and takes the wood with it. Separation is the gate, and it is 82.
scaffold sealedChest --spin=-24 --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/expert/chestProp.webp --tier=expert --name=chestProp --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"

# His COLLAPSED DOOR PLUG. --brightness=0.85 for the NATRON: the crust between the blocks came back 11.5%
# over the light clamp and lands at 2.0%, keeping 63 of separation.
#
# The return spread forty of its own blocks over the frame where the scaffold heaps twelve, which is the
# multi-piece rule doing its job — the mask cuts basalt into the MODELLED silhouettes and the arrangement,
# the footprint and the shadow all stay ours. Ask a scatter for material, never for layout.
scaffold rubblePile --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/expert/rubblePile.webp --tier=expert --name=rubblePile --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.85

# The nobleman's KA-STATUE, and the entry that cost the most rolls in the file for a reason that turned
# out not to be about the painting at all. Two returns came back a cartoon character, and measuring them
# found nothing wrong: 85% of the paint landed inside the mask, so it WAS a repaint of the scaffold, and
# its colour-share, saturation and interior brush texture all sat inside the range of the fifteen landed
# props at this rank. Two rounds of sharper wording bought nothing, because the wording was not the fault.
#
# The SUBJECT was. It was the only tile in the set with a bare torso, arms, knees and separated toes, and
# the only one with a portrait face — where the set's other figure, the merchant's shabti, is a wrapped
# column with a flat mask and no limbs, and landed first roll. So the brief changed rather than the
# prompt: a long kilt to the shins covers exactly where the modelled anatomy and the highlights lived,
# and the flesh is left unpainted limestone, which takes the large saturated skin mass out of the picture.
#
# --brightness=0.76 --saturation=1.3. Untouched it put 39.7% over the light clamp — the whole figure is
# pale limestone now — where every other prop here is at 4.5% or below. 0.86 fixed the clamp and left it
# EXACTLY level with the floor, which fails the ten-luminance separation rule outright; 0.76 puts it 20
# darker. The saturation is for warmth: bare stone came back at -50 and 1.3 brings it to -39, beside the
# lamp at -63 and the chest at -15.
scaffold statue --contents=seated --spin=7 --colour=#e0c193 --colour-figure=#8a6a44 --floor=#c39c68
yarn import-tile art/masters/props/junior/statue.webp --tier=junior --name=statue --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.76 --saturation=1.3

# The nobleman's COFFIN, propped upright — `prim_statue --contents=mummiform`, the pose that stands a
# sarcophagus on end so its anthropoid outline lands in the FRONT plane, the one plane the shear leaves
# alone. Lying down that outline is in the top face, which this projection compresses to k of its depth,
# and two passes of it read as a chest with a stepped lid.
#
# NO --brightness, and it is the first prop at this rank that needed none. Yellow-ground coffin paint is
# already inside the palette: 2.1% over the light clamp, 3.4% under the dark one, +(-15) warmth beside
# the chest at -15, and 13 luminance darker than the floor. Every knob left at 1.0 measures better than
# any setting of them.
#
# The one blemish is a PAINTED SHADOW ON THE PLINTH — a dark wedge the repaint cast from the coffin onto
# the bier beside it. It survives because it lies INSIDE the mask, where the rendered seat cannot replace
# it, and at 56 units it reads as a notch out of the bier rather than as shade. The prompt's "paint the
# shadow at its foot" line is what invites it, and it is worth nothing on a prop that takes --seat: the
# masked-away version costs nothing, this one does not.
scaffold statue --contents=mummiform --spin=11 --colour=#e0c193 --colour-figure=#8a6a44 --floor=#c39c68
yarn import-tile art/masters/props/junior/sarcophagus.webp --tier=junior --name=sarcophagus --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"

# The nobleman's PLASTER FALL, and the difference from his standing pile is entirely paint: the pile is
# `--contents=plaster` and this is `--contents=spill`, the same primitive laid flat on the floor. What
# makes it his is that the fragments landed FACE-UP — the painted side of a tomb wall, ochre and red and
# black on cream, part of a kilt, half a hand, a band of chevrons, a few signs — where the priest's spill
# is broken basalt and the merchant's is mudbrick.
#
# The hieroglyphs on one fragment are fine and are not the tally board's problem: a hieroglyph is a
# PICTURE and comes back a picture. It is cursive the generator cannot draw without writing English.
#
# --brightness=0.84 and no saturation. Cream plaster on pale sandstone is the rank's worst pairing and
# untouched it put 22.4% over the light clamp; 0.84 takes that to 1.9% and leaves it 42 darker than the
# slab. The 6.1% under the DARK clamp is the black line-work on the painted faces and is left alone —
# the same argument the pit's shaft makes, that a tail belonging to the subject is not a fault. 1.25
# saturation was tried and pushed warmth from -35 to -21 without helping anything read.
scaffold rubblePile --contents=spill --colour=#e0c193 --floor=#c39c68
yarn import-tile art/masters/props/junior/rubbleSpill.webp --tier=junior --name=rubbleSpill --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.84

# The nobleman's LEDGER BOARD. FLAT — no mesh, no mask, no seat, the same route as the merchant's tally
# board and his own stela: a plank on two pegs is a slab, and its own silhouette becomes the tile.
#
# THE MASTER HAS THE WORD "RED" LETTERED ON IT FOUR TIMES, and it is not a defect in the tile. Three
# rolls went into this one. The first came back a modern accounting sheet with English column headings
# and Arabic numerals, which is what asking for hieratic in a scribe's hand buys — hieroglyphs are
# pictures and come back as pictures, cursive has no pictorial vocabulary and comes back as English.
# Rewritten to ask for counting strokes it got the marks right and then lettered R-E-D at the foot of
# every column, because the prompt asked for "a row of larger RED marks" and capitals in these prompts
# mean a thing to draw. At 56x28 those three letters are two pixels tall and sit in a row of red
# strokes: they are not legible and not distinguishable from the tallies. A fourth roll would buy
# nothing the map can see, and the prompt is fixed for whoever needs the next board.
#
# --brightness=0.80 --saturation=1.6, and the pair is doing two different jobs. Whitewashed cedar is the
# palest thing this rank owns: untouched it put 42.8% over the light clamp and 0.85 fixed that but left
# the board 7 luminance from the floor, inside the ten the separation rule refuses. 0.80 gives 17. The
# saturation is for warmth — bare whitewash measures -73 against a rank that runs -4 to -63, and 1.6
# brings it to -62, beside the lamp's -63.
yarn import-tile art/masters/props/junior/tallyBoard.webp --tier=junior --name=tallyBoard --slot=wall \
  --filter=smooth --headroom=0.18 --brightness=0.80 --saturation=1.6

# BASTET, the merchant's patron, and the first patron tile in the set — `<kind>-<patron>.png`, which
# `patronTileUrl` prefers over the generic drawing for five kinds and falls back from silently.
#
# The one variant that does NOT reuse its generic's scaffold: the merchant's statue is `shabti.glb`, a
# mummiform figurine, and Bastet is a seated cat. `--contents=lioness` is the pose — an animal sitting
# up — and the scaffold had a bug the first roll found. It inherited `couchant`'s head, whose muzzle
# reaches in -X because a recumbent jackal faces left, so the scaffold's cat sat squared to the camera
# with its face turned sideways; the ears, correctly apart in X, then read as one in front of the other
# along the snout. The muzzle now reaches in -Y when the animal sits, which also draws it lower and is
# what a face jutting at the viewer should do. The return had already ignored the geometry and followed
# the prompt's "facing the viewer", so this master fits either scaffold — proved by importing against
# both and diffing: not one pixel apart, which is what an ENVELOPE is for.
#
# --brightness=0.92 --saturation=1.15. Untouched the tile measured EXACTLY 10 luminance from the floor,
# which is the value tile-stats refuses below — dark bronze on the merchant's dark floor is the tightest
# pairing at this rank. 0.92 gives 18. The saturation is warmth: bronze came back at +18 against a rank
# that sits at +22 to +25, and 1.15 lands it at +23. The 8.2% under the dark clamp is the bronze itself.
#
# NO VISIBLE SHADOW, and it is not a missing seat: the painted plinth came back larger than the modelled
# one and covers its own footprint entirely. The plinth's drawn underside carries the contact instead.
# If this is ever re-rolled, the thing to fix is the plinth — it came back in three-quarter perspective
# where rule 4 asks for its long edges horizontal.
scaffold statue --contents=lioness --spin=-9 --colour=#a49781 --colour-figure=#6f6459 --floor=#6c6257
yarn import-tile art/masters/props/starter/statue-bastet.webp --tier=starter --name=statue-bastet --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.92 --saturation=1.15

# ANUBIS on the vault's FALSE-DOOR STELA — 44 rooms, the largest patron pairing in the world, because
# the Noble's Hidden Vault is six floors deep and every floor of it dresses. FLAT: no mesh, no mask, no
# seat, the same route as the generic stela it varies.
#
# The first roll came back THREE COPIES of the stela in a row. The prompt asked for a landscape frame
# twice as wide as tall — correct, it is a wall item — around an object described as a portrait doorway,
# and the generator filled the width the obvious way. The fix was to describe what the landed generic
# actually is: one WIDE false door reaching both edges, a dark doorway a third of the picture across
# with a broad jamb either side, and "ONE object, and it fills the frame" said outright.
#
# --brightness=0.74, the same as the generic, and it is not a coincidence: warm cream limestone on pale
# sandstone is the pairing that rank struggles with. Untouched it put 54.5% over the light clamp and
# landed 40 LIGHTER than the floor; 0.85 fixed the clamp and left 6 of separation, inside the ten the
# rule refuses. 0.74 gives 17 darker and 0.0% over.
yarn import-tile art/masters/props/junior/stela-anubis.webp --tier=junior --name=stela-anubis --slot=wall \
  --filter=smooth --headroom=0.18 --brightness=0.74

# ANUBIS in the vault's FALSE-DOOR SHRINE, 18 rooms. Same `falseDoor` scaffold as the nobleman's generic
# shrine, so it drops into the same footprint; what makes it his patron's is the black jackal head in the
# recess, which at 56 units is the only part of the figure that reads and is exactly what the one-mark
# rule asks for.
#
# Its first roll was re-staged into three-quarter isometric and came back 2048x2048 SQUARE — the tell
# that the scaffold was not used at all. The reroll came back 1686x2528, the scaffold's own aspect, and
# held the projection without another word being added. Aspect first, prompt second, when a return is
# re-staged.
#
# --brightness=0.8. Untouched, pale limestone put 18.1% over the light clamp and read 18 LIGHTER than the
# floor; 0.88 cleared the clamp but left 6 of separation. 0.8 gives 22 darker, 0.0% over and a 1.1% dark
# tail, which is the cleanest pair of numbers at this rank.
scaffold falseDoor --spin=6 --colour=#e0c193 --floor=#c39c68
yarn import-tile art/masters/props/junior/shrine-anubis.webp --tier=junior --name=shrine-anubis --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.8

# ANUBIS COUCHANT in the vault, 6 rooms, and the tile that cost three rolls to three different faults —
# worth reading in order, because two of them were the prompt correcting itself into the opposite ditch.
#
# --spin=-22 where the priest's Anubis is -8, and the extra turn is the EARS. `couchant` faces left and
# carries its ears apart in X, which in pure profile puts one in front of the other along the snout.
# Moving them to ±Y where they anatomically belong was tried and reverted: they merge into one cone
# under the shear, and worse, it moves the mask of the priest's tile, whose master was painted over the
# ±X silhouette — his ear tips came back blunted. Turning the ANIMAL costs no geometry, and at -22 the
# same two cones sit either side of the skull. Spin is per entry; that is what makes it free.
#
# ROLL 1 came back 2048x2048 square and three-quarter isometric — the tell that the scaffold was not
# used at all. ROLL 2 came back the right aspect and a FLAT SIDE ELEVATION with no plinth top and one
# ear, because rule 2 had been "strengthened" to end "you never see round the side of anything". In a
# cavalier oblique you DO see round the side; that clause asks for an elevation and got one. Rule 3 was
# pulling the same way with "he does not turn to face you", written when the spin was -8 and simply
# untrue at -22. ROLL 3 landed once rule 2 said "nothing gets smaller as it goes back" — the wording the
# priest's Anubis landed on — rule 3 stated the turn positively, and rule 4 asked for the plinth's TOP
# FACE by name. It came back turned a little further than the scaffold, and the envelope absorbed it:
# 90% IoU, 98.8% of the paint inside the mask.
#
# --brightness=0.9 for the PLINTH, not the jackal. Pale limestone put 13.6% over the light clamp; 0.9
# takes it to 0.0%. The 49% under the dark clamp is the black resin and is not a defect — the priest's
# shipped Anubis measures 35.9% for the same reason.
scaffold statue --contents=couchant --spin=-22 --colour=#e0c193 --colour-figure=#8a6a44 --floor=#c39c68
yarn import-tile art/masters/props/junior/statue-anubis.webp --tier=junior --name=statue-anubis --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.9

# THOTH on the nobleman's FALSE-DOOR STELA, 7 rooms. The rank's second god, and the reason his patron
# art is worth painting at all: before the Noble's Hidden Vault was dedicated to Anubis every
# patron-carrying pyramid of his named Thoth, and a lone god is the generic drawing under another name.
# FLAT — no mesh, no mask, no seat, the same route as the generic stela.
#
# --brightness=0.74, the third tile at this rank to land on exactly that number, and not by habit: warm
# cream limestone on pale sandstone is the pairing the nobleman struggles with, and it always arrives
# too light. Untouched this put 49.2% over the light clamp and read 35 LIGHTER than the floor. 0.8 fixed
# the clamp and left 9 of separation, one under the ten the rule refuses. 0.74 gives 21.
#
# --trim, and it is the only tile in the file that needs it. A WALL item never trims: a prop's frame is
# thrown away and its object re-seated, but a wall item's frame IS its placement, so air round the
# object becomes air in the band and the tile reads as a sticker stuck on the wall. Measured across the
# nobleman's three stelae: the two that read fill 96% and 97% of the frame width, this one 74%. --trim
# cuts the keyed background away and scales the object until it touches the band top and bottom,
# keeping its aspect, so the leftover air moves to the SIDES where it does no harm.
yarn import-tile art/masters/props/junior/stela-thoth.webp --tier=junior --name=stela-thoth --slot=wall \
  --filter=smooth --headroom=0.18 --brightness=0.74 --trim

# THOTH in the nobleman's FALSE-DOOR SHRINE, 3 rooms. Same `falseDoor` scaffold as his generic shrine
# and as `shrine-anubis`, so all three drop into one footprint and a room reads as the same furniture
# with a different god in the recess. The blue IBIS HEAD is the whole of what identifies him at 56
# units — the beak is two pixels and the colour is what carries it, which is the one-mark rule working.
#
# --brightness=0.85 where `shrine-anubis` took 0.8: same object, same scaffold, different return, and
# the numbers are per image rather than per entry. Untouched it put 14.7% over the light clamp and sat
# 7 from the floor; 0.85 gives 0.0% and 32 darker.
scaffold falseDoor --spin=6 --colour=#e0c193 --floor=#c39c68
yarn import-tile art/masters/props/junior/shrine-thoth.webp --tier=junior --name=shrine-thoth --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.85

# BASTET in the merchant's household SHRINE, 3 rooms, and the second patron tile at his rank. Same
# `prim_shrine` default as his generic — a mudbrick box with a figure and a lamp in the niche — with a
# seated bronze cat where Bes stands. The lamp sooting the back wall is the generic's own detail kept.
#
# Its first roll came back 2048x2048 SQUARE, the tell that the scaffold was never attached, and was
# staged three-quarter isometric to match. Nothing was rewritten: the reroll came back 1686x2528 and
# held the projection. Check the aspect before touching a prompt.
#
# --brightness=0.76 --saturation=1.6, and the two clamps pull opposite ways here, which is worth
# recording because the merchant's rank does it often. Whitewash on his near-black floor came back 52
# LIGHTER with 49.4% over the light clamp. Darkening fixes the clamp but walks the tile THROUGH zero
# separation on the way — 0.66 lands it 3 darker, which fails the ten-luminance rule from the other
# side, and 0.6 makes a whitewashed shrine darker than the floor it stands on, which inverts what the
# object is. 0.76 keeps it 13 LIGHTER, where the generic shrine sits at 10, and leaves both tails near
# 9%. The saturation stops at 1.6: 2.2 hits the rank's +25 warmth band exactly and turns the worn ochre
# patches a garish orange, and the generic shrine ships at +9 anyway.
scaffold shrine --spin=-12 --colour=#a49781 --floor=#6c6257
yarn import-tile art/masters/props/starter/shrine-bastet.webp --tier=starter --name=shrine-bastet --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.76 --saturation=1.6

# THOTH as the nobleman's ka-statue, 3 rooms, and the tile that cost four rolls to a fault that was not
# one. Same `--contents=seated` scaffold, same --spin=7, same material handling as his generic statue.
#
# FOUR ROLLS WERE SPENT REJECTING A CORRECT PROJECTION. Each return came back "plain oblique" — a
# near-frontal view with almost no top faces — and each was judged against the couchant Anubis, which
# shows a broad plinth top because it is long along X and spun to -22. A SEATED figure at 7 degrees has
# nothing to show: the pose is a throne back slab, a torso and a head, all front faces, and the plinth's
# top is a sliver. Look at `junior/statue`, which shipped: it is as flat as any of the rolls that were
# thrown away. The measurement that ends the argument is mask overlap — this master sits at 83.9% IoU
# against the landed statue's 86.1%, two points apart.
#
# The prompt rewrites those rolls bought are worth keeping anyway, and the queue records them: the
# projection is now pinned to the reference rather than described in prose, which is the older rule and
# the one that kept getting lost. But the lesson here is about JUDGING: compare a return to the landed
# tile of its OWN POSE, never to another pose's depth cues.
#
# --brightness=0.8 --saturation=1.3, which lands on the generic's own numbers almost exactly — -37
# warmth against its -39, 21 darker against its 20, a 2.1% dark tail against its 2.5%. That is what a
# variant should measure: the same object at the same rank with a different god on it.
scaffold statue --contents=seated --spin=7 --colour=#e0c193 --colour-figure=#8a6a44 --floor=#c39c68
yarn import-tile art/masters/props/junior/statue-thoth.webp --tier=junior --name=statue-thoth --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --brightness=0.8 --saturation=1.3

# The priest's COFFIN, propped upright — `prim_statue --contents=mummiform`, the pose that puts an
# anthropoid outline in the FRONT plane, the one plane this shear leaves alone.
#
# NO KNOBS. 0.2% over the light clamp, +27 warmth, 59 darker than the slab. The 22.7% under the dark
# clamp is the coffin being dark cedar and is not a defect — the priest's own Anubis ships at 35.9%.
#
# TWO FAULTS AND ONE OF THEM WAS THE PROMPT'S SILENCE. The first roll came back with the boxes painted
# AS BOXES: a cube for a head with a square plaque of a face on it, the crossed arms as two rectangular
# bars. It was obeying — the entry ended with "keep every edge, every proportion and every silhouette",
# and `mummiform` is a `prim_statue` pose, so its scaffold is an ENVELOPE and owed the carve section
# instead. The entry now carries one written for a coffin. `junior/sarcophagus` landed FIRST ROLL off
# the same wrong instruction, which is why it went unnoticed for so long: the model interpreted loosely
# that time, and in a clean chat it interprets literally.
#
# The second roll carved the coffin perfectly and drew the plinth as a FLAT PANEL behind it, because the
# coffin carve block had four numbered rules where the statues have five — the plinth rule was the one
# missing. THE MASK RESCUED IT: cut to the scaffold's own silhouette the panel becomes the plinth, and
# the natron dust the painter put on it reads as the slab's top face. 87.2% IoU, 91.6% of the paint
# inside the mask, the best of any envelope return in the session and better than the junior coffin's
# 80.4%. The rule is added anyway, for the pharaoh's and the gods' coffins.
scaffold statue --contents=mummiform --spin=-6 --colour=#a7b2be --colour-figure=#6f6459 --floor=#8d98a5
yarn import-tile art/masters/props/expert/sarcophagus.webp --tier=expert --name=sarcophagus --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
