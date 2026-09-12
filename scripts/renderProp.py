"""Renders a prop in the map's projection, exactly, from a 3D mesh.

    blender -b -P scripts/renderProp.py -- --primitive=cube --out=/tmp/cube.png
    blender -b -P scripts/renderProp.py -- --primitive=table --out=/tmp/table.png
    blender -b -P scripts/renderProp.py -- --mesh=jarRack.glb --out=jarRack.png
    blender -b -P scripts/renderProp.py -- --mesh=jarRack.glb --out=rack-e.png --spin=90

Why this exists: eighteen rolls went into asking an image generator for cavalier oblique and it obeyed
on boxes and refused on figures, every prop being a fresh throw of the dice. The projection is not a
matter of taste or luck — it is one matrix — and a mesh rendered through that matrix is correct by
construction, the same way `make-arch` builds a gateway instead of asking for one.

THE PROJECTION. Cavalier oblique is NOT a camera angle, which is why "30 degrees above the floor" never
worked: no camera placement produces it. It is a SHEAR applied before an orthographic front view.

    Blender axes: X right, Y away from the viewer (depth), Z up.
    A point D units further back is drawn D units HIGHER and not one pixel sideways:

        x' = x          width is unchanged
        z' = z + k * y  depth pushes straight up
        (y is then discarded by the orthographic front view)

`k` is the depth ratio: 1.0 is textbook cavalier, 0.5 is cabinet (half depth, what
the renderer's WALLS use — SIDE_W 14 of thickness images as FACE_TOP 7). See tile-art-brief.md, "A PROP
is tilted more steeply than a WALL, on purpose".

--spin turns the object on the floor BEFORE the shear, which is the thing prompting could never do: the
same mesh gives a rack seen from its end, or four rotations of a statue, all in one projection.

--primitive=cube renders a unit cube instead of a mesh, and is the calibration case: at k=1 its top face
must come out exactly as wide as its front face and exactly as tall, with no edge sloping and nothing
narrowing toward the back. If the cube is right the matrix is right, whatever the mesh does afterwards.

Nothing here is verified: this file was written on a machine with no Blender. The cube is the first
thing to run.
"""

import sys
import math
import bpy
import bmesh
from mathutils import Matrix, Vector

# The slot is 56x84 map units; render well above it and let `import-tile` resize, the same way every
# painted tile in this set is generated far above map size (tile-art-brief.md, "The style").
DEFAULT_W, DEFAULT_H = 448, 672


def arg(name, fallback=None):
    prefix = f"--{name}="
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    for a in argv:
        if a.startswith(prefix):
            return a[len(prefix) :]
    return fallback


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def box(sx, sy, sz, x=0.0, y=0.0, z=0.0):
    """One rectangular block, sized and placed by its CENTRE."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    o = bpy.context.object
    o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(scale=True)
    return o


def join_all():
    bpy.ops.object.select_all(action="SELECT")
    bpy.context.view_layer.objects.active = bpy.context.selected_objects[0]
    bpy.ops.object.join()
    return bpy.context.object


# Parametric shapes, so the boxy half of the prop list needs no mesh generator at all. A market table is
# four legs and a slab; a crate is a box with a rim. Proportions are in metres and read as real furniture
# because the projection cares about depth, and an object with no depth has no top to show.
PRIMITIVES = {}


def prim_cube():
    bpy.ops.mesh.primitive_cube_add(size=1)
    return bpy.context.object


def prim_table():
    """A low market table: 1.2 wide, 0.6 deep, 0.55 high."""
    top_h, leg = 0.07, 0.06
    box(1.2, 0.6, top_h, z=0.55 - top_h / 2)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(leg, leg, 0.55 - top_h, x=sx * (0.6 - leg), y=sy * (0.3 - leg), z=(0.55 - top_h) / 2)
    return join_all()


def prim_crate():
    """A rope-handled crate: 0.7 wide, 0.5 deep, 0.5 high, with a lid rim standing proud of the box."""
    box(0.7, 0.5, 0.46, z=0.23)
    box(0.74, 0.54, 0.05, z=0.485)
    return join_all()


def jar(x, y, height, belly, z=0.0, part="pottery"):
    """One Egyptian storage jar: a round belly tapering to a point, a short neck, a domed stopper.

    Built from a sphere squeezed and a cone rather than modelled, because at 56 units what survives is
    the silhouette — a round shoulder over a taper — and nothing finer.

    Every piece takes `part`, because a primitive that marks any of itself has to mark all of itself:
    `join_all` merges material slots by name and the polygons keep their indices, so an unmarked jar in a
    marked rack would come out in whatever slot landed at index 0."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=belly, location=(x, y, z + height * 0.62))
    body = bpy.context.object
    body.scale = (1.0, 1.0, height * 0.42 / belly)
    bpy.ops.object.transform_apply(scale=True)
    mark(body, part)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=belly, radius2=0.0, depth=height * 0.5, location=(x, y, z + height * 0.37))
    point = bpy.context.object
    point.rotation_euler = (math.radians(180), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    mark(point, part)
    mark(cyl(belly * 0.42, height * 0.12, x=x, y=y, z=z + height * 0.98, verts=20), part)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=10, radius=belly * 0.44, location=(x, y, z + height * 1.03))
    dome = bpy.context.object
    dome.scale = (1.0, 1.0, 0.55)
    bpy.ops.object.transform_apply(scale=True)
    mark(dome, part)


def prim_jarrack():
    """The merchant's rack: two uprights, two rails, three jars standing in it.

    The test this exists for is CURVES. Boxes came through the shear on the first try; a sphere and a
    cone are where a projection usually gives itself away, and a jar's stopper seen from above is the
    tell — under this shear a circle lying flat must draw as an ellipse exactly as wide as the jar."""
    post, w, d, h = 0.07, 0.95, 0.34, 0.62
    for sx in (-1, 1):
        mark(box(post, d, h, x=sx * (w / 2 - post / 2), z=h / 2), "body")
    for z in (h - 0.06, 0.16):
        mark(box(w - post * 2, 0.05, 0.05, z=z), "body")
    # --contents=none renders the FRAME alone, and it exists for the shadow rather than for the picture.
    # `make_shadow` flattens the whole object to z=0, so jars held clear of the floor in a rack cast their
    # BELLIES: three fat ellipses sitting in front of the rack, where the hand-painted merchant version
    # has one narrow band under the frame. --sun cannot fix it, for `prim_pillar`'s reason — it shifts a
    # footprint in depth, not out from under a shape as wide as the shadow it makes.
    #
    # This is safe to composite because the jars sit INSIDE the frame's bounding box on all three axes —
    # 0.57 tall against posts of 0.62, x within ±0.415 against ±0.44, depth within ±0.125 against 0.34 —
    # so `add_camera`, which frames from the object's own bounds, gives both renders the same frame. A
    # primitive whose contents overflowed its frame could not be shadowed this way.
    if arg("contents") == "vessels":
        # The pharaoh's rack: sealed gold vessels and alabaster ointment jars, so what it has that no
        # other rank's has is VARIETY. The merchant's three are one jar repeated and the priest's four are
        # one jar in four hats; a treasury shelf is a set of different objects, and at slot size that
        # difference has to be in the SILHOUETTE — a squat pot, a tall footed vase, a shouldered flask.
        #
        # Two materials, marked apart: the vessels metal, the ointment jars pottery. The repaint is told
        # which is gold and which is alabaster by the scaffold rather than by the prompt guessing, which
        # is `prim_niche`'s rule and the reason every marked primitive marks all of itself.
        #
        # Everything stays under the frame's own 0.62, by the invariant stated below.
        mark(cyl(0.135, 0.20, x=-0.31, y=0.0, z=0.10, verts=16), "metal")
        mark(cyl(0.145, 0.03, x=-0.31, y=0.0, z=0.205, verts=16), "metal")
        mark(cyl(0.055, 0.05, x=-0.31, y=0.0, z=0.245, verts=12), "metal")
        # The tall footed vase, and its FOOT is a separate drum: a stem tapering straight into the floor
        # reads as a bottle, where a foot standing proud reads as a vessel set down. Elliptical in y for
        # the depth tax `prim_lamp` records — a round foot buys width and gives it straight back.
        stem_foot = mark(cyl(0.085, 0.045, x=-0.03, y=0.0, z=0.022, verts=16), "metal")
        stem_foot.scale = (1.0, 0.8, 1.0)
        bpy.ops.object.transform_apply(scale=True)
        mark(cyl(0.038, 0.12, x=-0.03, y=0.0, z=0.10, verts=12), "metal")
        bpy.ops.mesh.primitive_uv_sphere_add(segments=18, ring_count=10, radius=0.115, location=(-0.03, 0.0, 0.26))
        belly_v = bpy.context.object
        belly_v.scale = (1.0, 0.86, 1.05)
        bpy.ops.object.transform_apply(scale=True)
        mark(belly_v, "metal")
        mark(cyl(0.062, 0.09, x=-0.03, y=0.0, z=0.40, verts=12), "metal")
        # Two alabaster ointment jars, short and wide-shouldered — the shape that is NOT a gold vessel,
        # which is the whole reason they are here.
        for jx, jr in ((0.20, 0.10), (0.38, 0.082)):
            mark(cyl(jr, 0.16, x=jx, y=0.0, z=0.08, verts=14), "pottery")
            mark(cyl(jr * 1.10, 0.028, x=jx, y=0.0, z=0.172, verts=14), "pottery")
            cap = cyl(jr * 0.72, 0.05, x=jx, y=0.0, z=0.208, verts=14)
            cap.scale = (1.0, 1.0, 0.8)
            bpy.ops.object.transform_apply(scale=True)
            mark(cap, "pottery")
    elif arg("contents") == "canopic":
        # The priest's FOUR canopic jars, and the count is the point — four sons of Horus, one organ each,
        # so three would be the wrong object rather than a sparser one. Four in a 0.95 rack is 0.10 of
        # belly against the merchant's 0.125, which is at `prim_shelf`'s coarseness floor and no finer.
        #
        # A canopic jar is NOT `jar()`. That one tapers to a point, which is an amphora meant to stand in
        # sand or a ring; a canopic jar has a FLAT BASE and stands on a shelf, and its shoulder is high
        # and square rather than round. So the body is a barely-tapered drum and the whole silhouette
        # difference lives in the head on top.
        #
        # The HEADS are what the repaint is being handed: human, baboon, jackal, falcon. At 0.10 of belly
        # no muzzle survives as geometry, so each is a stopper of a different PROFILE — a dome, a taller
        # dome, an upright wedge for the jackal's ears, a small round for the falcon — and the paint puts
        # the faces on. Four identical domes would give the repaint nothing to tell them apart by, which
        # is `prim_niche`'s lesson about a scaffold arriving already told apart.
        # EVERYTHING STAYS UNDER THE RACK'S OWN HEIGHT. The first pass stood the jars on a plinth and
        # their heads crossed the top rail at 0.71 against a frame of 0.62, which breaks the invariant
        # stated above: contents inside the frame on all three axes, so add_camera gives the object and
        # its shadow the same frame. A jackal ear poking out of the top is enough to shift one of them.
        base_z = 0.0
        for x, head in ((-0.30, "dome"), (-0.10, "tall"), (0.10, "ears"), (0.30, "round")):
            body = cyl(0.086, 0.32, x=x, y=0.0, z=base_z + 0.16, verts=14)
            body.scale = (1.0, 0.86, 1.0)
            bpy.ops.object.transform_apply(scale=True)
            mark(body, "pottery")
            # A shoulder ring, proud of the body: it is where the lid meets the jar, it is the line the
            # repaint paints the seal on, and without it the jar and its head are one blob.
            mark(cyl(0.093, 0.035, x=x, y=0.0, z=base_z + 0.32, verts=14), "pottery")
            top = base_z + 0.335
            if head == "ears":
                # The jackal, and its ears are CONES rather than boxes: two square prongs read as a fork
                # or a crown, and what says jackal at this size is a point. They sit apart in X, never in
                # Y — a pair built front-to-back stacks vertically under the shear and draws as one ear.
                mark(cyl(0.066, 0.07, x=x, y=0.0, z=top + 0.035, verts=12), "pottery")
                for ex in (-0.032, 0.032):
                    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.028, radius2=0.004,
                                                    depth=0.085, location=(x + ex, 0.0, top + 0.11))
                    mark(bpy.context.object, "pottery")
            else:
                r, dome_h = {"dome": (0.072, 0.10), "tall": (0.064, 0.15), "round": (0.076, 0.085)}[head]
                bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=r,
                                                     location=(x, 0.0, top))
                cap = bpy.context.object
                cap.scale = (1.0, 0.86, dome_h / r)
                bpy.ops.object.transform_apply(scale=True)
                mark(cap, "pottery")
    elif arg("contents") != "none":
        for x in (-0.29, 0.0, 0.29):
            jar(x, 0.0, h * 0.92, 0.125)
    return join_all()


def cyl(r, h, x=0.0, y=0.0, z=0.0, verts=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=(x, y, z))
    return bpy.context.object


def cone(r_bottom, r_top, h, x=0.0, y=0.0, z=0.0, verts=18):
    """A truncated cone. WIDEN IT UPWARD AND ITS SIDE NORMALS COME OUT INVERTED — the laws table records
    it and `prim_basin` paid for it — so anything with the larger radius on top must go through
    `recalc_outward` or it renders near-black with its material slots reading correctly the whole time."""
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r_bottom, radius2=r_top, depth=h, location=(x, y, z))
    obj = bpy.context.object
    if r_top > r_bottom:
        recalc_outward(obj)
    return obj


def prim_market():
    """One table and what is on it: `--contents=market` is the merchant's balance and heap of grain,
    `--contents=laid` the nobleman's laid dining table.

    A prop is not its silhouette alone — the painted version of this reads as a market stall because of
    what stands ON it, and the scaffold has to carry that or the repaint has nothing to paint. The scale
    is a post, a beam and two pans; the grain is a squashed cone. Nothing here is finer than a thumb at
    slot size, which is the budget.

    The laid table is the same carcass, and it obeys the far-edge rule below for the same reason: its jar
    is what tops the back edge, so the platter and the loaves may sit flat on the timber."""
    contents = arg("contents", "market")
    top_h, leg, w, d, h = 0.07, 0.06, 1.2, 0.6, 0.5
    if contents == "baskets":
        # TRADED FROM THE GROUND, not from a table. Market scenes in tomb painting show goods sold out of
        # big reed baskets set down on the floor, with the scales beside them — the table in the brief's
        # merchant row is the doubtful part of it, and this is the alternative to look at.
        #
        # Built INSTEAD of the table, so nothing of the carcass above is reached: the whole point is that
        # there is no table.
        #
        # A basket is a drum, and a drum is the shape this projection is least kind to — `prim_brazier`'s
        # dish and `prim_lamp`'s foot both record it. Round costs depth, and depth is charged to the drawn
        # height at k, so three round baskets side by side would be as tall drawn as they are wide. They
        # are squashed to 0.62 in y for that reason, which also reads correctly: a coiled basket packed
        # against its neighbours is not a circle.
        #
        # What says REED at 56 units is not the weave, which is finer than a pixel here. It is the RIM —
        # a ring proud of the body, which is how a coiled basket is finished — and a LID leaning against
        # one of them. Both are geometry the repaint can put a weave on; neither is paint alone.
        for bx, br, bh, part in ((-0.34, 0.28, 0.40, "body"), (0.10, 0.24, 0.32, "body"), (0.46, 0.19, 0.22, "body")):
            body = cyl(br, bh, x=bx, y=0.0, z=bh / 2, verts=18)
            body.scale = (1.0, 0.62, 1.0)
            bpy.ops.object.transform_apply(scale=True)
            mark(body, part)
            rim = cyl(br * 1.07, 0.05, x=bx, y=0.0, z=bh, verts=18)
            rim.scale = (1.0, 0.62, 1.0)
            bpy.ops.object.transform_apply(scale=True)
            mark(rim, part)
        # The first basket is OPEN, heaped over its rim: a lid on every one of them is a row of drums, and
        # what says market is being able to see what is for sale. `prim_market`'s grain heap is the shape.
        bpy.ops.mesh.primitive_cone_add(vertices=18, radius1=0.26, radius2=0.0, depth=0.20,
                                        location=(-0.34, 0.0, 0.48))
        heap = bpy.context.object
        heap.scale = (1.0, 0.62, 1.0)
        bpy.ops.object.transform_apply(scale=True)
        mark(heap, "accent")
        # The second is lidded, and the third's lid LEANS against it — the one part of a basket that is
        # not a drum, and the thing that stops the group reading as three pots.
        lid = cyl(0.25, 0.045, x=0.10, y=0.0, z=0.345, verts=18)
        lid.scale = (1.0, 0.62, 1.0)
        bpy.ops.object.transform_apply(scale=True)
        mark(lid, "body")
        leaning = cyl(0.17, 0.04, verts=18)
        leaning.scale = (1.0, 0.62, 1.0)
        bpy.ops.object.transform_apply(scale=True)
        mark(turn(leaning, 68, "Y", 0.66, -0.06, 0.17), "body")
        return join_all()
    if contents == "altar":
        # The priest's, and it is NOT the table with different things on it: an altar is a solid block of
        # stone standing on the floor, so the carcass above is skipped the way `baskets` skips it. What
        # separates the two silhouettes at 56 units is exactly that — daylight under a top, or none.
        #
        # A CAVETTO over a battered body, both of which do work here. The overhang gives the block a
        # drawn line across it that a plain cube has nowhere to put, and the taper stops the thing reading
        # as a crate: `prim_chest` is a box this size and the two must not converge.
        # FLAT IN Y, and this is the law about depth being taxed into height doing real damage: at a depth
        # of 0.52 the top face drew 0.36 tall — bigger than the block under it — and the altar read as a
        # table top with a dark slot in it. An altar only has to read from the FRONT, so the depth is cut
        # to little more than the channel needs and the top comes back a band.
        ab_w, ab_d, ab_h = 0.92, 0.34, 0.46
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.72, radius2=0.64, depth=ab_h,
                                        location=(0, 0, ab_h / 2))
        body = bpy.context.object
        body.rotation_euler = (0, 0, math.radians(45))
        bpy.ops.object.transform_apply(rotation=True)
        body.scale = (ab_w / 1.018, ab_d / 1.018, 1.0)
        bpy.ops.object.transform_apply(scale=True)
        mark(recalc_outward(body), "body")
        mark(box(ab_w + 0.10, ab_d + 0.08, 0.07, z=ab_h + 0.035), "body")
        top = ab_h + 0.07
        # The LIBATION CHANNEL, and it runs in X because that is the only horizontal axis: cut along y it
        # would draw as a vertical stripe up the slab and read as a crack. VOID rather than a boolean, by
        # `prim_pit`'s marker — near-black, casting nothing, which is what a groove holds.
        #
        # IT MUST BREAK THE SURFACE. Sunk "flush" at top - 0.038 its own top face landed 0.013 UNDER the
        # slab's, so the groove was buried in solid stone and the scaffold came back with a blank top.
        # The repaint still had a channel in it — because the prompt describes one in words — which is the
        # pipeline running backwards and the reason it went unnoticed: the geometry is supposed to settle
        # this before the generator ever sees it. A recess is cut by a VOID box standing slightly PROUD of
        # the surface it cuts, never level with it and never below.
        #
        # It runs OFF the right-hand edge. There is no separate spout: a channel that reaches the rim is
        # already draining, and the block that used to project past the cavetto is what floated (see
        # below). Ending it short of the rim is what reads as a scratch, so it overshoots by 0.04.
        mark(box(0.89, 0.075, 0.05, x=0.105, y=-0.06, z=top - 0.02), VOID)
        # NO SPOUT, and this is the entry worth reading before adding any part that sticks out.
        #
        # It was a block 0.13 wide set past the cavetto's overhang, overlapping it by 0.025 at one corner.
        # Non-zero, so the arithmetic said "attached" — and the generator drew it as a separate cube flying
        # beside the altar. Contact is not a boolean: an overlap that is thin, or at a corner, or on one
        # face only, reads as no contact at all and the repaint paints what it reads. `prim_mask`'s law
        # says a hairline is a gap; this is its other half — a sliver is a gap too.
        #
        # The fix was not a bigger overlap. A projecting nub had nothing to say that extending an existing
        # part could not: the brief asks for a channel cut in the altar, not for a spout, and the channel
        # running out over the rim does the whole job. Delete the part rather than reseat it.
        # Something has to TOP THE BACK EDGE or everything on the slab reads as a stain on it — the rule
        # `laid` paid for above. Here it is the incense: two cones standing at the back, which are also
        # the one part of an altar that is unmistakably an altar's.
        for cx in (-0.26, -0.09):
            bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=0.062, radius2=0.012, depth=0.20,
                                            location=(cx, 0.09, top + 0.10))
            mark(bpy.context.object, "accent")
        # Bread, flat on the stone in front of the channel: squashed spheres, coarse for `prim_shelf`'s
        # reason. They may lie flat because the cones already hold the back line.
        for lx, ly, r in ((0.16, 0.07, 0.082), (0.32, 0.01, 0.072)):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=r,
                                                 location=(lx, ly, top + 0.04))
            loaf = bpy.context.object
            loaf.scale = (1.25, 1.0, 0.5)
            bpy.ops.object.transform_apply(scale=True)
            mark(loaf, "accent")
        return join_all()
    mark(box(w, d, top_h, z=h - top_h / 2), "body")
    for sx in (-1, 1):
        for sy in (-1, 1):
            mark(box(leg, leg, h - top_h, x=sx * (w / 2 - leg), y=sy * (d / 2 - leg), z=(h - top_h) / 2), "body")
    if contents == "laid":
        # A platter of loaves, two cups, and a stoppered jar. The JAR is the piece that has to top the
        # back edge — see the derivation below, which the grain heap paid for: under z + k*y the back of
        # the tabletop is the HIGH boundary at h + k*d/2, and anything drawn against timber rather than
        # against the background reads as a stain on it. The jar clears that line by 0.13, so everything
        # else is free to lie flat.
        # In a ring, not on its point. `prim_basin` records the failure: `jar()` tapers to a point, and
        # a point standing on a flat surface gives a contact one pixel wide that reads as balancing.
        mark(cyl(0.108, 0.045, x=-0.30, y=0.06, z=h + 0.022, verts=14), "pottery")
        jar(-0.30, 0.06, 0.30, 0.105, z=h - 0.02, part="pottery")
        mark(cyl(0.21, 0.028, x=0.16, y=-0.02, z=h + 0.014, verts=20), "pottery")
        # Loaves: squashed spheres, coarse for the same reason `prim_shelf`'s pots are.
        for lx, ly, r in ((0.08, 0.02, 0.085), (0.24, -0.06, 0.075), (0.19, 0.09, 0.07)):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=r,
                                                 location=(lx, ly, h + 0.045))
            loaf = bpy.context.object
            loaf.scale = (1.25, 1.0, 0.55)
            bpy.ops.object.transform_apply(scale=True)
            mark(loaf, "accent")
        for cx in (0.44, 0.52):
            mark(cyl(0.052, 0.075, x=cx, y=-0.09 if cx > 0.5 else 0.06, z=h + 0.037, verts=12), "pottery")
        return join_all()
    # The balance, standing on the right of the top: post, beam across it, a shallow pan hanging at
    # each end. Pans are discs, which under this shear draw as ellipses — the same tell as the jar lids.
    post_x, post_h = 0.30, 0.32
    mark(cyl(0.022, post_h, x=post_x, z=h + post_h / 2), "metal")
    mark(box(0.46, 0.035, 0.035, x=post_x, z=h + post_h), "metal")
    for sx in (-1, 1):
        # The cord is THIN and long. At 0.019 on a 0.10 drop it drew as a stalk and the pair read as two
        # mushrooms standing on the table rather than as pans hanging off a beam; what says "hanging" is
        # a gap of daylight between the pan and everything below it, not the cord itself.
        mark(cyl(0.009, 0.15, x=post_x + sx * 0.20, z=h + post_h - 0.085, verts=6), "metal")
        mark(cyl(0.098, 0.016, x=post_x + sx * 0.20, z=h + post_h - 0.165), "metal")
    # The grain, heaped on the left. Where it goes is DERIVED, and the derivation has a wrong turn in it
    # worth keeping, because the obvious fix is the one that fails.
    #
    # It has to own a silhouette. `prim_lamp` records the rule from the other end: a dish sitting wholly
    # within the stool's seat draws its own pale top inside a pale rectangle of the same value, and the
    # eye takes the dark side for a hole in the furniture. A heap set on this tabletop is worse still — a
    # cone 0.24 across and 0.13 tall is all top face and rendered as discoloured timber.
    #
    # The obvious answer is to push it over the FRONT edge, and it is wrong twice. Pushed far enough to
    # break that edge, the base ran -0.49 to 0.01 against a top that stops at -0.30: nearly half the heap
    # hanging in the air. Pulled back until it is supported, its front rim lands exactly ON the edge — the
    # arithmetic is clean, `-d/2 + r` draws at `h - k*d/2` to three decimals — and it still reads as a
    # stain, because touching a boundary tangentially does not break it.
    #
    # The edge to break is the FAR one. Under z + k*y the back of the tabletop is the HIGH boundary, at
    # h + k*d/2, and anything that tops it is drawn against the background instead of against timber. So
    # the heap is sized to reach over that line rather than pushed off the near side, and it stays wholly
    # on the table: base -0.30 to 0.30 against a top of exactly that, apex drawn at 0.740 against a back
    # edge at 0.710.
    #
    # It costs a heap slightly steeper than grain really lies — 0.8 of its radius where the angle of
    # repose gives 0.65. At natural slope, fully supported, the apex misses the back edge by 0.015 and
    # there is nowhere else to find it: that is what the extra height is buying.
    grain_r = 0.30
    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=grain_r, radius2=0.0, depth=0.24,
                                    location=(-0.26, 0.0, h + 0.12))
    mark(bpy.context.object, "accent")
    return join_all()


def tilt(obj, degrees, axis="Y"):
    """Leans one part over, about THE WORLD ORIGIN — not about its own centre.

    That is not what it was written to do, and it is worth knowing which it really is. `box` ends with
    `transform_apply(scale=True)`, and that operator applies the LOCATION too: the offset lands in the
    mesh and the object's origin stays at (0, 0, 0). So object-level rotation pivots a part about the
    origin of the whole prop, and the further from it a part sits the further the turn throws it. A bar
    0.30 long at z=0.60 turned 90 degrees does not stand up; it lies along X at z=0.

    Nobody noticed because every caller is a small angle on a part that is near the origin or long enough
    not to care — a wedge at 16 degrees, an ostracon at 7. It is left ALONE rather than corrected: the
    merchant's pillar, shelf and sconce were all painted over what it really does, and their masks would
    cut shapes the art no longer fills.

    For anything new, use `turn`, which is what this docstring used to claim."""
    i = "XYZ".index(axis)
    obj.rotation_euler[i] = math.radians(degrees)
    return obj


def turn(obj, degrees, axis="Y", x=0.0, y=0.0, z=0.0):
    """Turns a part about its own centre, then puts it where it belongs. Build it at the ORIGIN.

    The pair of transforms in the order that matters: `obj.location` is a translation applied after the
    rotation, so a part made at the origin turns in place and then moves out. `join_all` bakes both. See
    `tilt` for what happens when a part is placed first and turned second."""
    i = "XYZ".index(axis)
    obj.rotation_euler[i] = math.radians(degrees)
    obj.location = (x, y, z)
    return obj


def prim_shelf():
    """Mudbrick shelving and what stands in it: `--contents=storage` is the merchant's pots and linen,
    `--contents=linen` the nobleman's linen press with a mirror case on the top course.

    An OPENING is shorter than the gap that makes it. The shelf above is a slab of depth d, and its
    front-bottom edge sits at y = -d/2, so the shear draws that edge 0.7*(d/2) LOWER than its own z. A
    pot the gap could hold is beheaded by the lip; the room a pot really has is
    (z_above - 0.35*d) - (z_below + 0.35*d), which is where the 0.22 below comes from.

    Two more, learned the same way. The contents have to be COARSE — a jar of 0.07 belly on a 1.35-wide
    unit is three pixels in the slot, the brief's tenth-of-the-object rule failed by a factor of two —
    and they have to be SQUAT, because an amphora slim enough to read as an amphora is finer than that
    limit. These are storage pots, and the ostracon lies flat on the top course where the shear shows a
    top face generously, rather than leaning in an opening where nothing is lit.

    The linen press is the same carcass with FOLDED CLOTH in it, and it is marked `cloth` throughout —
    stacked sheets and stacked anything else are the same boxes, so the only thing that tells the repaint
    which it is looking at is the colour it arrives in. The mirror case goes on the top course for the
    ostracon's reason, and it is `metal`, which is the one part of this prop that is not mud or cloth."""
    contents = arg("contents", "storage")
    linen = contents == "linen"
    # Marking is per-VARIANT and not per-rank: the merchant's storage is one material throughout and
    # marking it would only split a slot nothing overrides, where the later variants put cloth and
    # papyrus against mudbrick and need them told apart before the repaint sees them.
    marked = contents in ("linen", "papyrus")

    def put(obj, name):
        return mark(obj, name) if marked else obj

    w, d, h, brick = 1.15, 0.30, 0.86, 0.08
    lip = 0.35 * d
    put(box(w, brick, h, y=(d - brick) / 2, z=h / 2), "body")
    for sx in (-1, 1):
        put(box(brick, d, h, x=sx * (w / 2 - brick / 2), z=h / 2), "body")
    shelf_z, shelf_t = 0.40, 0.07
    put(box(w - brick * 2, d, shelf_t, z=shelf_z), "body")
    put(box(w, d, brick, z=h - brick / 2), "body")
    base = shelf_z + shelf_t / 2
    if contents == "papyrus":
        # The priest's library: rolls in a cedar rack, and every one of them LIES ALONG X. A roll stood on
        # end is a disc, and the shelf docstring already records what a disc in a dark opening reads as —
        # a hole. Lying along X it is a bar with a round end showing, and the end is the part the brief
        # wants clay-sealed, so that is the half worth keeping visible.
        #
        # THREE SHORT ROLLS ACROSS, not one long one per shelf. A single roll spanning the opening is a
        # rail, and the rack already has rails; what says "many documents" is the repeated end-circle, so
        # the width is spent on count rather than on length.
        #
        # The openings are TIGHT. By this primitive's own formula the usable height is
        # (0.78 - 0.105) - (0.435 + 0.105) = 0.135 upstairs and 0.155 down, so a roll is 0.05 of radius
        # and there is room for exactly one course. Two courses were tried and the upper one was cut in
        # half by the lip.
        for lvl, z0 in ((0, 0.105), (1, base + 0.062)):
            for rx in (-0.32, 0.0, 0.32):
                roll = put(cyl(0.05, 0.28, x=rx, y=-0.01, z=z0, verts=12), "cloth")
                roll.rotation_euler = (0, math.radians(90), 0)
                # A TIE round the middle of each, which is how a roll is kept shut and is the one thing
                # separating this from a stack of dowels. Proud of the roll by more than a hairline, or
                # `prim_mask`'s law says it disappears into the seam.
                tie = put(cyl(0.056, 0.03, x=rx, y=-0.01, z=z0, verts=12), "accent")
                tie.rotation_euler = (0, math.radians(90), 0)
        # ONE UNROLLED, and it lies ON the shelf rather than hanging off the front of it. Hung outside the
        # carcass it left the frame — the invariant `prim_jarrack` states, that contents stay inside the
        # frame's bounds so both renders get the same camera — and at 0.30 tall it read as a crate stuck
        # to the side. Lying on the course it is a pale sheet against mudbrick, which is all it has to be.
        put(box(0.30, 0.20, 0.014, x=0.33, y=-0.01, z=h + 0.007), "cloth")
        unrolled = put(cyl(0.038, 0.30, x=0.33, y=0.07, z=h + 0.038, verts=12), "cloth")
        unrolled.rotation_euler = (0, math.radians(90), 0)
    elif linen:
        # Upper level: two stacks of folded sheets, and a rolled bolt lying along X beside them. The bolt
        # lies rather than stands for `prim_lamp`'s reason about pointing at the viewer: a cylinder on end
        # in an opening is a disc, and a disc in a dark gap is a hole.
        put(box(0.40, 0.24, 0.055, x=-0.28, z=base + 0.028), "cloth")
        put(box(0.36, 0.22, 0.05, x=-0.30, z=base + 0.081), "cloth")
        bolt = put(cyl(0.055, 0.34, x=0.28, y=-0.02, z=base + 0.055, verts=12), "cloth")
        bolt.rotation_euler = (0, math.radians(90), 0)
        # Lower level: three sheets stacked, each a little smaller, which is what says folded rather than
        # one block — the offsets are bigger than the thicknesses on purpose.
        put(box(0.56, 0.26, 0.075, x=-0.24, z=0.038), "cloth")
        put(box(0.50, 0.24, 0.065, x=-0.28, z=0.108), "cloth")
        put(box(0.44, 0.22, 0.06, x=-0.22, z=0.170), "cloth")
        put(box(0.30, 0.24, 0.20, x=0.30, y=-0.01, z=0.10), "cloth")
        # The mirror case, flat on the top course: a disc and its handle, the one metal thing here.
        put(cyl(0.15, 0.032, x=0.30, y=-0.01, z=h + 0.016, verts=20), "metal")
        put(box(0.20, 0.06, 0.028, x=0.06, y=-0.01, z=h + 0.014), "metal")
    else:
        # Upper level: two mud-stoppered storage pots, sized to the room the lip really leaves.
        room = (h - brick - lip) - (base + lip)
        for x in (-0.33, -0.02):
            jar(x, -0.02, room / 1.15, 0.10, z=base)
        # Lower level: folded linen, stacked.
        box(0.52, 0.24, 0.11, x=-0.28, z=0.055)
        box(0.46, 0.22, 0.10, x=-0.31, z=0.16)
        cyl(0.12, 0.23, x=0.29, y=-0.01, z=0.115, verts=16)
        # The tally ostracon, lying on the top course.
        tilt(box(0.26, 0.20, 0.03, x=0.34, y=-0.01, z=h + 0.015), 7, "X")
    return join_all()


def prim_chest():
    """Reed baskets and a rope-handled crate stacked together, a stoppered jar on the crate.

    The lid is SLID BACK, not tipped up on its hinge: a tilted lid is a pale plane wider than the crate
    itself and the eye reads the whole thing as a table, where a lid pushed back leaves a dark slot at
    the front that says ajar in three pixels. The crate is also shallower than a crate really is (0.38
    on 0.70), so its front face outweighs the top face the shear reveals."""
    cw, cd, ch = 0.70, 0.38, 0.46
    box(cw, cd, ch, x=-0.30, z=ch / 2)
    box(cw + 0.04, cd * 0.76, 0.05, x=-0.30, y=cd * 0.17, z=ch + 0.025)
    jar(-0.32, -0.02, 0.24, 0.11, z=ch + 0.05)
    # Two reed baskets beside it, the smaller stacked on the larger, each with its lid on.
    cyl(0.19, 0.28, x=0.34, y=0.01, z=0.14, verts=20)
    cyl(0.21, 0.04, x=0.34, y=0.01, z=0.30, verts=20)
    cyl(0.15, 0.22, x=0.31, y=-0.03, z=0.42, verts=20)
    cyl(0.17, 0.04, x=0.31, y=-0.03, z=0.55, verts=20)
    return join_all()


def prim_brazier():
    """A shallow clay dish on three splayed legs, cold ash in it, one unburnt stick across the rim.

    A round dish on legs reads as a TABLE unless two things are true: the legs splay out past the dish
    so the tripod is part of the silhouette, and the ash sits low enough inside that a ring of rim shows
    all round it. The ring has to be a tenth of the object wide to survive the slot, which is what sets
    the dish at 0.34 against ash at 0.24 — a rim any thinner measured three pixels and the dish came
    back as a solid disc.

    Wide and low, so the shear reveals a lot of TOP and it lands portrait at --scale=1 whatever the real
    object does. Its size is set at import, not here."""
    if arg("contents") == "censer":
        # The priest's, and it HANGS — a censer swung on chains, not a dish on legs. So it shares nothing
        # with the tripod below except being a vessel, and the frame has to hold a stand to hang it from
        # or the thing floats: a prop's shadow is its own footprint flattened, and a bowl in mid-air over
        # a footprint reads as hovering however the shadow is tuned (`sun_offset`).
        #
        # The STAND is a shepherd's crook of a post: upright, with an arm reaching out in X. It reaches in
        # X because that is the only horizontal axis there is — an arm built along y would draw as a
        # vertical stub, which is `prim_sconce`'s whole docstring.
        post_h = 0.92
        mark(cyl(0.115, 0.045, x=-0.26, z=0.022, verts=16), "metal")
        mark(cyl(0.035, post_h, x=-0.26, z=post_h / 2, verts=10), "metal")
        arm = mark(cyl(0.028, 0.34, x=-0.10, z=post_h - 0.02, verts=10), "metal")
        arm.rotation_euler = (0, math.radians(90), 0)
        # THREE CHAINS drawn as two: the third hangs behind the bowl and the shear stacks it into the
        # same drawn column as the front pair, so modelling it costs geometry for nothing. Each is a thin
        # bar, because a real chain is finer than a pixel here and what has to read is the SUSPENSION.
        bowl_z = post_h - 0.34
        for cx in (-0.055, 0.055):
            mark(box(0.016, 0.016, 0.26, x=0.06 + cx, y=0.0, z=bowl_z + 0.16), "metal")
        # The bowl: a flared cone, rim ring proud of it, and the smoke. Flared HARD for `prim_basin`'s
        # reason — a wall leaning only 30 degrees off vertical renders as dark as the chains and the
        # vessel merges with its own interior.
        bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.075, radius2=0.17, depth=0.13,
                                        location=(0.06, 0, bowl_z))
        mark(recalc_outward(bpy.context.object), "metal")
        mark(cyl(0.18, 0.035, x=0.06, z=bowl_z + 0.065, verts=24), "metal")
        mark(cyl(0.135, 0.03, x=0.06, z=bowl_z + 0.055, verts=20), VOID)
        # SMOKE IS PAINT, and this is the one place in the file where modelling something made it worse.
        # Three tapering drums stacked over the rim came back as a tiered finial and the whole prop read
        # as a street lamp — regular, opaque and solid, which are the three things smoke is not. Geometry
        # can only offer smoke a silhouette, and a smoke silhouette is exactly what does not exist.
        #
        # What is left is ONE low dome sitting in the rim: enough of a shape for the repaint to have
        # somewhere to start a plume, and small enough that it reads as burning incense if the paint says
        # nothing. Same reasoning as the flame nubs elsewhere in the file, one step further — those keep a
        # cone because a flame does have an outline.
        smoulder = cyl(0.10, 0.05, x=0.06, y=0.0, z=bowl_z + 0.085, verts=14)
        smoulder.scale = (1.0, 0.85, 1.0)
        bpy.ops.object.transform_apply(scale=True)
        mark(smoulder, "accent")
        return join_all()
    leg_h, foot_r = 0.24, 0.22
    for i in range(3):
        a = math.radians(90 + i * 120)
        leg = cyl(0.035, leg_h + 0.04, x=math.cos(a) * foot_r, y=math.sin(a) * foot_r, z=leg_h / 2, verts=8)
        leg.rotation_euler = (math.radians(math.sin(a) * 11), math.radians(-math.cos(a) * 11), 0)
    bpy.ops.mesh.primitive_cone_add(vertices=28, radius1=0.17, radius2=0.34, depth=0.18, location=(0, 0, leg_h + 0.09))
    ash = cyl(0.25, 0.10, z=leg_h + 0.20, verts=24)
    ash.scale = (1.0, 1.0, 0.6)
    tilt(box(0.34, 0.04, 0.04, y=-0.07, z=leg_h + 0.23), 9)
    # --lit is the nobleman's, whose brazier is burning where the merchant's is cold. The flame is
    # modelled only because it is the one place the ochre accent is allowed and a prompt can put paint
    # only where there is a shape. It is a NUB and never a cone: a sharp triangle a fifth of the object
    # tall is the most salient thing in the picture, and it has turned a lamp into a rocket twice in
    # this file already (`prim_lamp`, `prim_sconce`).
    if arg("lit"):
        bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=0.075, radius2=0.0, depth=0.12,
                                        location=(0, -0.01, leg_h + 0.29))
    return join_all()


def prim_lamp():
    """An oil lamp and the thing it stands on: `--contents=stool` is the merchant's low wooden stool,
    `--contents=stand` the nobleman's tall bronze stand. The lamp itself is the same object at both ranks,
    which is `prim_niche`'s pattern and why the second rank cost no model.

    Nothing on this may point at the VIEWER. A pinched spout modelled along -Y draws, under the shear, as
    a cone hanging straight down off the saucer, and the first scaffold read as a flying saucer with a
    nose cone. The spout goes out along X, where the projection leaves it alone.

    The flame is modelled rather than left to the repaint because it is the one place the ochre accent is
    allowed, and a prompt can only put paint where there is already a shape. But it is a NUB and not a
    cone: a sharp triangle a fifth of the object tall is the most salient shape in the picture. The lamp
    is a straight cylinder for the same reason — a flared saucer overhangs its own base and the black
    crescent of its underside was bigger than the lamp.

    Two things about the STOOL, both about the seat's top face, which is the shape that eats this prop. A
    seat 0.26 deep put 40% of the drawn height into one featureless pale rectangle and read as a wall with
    legs; at 0.16 it is 22% and reads as a seat. And whatever stands on that seat must OVERHANG its front
    edge, because a dish sitting wholly within the seat draws its own pale top INSIDE a pale rectangle of
    the same value and the eye reads the dark side wall as a hole in the furniture rather than as a bowl.
    Hanging the lamp over the front breaks the seat's top-to-front boundary, which is the one edge in the
    picture that says which surface is which.

    The STAND is that rule again with nothing to hide behind. A single shaft is 8 units wide in a 56 unit
    cell, so the width has to come from the FOOT and the DISH, and the two of them are what the eye gets:
    splayed feet at the bottom, a saucer wider than the shaft at the top, and one collar in the middle so
    the shaft is not a single unbroken line. Every part of it is marked `metal` — the whole point of the
    rank's row is that this one is bronze and the merchant's is wood, and a scaffold that does not say so
    comes back as another wooden stool."""
    contents = arg("contents", "stool")
    stand = contents == "stand"
    part = "metal" if stand or contents == "tree" else None

    def put(obj):
        return mark(obj, part) if part else obj

    if contents == "tree":
        # The pharaoh's LAMP TREE: one stem, three arms, a shallow shade over each wick. It is the only
        # lamp in the file that is not one flame, and the count is the whole difference — a single saucer
        # on a taller stand is the nobleman's object at a bigger size.
        #
        # THE ARMS REACH IN X, all three of them, because that is the only horizontal axis. An arm swung
        # out along y would draw as a vertical stub growing out of the stem, which is the failure
        # `prim_sconce`'s docstring is entirely about. So the tree is FLAT: a candelabrum seen edge-on,
        # which is also how tomb painting draws one.
        foot_r, stem_h = 0.24, 0.90
        bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=foot_r, radius2=0.05, depth=0.16,
                                        location=(0, 0, 0.08))
        foot = bpy.context.object
        foot.scale = (1.0, 0.55, 1.0)  # ELLIPTICAL, for the depth-tax reason this primitive records above
        bpy.ops.object.transform_apply(scale=True)
        put(recalc_outward(foot))
        put(cyl(0.035, stem_h, z=stem_h / 2, verts=12))
        put(cyl(0.09, 0.035, z=0.20, verts=16))
        # Three lights: the centre one on the stem itself and one at each end of a cross-arm, the outer
        # pair set LOWER so the group reads as a tree rather than as a bar. Each is a saucer, a shade over
        # it, and a NUB of flame between — never a cone, by the law four primitives here have paid for.
        arm_z = stem_h - 0.16
        bar = put(cyl(0.026, 0.62, z=arm_z, verts=10))
        bar.rotation_euler = (0, math.radians(90), 0)
        # EVERY LIGHT GETS A RISER, the centre one included, and leaving it off is what floated it: the
        # outer pair stand on the arm and were given a stalk up to their saucers, while the centre sat at
        # stem_h + 0.18 with nothing under it — the stem stops at stem_h. `--spin` did not cause it and
        # arithmetic did not catch it; the piece count in Step 2's gate did, in one command.
        for lx, lz in ((-0.31, arm_z), (0.31, arm_z), (0.0, stem_h - 0.14)):
            put(cyl(0.022, 0.17, x=lx, z=lz + 0.075, verts=8))
            saucer = put(cyl(0.105, 0.045, x=lx, z=lz + 0.16, verts=18))
            saucer.scale = (1.0, 0.8, 1.0)
            bpy.ops.object.transform_apply(scale=True)
            bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=0.05, radius2=0.0, depth=0.075,
                                            location=(lx, -0.01, lz + 0.215))
            mark(bpy.context.object, "accent")
            # The SHADE, and it is what makes this the pharaoh's: alabaster over each wick, a dome the
            # flame sits under. Marked pottery rather than metal so the repaint gets the two told apart —
            # `prim_niche`'s lesson about a scaffold arriving already sorted.
            shade = cyl(0.085, 0.055, x=lx, z=lz + 0.28, verts=16)
            shade.scale = (1.0, 0.85, 1.0)
            bpy.ops.object.transform_apply(scale=True)
            mark(shade, "pottery")
        return join_all()

    if stand:
        # A FLARED TRUMPET FOOT, not a tripod, and FLATTENED IN DEPTH.
        #
        # Two failures, and the second is the one worth keeping. Splayed legs are `prim_brazier`'s answer
        # to a vessel that reads as a table, but they buy almost no width: `tilt` turns a part about its
        # own centre, so a leg 0.20 long reaches 0.07 and the widest thing in the prop stayed the saucer.
        # A cone opening downward is one primitive and as wide as it is told to be.
        #
        # But a ROUND foot 0.44 across still landed 33 of 56, because the shear TAXES DEPTH INTO HEIGHT:
        # the drawn height is not the object's z extent but max(z + k*y) - min(z + k*y), so 0.44 of depth
        # adds 0.31 of drawn height and eats the width it just bought. Every round-footed prop pays this;
        # this one cannot afford it, having no width anywhere else. So the foot is an ELLIPSE — wide in x,
        # 0.55 of that in y — which costs nothing, because the projection only ever draws one view.
        #
        # The cone is built radius1-wide, which is the orientation Blender winds outward; see
        # `recalc_outward` for what the other way round costs.
        foot_r, shaft_h = 0.26, 0.38
        bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=foot_r, radius2=0.06, depth=0.20,
                                        location=(0, 0, 0.10))
        foot = bpy.context.object
        foot.scale = (1.0, 0.55, 1.0)
        bpy.ops.object.transform_apply(scale=True)
        put(foot)
        put(cyl(0.10, 0.04, z=0.20, verts=16))
        put(cyl(0.038, shaft_h, z=0.20 + shaft_h / 2, verts=12))
        # One collar, so the shaft is not a single unbroken stroke at slot size.
        put(cyl(0.062, 0.045, z=0.20 + shaft_h * 0.45, verts=12))
        h = 0.20 + shaft_h
        # The stand's lamp IS its saucer, one wide dish and not a small one standing in a big one: at
        # 0.095 inside a 0.17 saucer the lamp was a bump on a plate, two pale discs of one value.
        lamp_x, lamp_y, dish_r, spout_x = 0.0, 0.0, 0.17, 0.178
    else:
        top_h, leg, w, d, h = 0.045, 0.04, 0.36, 0.16, 0.30
        box(w, d, top_h, z=h - top_h / 2)
        for sx in (-1, 1):
            for sy in (-1, 1):
                box(leg, leg, h - top_h, x=sx * (w / 2 - leg), y=sy * (d / 2 - leg), z=(h - top_h) / 2)
        lamp_x, lamp_y, dish_r, spout_x = -0.02, -0.04, 0.095, 0.13
    # The spout OVERLAPS the rim. At the merchant's 0.13 on a 0.095 dish it clears by 0.018 and reads as
    # a pinched lip, but the same clearance on the stand's 0.17 saucer read as a flame floating beside the
    # lamp. Its own number per rank, and the merchant's is left at 0.13 to the digit: the geometry a master
    # was painted over cannot move afterwards or the mask cuts a shape the art no longer fills.
    put(cyl(dish_r, 0.05, x=lamp_x, y=lamp_y, z=h + 0.025, verts=20))
    put(box(0.075, 0.05, 0.03, x=spout_x, y=lamp_y, z=h + 0.03))
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.028, radius2=0.0, depth=0.055,
                                    location=(spout_x, lamp_y, h + 0.075))
    if stand:
        mark(bpy.context.object, "accent")
    return join_all()


def prim_pillar():
    """A rough timber prop leaning against the roof it holds up, wedges hammered in at its foot.

    Its top is out of frame on purpose, so it fills the slot's height. Standing it plumb made it 20
    units wide in a 56 unit cell and read as a turned column; the 12 degree LEAN is what makes it a
    makeshift prop and it is also the only thing that buys width. The post is rotated about its middle
    and then slid back by sin(lean)*h/2, so the foot still lands where it started.

    NO STONE PAD, and the reason generalises to every prop: a WIDE FLAT SLAB lying at floor level casts
    a shadow of its own silhouette directly beneath itself, because this projection draws a footprint
    0.7*depth lower than the thing that made it and a slab has almost no height to separate the two. The
    eye stacks them and reads a two-tier plinth. --sun cannot help — it shifts the footprint sideways in
    depth, not out from under a shape as wide as the shadow it makes. A pad also added nothing the brief
    asked for; the wedges are what it names, and they are chunky here so they survive the slot."""
    post_h, lean = 2.0, 12.0
    bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=0.155, radius2=0.115, depth=post_h,
                                    location=(math.sin(math.radians(lean)) * post_h / 2, 0, post_h / 2))
    bpy.context.object.rotation_euler = (0, math.radians(lean), 0)
    for sx in (-1, 1):
        tilt(box(0.20, 0.13, 0.10, x=sx * 0.20, y=sx * 0.03, z=0.05), sx * 16)
    return join_all()


def prim_palm():
    """The nobleman's palm column: a tapered shaft, a bound collar, a palm-frond capital.

    NOT `prim_pillar`. That is the merchant's makeshift timber prop, leaning on wedges, and the brief
    gives this rank a dressed column with a painted capital — a different object at the same slot, which
    is the mistake `art-tasks.md` warns about.

    ITS TOP IS OUT OF FRAME, like the timber prop's, and for the same reason: a column runs floor to
    ceiling and the slot is 56x84. What is drawn is the shaft and the collar; the capital is only
    suggested by the fronds beginning at the top edge, because a capital drawn whole would push the
    shaft down to a stump.

    STANDING PLUMB IS THE PROBLEM the leaning prop does not have. A vertical cylinder at 56 units wide
    is a featureless pale bar — `prim_pillar` records that a plumb post read as a turned column, which is
    exactly what is wanted here and leaves nothing for the eye. So the width has to be earned by the
    COLLAR and the fronds: rings of bound cord at the base and shoulder, and the frond tips splaying past
    the shaft's own width, which is the one thing that says palm rather than pipe.

    The taper is real and shallow — a palm trunk narrows going up, and at 0.16 to 0.13 over the drawn
    height it is about three pixels of difference, which is the most the slot can carry.

    THE CROWN SETS THE WIDTH, and the first pass got it wrong in a way worth recording: a slim shaft with
    the fronds at 54 degrees landed the whole prop 25 units wide in a 56 unit cell — under half a cell,
    which reads as a pole in the distance rather than a column in the room. Nothing about the shaft can
    fix that, because the import fits the OBJECT to the slot and the object was tall and narrow. Splaying
    the fronds to 66 degrees and shortening the shaft is what widens the silhouette."""
    if arg("contents") == "banded":
        # The pharaoh's column, and it is the plainest shape in the set on purpose: a dressed shaft with
        # bands round it, no frond and no sheaf. What makes it his is the GILDING and the cartouche the
        # repaint puts on the bands, which is paint — so the geometry's whole job is to offer the bands.
        #
        # A plumb cylinder is a featureless pale bar; both columns above record it. The palm buys width
        # from fronds and the sheaf from lobes, and this one has neither, so it buys it from a TAPER wide
        # enough to read plus bands standing proud. It is the narrowest of the three and that is correct:
        # dressed stone at this rank is meant to look cut, not bundled.
        sh = 1.66
        bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=0.20, radius2=0.155, depth=sh,
                                        location=(0, 0, sh / 2))
        mark(bpy.context.object, "body")
        # Three bands, and the middle one is the cartouche band the brief names. Proud of the shaft by
        # more than a hairline — `prim_mask`'s law — or they read as a change of colour in the stone
        # rather than as a moulding the paint can carry a name on.
        for z, r, t in ((0.13, 0.225, 0.075), (0.80, 0.205, 0.115), (1.50, 0.185, 0.075)):
            mark(cyl(r, t, z=z, verts=20), "metal")
        return join_all()
    if arg("contents") == "papyrus":
        # The priest's papyrus-BUNDLE column: a sheaf of stems bound at top and bottom, not one drum.
        #
        # The lobes are what this variant is for. A plumb cylinder is a featureless pale bar — the
        # failure `prim_pillar` and the palm above both record — and the palm buys its width from
        # fronds it can splay. A papyrus column has no crown in frame to splay, so the width has to come
        # out of the SHAFT, and a ring of stems gives a scalloped silhouette instead of a straight edge.
        #
        # EIGHT stems, of which five ever draw: the back three stack into the same drawn column as the
        # front ones under the shear. They are modelled anyway because the silhouette's outer edge is
        # made by the two at the sides, and dropping the back row shifts the ring's centre.
        sh = 1.62
        for i in range(8):
            a = math.radians(i * 45)
            stem = cyl(0.062, sh, x=math.cos(a) * 0.105, y=math.sin(a) * 0.105, z=sh / 2, verts=10)
            mark(stem, "body")
        # The BINDINGS, wider than the sheaf so they read as cord tied on rather than as a step in the
        # stone — the palm's collars below make the same point and set these radii.
        for z, r in ((0.16, 0.20), (1.44, 0.195)):
            mark(cyl(r, 0.075, z=z, verts=18), "cloth")
            mark(cyl(r * 0.96, 0.03, z=z + 0.06, verts=18), "cloth")
        # The CLOSED BUD, and only its lower third is in frame — same rule as the palm's capital, whose
        # docstring records that a capital drawn whole pushes the shaft down to a stump. A closed bud is
        # WIDER than the sheaf and swells before it narrows, so what shows at the top edge is the swell,
        # which is the one silhouette a palm capital cannot be mistaken for.
        bpy.ops.mesh.primitive_uv_sphere_add(segments=18, ring_count=10, radius=0.235, location=(0, 0, 1.74))
        bud = bpy.context.object
        bud.scale = (1.0, 1.0, 1.35)
        bpy.ops.object.transform_apply(scale=True)
        mark(bud, "body")
        return join_all()
    shaft_h = 1.55
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.16, radius2=0.13, depth=shaft_h,
                                    location=(0, 0, shaft_h / 2))
    mark(bpy.context.object, "body")
    # Bound cord: two collars, one at the foot and one at the shoulder. Wider than the shaft, so they
    # read as something tied ON rather than as a change in the stone.
    for z, r in ((0.14, 0.185), (1.62, 0.175)):
        mark(cyl(r, 0.075, z=z, verts=16), "cloth")
        mark(cyl(r * 0.97, 0.03, z=z + 0.06, verts=16), "cloth")
    # The fronds, splaying from the shaft's top. Each is built with its BASE at its own object origin —
    # `tilt` turns a part about its centre, and rotating a frond about its middle threw all six of them
    # off the column into the air. Base at the origin, then Y to tip it out and Z to spin it round, is
    # the only arrangement where the join stays put.
    #
    # NOCAST on all six: they are three metres up a column, and this projection's shadow is a flattened
    # copy, which laid six separate dashes on the floor around the foot.
    for i in range(6):
        frond = box(0.10, 0.055, 0.62)
        frond.data.transform(Matrix.Translation((0.0, 0.0, 0.31)))
        frond.location = (0.0, 0.0, shaft_h - 0.06)
        frond.rotation_euler = (0.0, math.radians(66), math.radians(i * 60 + 15))
        mark(frond, NOCAST)
    return join_all()


def prim_falsedoor():
    """The nobleman's shrine: a miniature false-door stela with an offering table set before it.

    A FALSE DOOR IS A RECESS, so `prim_niche`'s rule carries over unchanged and is the whole reason this
    is modelled: the recessed panel's floor draws ABOVE its front lip, because depth going back is depth
    going up. Asked for in words a generator draws the recess receding to a vanishing point, which is
    photographically correct and wrong here. What differs from the niche is the shear — this stands on
    the floor at k = 0.7 rather than hanging on a wall at 0.5 — and that it is TALL rather than wide.

    THE TABLE IN FRONT IS THE HARD PART, and it is `prim_market`'s grain heap again from the other side.
    A slab set before the door overlaps it in the drawn picture, and under z + k*y anything nearer the
    viewer draws LOWER — so the table lands over the door's base and hides exactly the part that says
    recess. It is therefore kept LOW and SHALLOW: a slab on two short piers, its top well below the
    recess floor, so the door's own sill still reads above it.

    Three registers of sunk relief are what a real false door has. At 56 units they are three horizontal
    bands and nothing finer, which is what the jambs and the lintel courses provide — the carving is
    paint, as it was for the stela."""
    w, d, h, brick = 0.66, 0.30, 1.32, 0.085
    lip = 0.35 * d
    # The stela: a back slab, two stepped jambs, a sill and a lintel, hollow between them.
    mark(box(w, brick, h, y=(d - brick) / 2, z=h / 2), "body")
    for sx in (-1, 1):
        mark(box(brick * 1.5, d, h, x=sx * (w / 2 - brick * 0.75), z=h / 2), "body")
        # the outer step, which is what makes a false door read as a doorway rather than a niche
        mark(box(brick, d * 0.7, h * 0.92, x=sx * (w / 2 + brick * 0.4), z=h * 0.46), "body")
    mark(box(w, d, brick * 1.4, z=brick * 0.7), "body")
    mark(box(w, d, brick * 1.6, z=h - brick * 0.8), "body")
    # A drum roll over the opening, and a cavetto slab on top: the two things that say false DOOR.
    roll = mark(cyl(brick * 0.9, w * 0.92, x=0, y=-d * 0.1, z=h - brick * 1.9, verts=12), "body")
    roll.rotation_euler = (0, math.radians(90), 0)
    mark(box(w + brick * 1.2, d + 0.03, brick * 1.1, z=h + brick * 0.55), "body")
    # The offering table: LOW and shallow, its top below the recess floor so the sill still reads.
    top_z = brick * 1.4 + 0.13
    mark(box(w * 0.62, d * 0.52, 0.05, y=-d * 0.62, z=top_z), "body")
    for sx in (-1, 1):
        mark(box(0.05, 0.05, top_z - 0.02, x=sx * w * 0.22, y=-d * 0.62, z=(top_z - 0.02) / 2), "body")
    # One loaf and a jar on it, coarse enough to survive the slot.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=0.055, location=(-0.10, -d * 0.62, top_z + 0.05))
    loaf = bpy.context.object
    loaf.scale = (1.3, 1.0, 0.7)
    bpy.ops.object.transform_apply(scale=True)
    mark(loaf, "accent")
    jar(0.10, -d * 0.62, 0.17, 0.048, z=top_z + 0.025, part="pottery")
    return join_all()


def prim_sealedchest():
    """The nobleman's chest: one sealed box, a banded lid, wax seals on a knotted cord.

    NOT `prim_chest`, which is the merchant's baskets-and-crate. The brief gives this rank a single sealed
    chest with painted panels, and one object is a harder silhouette than three: there is nothing beside it
    to give it scale or to break its outline.

    WHAT MAKES A BOX READ AS A CHEST is a line across it, and the first pass learned that a lid you can
    see in three-quarter view is invisible in the tile. An overhanging lid, feet, a proud front lip — all
    of them were there in the preview and none survived the shear, because the shear turns the lid's top
    into one pale field and the body's front into one darker field, and a box has exactly that boundary
    whether it opens or not. So the line is a BAND: a strip round the body's top in `metal`, which is a
    different colour and not a different orientation. `mark` is how the geometry offers a line the shear
    cannot flatten away.

    The feet stay, for `prim_pillar`'s reason: a box flat on the floor has its footprint directly beneath
    it and joins the ground, where four short feet leave a visible gap under the body.

    Shallower than it is wide, again for `prim_chest`'s reason: a deep box gives the shear a big pale top
    face and the whole thing reads as furniture rather than as a container.

    The cord is coarse on purpose — at 0.02 it is one pixel at slot size, so it is 0.045 and reads as a
    strap — and the seal stands in FRONT of it, not behind: behind, the strap split the seal in two."""
    w, d, h, foot = 0.72, 0.40, 0.40, 0.055
    if arg("contents") == "cavetto":
        # The pharaoh's chest, and the only thing that changes is the LID: a cavetto cornice instead of a
        # flat overhang, which is the one profile this rank puts on everything it owns. The carcass, the
        # band and the feet are the nobleman's unchanged — this docstring's whole point is that the line
        # across a box is what says chest, and that line is still there.
        #
        # No cord and no seal. His chest is inlaid rather than tied shut, so the strap the sealed variant
        # spends its width on is spent here on the cornice's own step, and the cartouche is paint.
        mark(box(w, d, h, z=foot + h / 2), "body")
        mark(box(w + 0.03, d + 0.03, 0.035, z=foot + h), "metal")
        # The cavetto: a flare that is WIDER AT THE TOP, built as two steps rather than a curve because a
        # curve of 0.06 is under a pixel at slot size and costs a cone that has to be wound outward.
        mark(box(w + 0.05, d + 0.03, 0.045, z=foot + h + 0.040), "body")
        mark(box(w + 0.11, d + 0.05, 0.035, z=foot + h + 0.080), "body")
        mark(box(w + 0.13, d + 0.06, 0.028, z=foot + h + 0.111), "body")
        for sx in (-1, 1):
            for sy in (-1, 1):
                mark(box(0.07, 0.07, foot, x=sx * (w / 2 - 0.07), y=sy * (d / 2 - 0.07), z=foot / 2), "body")
        # The INLAID PANEL, sunk into the front. It is a marked recess and not a painted rectangle,
        # because a repaint cannot put a border on a flat face and have it stay put: `prim_chest`'s band
        # makes the same argument one axis over.
        mark(box(w * 0.62, 0.03, h * 0.52, y=-(d / 2) - 0.004, z=foot + h * 0.50), "accent")
        return join_all()
    mark(box(w, d, h, z=foot + h / 2), "body")
    # The band that says lid. A colour change, because an edge is not one — see the docstring.
    mark(box(w + 0.03, d + 0.03, 0.035, z=foot + h), "metal")
    # The lid, overhanging on every side so it steps out at the corners as well.
    mark(box(w + 0.05, d + 0.04, 0.06, z=foot + h + 0.048), "body")
    for sx in (-1, 1):
        for sy in (-1, 1):
            mark(box(0.07, 0.07, foot, x=sx * (w / 2 - 0.07), y=sy * (d / 2 - 0.07), z=foot / 2), "body")
    # The cord: over the lid, down over its front lip, with a seal where it crosses.
    mark(box(0.045, d + 0.06, 0.05, x=-0.06, z=foot + h + 0.088), nocast("cloth"))
    # It stops HALFWAY DOWN the face, and that is a --spin lesson (pipeline Step 1b). A part standing
    # proud of a front face is moved in Y by the spin, and Y feeds the drawn vertical — so at 0.78 of the
    # body's height the strap's drawn foot dropped past the chest's own base once the chest was turned 27
    # degrees, and hung under it like a loose stick. Nothing was wrong with it square-on, which is exactly
    # why the spin has to be chosen before the master is painted.
    mark(box(0.045, 0.05, h * 0.55, x=-0.06, y=-(d / 2 + 0.045), z=foot + h * 0.80), nocast("cloth"))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.058,
                                         location=(-0.06, -(d / 2 + 0.085), foot + h * 0.58))
    seal = bpy.context.object
    seal.scale = (1.0, 0.5, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    mark(seal, nocast("accent"))
    return join_all()


def prim_basin():
    """The stand two ranks share: three splayed legs, a collar, and `--contents` for what stands in it.

    `--contents=jar` (the merchant) is a pointed water jar; `--contents=bowl` (the nobleman) is an open
    ablution basin with a thick rim. One primitive for both because `prim_niche` proved the pattern: the
    stand is the same at both ranks and only the vessel differs, so the second rank costs a repaint and
    not a model.

    Three things this had to learn, in the order the previews showed them:

    THE LEGS SPLAY. `prim_brazier` records why — a round vessel on straight legs reads as a table, and
    what fixes it is the feet standing outside the vessel's own width, so the tripod is part of the
    silhouette rather than hidden behind it.

    THE VESSEL SITS IN THE COLLAR, not on it. `jar()` tapers to a POINT, and resting that point on a flat
    ring drew an egg balancing on a pin: the contact was one pixel wide, and a shape whose contact you
    cannot see reads as floating however solid the mesh is. So the collar is a short drum WIDER than the
    jar's waist and the jar sinks into it past its taper — the contact the eye gets is a fat overlap. The
    drum is solid rather than bored out because nothing sees its top: under the shear the jar's own belly
    covers it, and a boolean would cost geometry for a face that never renders.

    IT HAS TO BE WIDE ENOUGH TO BE SEEN. `seat_and_normalise` makes every object exactly one tall, so a
    tall narrow prop is scaled by its HEIGHT and lands well inside the slot's 56 — the first pass came
    out 32 wide and read as spindly. Short legs and a fat belly, and it lands near 50."""
    contents = arg("contents", "jar")
    if contents == "pool":
        # The priest's SACRED POOL: a hole cut in the floor, LINED, with water in it.
        #
        # THE OPENING HAS TO BE MOST OF THE PICTURE, and getting that wrong is what cost this prop four
        # rolls. Under z + k*y a hole of depth d draws a band only k*d tall, so at d = 0.30 the opening
        # was 0.21 of an object a full unit wide — a dark stripe across a low box, which is exactly how
        # every return drew it: a bench, a tank, a tray. Nothing in the prompt can argue a thin stripe
        # into being a pool. The opening is now 0.62 deep, so it draws 0.43 tall and is the largest thing
        # in the frame, which is what a pool in a floor actually looks like from here.
        #
        # AND NOTHING TALL MAY STAND BESIDE IT. A jar was added to put an object of known size on the
        # paving, and it stole the frame: at 0.30 tall it set the drawn height and squeezed the opening
        # into a third of what it should be. `seat_and_normalise` scales by height, so the tallest thing
        # in a prop decides how big everything else is drawn. A hole's tile cannot afford a neighbour.
        pw, pd, k = 0.92, 0.62, 0.7
        depth = k * pd
        # THE LINING, and it is the pool rather than the floor: far wall and both side walls dropping
        # from the paving to the bottom. They have to belong to the POOL because the floor is omitted
        # from the mask — a wall that belonged to the floor would be cut away with it and the tile would
        # lose the one surface that says how deep this is.
        # THE WATER IS THE OPENING, and this is the whole trick — everything else here was built twice
        # before arriving at it.
        #
        # A horizontal plane spanning the hole draws as a band exactly k*pd tall, which IS the opening's
        # drawn extent. So one water plane at the rim fills the hole corner to corner with nothing left
        # to see through, and there is no need for a bottom or for walls dropping to one.
        #
        # Both of those were tried. Walls plus a water slab left the near half of the opening open to the
        # backdrop, because the near lip draws lower than the water does. Adding a bottom to close it put
        # geometry BELOW the near lip, where `prim_pit`'s law says nothing may go — and it did not merely
        # waste mesh, it showed, as a pale lip hanging under the hole. Then the interior was fully visible
        # and the thing read as a box with its front cut off.
        mark(box(pw, pd, 0.03, z=-0.015), "water")
        # A shallow band of wet stone above the waterline at the back, and nothing more. It is the only
        # depth cue this needs: the far lip is stone, the rest is water.
        mark(box(pw, 0.05, 0.07, y=(pd - 0.05) / 2, z=0.0), "body")
        # STEPS crossing the near lip, which is what proves a hole is a hole — `prim_pit`'s ladder does
        # the same job. They start ABOVE the paving and walk down through the waterline, so the eye has
        # to read them as descending into something.
        # They stop INSIDE the drawn opening. Walked down to -0.21 the lowest tread fell past the near lip,
        # and `prim_pit`'s law says nothing may: it left a hole in the picture where neither step nor floor
        # covered, 100 by 14 pixels of backdrop showing through. Four shallow treads inside the band read
        # as descending perfectly well.
        for sw, sz in ((0.34, 0.028), (0.29, -0.012), (0.24, -0.052), (0.19, -0.092)):
            mark(box(sw, pd * 0.26, 0.038, x=-(pw - sw) / 2 + 0.04, y=-pd * 0.24, z=sz), "body")
        # A KERB ALL FOUR WAYS ROUND, the near side included.
        #
        # It was left off the near edge on purpose once, reasoning that a rim across the front is what
        # makes a hole read as a container. That was the wrong lesson from the right observation: what
        # made the early rolls read as a tub was the object having an OUTSIDE, not its having a coping.
        # Open at the front the water simply stopped in mid-air with nothing to stop it, and a border
        # broken on the one side facing the viewer reads as unfinished rather than as open. A temple pool
        # is coped all the way round, which is also what the reference now shows.
        #
        # The near length is drawn in FRONT of the water — nearest the camera, so it occludes the water's
        # bottom edge — which is exactly what a coping does and what the missing edge was asking for.
        #
        # ALL FOUR LENGTHS END FLUSH, so the coping's outline is a clean 1.04 by 0.74 rectangle and
        # `--context`'s opening can be cut to exactly that. The near and far lengths used to run 0.06
        # past the sides, which left four tabs poking out at the corners; harmless while the paving
        # stopped short of the coping, and a z-fighting overlap the moment the two became coplanar.
        for sx in (-1, 1):
            mark(box(0.06, pd + 0.12, 0.045, x=sx * (pw + 0.06) / 2, z=0.022), "body")
        for sy in (-1, 1):
            mark(box(pw + 0.12, 0.06, 0.045, y=sy * (pd + 0.06) / 2, z=0.022), "body")
        pool = join_all()
        # THE COPING'S TOP IS THE FLOOR, so the whole pool drops until it is at z=0.
        #
        # Nothing about the object changes — this is a uniform translation, and `seat_and_normalise`
        # removes it again — but z=0 is where `--context` lays the paving, so moving it moves the FLOOR.
        # Built with the paving at the water's rim the kerb stood a finger proud of it and the first
        # painted return read exactly as that: a framed slab lying ON the floor, with its own shadow
        # under it, rather than an opening cut INTO the floor. A temple pool's coping is a course of kerb
        # bedded flush, and flush is also what stops the tile reading as a picture hung on a wall.
        #
        # Which leaves nothing standing above the paving, so this prop casts NOTHING and is imported with
        # no `--seat`. That is the same rule `prim_pit` follows and for once with no exception to it:
        # the pit keeps a seat because its spoil lies on the floor beside the hole, and there is no
        # equivalent here — every part of this is at or below the paving.
        pool.data.transform(Matrix.Translation((0.0, 0.0, -0.0445)))
        return pool
    # The nobleman's basin is SHALLOW, so its stand is tall: a squat vessel on short legs is scaled by
    # its width and lands about 48 high in an 84 slot, which wastes the tallest thing on the floor.
    leg_h = 0.45 if contents == "bowl" else 0.30
    foot_r, belly = 0.26, 0.21
    for i in range(3):
        a = math.radians(90 + i * 120)
        leg = mark(cyl(0.042, leg_h + 0.06, x=math.cos(a) * foot_r, y=math.sin(a) * foot_r, z=leg_h / 2, verts=8), "body")
        leg.rotation_euler = (math.radians(math.sin(a) * 15), math.radians(-math.cos(a) * 15), 0)
    if contents == "bowl":
        # A truncated cone opening upward, a rim ring of its own, and a VOID disc for the water.
        #
        # The rim is a RING several pixels thick and not the edge between two faces, because the brief
        # paints that rim and a repaint cannot put a band of colour on a crease. The interior is a hole
        # by `prim_pit`'s marker rather than a boolean: VOID renders near-black and casts nothing, which
        # is what the inside of an open vessel looks like from above, and it costs one primitive.
        # FLARED hard — 45 degrees, not 30. The rig lights by face angle, and a wall that leans only
        # 30 degrees off vertical renders as dark as the legs do, so the vessel and its black interior
        # merged into one mass under a pale rim. At 45 the wall catches light and reads as a dish.
        rim_r, basin_h = 0.28, 0.16
        # A HUB the legs meet, and without it they meet nothing. The bowl is a cone that narrows going
        # down, so at the height the leg tops reach — radius 0.194, once the 15 degree splay has pulled
        # them in — the cone is only 0.155 across, and the legs pass OUTSIDE it: three struts beside a
        # bowl rather than under it. Widening the cone's base instead would flatten the flare back toward
        # vertical, which is the shading failure recorded below.
        #
        # A ring stand is how the object is really built anyway, and it is what the merchant's jar variant
        # already has in its collar. Same construction at both ranks now.
        mark(cyl(0.21, 0.07, z=leg_h, verts=18), "body")
        # A cone whose radius2 exceeds its radius1 comes out of Blender with its side normals pointing
        # INWARD, so it renders near-black: the first bowl was a dark cauldron under a pale rim, and the
        # material slots said "pottery" throughout — only the low-pitch preview showed it. Turning the
        # cone over does NOT fix it, because the normals turn with the geometry; `recalc_outward` does.
        bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=rim_r * 0.45, radius2=rim_r, depth=basin_h,
                                        location=(0, 0, leg_h + basin_h / 2))
        mark(recalc_outward(bpy.context.object), "pottery")
        mark(cyl(rim_r * 1.06, 0.045, z=leg_h + basin_h, verts=24), "pottery")
        # PROUD of the rim ring, not inside it. A disc set below the ring is covered by it — a `cyl`
        # is a solid drum and not a hoop — and the basin renders as a stool with a lid.
        # WATER, not a void. `nocast` because it lies inside the vessel and touches no floor — the bowl
        # casts the footprint, and the water is above it. The geometry is unchanged from when this was
        # VOID: the disc is in the same place, so the MASK is byte-identical and only the paint differs.
        mark(cyl(rim_r * 1.06 - 0.055, 0.014, z=leg_h + basin_h + 0.026, verts=24), nocast("water"))
        rim_r = rim_r * 1.06
        rim_z = leg_h + basin_h
    else:
        # The collar: a drum the jar sinks into past its taper, and only just wider than the belly.
        #
        # `jar()` tapers to a POINT, and resting that point on a flat ring drew an egg balancing on a pin:
        # the contact was a pixel wide, and a shape whose contact you cannot see reads as floating however
        # solid the mesh is. Sunk in, the contact is a fat overlap. And the drum is 1.02 of the belly and
        # not 1.10 — at 1.10 its top face was a pale ellipse wider than the jar and the pair read as an
        # egg on a stool, which is `prim_brazier`'s failure in a new place. Solid, not bored: under the
        # shear the belly covers the top, so a boolean would buy a face nothing renders.
        mark(cyl(belly * 1.02, 0.10, z=leg_h - 0.01, verts=18), "body")
        jar(0.0, 0.0, 0.62, belly, z=leg_h - 0.10, part="pottery")
        rim_r = belly
        rim_z = leg_h + 0.62 * 0.42
    # The dipper, hung at the widest point so it OVERHANGS the outline. `prim_lamp`'s rule: a cup wholly
    # inside a pale shape is a dark spot in it and reads as a hole in the pottery, not a second object.
    mark(cyl(0.075, 0.09, x=rim_r + 0.03, y=-0.03, z=rim_z, verts=12), "pottery")
    mark(box(0.09, 0.03, 0.026, x=rim_r - 0.02, y=-0.03, z=rim_z + 0.04), "pottery")
    return join_all()


def prim_mat():
    """A reed mat lying flat on the floor — one thin sheet, and nothing else.

    THE ONE PROP WHOSE IDENTITY IS PAINT, not geometry, and that is a finding rather than a shortcut.
    Under this projection a flat thing on the floor has no silhouette, which is the wall
    tile-art-brief.md hits with floor scatter. Three shaped designs were rendered and measured before
    this one:

    1. Flat sheet with a roll behind it. All top face — two pale bands of one value, nothing between
       them to say mat rather than slab.
    2. The roll stood on its end. That gains a front elevation, but a cylinder upright is drum-shaped
       whatever is painted on it, and at 50 units it read as one of the crate's reed baskets.
    3. The sheet with its edges FOLDED. A fold at the NEAR edge is invisible, and the rule is general:
       lifting the front edge raises its z, but as the flap swings up its tip travels back toward the
       hinge, and under z + 0.7y the two terms nearly cancel — 0.016 of drawn height for 0.13 of real
       lift. Relief at the FRONT of any prop is free to model and impossible to see. Only the far edge
       gains from both, and a far-edge fold draws as one more pale band above the sheet.

    ITS OWN THICKNESS IS THE TRAP. The sheet is a box, and a box has a side: spun on the floor, the shear
    draws that edge as a dark band down one side, and a dark band down one side of a flat thing reads as
    the thing being RAISED off the floor rather than lying on it. At 0.055 on a 0.95-wide sheet that band
    is only a couple of pixels in the slot and it was still the first thing anyone noticed. Keep a floor-
    lying sheet as thin as the mesh allows, and let the paint carry the edge instead of the geometry.

    So the sheet is left alone and the weave carries it: a coarse checker of eight squares across is
    about 6 units apiece at slot size, which survives where a spiral or a frayed straw does not. What
    geometry still owes the prop is a shape that is not a FLOOR TILE, and --spin is what buys that — a
    rug lying askew of the grid cannot be read as part of the paving, and it costs one flag."""
    box(0.95, 0.72, 0.055, z=0.0275)
    return join_all()


def prim_rubbleheap():
    """A heap of broken mudbrick, one brick still whole — the ROOM's rubble, not the scatter's.

    `rubble` is two objects sharing one name (SiteMapView's STANDING_VARIANT). The scatter layer lays a
    spill on cells the player WALKS OVER, so that one has to stay flat enough to walk through. This is
    the other one: a room's dressing lands on an empty claimed cell nobody can walk on, so it is free to
    stand up and be walked around. Knee-high is the point of it, and would be nonsense underfoot.

    Step 0 of the pipeline files rubble under "cloth, heaps, scatter — still unsolved". That is right
    about SAND and wrong about this: a merchant's rubble is broken MUDBRICK, and a brick is a box.

    What the heap has to beat is `prim_mat`'s finding — a flat thing on the floor is all top face and
    has no silhouette. So the heap is built with real height, and the height is put at the BACK: under
    z + 0.7y a piece one unit further back draws 0.7 higher, so mass behind the centre buys drawn height
    twice over where the same mass in front buys almost none.

    NO BASE UNDER IT. The first version stood the bricks on two flattened blocks meant to read as a
    mound of mortar; they drew as a clean rectangular plinth with rubble sitting on it, because a big
    box is a big box whatever it is called. The mound has to BE the bricks.

    EVERY PIECE IS ROLLED OFF LEVEL, not merely turned on the floor. Yaw alone leaves every top face
    parallel to every other and the pile reads as stacking — as a wall being built rather than one that
    fell. A few degrees about Y is what says the pieces came to rest where they landed.

    Sizes are a real mudbrick's proportions, roughly 2 : 1 : 0.6, so the pieces read as brick rather
    than gravel: at slot size a whole brick is about 14 units, the smallest thing that still says brick.
    The mortar dust and the sherd scatter are PAINT, like the mat's weave — geometry that small does not
    survive the slot."""
    if arg("contents") == "spill":
        """A spill of broken mudbrick underfoot — the SCATTER layer's brick, not the room's.

        The third object sharing this name, and the one with the least to work with. `rubblePile` stands
        knee-high on a cell nobody can reach and is free to have a silhouette; this lies on the cells the
        player WALKS OVER, so it has to stay flat enough to walk through — a heap in the middle of a
        passage is a wall, not a decoration.

        Which means `prim_mat`'s finding applies in full and cannot be worked around: a flat thing on the
        floor is all top face and has no outline of its own. The heap answers that by putting mass at the
        BACK, where z + k*y draws it twice over. A spill cannot: any height it gains is height the player
        appears to walk through.

        So the silhouette is spent OUTWARD instead of upward. Fourteen pieces spread over a full cell and
        a half rather than eight piled into a third of one, with the outline deliberately ragged — a
        long, broken, uneven edge is a shape even when nothing in it is more than a finger tall. Each
        piece still keeps a little height, and that is not decoration either: at 0.05 a fragment draws a
        front face and a footprint of its own, so a dozen of them give a dozen small edges, and that
        texture is what stops the whole thing reading as a stain.

        NOTHING STANDS UP. `--contents=plaster` leans two shards against its pile because a room's
        dressing may; here they would be the one thing the player's feet pass through."""
        # Denser where it fell and thinning outward, with pieces OVERLAPPING near the middle. Spread
        # evenly the first pass read as fourteen bricks someone had set down, not as one thing that
        # broke: what says spill is that the eye finds a body to it and a scatter around the edge.
        for sx, sy, x, y, z, yaw, roll in (
            # the body — overlapping, close, the middle of the fall
            (0.26, 0.14, -0.20, -0.04, 0.026, -11, 4),
            (0.22, 0.13, -0.05, -0.14, 0.026, 24, -5),
            (0.28, 0.15, 0.10, 0.00, 0.028, -6, 6),
            (0.24, 0.13, 0.26, -0.11, 0.026, 17, -3),
            (0.25, 0.14, -0.30, 0.10, 0.028, 8, -6),
            (0.21, 0.12, 0.02, 0.14, 0.024, -19, 4),
            (0.27, 0.14, 0.30, 0.09, 0.028, 31, -7),
            # the scatter — smaller, further out, thinning
            (0.20, 0.12, -0.48, -0.14, 0.024, -28, 5),
            (0.19, 0.11, 0.50, 0.00, 0.022, -9, 5),
            (0.14, 0.10, -0.60, 0.10, 0.020, 42, -4),
            (0.13, 0.09, 0.62, 0.16, 0.020, -37, 6),
            (0.11, 0.08, -0.12, 0.30, 0.018, 15, -3),
            (0.10, 0.08, 0.42, -0.28, 0.018, -22, 4),
            (0.09, 0.07, -0.40, -0.28, 0.016, 33, -5),
        ):
            # BUILT AT THE ORIGIN, TURNED, THEN PLACED — and that order is the whole reason the pieces
            # rest on the floor. `tilt` pivots about the world origin (see its docstring), so a fragment
            # placed at x=0.62 and then rolled 7 degrees is lifted 0.075 clear of the ground: nearly twice
            # its own height, and the footprint underneath it stayed where the floor is. It read as brick
            # hovering over its own shadow, and no --sun value could have fixed it, because nothing was
            # wrong with the shadow.
            #
            # The two branches below keep the old order. Their masters were painted over what it really
            # does, and moving the geometry now would leave the masks cutting shapes the art no longer
            # fills.
            piece = box(sx, sy, z * 2)
            tilt(piece, roll, "Y")
            tilt(piece, yaw, "Z")
            piece.location = (x, y, z)
        return join_all()
    if arg("contents") == "plaster":
        # The nobleman's rubble is a PLASTER FALL, and a fall is not a heap. Plaster comes off a wall in
        # thin painted sheets that land face-up and slide, so the pieces are a third the thickness of a
        # brick and lie nearly flat, spread wide rather than stacked into courses.
        #
        # That costs the drawn height a heap gets from putting mass at the BACK, so the silhouette has to
        # come from somewhere else: the sheets are given a real ROLL, five to fifteen degrees off level,
        # which is what a curved plaster flake does when it lands and is the only relief a flat thing can
        # own under this projection (`prim_mat` — a flat thing on the floor is all top face).
        #
        # Two upright shards leaning against the pile are the exception, and they are what stops the whole
        # thing reading as a stain. Their painted faces are the point of the kind.
        for sx, sy, x, y, z, yaw, roll in (
            (0.30, 0.22, -0.30, -0.06, 0.018, -12, 7),
            (0.26, 0.20, 0.01, -0.12, 0.018, 21, -9),
            (0.28, 0.21, 0.30, -0.02, 0.018, -6, 11),
            (0.24, 0.19, -0.13, 0.12, 0.055, 34, -14),
            (0.27, 0.20, 0.19, 0.15, 0.055, -18, 8),
            (0.20, 0.16, -0.38, 0.16, 0.052, 9, -6),
        ):
            piece = box(sx, sy, 0.035, x=x, y=y, z=z)
            tilt(piece, yaw, "Z")
            tilt(piece, roll, "Y")
        for x, y, lean, yaw in ((-0.06, 0.05, 58, -22), (0.13, 0.02, -47, 15)):
            shard = box(0.23, 0.035, 0.20, x=x, y=y, z=0.10)
            tilt(shard, yaw, "Z")
            tilt(shard, lean, "Y")
        return join_all()
    B = 0.30  # a whole brick's length
    # (length, width, height, x, y, z, yaw, roll). Fixed rather than random: a primitive that renders
    # differently every run cannot be judged against its last roll.
    pieces = [
        # the bed — wide, low, overlapping, and reaching back
        (B * 0.9, 0.15, 0.09, -0.22, 0.00, 0.045, -8, 4),
        (B * 0.8, 0.14, 0.09, 0.02, -0.04, 0.045, 14, -6),
        (B * 0.7, 0.15, 0.09, 0.25, 0.02, 0.045, -19, 5),
        (B * 0.6, 0.13, 0.08, -0.30, 0.09, 0.05, 26, -3),
        (B * 0.9, 0.15, 0.09, 0.10, 0.13, 0.05, -5, 7),
        # the second course, drawn higher by being further back as well as by z
        (B * 0.55, 0.14, 0.09, -0.14, 0.09, 0.14, 17, -11),
        (B * 0.75, 0.15, 0.09, 0.09, 0.06, 0.15, -12, 8),
        (B * 0.45, 0.13, 0.08, 0.28, 0.14, 0.14, 22, -5),
    ]
    for sx, sy, sz, x, y, z, yaw, roll in pieces:
        piece = box(sx, sy, sz, x=x, y=y, z=z)
        tilt(piece, yaw, "Z")
        tilt(piece, roll, "Y")
    # The one whole brick: full length, on top of the crown where nothing crops it, tipped so it reads
    # as come to rest rather than as laid.
    # The whole brick IS the crown, rather than a tenth piece balanced on one. A separate crown sat
    # behind it at nearly the same DRAWN height — z + 0.7y makes a piece further back climb to meet
    # whatever is in front of it — so it hid behind the brick instead of supporting it, and the heap
    # showed a clear gap of magenta between its top and the course below. Judge contact in the sheared
    # projection, never in world space: two pieces that touch in Blender need not touch on the page,
    # and two that are far apart in y can land on top of each other.
    whole = box(B, 0.15, 0.095, x=-0.04, y=0.14, z=0.19)
    tilt(whole, -14, "Z")
    tilt(whole, 6, "Y")
    return join_all()


def prim_pit():
    """A cellar shaft cut through the floor, a pole laid across its far lip and a rope ladder over it.

    A HOLE IN THE FLOOR IS EXACTLY ONE PARALLELOGRAM DEEP, and everything below that is wasted mesh.
    Under z + k*y the ground in FRONT of the opening draws lower and lower as it comes toward the
    viewer, so it covers the shaft below the near lip's own line. Work the drawn extents: the far lip
    (y=+d/2, z=0) draws at +k*d/2, the near lip (y=-d/2, z=0) at -k*d/2, so the opening is a band k*d
    tall — and a vertical far wall of height exactly k*d fills it top to bottom and stops where the
    near lip is. One unit deeper and the extra is behind the floor the sprite is composited onto.

    That is why the shaft is a WALL and not a well: `hv = k * d`, and no near wall, no bottom, no
    sides. A shaft modelled as a hollow box shows the OUTSIDE of its near wall under the lip, which
    reads as a crate standing on the floor rather than as a hole in it.

    The dark comes from the NORMAL, not from the paint. That far wall faces the viewer, so it shades
    like any front face and the repaint is only asked to take it further down — which a generator will
    do for a shape that is already there, and will not do for one that is not.

    NOTHING IS BUILT ROUND THE MOUTH, and four renders were spent learning it. This shear has no
    convergence — it moves points up, never inward — so anything laid round a rectangular hole stays a
    rectangle on the page: a coping on all four sides read as a window with a sill, the same under a
    raised cross-bar read as a doorway with a lintel, and a kerb in front and behind read as a SHELF,
    because two pale bars with a dark slot between them is what `prim_shelf` is. The floor tile the
    sprite is composited onto is the rim. All this has to draw is the hole, what lies loose at its
    edge, and what hangs into it.

    NOTHING RUNS ALONG -Y. A rope taken back over the lip to a stake draws as a vertical post, because
    a bar lying in depth images as drawn height and nothing else; one render grew three fence posts out
    of the rim. `prim_lamp`'s spout rule, one axis over: nothing may point at the viewer, and nothing
    may run away from him. So the ladder hangs from a pole laid ACROSS the mouth, along X.

    `--contents=plain` LEAVES THE WAY DOWN OUT, and that is a rule about meaning rather than about
    modelling: a staircase is a way to the floor below and the player can take it, where a pit is
    scenery they cannot. A hole with a ladder in it makes the same offer a stairwell makes, and only
    one of the two is real. The SPOIL carries the reading on its own — it already lies over the near
    lip and the corners, which is what says "opening" rather than "dark rectangle".

    NO FOOTPRINT. Import this with --shadow=0 and no --seat: `make_shadow` flattens the object to z=0
    and pushes it toward the viewer, so a pit's footprint is a second dark parallelogram lying in front
    of the first one, and the tile reads as two holes. A hole casts nothing."""
    w, d = 0.94, 0.66  # the opening
    k = 0.7  # the shear this set is drawn at; the shaft's visible height is a function of it
    hv = k * d
    # The shaft: the far wall alone, exactly filling the drawn opening, and the only VOID part of any
    # primitive — everything else here is stone in the rank's own colour.
    mark(box(w, 0.05, hv, y=(d - 0.05) / 2, z=-hv / 2), VOID)
    # The spoil: what came out of the shaft, lying at its near edge and over the corners, so the mouth
    # has no straight side left. Drawn BELOW the hole, where this projection puts anything in front.
    for sx, sy, x, y, yaw in (
        (0.26, 0.13, -0.44, -0.40, -9),
        (0.22, 0.12, 0.44, -0.42, 13),
        (0.20, 0.12, -0.58, -0.16, 66),
        (0.18, 0.12, 0.57, -0.10, -58),
    ):
        mark(tilt(box(sx, sy, 0.08, x=x, y=y, z=0.04), yaw, "Z"), "body")
    if arg("contents") == "plain":
        return join_all()
    # The pole laid across the far lip, and the ladder over it. Coarse on purpose — at 56 units across
    # the opening a rope of 0.03 is two pixels and the ladder becomes a smudge.
    rope_y = (d - 0.05) / 2 - 0.055
    pole = mark(cyl(0.05, w - 0.06, x=0, y=d / 2 + 0.01, z=0.05, verts=12), NOCAST)
    pole.rotation_euler = (0, math.radians(90), 0)
    for sx in (-1, 1):
        mark(box(0.05, 0.05, 0.10 + hv, x=sx * 0.25, y=rope_y, z=(0.10 - hv) / 2), NOCAST)
    for i in range(3):
        mark(box(0.55, 0.055, 0.055, y=rope_y, z=-0.09 - i * 0.15), NOCAST)
    return join_all()


def prim_gate():
    """A ward gate across a passage: `--contents=shut` has the grille down, `--contents=open` has it sunk
    into the threshold it stands on.

    IT IS DRAWN FOR THE BOUNDARY between the gate's square and the one in front of it — the map halts the
    player on the approach and stands this across the mouth (`SiteMapView`, `useSiteNavigation`) — so it
    is a thing seen face on across a corridor, and the whole of the job is that the two states read apart
    at 56 units.

    IT IS A GRILLE, AND THAT IS WHY IT NEEDS NO REPAINT. Every other tile in this set is a Blender render
    sent out to be painted, because flat-shaded stone is a slab of one colour and the repaint is what puts
    limestone in it. Bars have nothing to paint: a steel upright is a straight edge and a single value,
    which is exactly what the renderer already draws, so the render IS the tile and the master is the
    Python. The boarded leaf this replaced is the half that wanted paint, and it is gone.

    THE OPENING IS EMPTY, NOT VOID, and that is the one decision here that is not obvious. Every other
    hole in this set marks its inside VOID so it renders near-black; a gate must not, because an OPEN
    gate drawn that way is a black rectangle standing in a lit corridor, and the passage it has just
    stopped blocking is exactly what the player should now see through it. The gaps BETWEEN the bars are
    the same argument while it is shut, and they can be transparent safely because this tile stands on
    the APPROACH: what shows between them is the corridor the player is already in, never the sealed
    pocket whose tier is the thing being kept back (`cellFloorAt`).

    A LINTEL IS THE POINT, where `prim_pit` had to keep one out. Anything crossing a mouth reads as a
    lintel, which cost that primitive four renders to learn as a hazard; here it is the read being asked
    for, so the mouth is crossed deliberately and the jambs are what it lands on.

    BARS RUN IN X, the one axis drawn honestly, so their spacing is the spacing the player sees; in y or
    z they would be a stack of lines. At 56 units an upright lands near 3px and a gap near 4, the
    narrowest a grille can be and still read as one — a hairline is a gap, and here that law is being
    USED rather than worked around.

    THE GRILLE IS ALSO WHAT KEEPS THE TILE OFF `tile-stats`' "too dark" complaint without a correction
    flag. A solid leaf read 36 below the slab it stands on; the bars give the floor back between them and
    the tile lands at a median of 81 against a slab band of 87-114, the closest anything in this set gets.

    THE CAVETTO IS SHALLOW IN Y, and that is its whole tuning. Its top face is the one horizontal plane up
    there and takes the light square on, so a course built the full thickness of the wall laid the
    brightest band on the entire floor — brighter than the paving, the walls and every prop beside it.
    """
    k = 0.7
    opening, jamb, d = 0.66, 0.13, 0.22
    h = 1.02  # jamb height; the lintel sits on top of it
    half = opening / 2 + jamb / 2
    span = opening + 2 * jamb
    # BOTH open facings: there is one opened drawing, so `open-side` must match here too.
    open_gate = arg("contents", "").startswith("open")

    if open_gate:
        # OPENED, THE WHOLE GATE HAS GONE DOWN — frame and all, not just the grille. A ward that has been
        # paid for should leave a corridor you can walk, and jambs and a lintel left standing in the
        # passage go on saying "barred" long after the bar is lifted: at 56 units a doorway IS its frame,
        # so keeping the stonework kept the obstacle.
        #
        # What is left is the slot the gate went into: a bar of dark metal lying flush in the threshold,
        # the width of the opening. Not nothing at all — the player has to be able to see where the ward
        # stood, and the map's own sill is laid across this same seam — but nothing that stands up out of
        # the floor. The two facings need no separate drawing for this: a slot has no depth to collapse.
        mark(box(0.86, 0.10, 0.045, z=0.022), "metal")
        return join_all()

    if arg("contents", "").endswith("-side"):
        # THE SAME GATE IN A WALL THAT RUNS UP THE PAGE, for a passage walked across — half of them.
        #
        # NARROW AND TALL, which is the whole of it, and the first attempt got it backwards. This gate's
        # plane is the y-z one: its width runs in DEPTH and its height in z, so `drawn = (x, z + k*y)`
        # gives it no horizontal extent at all and piles the passage's whole width onto its height. A
        # side gate built as wide as the face-on one is therefore not a side view of anything — it is the
        # face-on gate again, one size down, which is exactly how it read on the map.
        #
        # So it is drawn the shape the projection actually makes: a tall narrow panel standing in the
        # seam between two columns, which is SIDE_W — a quarter of a cell — where the face-on gate spans
        # a whole one. That difference in silhouette is what tells a player which way a passage runs,
        # and it is the same trade `prim_stair` makes at `--contents=down-side`: not a truthful
        # projection of the object, but the one drawing that still says what the object is.
        #
        # ONE BAR, because that is what a grille seen from the side IS. The uprights of a portcullis stand
        # in a row across the passage, so edge-on they line up behind one another and the whole rank
        # draws as a single upright — a second bar beside it would be a second GATE, not a second bar.
        # Five went to three, three to two, and each step was still drawing the face-on gate at a smaller
        # size; one is the count the view actually has.
        #
        # WHICH IS WHY THE MODEL IS SMALL. With one upright there is nothing to be wide for: the panel is
        # the wall's own thickness, SIDE_W, a quarter of a cell, and at 0.12 it lands near that. The
        # earlier cuts were wide enough to keep bars apart and read as doorways because of it.
        w, thick = 0.12, 0.16
        # A pier at the head and one at the foot — the jambs of a north-south wall stand north and south
        # of the opening, so in the picture they stack rather than flank.
        mark(box(w + 0.07, thick, 0.12, z=0.06), "body")
        mark(box(w + 0.07, thick, 0.14, z=0.92), "body")
        grille_h = 0.76
        mark(box(0.05, thick * 0.55, grille_h, z=grille_h / 2 + 0.12), "metal")
        # The drawbar, edge-on too: a stub either side of the upright rather than a bar across a row.
        mark(box(w + 0.05, thick * 0.45, 0.07, z=0.50), "metal")
        return join_all()

    # A pad under each jamb rather than a sill across the whole doorway: the opening has to reach the
    # floor or there is nothing to walk through. Parts overlap by ~0.03 rather than butting.
    for sx in (-1, 1):
        mark(box(jamb + 0.06, d, 0.05, x=sx * half, z=0.025), "body")
        mark(box(jamb, d, h, x=sx * half, z=h / 2 + 0.03), "body")
        # The socket the drawbar sits in: a proud block, not a recess. A recess must stand clear of the
        # face it cuts, and at this size a sunk one is simply not there.
        mark(box(jamb * 0.78, d * 0.45, 0.10, x=sx * half, y=-(d / 2) - 0.01, z=0.60 - k * ((d / 2) + 0.01)), "deep")
    # The threshold, kept SHALLOW in y so its top face draws as a line and not as a band.
    mark(box(opening + 0.04, d * 0.3, 0.035, z=0.018), "body")
    # The lintel across both jambs, and a cavetto over it — the one moulding that says EGYPTIAN doorway
    # at this size, and the only thing making the silhouette more than a rectangle.
    mark(box(span, d, 0.11, z=h + 0.055), "body")
    mark(box(span + 0.09, d * 0.42, 0.06, y=-(d * 0.25), z=h + 0.14 + k * (d * 0.25)), "body")

    proud = 0.05
    lift = k * proud

    # Five uprights, floor to lintel.
    bars, grille_h = 5, h - 0.10
    for i in range(bars):
        x = (i - (bars - 1) / 2) * (opening / bars)
        mark(box(0.052, d * 0.22, grille_h, x=x, y=-proud, z=grille_h / 2 + 0.05 + lift), "metal")
    # Two rails tying them together, and the drawbar long enough to reach the sockets in the jambs — a
    # bar that stops short of them is a stripe on a grille rather than a thing holding the gate shut.
    mark(box(opening + 0.02, d * 0.24, 0.05, y=-proud, z=0.93 + lift), "metal")
    mark(box(span * 0.94, d * 0.26, 0.09, y=-proud - 0.03, z=0.60 + k * (proud + 0.03)), "metal")
    return join_all()


def prim_exit():
    """The way out as a SHAFT OF LIGHT falling into the chamber — the marker a dungeon crawler uses to say
    "leave here", rather than an architectural way out.

    IT HAS NO FACING, which is the whole argument for it. A doorway has to be aimed: face on it needs the
    wall it is cut in, and walked across it becomes a narrow lit slot that reads as a column — `pillar`,
    which this set already draws. A shaft standing free on the floor is the same picture from every
    approach, so one drawing serves all four and there is nothing to aim.

    IT WIDENS UPWARD, because that is light coming DOWN through a hole rather than a post standing up. The
    first attempt tapered the other way in four stacked courses and read as a tiered stack of blocks: a
    stepped silhouette is a built thing, and light has no steps in it.

    WHICH MEANS CONES, AND CONES WIDENING UPWARD INVERT THEIR SIDE NORMALS — the laws table's entry, which
    `prim_basin` paid for. `cone` calls `recalc_outward` for exactly this case; without it the shaft
    renders near-black while its material slots read correctly the whole time.

    TWO VALUES, NOT ONE: a brighter CORE inside a wider HAZE. Rendered as a single slab of its own colour
    the shaft is a hard-edged block of pale, which is a pillar again — the core is what you see, the haze
    is what the dusty air does with it.

    IT IS THE ONE TRANSPARENT THING IN THE SET, deliberately. `flat_material`'s alpha carries through the
    import — the mask is the render's own alpha and the composite multiplies by it — so the paving and any
    drift on it still show through, which is what stops it reading as a solid post planted on the floor.

    The set is matte and has no glow anywhere, so nothing here is drawn being lit: the renderer lays its
    own pool at the foot (`NodeSprite.light`), the same way a stair's cresset is MOTIVATED in the tile and
    lit by the map.

    A BEAM ALONE IS NOT A MARKER, which is what shipping it proved. On the paving at 56 units it read as a
    pale cone on a pale disc — a drift of sand, a heap, anything conical — because nothing in it is BUILT
    and a player reads "somebody put that there" off built things. So a marker STONE stands in it: a low
    battered cippus with a sunk panel for its inscription, which is a thing that was placed, and the light
    is then what singles it out rather than what has to carry the whole meaning.

    THE STONE STANDS INSIDE THE SHAFT, which is only possible because the import ADDS the light layer
    rather than laying it over or under (`import-tile --glow`). Sharp has no depth buffer, so a composited
    layer has to be wholly in front of the paint or wholly behind it — and a beam centred on a marker is
    neither. Three arrangements were built to dodge that before the additive one: the stone in front of a
    beam, the stone in front of a disc, and a shaft slanted past it. Added, the stone inside the shaft is
    lit stone and nothing has to dodge.

    THE STONE IS PAINTED AND THE LIGHT IS NOT, which is why they are separate parts rather than one mesh.
    A repaint comes back opaque on magenta, so a painted beam is a post; the stone goes through the
    generator as any prop does and the light is rendered and added back at import (`--drop` here,
    `--glow` there). Everything of the light is `!nocast`: it stands on the floor in the picture but casts
    nothing on it.

    AND THE LAYER IS RENDERED DIM, because with an additive composite the SUM is what clips. The free
    beam's own 0.28 haze and 0.9 core saturate to a solid tan mass over the stone and take the glyph
    column with them; 0.18 and 0.26 leave the inscription readable through the light.
    """
    # The pool on the paving, which is what roots the shaft to the floor rather than leaving it hovering.
    # Flat and shallow: depth is taxed into height here as everywhere.
    mark(cyl(0.30, 0.02, y=-0.14, z=0.01, verts=24), "daylight!nocast")
    # The SHAFT, standing ON that pool and closing to a point above the pillar's cap. It is centred on the
    # stone rather than set behind it, which is only possible because the import ADDS this layer
    # (`--glow`): a beam composited over the paint would hide the marker, and one composited under it
    # would be hidden BY the marker, so every earlier arrangement had to dodge sideways and none of them
    # read. Added, the stone inside the shaft is simply lit stone.
    #
    # THREE NESTED CONES RATHER THAN ONE, which is how a flat material gets a falloff. One cone is a wedge
    # with a hard edge down each side and the same value all the way across, and next to the pool at its
    # foot — a single disc, soft because it is round — that wedge is the part that reads as a shape rather
    # than as light. Nested and added, the sum steps up toward the middle and the outermost edge is the
    # faintest thing in the tile, which is what an edge of light looks like.
    #
    # No brighter CORE part in it: the steps are all the same material, and it is the overlap that makes
    # the middle bright. A core of its own colour is a hard edge up the centre, and against an additive
    # composite that edge is where the sum clips first.
    for r in (0.30, 0.21, 0.13):
        mark(cone(r, 0.0, 1.30, y=-0.02, z=0.65), "haze!nocast")
    # MOTES IN THE BEAM WERE TRIED AND CUT, and the arithmetic is the whole answer. A tile is stored at
    # 2x, so a speck small enough to be a speck is two or three stored pixels and lands on ONE drawn — at
    # 56 units that is a single pixel of added light inside a cone that is already light, and it is not
    # visible at all. Enlarged until it was, it stopped being dust; moved off the shaft to keep clear of
    # the stone, it fell where the cone is thin enough that it read as dirt on the lens. Over the pillar
    # it was worse than invisible: additive, it brightens the glyph column, which is the one part of this
    # tile that has to stay legible.
    # The marker stone: a stepped base, a round shaft between two collars, and a cap.
    #
    # ROUND, and SHORT. A square post with a sunk panel in it read as a shrine cabinet — the panel is a
    # doorway at 56 units whatever is painted in it. A drum is the other failure and `prim_mat` recorded
    # it: a bare cylinder upright is a basket whatever is on it. What tells this from both is the
    # PROFILE — base, collar, plain register, collar, cap — which is a turned thing rather than a box or a
    # tube, and it is nothing like `prim_pillar`, whose timber post leans and leaves the frame.
    #
    # THE REGISTER BETWEEN THE COLLARS IS WHERE THE SYMBOLS GO, and leaving it smooth is deliberate: a
    # round face cannot be cut into without the relief going round with it, so the glyphs are PAINT and
    # what the geometry owes them is a clean band of a known height to sit in.
    y, r_low, r_high, h = -0.24, 0.105, 0.090, 0.62
    mark(box(0.30, 0.22, 0.055, y=y, z=0.0275), "body")
    mark(box(0.245, 0.18, 0.05, y=y, z=0.080), "body")
    mark(cone(r_low, r_high, h, y=y, z=0.105 + h / 2, verts=20), "body")
    for z in (0.130, 0.105 + h - 0.025):
        mark(cyl(0.128, 0.042, y=y, z=z, verts=20), "body")
    # The cap overhangs the collar under it, which is the one step that survives the slot.
    mark(cyl(0.126, 0.05, y=y, z=0.105 + h + 0.025, verts=20), "body")
    return join_all()


def _stair_torch(x, y, scale=1.0):
    """A cresset standing beside a stair mouth, and the reason the flight is graded at all.

    A hole gets no light — its walls stand in the y-z plane and draw as lines, so `--sun` has nothing
    to bite on and the three values down the treads are shading nobody asked for. A torch at the mouth
    gives them a SOURCE: the top tread is the one it reaches, and each one below is further from it.
    Same argument as `prim_lamp`, one step further: the light is not drawn here, it is MOTIVATED here,
    and the renderer lays its own pool on the floor (`LIT_DECORATIONS`).

    It stands OFF to one side rather than over the opening: anything crossing the mouth reads as a
    lintel, which `prim_pit` paid four renders to learn, and a post over a hole would be a handrail no
    part of this set has.
    """
    # SHORT, because `seat_and_normalise` scales the whole object to one unit tall: a cresset at head
    # height is the tallest thing in the frame and shrinks the hole it is meant to light. At 0.30 it
    # stands beside the mouth instead of over it.
    # `scale` exists because a painted tile's mask can never move. The flight that walks ACROSS was
    # painted over the full-height cresset and keeps it; the one coming toward the viewer took a
    # shorter one so the OPENING dominates the frame, which is what a painter draws when handed this.
    mark(cyl(0.030 * scale, 0.30 * scale, x=x, y=y, z=0.15 * scale, verts=10), "metal")
    mark(cyl(0.070 * scale, 0.08 * scale, x=x, y=y, z=0.33 * scale, verts=12), "metal")
    # The flame is a shape, not a light: an accent-coloured mass the repaint knows to burn.
    mark(box(0.085 * scale, 0.07 * scale, 0.11 * scale, x=x, y=y, z=0.42 * scale), "accent")


def prim_stair():
    """A flight of steps: `--contents=up` climbs away from the viewer, `--contents=down` descends toward him.

    THE TWO DIRECTIONS ARE NOT MIRROR IMAGES, and the projection is why. Drawn height is z + k*y, so a
    flight that RISES as it recedes separates twice over — every tread gains its own rise and 0.7 of its
    going — while one that DESCENDS as it recedes very nearly cancels: at a rise of 0.10 against a going
    of 0.12 the treads move 0.016 apart on the page and the flight draws as a smear. So a descending
    flight comes TOWARD the viewer, where the rise and the going add again.

    A FLIGHT HEAD-ON IS A STRIPED WALL, which is the first thing this cost. There is no third plane to
    show a staircase's side profile in, so pale tread, dark riser, pale tread is all the geometry says —
    and a wall of courses says exactly the same. What tells them apart is the PARAPETS: a stair cut
    between two walls, each climbing with it, gives the flight a silhouette that rises to one end, and a
    wall has no such shape. They also stop the treads reaching the frame's edges, which is what made the
    first render read as masonry filling the picture.

    NOTHING IS BUILT ROUND THE MOUTH of the descending one, for `prim_pit`'s reason: this shear moves
    points up rather than inward, so a kerb round a rectangular opening stays a rectangle on the page and
    reads as a window sill. The floor tile the sprite is composited onto is the rim, and the treads stay
    INSIDE the opening — a tread drawn below the near lip is a slab lying on the floor.

    NO FOOTPRINT on the descending one: a hole casts nothing, so import it with --shadow=0 and no
    --seat, exactly as a pit is. The climbing one stands on the floor and seats normally.
    """
    k = 0.7
    if arg("contents") == "down":
        w, d = 0.98, 0.92  # the opening
        hv = k * d
        # The shaft behind the steps: the far wall alone, filling the drawn opening, marked VOID so it
        # renders near-black before any paint reaches it.
        mark(box(w, 0.05, hv, y=(d - 0.05) / 2, z=-hv / 2), VOID)
        # Three treads walking down and forward INTO that dark, the top one level with the paving. The
        # rise and the going are set so the LAST one still draws above the near lip (-k*d/2): a tread
        # below that line is drawn in front of the hole and reads as a slab lying on the floor.
        for i in range(3):
            # Three values, one per tread: paving, stone in shade, and then the shaft's own dark, so the
            # last step is already going out of sight. That falloff is what a hole cannot get from the
            # lamp — its walls stand in the y-z plane and draw as lines, so no light reaches down it.
            mark(box(w - 0.10, 0.17, 0.05, y=(d / 2) - 0.19 - i * 0.17, z=-0.06 - i * 0.13), ("body", "deep", VOID)[i])
        _stair_torch(-(w / 2) + 0.02, (d / 2) - 0.10, scale=1.35)
        return join_all()

    if arg("contents") == "down-side":
        # THE SAME HOLE, WALKED ACROSS. A stairhead is a dead end and faces whichever way the player
        # came from — the four facings are almost evenly split over the world — and `--spin` cannot
        # give them: the shaft is a far wall FACING THE VIEWER, so turning it edge-on collapses it to a
        # black line and leaves the treads standing as vertical slabs. East and west are this one
        # mirrored in X, which IS a valid oblique view of the mirrored object and costs the renderer a
        # transform rather than a tile.
        w, d = 0.92, 0.62
        hv = k * d
        mark(box(w, 0.05, hv, y=(d - 0.05) / 2, z=-hv / 2), VOID)
        # Treads stepping down and to the LEFT, each one narrower into the dark. Width is drawn
        # honestly here — only x is horizontal — so the flight reads as going sideways rather than as
        # three bars stacked up the page.
        for i in range(3):
            mark(
                box(0.30 - i * 0.04, 0.20, 0.035, x=0.26 - i * 0.24, y=(d / 2) - 0.22, z=-0.05 - i * 0.08),
                ("body", "deep", VOID)[i],
            )
        _stair_torch((w / 2) - 0.02, (d / 2) - 0.04)
        return join_all()

    if arg("contents") == "up-side":
        # CLIMBING ACROSS, for a stairhead entered from the east or the west, and the mirror of it
        # serves the other side. The going runs in X, where width is drawn honestly, so the flight
        # reads as a staircase seen from the side — the one arrangement in this projection that shows a
        # stair's profile at all. The rise still draws vertically, so tread and riser alternate the way
        # they do climbing away.
        #
        # The parapets run along X too, one behind the flight and one in front of it. Under z + k*y the
        # back one draws HIGHER than the treads and the front one LOWER, which is what boxes the flight
        # in — a parapet at either END would be two vertical bars and say nothing.
        going, rise, w = 0.17, 0.10, 0.30
        for i in range(5):
            h = 0.06 + i * rise
            mark(box(going, w, h, x=-0.34 + i * going, y=0.0, z=h / 2), "body")
        # ONE parapet, at the BACK. The front one drew lower than everything it was meant to frame and
        # laid a pale band across the flight; behind it, it draws higher and reads as the wall the stair
        # is cut against.
        mark(box(going * 5.4, 0.10, 0.30, x=-0.34 + going * 2, y=(w / 2) + 0.05, z=0.15), "body")
        return join_all()

    # Climbing away between its parapets. Five treads, each set back and up; the top faces are the whole
    # of what reads, so the going is generous and the rise is what the shear multiplies.
    tread_w, going, rise = 0.56, 0.13, 0.085
    for i in range(5):
        h = 0.06 + i * rise
        mark(box(tread_w, going, h, y=-0.26 + i * going, z=h / 2), "body")
    # The parapets: one each side, climbing with the flight and standing a little proud of it, so the
    # silhouette is a shape that rises to one end rather than a rectangle of stripes.
    for sx in (-1, 1):
        mark(box(0.13, going * 5, 0.30, x=sx * (tread_w / 2 + 0.065), y=-0.26 + going * 2, z=0.15), "body")
        mark(box(0.13, going * 2.2, 0.46, x=sx * (tread_w / 2 + 0.065), y=-0.26 + going * 3.9, z=0.23), "body")
    return join_all()


def prim_sconce():
    """A bronze bracket on the wall with an oil lamp standing on it — the nobleman's.

    THE Y-Z PLANE COLLAPSES TO A VERTICAL LINE, and this is the finding a wall bracket exists to teach.
    Only x is drawn horizontally; y and z both feed the vertical. So ANY structure that lives in the
    plane of the wall's depth — a plate, an arm reaching out of it, a diagonal stay under that arm, the
    lamp on its end — draws as one vertical stack, however truthfully it is built. A bracket modelled the
    way a bracket really is cannot read as an arm reaching out; it reads as three small blobs above one
    another, and at 28 units that is a smudge.

    So the arm is turned into X. The plate is against the wall at one end and the arm runs ACROSS the
    band to the lamp, which is a cantilever a smith would frown at and the only version that reads. The
    brace under it is in the x-z plane for the same reason — a brace in y-z is invisible by construction,
    not merely small. `prim_lamp`'s spout rule is the same law one axis over.

    WIDTH COMES FROM THE ARM, and it has to, because the wall slot does not trim: `SLOTS.wall` is
    `seat: false`, so whatever frame the render hands over is what gets scaled into 56x28. A compact
    object needs `--margin` rather than a scale flag, and its own proportions have to be near the band's
    2:1 or the import squashes it.

    The lamp is the merchant niche's mass — a rounded body with a spout — because that is the one content
    shape proven to survive this band. The flame is a nub, not a cone: it exists so the repaint has a
    shape to put the ochre accent on, and a sharp triangle a fifth of the object tall turns a lamp into a
    rocket (`prim_lamp`).

    FOUR RANKS ON --contents, and the plate, the arm and the brace are the same in all of them because
    the y-z finding above applies to every one: `lamp` is the nobleman's bracket lamp, `chain` the
    priest's lamp hung on a chain, `mirror` the master's bronze mirror sconce, `crystal` the wizard's
    bracket with light and no lamp. What hangs on the end is the only difference, which is `prim_niche`'s
    pattern — the ranks that follow cost a repaint and not a model.

    The nobleman's numbers do not move. A master was painted over them, and the mask would cut a shape
    the art no longer fills.
    """
    contents = arg("contents", "lamp")

    def put(obj, name):
        # The nobleman's is left UNMARKED, exactly as it was painted; every later rank marks all of
        # itself, because `mark`'s rule is that a primitive marking any of itself has to mark the rest —
        # an unmarked part inherits whatever slot lands at index 0.
        return obj if contents == "lamp" else mark(obj, name)

    # The wall plate: flat against the wall, its own depth shallow so it does not out-draw the arm. Tall
    # enough for the brace to land ON it — the brace's foot has to meet the plate in the DRAWN picture,
    # and the two sit at different y, so the plate draws 0.07 higher than its own z and the brace 0.025.
    put(box(0.20, 0.07, 0.62, x=-0.42, y=0.14, z=0.53), "metal")
    # The arm, across the band, and the two pegs that fix the plate to the wall.
    put(box(0.80, 0.10, 0.10, x=-0.02, y=0.05, z=0.50), "metal")
    for z in (0.74, 0.32):
        put(box(0.11, 0.15, 0.07, x=-0.42, y=0.05, z=z), "metal")
    # The brace, in the x-z plane where a diagonal is drawn as a diagonal. In y-z it would be invisible by
    # construction rather than merely small.
    put(tilt(box(0.36, 0.07, 0.06, x=-0.22, y=0.05, z=0.40), -38, "Y"), "metal")
    if contents == "lamp":
        # The lamp standing on the arm's end: the niche's proven mass, its spout along X.
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.16, location=(0.26, 0.0, 0.68))
        body = bpy.context.object
        body.scale = (1.3, 0.9, 0.95)
        bpy.ops.object.transform_apply(scale=True)
        box(0.17, 0.08, 0.08, x=0.52, y=0.0, z=0.65)
        bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.065, radius2=0.0, depth=0.12, location=(0.26, 0.0, 0.88))
        return join_all()
    if contents == "chain":
        # The priest's: the lamp HANGS, two links below the arm. A chain is the one structure that may
        # run in z — it is drawn vertically because it IS vertical — but the band is 2:1, so there are
        # two links and not five, and the arm is where the width still comes from.
        for z in (0.44, 0.34):
            mark(box(0.05, 0.05, 0.07, x=0.30, y=0.0, z=z), "metal")
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.15, location=(0.30, 0.0, 0.22))
        bowl = bpy.context.object
        bowl.scale = (1.25, 0.9, 0.62)
        bpy.ops.object.transform_apply(scale=True)
        mark(bowl, "metal")
        # The spout and its flame go out along X, not up: above the bowl they sit under the chain, which
        # is the one place on a HANGING lamp that is already occupied.
        mark(box(0.16, 0.07, 0.07, x=0.46, y=0.0, z=0.21), "metal")
        bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.06, radius2=0.0, depth=0.13, location=(0.50, 0.0, 0.29))
        mark(bpy.context.object, "accent")
        return join_all()
    if contents == "mirror":
        # The master's mirror sconce: a DISC IN THE X-Z PLANE, which is the only orientation that draws
        # as a disc — flat against the wall it would be an ellipse, and in y-z it would be a line. The
        # lamp stands in front of it, small, so the disc is the shape and the flame is the incident.
        disc = mark(cyl(0.26, 0.035, x=0.26, y=0.10, z=0.70, verts=24), "metal")
        disc.rotation_euler = (math.radians(90), 0, 0)
        mark(cyl(0.05, 0.16, x=0.26, y=0.10, z=0.50, verts=10), "metal")
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.12, location=(0.26, -0.10, 0.56))
        lamp = bpy.context.object
        lamp.scale = (1.3, 0.9, 0.7)
        bpy.ops.object.transform_apply(scale=True)
        mark(lamp, "metal")
        bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.055, radius2=0.0, depth=0.14, location=(0.26, -0.10, 0.70))
        mark(bpy.context.object, "accent")
        return join_all()
    # The wizard's: LIGHT WITH NO LAMP. Three crystal shards standing off the arm and one accent nub
    # above them, and the nub is the whole tile — it is the only thing a repaint can put light on, and
    # there is deliberately no vessel under it for the light to be coming out of.
    for x, tall in ((0.08, 0.34), (0.28, 0.46), (0.46, 0.26)):
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.075, radius2=0.0, depth=tall,
                                        location=(x, 0.0, 0.55 + tall / 2))
        mark(bpy.context.object, "metal")
    # NESTED among the tips, not above them. Set clear of the cluster it read as a ball floating over a
    # row of pegs — the same detachment `prim_palm` and the pit's shadow both cost a render to find.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=0.13, location=(0.28, 0.0, 0.80))
    glow = bpy.context.object
    glow.scale = (1.0, 0.8, 1.1)
    bpy.ops.object.transform_apply(scale=True)
    mark(glow, "accent")
    return join_all()


def prim_hanging():
    """A patched awning cloth slung from a pole — the merchant's, and the first CLOTH in the set.

    Step 0's table filed cloth under "still unsolved" beside sand and loose scatter. That was a guess
    about difficulty rather than a measurement, and it is wrong in the same direction the sand note was:
    a hanging cloth is one of the EASIEST things this projection draws.

    It is nearly all FRONT FACE, and the front plane is the one the shear leaves alone — no top to fight
    and no depth to foreshorten, which is most of what every other primitive in this file spends its
    docstring on. Its folds run vertically, and a vertical ridge draws as a vertical ridge. Nothing here
    runs along -Y and nothing points at the viewer, so `prim_lamp`'s rule and `prim_sconce`'s never come
    up at all.

    NO SIMULATION, and not as a shortcut. Blender's cloth solver would give a drape that changes with the
    frame it was baked on, and a primitive that renders differently every run cannot be judged against
    its last roll — the whole file depends on a scaffold coming back byte for byte. A cloth hung from a
    bar is anyway a formula: it hangs in a sine along its width, pinched to nothing where it is tied and
    swinging widest at the free hem. That is two lines, and it is deterministic.

    THE FOLDS DISPLACE IN Y, toward and away from the viewer, not in X. Under z + k*y a fold pushed back
    is drawn HIGHER, so the ripple lands as a shift in the drawn surface and its shading does the rest —
    which is what a fold looks like. Displaced sideways instead, the cloth would merely get narrower and
    wider and read as a flag with a scalloped edge.

    The HEM is ragged and the corners are torn, because that is the only thing separating an awning from
    a banner at 56 units: a banner is hemmed straight.

    `--contents=rail` is the priest's VEIL, and it is the same cloth in the wall band rather than on the
    floor: a rail across the band, the drape hanging from it, and the whole thing FOLDED BACK ON ONE SIDE,
    which his row asks for and is also what stops a 2:1 sheet reading as a blank panel. No posts — a wall
    item stands on nothing — and it is wide and short where the awning is nearly square."""
    contents = arg("contents", "awning")

    def sheet(width, height, x0=0.0, folds=(8.0, 3.0), amp=(0.05, 0.028), hem=None, crown=None):
        """One hung sheet: a grid stood into the XZ plane, rippled in Y, its hem shaped by `hem`.

        The ripple is in Y and not in X for the reason the docstring above gives — a fold pushed back is
        drawn higher, which is what a fold looks like, where a fold pushed sideways only makes the cloth
        narrower and reads as a scalloped flag. `hem` takes the x fraction and returns how much to lift or
        drop that column's bottom edge, which is the one line separating an awning from a curtain."""
        bpy.ops.mesh.primitive_grid_add(x_subdivisions=24, y_subdivisions=12, size=1)
        cloth = bpy.context.object
        cloth.rotation_euler = (math.radians(90), 0, 0)
        bpy.ops.object.transform_apply(rotation=True)
        cloth.data.transform(Matrix.Diagonal((width, 1.0, height, 1.0)))
        cloth.data.transform(Matrix.Translation((x0, 0.0, height / 2)))
        for v in cloth.data.vertices:
            drop = 1.0 - (v.co.z / height)
            u = (v.co.x - x0) / width
            fold = (math.sin(u * math.pi * folds[0]) * amp[0]
                    + math.sin(u * math.pi * folds[1] + 0.7) * amp[1])
            v.co.y += fold * (0.15 + drop * 0.85)
            if hem and drop > 0.93:
                v.co.z += hem(u)
            if crown and drop < 0.07:
                v.co.z += crown(u)
        return cloth

    if contents in ("linen", "veil", "gold"):
        # The three that hang from a POLE on posts, which is the merchant's frame unchanged: a prop stands
        # on a floor cell, and without the posts the bar hangs in the air over a shadow.
        w, h = 0.90, 0.80
        mark(cyl(0.045, w + 0.16, x=0, y=0, z=h, verts=12), "body").rotation_euler = (0, math.radians(90), 0)
        for sx in (-1, 1):
            mark(cyl(0.035, h, x=sx * (w / 2 + 0.055), y=0.0, z=h / 2, verts=8), "body")
        if contents == "linen":
            # The nobleman's: a STRAIGHT hem with a dyed border along it. His row is one dyed band and
            # that band is the whole tile — a linen sheet with a ragged hem is the merchant's awning in
            # cleaner cloth, and at 56 units nobody would read the difference.
            mark(sheet(w, h * 0.97), "cloth")
            # The border is a strip IN FRONT of the hem, and its z is set for where the shear DRAWS it,
            # not for where it sits: everything at negative y comes out k*y lower, so a band built level
            # with the hem draws below the cloth and reads as a plinth the hanging stands on. This one is
            # built 0.09 high and lands on the hem. (The master's mask pays the same tax on its collar.)
            mark(box(w * 0.98, 0.03, 0.07, y=-0.12, z=0.11), "accent")
            for sx in (-1, 1):
                mark(box(0.05, 0.10, 0.16, x=sx * w * 0.3, y=0.0, z=h - 0.02), "cloth")
            return join_all()
        if contents == "veil":
            # The priest's, on the floor rather than on the wall: the same veil as `rail`, DRAWN BACK to
            # one side. Two masses of different width is what says a veil someone opened.
            mark(sheet(w * 0.62, h * 0.95, x0=-w * 0.19), "cloth")
            for i, r in enumerate((0.085, 0.062, 0.042)):
                mark(cyl(r, h * (0.94 - i * 0.06), x=w * 0.30 + i * 0.055, y=-0.02 - i * 0.03,
                         z=h * (0.52 + i * 0.03), verts=10), "cloth")
            return join_all()
        # The master's: a gold-shot curtain with a WEIGHTED HEM, and the weights are the tile. A hem that
        # hangs straight is the nobleman's; weights pull it into scallops between them, so the hem is
        # lifted where a weight is not and each weight is a bead of its own below the cloth.
        mark(sheet(w, h * 0.97, hem=lambda u: 0.05 * (1.0 - abs(math.sin(u * math.pi * 4.0)))), "cloth")
        for i in range(4):
            u = (i + 0.5) / 4.0
            mark(cyl(0.038, 0.075, x=(u - 0.5) * w, y=-0.03, z=h * 0.02, verts=8), "accent")
        for sx in (-1, 1):
            mark(box(0.05, 0.10, 0.16, x=sx * w * 0.3, y=0.0, z=h - 0.02), "cloth")
        return join_all()
    if contents == "aurora":
        # The wizard's: A CURTAIN OF AURORA, so there is nothing holding it up. No pole and no posts —
        # what a prompt cannot invent is a shape, and a rail in this scaffold would be painted as a rail.
        #
        # It stands on its own hem instead, which is the only reason the footprint is honest, and it is
        # marked `accent` throughout: this is the one prop in the file that is nothing but the light.
        # Wider folds than cloth, and fewer of them — light does not crease.
        w, h = 0.80, 1.00
        mark(sheet(w, h, folds=(3.0, 1.0), amp=(0.09, 0.05),
                   hem=lambda u: 0.02 * math.sin(u * math.pi * 3.0),
                   crown=lambda u: 0.11 * math.sin(u * math.pi * 2.5 + 0.4) - 0.03), "accent")
        # NO TONGUES rising off the top edge. Three cones were tried there, to say the curtain ends in
        # nothing, and they were the most salient shape in the picture by a distance — `prim_lamp`'s
        # flame rule, which says a sharp triangle a fifth of the object tall takes the whole tile. They
        # read as teeth. The top edge waves instead, which is the same statement in the silhouette the
        # cloth already has.
        return join_all()
    if contents == "rail":
        w, h = 1.46, 0.50
        mark(cyl(0.04, w + 0.10, x=0, y=0, z=h, verts=12), "metal").rotation_euler = (0, math.radians(90), 0)
        for sx in (-1, 1):
            mark(box(0.09, 0.14, 0.10, x=sx * (w / 2 + 0.04), y=0.05, z=h), "metal")
        # The drape covers the left of the rail and stops short of the right, where it is gathered into a
        # bunch. Two masses of different width is the whole tile: an even sheet across a 2:1 band has no
        # silhouette at all, and a veil that is not drawn back is a wall.
        drape_w = w * 0.66
        bpy.ops.mesh.primitive_grid_add(x_subdivisions=24, y_subdivisions=10, size=1)
        cloth = bpy.context.object
        cloth.rotation_euler = (math.radians(90), 0, 0)
        bpy.ops.object.transform_apply(rotation=True)
        cloth.data.transform(Matrix.Diagonal((drape_w, 1.0, h * 0.94, 1.0)))
        cloth.data.transform(Matrix.Translation((-w / 2 + drape_w / 2, 0.0, h * 0.47)))
        for v in cloth.data.vertices:
            drop = 1.0 - (v.co.z / (h * 0.94))
            fold = math.sin(v.co.x / drape_w * math.pi * 8.0) * 0.05 + math.sin(v.co.x / drape_w * math.pi * 3.0 + 0.7) * 0.028
            v.co.y += fold * (0.15 + drop * 0.85)
        mark(cloth, "cloth")
        # The gathered end: three bundles of falling width, which reads as cloth pulled aside where one
        # cylinder reads as a column.
        for i, (dx, r) in enumerate(((0.0, 0.085), (0.055, 0.065), (0.10, 0.045))):
            mark(cyl(r, h * (0.92 - i * 0.06), x=w * 0.34 + dx, y=-0.02 - i * 0.03, z=h * (0.53 + i * 0.03), verts=10), "cloth")
        return join_all()
    w, h = 0.86, 0.78
    pole_r = 0.045
    mark(cyl(pole_r, w + 0.16, x=0, y=0, z=h, verts=12), "body").rotation_euler = (0, math.radians(90), 0)
    # Two posts under the pole's ends. A prop stands on a floor cell, and without them the bar hangs in
    # the air with a shadow under it — an awning nailed to a wall the tile does not draw. They also give
    # the footprint something to be cast BY: the cloth itself is a sheet, and a sheet flattened to z=0 is
    # `prim_pillar`'s slab, a shadow the same width as the thing above it.
    for sx in (-1, 1):
        mark(cyl(0.035, h, x=sx * (w / 2 + 0.055), y=0.0, z=h / 2, verts=8), "body")
    # The sheet: a grid, stood up into the XZ plane, then pushed back and forth in Y.
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=26, y_subdivisions=14, size=1)
    cloth = bpy.context.object
    cloth.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    cloth.data.transform(Matrix.Diagonal((w, 1.0, h, 1.0)))
    cloth.data.transform(Matrix.Translation((0.0, 0.0, h / 2)))
    for v in cloth.data.vertices:
        # 0 at the pole, 1 at the hem: the cloth is tied at the top and free at the bottom.
        drop = 1.0 - (v.co.z / h)
        # Folds across the width, and a shallower second wave so they are not evenly spaced.
        fold = math.sin(v.co.x / w * math.pi * 7.0) * 0.055 + math.sin(v.co.x / w * math.pi * 3.0 + 1.1) * 0.03
        v.co.y += fold * (0.15 + drop * 0.85)
        # The hem: torn, and lower at one end than the other, so it is an awning and not a banner.
        if drop > 0.93:
            v.co.z -= 0.035 + math.sin(v.co.x / w * math.pi * 5.0 + 0.6) * 0.03 + (v.co.x / w) * 0.05
    mark(cloth, "cloth")
    # Two ties over the pole. They are the only things that say it is HUNG rather than floating.
    for sx in (-1, 1):
        mark(box(0.05, 0.10, 0.16, x=sx * w * 0.3, y=0.0, z=h - 0.02), "cloth")
    return join_all()


def prim_shrine():
    """A merchant's household shrine: a mudbrick box standing on the floor, a Bes figure and a lamp in it.

    `prim_niche`'s bay, stood up. Same construction — back slab, two jambs, a sill under and a lintel
    over, the hollow between them being the shrine — and the same lip rule: an opening holds `0.35 * d`
    less than its gap, because the lintel's front-bottom edge draws that much lower than its own z. What
    changes is the shear. A niche is a wall item at k = 0.5; this stands on the floor at k = 0.7, so the
    same depth buys half again as much drawn height and the box has to be NARROWER to keep its slot's
    portrait shape.

    THE RECESS FLOOR DRAWS ABOVE ITS FRONT LIP, which is what makes a hollow read as a hollow rather than
    a panel stuck on the front: depth going back is depth going up. It is the one thing a generator will
    not do asked in words, and the whole reason this is modelled.

    WHAT STANDS IN IT IS A SILHOUETTE AND NOTHING FINER. Bes is a squat bearded dwarf with a lion's mane
    and his tongue out, and none of that survives at 56 units — what survives is that he is WIDE and
    short with an outsized head, which is the one thing about him a shape can carry. The rest is paint.

    The lamp beside him is the merchant's own: a saucer with the spout out along X, never toward the
    viewer (`prim_lamp`), and a flame that is a NUB. Four primitives in this file have now grown a nose
    cone at the first attempt."""
    plinth_h, brick = 0.09, 0.075
    w, d, h = 0.60, 0.40, 0.60  # the shrine box itself, above its plinth
    lip = 0.35 * d
    mark(box(w + 0.08, d + 0.06, plinth_h, z=plinth_h / 2), "body")
    base = plinth_h
    mark(box(w, brick, h, y=(d - brick) / 2, z=base + h / 2), "body")
    for sx in (-1, 1):
        mark(box(brick, d, h, x=sx * (w / 2 - brick / 2), z=base + h / 2), "body")
    mark(box(w, d, brick, z=base + brick / 2), "body")
    mark(box(w, d, brick, z=base + h - brick / 2), "body")
    # A cavetto would be the next rank's; a merchant's is a plain mud coping, and it is what stops the box
    # reading as an open-topped crate. It must not be DEEPER than the box: the shear draws a coping's top
    # face at 0.7 of its depth, so overhanging it by 0.05 all round put a pale slab across the top third
    # of the tile and the shrine read as a table with a hole in it. Overhang in X only, where overhang is
    # drawn as overhang.
    mark(box(w + 0.07, d, 0.05, z=base + h + 0.025), "body")
    if arg("contents") == "couchant":
        # The pharaoh's shrine, and what the brief gives it is a FIGURE ON THE LID — Anubis couchant. So
        # unlike the priest's naos this one keeps its opening dark and puts its rank on the roof, which is
        # also how the two escape the law about a frame with black inside drawing as one tile: the priest
        # fills the frame, the pharaoh crowns it.
        #
        # A cavetto first, wider than the box in X only. The merchant's coping records why not in y: the
        # shear draws a top face at 0.7 of its depth, and an overhang all round lays a pale slab over the
        # top third of the tile.
        mark(box(w + 0.15, d, 0.055, z=base + h + 0.078), "body")
        # THE JACKAL LIES ALONG X. Couchant means lying down, and a recumbent animal is a long shape —
        # built along y it would draw as a vertical lump on the roof, by the law that y and z both feed
        # the drawn vertical. Along x it is a body, a head and a tail, which is the whole silhouette.
        # IT HAS TO BE BIG ENOUGH TO BE THE POINT. The first pass drew the jackal at 0.46 along a lid of
        # 0.75 and it read as a bird sitting on a cabinet — the shrine is 0.85 tall, so a figure a third
        # of that is a detail rather than the crown, and this rank's whole silhouette is the crown. Two
        # thirds of the lid's width, and it also stops overhanging the left end.
        roof = base + h + 0.106
        mark(box(0.50, 0.16, 0.125, x=0.055, y=0.0, z=roof + 0.062), "accent")
        # The chest and head, at the LEFT end and higher than the body: a couchant jackal holds its head
        # up. A GAP at the neck, or head and body fuse into one loaf — `prim_shrine`'s Bes paid for that.
        mark(box(0.14, 0.14, 0.175, x=-0.145, y=0.0, z=roof + 0.150), "accent")
        mark(box(0.155, 0.115, 0.095, x=-0.165, y=-0.012, z=roof + 0.283), "accent")
        # The muzzle reaches further in X, and the EARS are two upright wedges set apart in x — never in
        # y, where the pair would stack into one drawn ear. Same rule as the canopic jackal's stopper.
        mark(box(0.125, 0.07, 0.05, x=-0.265, y=-0.018, z=roof + 0.268), "accent")
        for ex in (-0.036, 0.022):
            mark(box(0.032, 0.04, 0.09, x=-0.165 + ex, y=0.0, z=roof + 0.372), "accent")
        # The TAIL, hanging down the right end of the lid: the one part that breaks the roof's line, and
        # the reason the shape reads as an animal rather than as a box with a bump on it.
        mark(box(0.06, 0.07, 0.135, x=0.30, y=-0.012, z=roof + 0.030), "accent")
        return join_all()
    if arg("contents") == "sealed":
        # The priest's NAOS, doors shut and corded. Its opening is FILLED, which is the whole point: the
        # law this file states about a frame with black inside says every such kind draws as one tile, and
        # a shut naos is how this rank escapes that — no dark rectangle at all, just leaves in a surround.
        #
        # A CAVETTO over the merchant's plain coping, and it overhangs in X ONLY. The coping above records
        # the reason: the shear draws a top face at 0.7 of its depth, so overhanging in y lays a pale slab
        # across the top third of the tile and the box reads as a table.
        mark(box(w + 0.15, d, 0.055, z=base + h + 0.078), "body")
        mark(box(w + 0.11, d - 0.02, 0.035, z=base + h + 0.058), "body")
        # The leaves. UNEQUAL is not an option here as it is on the wall shrine — shut means shut — so
        # what stops them reading as one panel is the meeting stile between them, a dark seam of its own
        # rather than the edge between two boxes. At this size an edge is not a line; a gap is.
        inner_w, door_z0, door_z1 = w - brick * 2, base + brick, base + h - brick
        door_h = door_z1 - door_z0
        for sx in (-1, 1):
            mark(box(inner_w / 2 - 0.014, 0.05, door_h, x=sx * (inner_w / 4 + 0.008),
                     y=-(d / 2) + 0.03, z=door_z0 + door_h / 2), "timber")
        mark(box(0.018, 0.055, door_h, y=-(d / 2) + 0.028, z=door_z0 + door_h / 2), VOID)
        # The CORD runs in X across both leaves, and the SEAL sits where it crosses the seam. The cord is
        # the one part that must clear the leaves in y or the shear draws it behind them: negative y
        # draws lower, so it is set forward and its own z is nudged up to land back on the doors' middle.
        mark(box(inner_w + 0.02, 0.022, 0.028, y=-(d / 2) + 0.005, z=door_z0 + door_h * 0.52), "cloth")
        bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=0.055,
                                             location=(0, -(d / 2) - 0.01, door_z0 + door_h * 0.52))
        seal = bpy.context.object
        seal.scale = (1.0, 0.6, 1.0)
        bpy.ops.object.transform_apply(scale=True)
        mark(seal, "accent")
        return join_all()
    # What stands in it, sized to the room the lintel really leaves.
    floor_z = base + brick
    room = (base + h - brick - lip) - (floor_z + lip)
    # Bes: wide, short, outsized head. Body and head are two masses and there is no third — a figure this
    # small has room for a silhouette and no features at all.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=18, ring_count=10, radius=0.10, location=(-0.10, -0.01, floor_z + room * 0.26))
    body = bpy.context.object
    body.scale = (1.5, 0.85, 0.82)
    bpy.ops.object.transform_apply(scale=True)
    mark(body, "pottery")
    # A GAP at the neck, or the two masses fuse into one beehive — which is what the first render gave,
    # a stack of domes rather than a figure. The head is smaller than the body and sits clear of it, and
    # those two facts are the whole of what a 12-pixel Bes can say: wide, short, big-headed.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=18, ring_count=10, radius=0.072, location=(-0.10, -0.01, floor_z + room * 0.74))
    head = bpy.context.object
    head.scale = (1.2, 0.9, 0.92)
    bpy.ops.object.transform_apply(scale=True)
    mark(head, "pottery")
    # The lamp: a saucer on the sill beside him, its spout along X.
    mark(cyl(0.075, room * 0.16, x=0.16, y=-0.02, z=floor_z + room * 0.08, verts=16), "pottery")
    mark(box(0.06, 0.045, room * 0.11, x=0.235, y=-0.02, z=floor_z + room * 0.07), "pottery")
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.032, radius2=0.0, depth=room * 0.26,
                                    location=(0.16, -0.02, floor_z + room * 0.29))
    mark(bpy.context.object, "accent")
    return join_all()


def prim_niche():
    """A goods recess cut into a wall — one bay of `prim_shelf`, hollowed instead of shelved.

    WHY THIS IS MODELLED AT ALL. A wall item was taken for the one slot a generator could draw straight,
    on the grounds that it is seen face-on. That is true of its FRONT PLANE and false of everything
    behind it: the band is part of the same oblique world as the rest of the map, at HALF depth
    (`mapScale`'s SIDE_W 14 of wall thickness images as 7 of drawn height, so k = 0.5). A recess has
    depth by definition, so the first roll came back with its interior receding to a vanishing point —
    photographically correct and wrong for this map. Render it with `--shear=0.5` and the projection is
    right by construction, exactly as it is for a prop; the repaint then only has to supply material.

    So the rule the triage needs is not "wall items are flat". It is: a wall item with DEPTH is modelled
    like a prop and rendered at half shear, and only a genuinely flat one — a plaque, a stela, a tally
    board hanging against the surface — is straight to the generator.

    THE RECESS FLOOR IS DRAWN ABOVE ITS FRONT LIP, which is the whole reason this reads as a hole rather
    than as a picture hung on the wall: depth going back is depth going up. `prim_shelf`'s lip rule
    applies unchanged — an opening holds `0.35 * depth` less than its gap — so the pots are sized to
    what the lintel really leaves, not to the gap it appears to leave.
    """
    # Sized so the DRAWN shape is the slot's 2:1. Drawn height is h + k*d with k = 0.5, so a bay 0.62
    # tall and 0.34 deep draws 0.79 — against 1.30 of width that is 1.65:1, and the import would have
    # squashed it a sixth. Widening the bay rather than flattening it keeps the room the pots need.
    w, d, h, brick = 1.62, 0.34, 0.62, 0.09
    lip = 0.35 * d
    # THE BAY'S HEIGHT IS NOT NEGOTIABLE. A lintel twice as deep was tried, to give the nobleman's soot
    # a surface to fan across, and it cost more bay than the soot was worth: the contents flattened and
    # the oil jar came out a dot. What makes this bay read is that it is 78% of the drawn height, and
    # anything taken off the opening is taken off the only part anyone can see.
    head = brick
    contents = arg("contents", "goods")
    # The merchant's and the nobleman's are left UNMARKED, exactly as they were painted; the ranks added
    # since mark all of themselves, because `mark`'s rule is that a primitive marking any of itself has
    # to mark the rest. The master's SURROUND is the marked part that matters — his row is a gilded
    # surround, and a scaffold in one colour cannot say which part is the gold.
    marked = contents in ("sealed", "offering", "star")

    def put(obj, name):
        return mark(obj, name) if marked else obj

    surround = "accent" if contents == "offering" else "body"
    # The wizard's bay is BLACK inside — his row is a niche holding one star, so the back of it is night
    # and not plaster. VOID is the marker for exactly that (`prim_pit`).
    back = VOID if contents == "star" else "body"
    # The surround: back slab, two jambs, a sill under and a lintel over. The hollow between them IS the
    # niche, so nothing is modelled where the opening is.
    put(box(w, brick, h, y=(d - brick) / 2, z=h / 2), back)
    for sx in (-1, 1):
        put(box(brick, d, h, x=sx * (w / 2 - brick / 2), z=h / 2), surround)
    put(box(w, d, brick, z=brick / 2), surround)
    put(box(w, d, head, z=h - head / 2), surround)
    # What stands in it, sized to the room the lintel actually leaves. The BAY is the same at every rank
    # — the brief gives each one a niche, and a cut recess is a cut recess — so `--contents` is the only
    # thing that changes, and a rank costs a repaint rather than a model.
    base = brick
    room = (h - head - lip) - (base + lip)
    if contents == "sealed":
        # The priest's: DOORS SHUT ACROSS THE OPENING, with a cord and a seal over the join. Set back
        # from the front lip rather than flush with it, so a reveal of jamb still shows on either side —
        # flush, the whole thing is a panel and the bay it is set in is gone.
        leaf = (w - brick * 2) / 2 - 0.012
        for sx in (-1, 1):
            put(box(leaf, 0.05, h - brick * 2, x=sx * (w - brick * 2) / 4, y=0.02, z=h / 2), "timber")
        put(box((w - brick * 2) * 0.82, 0.04, 0.05, y=-0.02, z=h * 0.52), "cloth")
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.075, location=(0.0, -0.055, h * 0.52))
        seal = bpy.context.object
        seal.scale = (1.0, 0.5, 1.0)
        bpy.ops.object.transform_apply(scale=True)
        mark(seal, "accent")
        return join_all()
    if contents == "offering":
        # The master's: a platter of loaves and a jar on the sill, inside a gilded surround. The loaves
        # are `cloth` and the platter `pottery` for one reason only — two warm masses of one value read as
        # one lump at 28 units, and the repaint needs to be told which is bread.
        # The platter is an ELLIPSE, wide in x and shallow in y. Round at a radius that reads, it was
        # wider than the bay is DEEP and hung out through the opening — which the shear then charges to
        # the drawn height, so the tile came out a fifth taller than the band it has to fill.
        platter = cyl(0.24, 0.035, x=-0.34, y=-0.02, z=base + 0.018, verts=20)
        platter.scale = (1.0, 0.55, 1.0)
        bpy.ops.object.transform_apply(scale=True)
        put(platter, "pottery")
        for lx, r in ((-0.50, 0.095), (-0.34, 0.085), (-0.20, 0.075)):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=r, location=(lx, -0.02, base + 0.055))
            loaf = bpy.context.object
            loaf.scale = (1.15, 0.85, 0.6)
            bpy.ops.object.transform_apply(scale=True)
            mark(loaf, "cloth")
        # In a ring, for `prim_basin`'s reason: `jar()` tapers to a point and a point on a flat sill has a
        # contact one pixel wide, which reads as balancing rather than standing.
        put(cyl(0.10, 0.04, x=0.42, y=-0.02, z=base + 0.02, verts=14), "pottery")
        jar(0.42, -0.02, room / 0.78, 0.092, z=base, part="pottery")
        return join_all()
    if contents == "star":
        # The wizard's: ONE STAR, and nothing else in the bay. Three crossed bars, which is a six-pointed
        # star and the most a 28-unit band will resolve; a modelled point count above that is a blur.
        for deg in (0, 60, 120):
            mark(turn(box(room * 2.0, 0.06, 0.05), deg, "Y", 0.0, -0.04, base + room * 1.1), "accent")
        return join_all()
    if contents == "lamp":
        # The nobleman's LAMP NICHE, and everything here is about what survives 28 pixels.
        #
        # A LAMP IS THE WRONG SHAPE FOR THIS BAND, and two renders proved it. A lamp is a shallow dish,
        # four times as wide as it is tall; laid on the sill its whole silhouette is the sill itself, and
        # it came back a smear with a tail. Stood on a foot it became a spoon. What reads in this bay is
        # what reads in the merchant's — a chunky mass with a ROUND top, held clear of the sill and the
        # lintel both. So the lamps are squat rounded bodies with a spout, which is a lamp of the fat
        # closed sort, and the spout is the only fine thing on them.
        #
        # The spouts run along X. Along -Y a spout draws as a cone hanging off the body, `prim_lamp`'s
        # first failure, and at half shear there is even less room to recover from it.
        #
        # THREE objects evenly spread, because the merchant's bay proves that is what fills one: two and
        # a gap reads as a bay with two things left in it.
        for x, scale, lit in ((-0.50, 1.0, True), (-0.02, 0.88, False)):
            # DOMED, not squashed. The merchant's bundle is a sphere flattened to 0.62 of its radius
            # and it reads — but it reads BESIDE two tall jars, and the contrast is doing the work. A
            # bay of nothing but flattened masses came back as two dishes and a dot, twice. A lamp of
            # this closed sort is about as tall as it is half wide, so the sphere keeps its height and
            # loses its radius instead.
            bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.112 * scale,
                                                 location=(x, -0.02, base + 0.098 * scale))
            body = bpy.context.object
            body.scale = (1.35, 0.9, 1.0)
            bpy.ops.object.transform_apply(scale=True)
            box(0.15 * scale, 0.065, 0.075 * scale, x=x + 0.185 * scale, y=-0.02, z=base + 0.075 * scale)
            if lit:
                bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.055, radius2=0.0, depth=room * 0.44,
                                                location=(x, -0.02, base + 0.20 + room * 0.20))
        # The oil jar they are filled from, taller than the lamps so the row is not one flat line. SLIM:
        # `jar()`'s stopper is a fixed fraction of the height, so a fat short one is mostly dome and
        # reads as an onion — 0.105 of belly did exactly that. Narrow puts the shoulder back in charge.
        jar(0.48, -0.02, room / 0.72, 0.095, z=base)
        return join_all()
    # SLIMMER than the prop slot's pots. `jar()` puts a domed stopper on a spherical belly, which reads
    # as a jar at 84 units and as an onion at 28: the stopper is a fixed fraction of the height, so the
    # shorter the jar the more of it is dome. Taller and narrower puts the shoulder back in charge.
    jar(-0.46, -0.02, room / 0.82, 0.095, z=base)
    jar(-0.14, -0.02, room / 0.90, 0.088, z=base)
    # The tied cloth bundle: a squashed sphere, because a bundle is a silhouette and nothing finer.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.16, location=(0.40, -0.02, base + 0.13))
    bundle = bpy.context.object
    bundle.scale = (1.15, 0.9, 0.62)
    bpy.ops.object.transform_apply(scale=True)
    return join_all()


def prim_wallshrine():
    """A shrine BOX standing proud of the wall: `--contents=ajar` is the priest's, doors part open with a
    lamp lit inside; `--contents=opening` is the wizard's, which his row says is only an opening.

    NOT `prim_niche`, and the difference is the point of having both. A niche is cut INTO the wall and
    everything about it is a reveal — jambs, a sill, a lintel, and depth going back. A shrine is a cabinet
    ON the wall: it has a plinth under it and a cavetto cornice over it, and those two are the whole
    silhouette. At 28 units the box between them is a rectangle either way.

    THE DOORS ARE SLID, NOT SWUNG. A leaf on a vertical hinge swings into -y, and the y-z plane collapses
    to a vertical line under this projection (`prim_sconce`), so an open door draws as a stripe on the
    front of the shrine rather than as a door standing open. `prim_chest` solved the same problem for a
    lid by sliding it back. So one leaf covers the left of the opening, the other rather less of the
    right, and what says ajar is the BLACK GAP between them with a lamp standing in it.

    The interior is VOID — `prim_pit`'s marker — and it does the work in both variants: the priest's is a
    dark slot with one lit thing in it, and the wizard's is nothing else at all."""
    contents = arg("contents", "ajar")
    w, h, d = 1.50, 0.62, 0.28
    plinth, corn, jamb = 0.12, 0.14, 0.11
    # THE PLINTH AND THE CORNICE BOTH OVERHANG, and generously. The wizard's variant is an opening and
    # nothing else, and with a thin frame it drew as a black rectangle — the same picture as his niche
    # holding no star and as his star shaft, three tiles the map could not tell apart. What separates a
    # shrine from a hole is that it is a CABINET ON the wall: a foot under it and a cavetto over it,
    # both wider than the box between them. `prim_sealedchest` records the other half — an edge flush
    # with what is below it is not drawn as an edge at all.
    mark(box(w + 0.10, d + 0.06, plinth, z=plinth / 2), "body")
    mark(box(w + 0.16, d + 0.08, corn, z=h - corn / 2), "body")
    for sx in (-1, 1):
        mark(box(jamb, d, h - plinth - corn, x=sx * (w / 2 - jamb / 2), z=(h + plinth - corn) / 2), "body")
    # The interior, at the BACK of the box: near-black, and the only thing behind the doors.
    inner_w, inner_h = w - jamb * 2, h - plinth - corn
    mark(box(inner_w, 0.05, inner_h, y=d / 2 - 0.04, z=(h + plinth - corn) / 2), VOID)
    if contents == "ajar":
        # Two leaves, unequal, near the FRONT of the box so the gap between them is deep.
        for sx, frac in ((-1, 0.42), (1, 0.24)):
            mark(box(inner_w * frac, 0.05, inner_h, x=sx * (inner_w / 2 - inner_w * frac / 2), y=-d / 2 + 0.05,
                     z=(h + plinth - corn) / 2), "timber")
        # The lamp in the gap: the niche's proven mass, spout along X, flame a nub.
        bpy.ops.mesh.primitive_uv_sphere_add(segments=18, ring_count=10, radius=0.11, location=(0.02, 0.0, plinth + 0.10))
        body = bpy.context.object
        body.scale = (1.3, 0.9, 1.0)
        bpy.ops.object.transform_apply(scale=True)
        mark(body, "pottery")
        bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.055, radius2=0.0, depth=0.10,
                                        location=(0.02, 0.0, plinth + 0.23))
        mark(bpy.context.object, "accent")
    return join_all()


def prim_starshaft():
    """The wizard's shaft: a slot on the night, with stars in it.

    A hole and nothing else, so it is `prim_pit`'s marker doing the whole tile — VOID renders near-black
    and casts nothing, and the stars are the only lit thing in the band. What it needs from geometry is a
    SURROUND thick enough to read: the slot is a rectangle of black, and without a frame round it the tile
    is a black bar that reads as a gap in the wall rather than as an opening cut through it.

    The stars are crossed bars through `turn`, not `tilt` — see `tilt` for why a part placed and then
    turned swings out of the frame. Six points each at this size; anything finer is a blur at 28 units."""
    w, h, d = 1.44, 0.46, 0.20
    frame = 0.10
    mark(box(w, d, frame, z=frame / 2), "body")
    mark(box(w, d, frame, z=h - frame / 2), "body")
    for sx in (-1, 1):
        mark(box(frame, d, h - frame * 2, x=sx * (w / 2 - frame / 2), z=h / 2), "body")
    mark(box(w - frame * 2, 0.05, h - frame * 2, y=d / 2 - 0.04, z=h / 2), VOID)
    for x, r in ((-0.42, 0.085), (-0.05, 0.115), (0.34, 0.07)):
        for deg in (0, 60, 120):
            mark(turn(box(r * 2, 0.05, r * 0.34), deg, "Y", x, -0.03, h / 2), "accent")
    return join_all()


def prim_mask():
    """The master's funerary mask: nemes headdress, lappets, a face, a beard, a collar.

    PORTRAIT IN A LANDSCAPE BAND, and that is fine — the wall render's frame is 448x224 and the slot is
    56x28, which is the same 8:1 reduction on both axes, so nothing is squashed. A tall object is fitted
    by its height and simply leaves air at the sides, which is what a mask hung on a broad wall looks
    like. It is `--margin` that decides how much air, not a scale flag (`prim_sconce`).

    Marked in two slots and not one, because the row is a GILDED mask with LAPIS stripes: the face and
    the headdress are `accent` and the lappets are `metal`. Stripes are paint, not geometry — at this size
    a modelled stripe is a moiré — so all the scaffold can do is hand the repaint a separate part to put
    them on."""
    # ONE MASS IN FRONT OF ANOTHER, not five blocks in a row. Two passes were built as a crown, two
    # lappets, a face, a beard and a collar, each butted against its neighbours, and both drew as a NICHE
    # WITH AN EGG IN IT — which is the honest reading, because a nemes headdress modelled as a frame round
    # a face IS a frame, and at 28 units a frame is the strongest shape in the picture.
    #
    # What fixes it is depth. The headdress is one rounded dome, and the face, the lappets and the beard
    # all stand in FRONT of it at negative y. Under z + k*y a part pushed forward is drawn LOWER, so the
    # face separates from the headcloth by position and by shading instead of by an outline, and the
    # silhouette stays a single blob — which is what a mask on a wall is.
    # The collar is TALL, and it is the fix for a gap the shear opens rather than one the geometry has:
    # everything in front sits at negative y, so it is all drawn 0.05 LOWER than it is built, and a
    # face resting exactly on a collar hangs a hairline above it in the picture.
    mark(box(0.66, 0.20, 0.24, z=0.12), "accent")  # the collar it stands in
    bpy.ops.mesh.primitive_uv_sphere_add(segments=22, ring_count=14, radius=0.36, location=(0.0, 0.06, 0.52))
    nemes = bpy.context.object
    nemes.scale = (1.0, 0.55, 0.85)
    bpy.ops.object.transform_apply(scale=True)
    mark(nemes, "metal")  # the headcloth: STRIPED by the repaint, which is why it is its own slot
    for sx in (-1, 1):
        mark(box(0.13, 0.14, 0.46, x=sx * 0.27, y=-0.06, z=0.33), "metal")  # the lappets, down onto the collar
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.19, location=(0.0, -0.10, 0.46))
    face = bpy.context.object
    # Long enough to REACH the collar and wide enough to touch the lappets: left short, the gap under the
    # chin and the two slivers beside it were dark dome, and a mask with a hole under its face is a jar.
    face.scale = (1.05, 0.8, 1.32)
    bpy.ops.object.transform_apply(scale=True)
    mark(face, "accent")  # gilded, and the one part that must not be striped
    mark(box(0.10, 0.12, 0.20, y=-0.12, z=0.26), "accent")  # the beard, clear of the collar
    return join_all()


def prim_statue():
    """A statue, built out of boxes — and Step 0's table said this needed a museum scan.

    THE CANOPIC JARS ARE WHY IT DOES NOT. That row read "statues, sarcophagi, canopic jars: a museum
    scan", and the priest's four jars came back with a human wig, a baboon's muzzle, a jackal's snout and
    a falcon's painted eye — recognisable at 56x84 with NOT ONE FEATURE MODELLED. The scaffold gave four
    stopper profiles and the repaint did every face. A face is paint at this size.

    What that leaves geometry is POSTURE, and posture is the one thing paint cannot fix, because the mask
    cuts the return to the render's own silhouette. So `--contents` is a pose and never a deity: `seated`
    and `standing` are human, `couchant` is an animal lying down, `lioness` an animal sitting up. Which
    god it is comes from the prompt.

    The pipeline's opening says a generator "refuses the projection on FIGURES", and the ka-statue's seven
    rolls are the evidence — but those were PROMPT-ONLY, before any of this existed. A scaffold is exactly
    the fix for a projection a generator will not obey, so the old count argues for this route rather than
    against it.

    WHAT A FIGURE MUST HAVE AT 28 UNITS, in the order the shrine's jackal taught it:

    - A GAP AT THE NECK. `prim_shrine`'s Bes paid for this and the jackal paid again: a head touching its
      shoulders fuses into one loaf and the thing reads as a beehive. The head is smaller than the torso
      and stands clear of it.
    - MASS AT THE BACK, not the front. Under z + k*y anything behind the centre is drawn higher, so a
      seated figure's seat-back buys drawn height twice over where its knees buy none.
    - A LAP DRAWS LOWER THAN ITS SEAT. Negative y draws lower by k*y, which is what makes a seated figure
      read as seated rather than as a block with a head: the knees come toward the viewer and fall away.
    - THE HEADDRESS IS THE SILHOUETTE. A bare head is an egg at any rank. A nemes widening to the
      shoulders is unmistakably Egyptian and costs one trapezoid, and it is the only part of a human
      figure whose outline a player can actually read in a 56-wide cell.

    BOXES, AND ROUNDING THEM WAS TRIED AND LOST. The reasoning for rounding was good: the mask clips
    whatever the generator adds beyond a flat face, so a boxy scaffold asks to be rounded and then
    punishes the rounding on a jaw or a haunch. Every mass was rebuilt as a squeezed sphere to meet it
    halfway — and all four poses came back worse. Seated and standing read as stacked eggs, the lioness
    as a snowman with ears, and the couchant jackal as a slug: its body had been the one part that
    clearly said "animal lying down" and became a pebble.

    Two reasons, and the second is the one to remember. A sphere has no flat faces, so the shear has
    nothing to reveal — this projection's whole legibility is a lighter top against a darker front, and a
    smooth mass shades uniformly and reads as a blob (`prim_brazier` says the same of a drum, and
    `prim_market`'s baskets say round costs depth for nothing). And an Egyptian statue IS blocky: it is
    cut from a block, with flat planes and hard arrises, and the block statue is a whole genre. So boxes
    are not a compromise being tolerated here, they are what the subject actually looks like.

    SO THIS SCAFFOLD IS AN ENVELOPE, and it is the only one in the file that is. Every other primitive
    hands over the object's real silhouette and the prompt says keep every edge; a statue cannot, because
    a figure carved to its true contour is beyond what boxes describe and beyond what a generator will
    leave alone. The split is: geometry owns the PROJECTION and the POSE, and paint owns the CONTOUR.

    Which means the masses are deliberately a little FATTER than the statue inside them — roughed-out
    stone, with material to cut away. The prompt tells the generator it is looking at a block and to carve
    INWARD only, so its deviation lands inside the mask rather than outside it, where the mask would clip
    it. `--mask-grow` is the other way to buy that leeway and is NOT usable here: it admits an added pixel
    only above `SHADOW_FLOOR` 70, and a black-resin Anubis is painted darker than that, so his own carving
    would be thrown out as shadow. An envelope needs no flag.

    What an uncovered envelope costs is nothing much, which the altar measured: 8% of its mask had no
    paint over it and the tile came out with 8 magenta pixels, because the import keys magenta BEFORE it
    masks. The silhouette then belongs to the paint, which is the intention here rather than a defect.
    """
    contents = arg("contents", "seated")
    plinth_h = 0.09
    mark(box(0.62, 0.46, plinth_h, z=plinth_h / 2), "body")
    b = plinth_h

    if contents == "mummiform":
        # A COFFIN, and it is a pose like any other: `sarcophagus` was the other half of the row Step 0
        # sent to a museum scan, and it goes the same way Anubis did.
        #
        # IT STANDS UPRIGHT, propped against its own plinth, and that is a legibility decision taken
        # against the obvious one. A coffin in a tomb chamber lies on a bier, and lying is what was built
        # first — twice. The trouble is that a coffin's identity is its ANTHROPOID OUTLINE, narrow at the
        # head, widest at the shoulders, tapering to the feet, and lying down that outline is in the TOP
        # face, which this shear compresses to k of its depth. Two passes of it read as a chest with a
        # stepped lid. Stood up, the outline is in the FRONT plane — the one plane the shear leaves alone,
        # which is `prim_hanging`'s argument for why cloth is easy — and it is unmistakable.
        #
        # Everything the brief asks for at the four ranks that author one faces the viewer this way too: a
        # painted face, crossed arms, a cartouche band, a lid ajar, and a hollow if it is open. The
        # merchant's row proposes "propped upright" in as many words, so the staging is authored anyway.
        #
        # Upright also FILLS the slot. A coffin on its back is wide and short, and `seat_and_normalise`
        # scales by height, so it landed small in a 56x84 portrait cell with paving either side of it.
        opened = bool(arg("open"))
        d, front = 0.20, -0.11
        # The outline, foot to head. Steps in X are what the eye reads as a silhouette here, and they cost
        # nothing: X is the only axis drawn horizontally, so a change of width is a change of width.
        for cz, cw, ch in ((0.03, 0.24, 0.06), (0.16, 0.21, 0.20), (0.36, 0.27, 0.20), (0.55, 0.30, 0.18), (0.71, 0.17, 0.14)):
            mark(box(cw, d, ch, z=b + cz + ch / 2), "figure")
        if opened:
            # The gods' is OPEN AND EMPTY. A VOID panel down the front is the whole of it, inset so a rim
            # of case shows all round — `prim_brazier`'s rule about a dish needing a visible rim, one
            # object over. Proud of the face it cuts rather than level with it, by the altar channel's
            # lesson: buried under the surface, a recess renders as nothing.
            mark(box(0.20, 0.06, 0.52, y=front - 0.015, z=b + 0.36), VOID)
        else:
            # THE MASK, marked apart. The one feature every rank's prompt names, and the canopic jars
            # proved it is worth modelling as a PROFILE rather than a face: give the repaint a raised
            # panel where a face goes and it paints a face there.
            mark(box(0.13, 0.04, 0.12, y=front - 0.012, z=b + 0.74), "accent")
            # CROSSED ARMS over the chest, and they run in X because an arm reaching sideways is the only
            # arm this projection can draw (`prim_sconce`). Three of the four ranks ask for these or for a
            # cord across the same place, so this is where a band goes at every rank but the gods'.
            for ax, az in ((-0.045, 0.50), (0.045, 0.425)):
                mark(box(0.19, 0.035, 0.045, x=ax, y=front - 0.01, z=b + az), "figure")
        return join_all()

    if contents in ("couchant", "lioness"):
        # ANIMALS. `couchant` lies along X — a recumbent beast is a long shape, and built along y it draws
        # as a vertical lump by the law that y and z both feed the drawn vertical. `lioness` sits up, which
        # is the same parts in a taller stack.
        lying = contents == "couchant"
        # NARROWER THAN ITS PLINTH, and stood clear of it. The first envelope laid a body slab 0.54 wide
        # flush on a plinth 0.62 wide, in the same material: two rough slabs meeting with no step and no
        # colour change, which the generator resolved by reading the LOWER one as pedestal and the body
        # as more pedestal — then carved a small jackal on top of the pair. An animal has to overhang
        # nothing and to sit on a visible ledge.
        if lying:
            mark(box(0.46, 0.21, 0.19, x=0.04, z=b + 0.115), "figure")        # body, roughed FAT
            chest_z, head_z, hx = b + 0.255, b + 0.37, -0.17
        else:
            mark(box(0.26, 0.24, 0.30, x=0.0, y=0.03, z=b + 0.17), "figure")  # haunches, set BACK
            mark(box(0.13, 0.13, 0.26, x=0.0, y=-0.16, z=b + 0.15), "figure") # forelegs, forward and down
            chest_z, head_z, hx = b + 0.42, b + 0.54, 0.0
        mark(box(0.20, 0.20, 0.19, x=hx, z=chest_z), "figure")                # chest
        mark(box(0.17, 0.16, 0.15, x=hx - (0.02 if lying else 0), z=head_z), "figure")
        # THE MUZZLE FOLLOWS THE BODY, and getting that wrong is what the sitting pose was shipped with.
        #
        # `couchant` lies along X and faces LEFT, so its muzzle reaches in -X. `lioness` sits up facing
        # the VIEWER, and it inherited that muzzle — a head turned side-on above a body squared to the
        # camera. The ears then read as the fault, because with the face pointing left a pair standing
        # apart in X is one ear in front of the other along the snout rather than one either side of it.
        #
        # Sitting, the muzzle reaches in -Y instead. That also draws it LOWER by k*y, which is what a
        # face jutting toward the viewer should do, and it costs nothing: y is the axis the shear turns
        # into drawn height, and the muzzle is the one part of a head whose height is not load-bearing.
        #
        # THE EARS STAY APART IN X EITHER WAY, and on `couchant` that is deliberately not anatomy.
        #
        # A left-facing head's ears belong at ±Y. Under the shear that separates them by only k*0.09 =
        # 0.063 of drawn height, against an ear 0.10 tall and at the same X, so the near one swallows
        # the far one and the pair reads as a single lump — the stacking the canopic jackal's stopper
        # records — rendered both ways to be sure, and at ±Y the pair comes out as one cone with a hint
        # of a second behind it. At ±X they separate cleanly and sit fore-and-aft along the snout,
        # which is wrong on the model and right on the page: the priest's Anubis landed off this
        # scaffold with them painted as a near ear and a far ear, which is what a left-facing head
        # actually looks like.
        #
        # So do not "fix" these to match the lioness fix above. That one moved the MUZZLE, because her
        # body faces the viewer and her face did not. The ears were never the fault in either pose.
        if lying:
            mark(box(0.15, 0.10, 0.09, x=hx - 0.14, y=-0.015, z=head_z - 0.01), "figure")
        else:
            mark(box(0.11, 0.13, 0.09, x=hx, y=-0.13, z=head_z - 0.02), "figure")
        for ex in (-0.045, 0.045):
            bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.032, radius2=0.005, depth=0.10,
                                            location=(hx + ex, 0.0, head_z + 0.105))
            mark(bpy.context.object, "figure")
        if lying:
            mark(box(0.06, 0.07, 0.14, x=0.26, y=-0.01, z=b + 0.075), "figure")  # tail over the end
        return join_all()

    seated = contents == "seated"
    if seated:
        # The THRONE, and it is most of the silhouette: a back slab standing behind the figure, which is
        # also the mass that buys drawn height. The seat is what the lap sits on.
        mark(box(0.44, 0.30, 0.62, y=0.09, z=b + 0.31), "body")               # back slab
        mark(box(0.40, 0.34, 0.10, y=-0.06, z=b + 0.32), "body")              # seat
        # LAP AND SHINS. The lap runs forward in -y so the shear draws it lower than the seat, and the
        # shins drop from its front edge: together they are the L that says seated.
        mark(box(0.30, 0.22, 0.11, y=-0.16, z=b + 0.40), "figure")            # thighs
        mark(box(0.28, 0.10, 0.34, y=-0.24, z=b + 0.18), "figure")            # shins
        mark(box(0.30, 0.14, 0.06, y=-0.30, z=b + 0.03), "figure")            # feet
        torso_z, torso_h = b + 0.62, 0.30
    else:
        # STANDING, striding: one leg advanced in -y so it draws lower and the two legs do not merge into
        # a column. A figure standing with its feet level is a post with a head.
        mark(box(0.13, 0.13, 0.44, x=-0.08, y=0.04, z=b + 0.22), "figure")    # back leg
        mark(box(0.13, 0.15, 0.44, x=0.09, y=-0.09, z=b + 0.22), "figure")    # advanced leg
        mark(box(0.34, 0.22, 0.16, z=b + 0.50), "figure")                     # kilt, part of the figure
        torso_z, torso_h = b + 0.58, 0.34

    mark(box(0.32, 0.20, torso_h, y=0.01, z=torso_z + torso_h / 2), "figure") # torso
    # ARMS in X, down the sides, because an arm is the one part of a figure that can only read sideways.
    for sx in (-1, 1):
        mark(box(0.075, 0.14, torso_h * 0.82, x=sx * 0.20, y=-0.02, z=torso_z + torso_h * 0.44), "figure")
    top = torso_z + torso_h
    # THE GAP AT THE NECK — 0.03 of clear air, which is the one measurement in this primitive that is not
    # negotiable. Bes and the jackal both fused without it.
    mark(box(0.09, 0.10, 0.05, z=top + 0.025), "figure")                      # neck
    mark(box(0.17, 0.17, 0.17, z=top + 0.135), "figure")                      # head
    # THE NEMES: a trapezoid widening to the shoulders, and the whole reason a human figure reads at all.
    # Built as a cone of four sides so its taper is real geometry rather than a painted edge.
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.21, radius2=0.135, depth=0.20,
                                    location=(0, 0.01, top + 0.13))
    nemes = bpy.context.object
    nemes.rotation_euler = (0, 0, math.radians(45))
    bpy.ops.object.transform_apply(rotation=True)
    nemes.scale = (1.0, 0.72, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    mark(recalc_outward(nemes), "figure")
    return join_all()


PRIMITIVES.update(
    {
        "statue": prim_statue,
        "cube": prim_cube,
        "table": prim_table,
        "crate": prim_crate,
        "jarrack": prim_jarrack,
        "market": prim_market,
        "shelf": prim_shelf,
        "chest": prim_chest,
        "brazier": prim_brazier,
        "lamp": prim_lamp,
        "pillar": prim_pillar,
        "palm": prim_palm,
        "mat": prim_mat,
        "rubblePile": prim_rubbleheap,
        "niche": prim_niche,
        "pit": prim_pit,
        "stair": prim_stair,
        "gate": prim_gate,
        "exit": prim_exit,
        "sconce": prim_sconce,
        "shrine": prim_shrine,
        "falseDoor": prim_falsedoor,
        "sealedChest": prim_sealedchest,
        "basin": prim_basin,
        "hanging": prim_hanging,
        "wallShrine": prim_wallshrine,
        "starShaft": prim_starshaft,
        "mask": prim_mask,
    }
)


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


VOID = "void"  # the material name a primitive marks the inside of a hole with
# A part that does not TOUCH THE FLOOR, and so casts nothing on it. Coloured like any other part — it is
# the footprint it is kept out of, not the picture. `prim_pit`'s pole and its rope ladder are the case:
# they hang over and into the shaft, so there is no floor under them to catch a shadow, and flattened to
# z=0 they came out as dark slabs lying beside the hole.
NOCAST = "nocast"
# The same thing as a SUFFIX on any other part name, so a part can keep its colour and still cast nothing:
# `cloth!nocast` is painted as cloth and dropped from the footprint. Bare NOCAST is that suffix with no
# part in front of it, and stays for the pit's pole and ladder, which want the rank's plain stone.
#
# The case that wanted it: `prim_sealedchest`'s cord stands proud of the chest's front face, and a
# flattened footprint put a thin grey bar on the floor in front of the chest — a shadow belonging to the
# chest's own face, drawn on the ground. Marking it bare NOCAST would have fixed the shadow and painted
# the cord in mudbrick, which the repaint then has no reason to read as cord.
NOCAST_SUFFIX = "!nocast"


def nocast(name):
    """`name`, kept out of the footprint. Colour by the part, cast by nothing."""
    return f"{name}{NOCAST_SUFFIX}"


def unlit_parts():
    """The parts `--unlit=a,b` names, which are rendered EMITTING their colour rather than reflecting it.

    For a part that IS light rather than a thing light falls on. See `flat_material`: the exit's shaft is
    the only user, and the top of it rendered darker than its own hex until this existed."""
    return {p.strip() for p in (arg("unlit") or "").split(",") if p.strip()}


def part_of(slot_name):
    """The PART a slot names, with Blender's uniquifying suffix and the nocast marker both stripped."""
    return slot_name.split(".")[0].removesuffix(NOCAST_SUFFIX)

# What a marked part is painted, when the caller names no colour for it. A scaffold's job is to be
# RECOGNISED — tile-art-brief.md's whole argument for --colour is that a grey render came back as
# photographic burl on wooden door panels — and one flat colour over a whole prop only gets that half
# done. A market table in one brown is a brown table with brown things on it, and the repaint has to
# guess which lump is metal. Marked parts arrive already told apart.
PART_COLOURS = {
    VOID: "#2a2520",  # the inside of a hole: near-black, and the one part a prompt cannot put back
    "metal": "#8a7f6d",  # dull, never bright — the set is matte and has no highlight anywhere
    "accent": "#b07a3c",  # the rank's one warm ochre; override per rank with --colour-accent
    "pottery": "#8f7358",  # fired clay: warmer and duller than timber, and never the ochre accent
    # Worked wood, and DARK — the one part that has to out-value the rank's own stone. A door shut
    # across a niche is parallel to the jambs beside it, so it catches exactly the same light and a
    # scaffold in one colour draws it as a filled-in wall. Nothing but a different slot separates them.
    "timber": "#6b5236",
    # THE DAY OUTSIDE, and the only part in the set that is meant to be the BRIGHTEST thing on the map.
    # Every other tile is interior: an exit is the one place a tomb opens onto the sun, and it has to
    # out-value the paving the way `timber` has to out-value the stone. Pale and warm rather than white,
    # because it is sand and low sun through a doorway, not a lamp.
    "daylight": "#e6d2a4",
    # The air the beam stands in. Warmer and a shade deeper than the core, because a shaft of light in
    # dust is not the light itself — rendered at the core's own colour the two read as one hard-edged
    # slab, which is a pillar and not a beam.
    "haze": "#d8b87c",
    "cloth": "#bdb3a0",
    # STONE BELOW THE FLOOR LINE: the same material as `body`, carrying the light that reaches down a
    # shaft rather than the light on the paving. A hole has no sun in it — its walls stand in the y-z
    # plane and draw as lines — so depth cannot come from the lamp and has to be built as value. Two
    # steps of it (body, then this) are enough to say "going down" before any paint is asked for.
    "deep": "#5a544a",
    # Standing water, and the point of it is that it is NOT a hole. The nobleman's basin had its water
    # marked VOID — near-black, the marker for an absence — and the repaint did exactly what the scaffold
    # and the prompt both said: it came back pure black and read as a hole punched in a bowl. Dark, with
    # some of the vessel's own colour in it, is what water looks like in a basin indoors.
    "water": "#4a4f4a",
    # A carved FIGURE, and the one part whose job is to be a different colour from the stone under it.
    # `prim_statue`'s envelope is rough slabs, and a rough slab of animal sitting on a rough slab of
    # plinth is one mass: told apart only by shape, the first Anubis came back with his BODY read as
    # pedestal and a smaller jackal carved on top of it. A figure and its base are never the same
    # material anyway — black resin on basalt, painted limestone on granite — so this is also true.
    #
    # MID-TONE, and not the black the prompt asks for. Anubis is black resin and the obvious default was
    # #3a3630, which told him apart from the plinth and then cost the thing the scaffold is FOR: at that
    # value his top faces and his front faces shade the same and the planes stop reading, which is the
    # grey-render failure Step 2's gate is about. #6f6459 is far enough from pale basalt to be a
    # different object and light enough to still catch the rig. A scaffold's colour is a legibility aid,
    # never a colour instruction — the niche arrives in stone and comes back with cedar doors.
    # Override per rank with --colour-figure.
    "figure": "#6f6459",
    # NOCAST is not a colour: a part kept out of the footprint is still painted the rank's stone.
}


def recalc_outward(obj):
    """Points every face of a mesh out of its own volume.

    Blender's cone primitive winds its side faces the other way round when the TOP radius is the larger
    one, and an inward normal in this rig renders near-black — the flat lighting has nothing behind the
    surface to catch. Rotating the object does not help: the normals rotate with it. Returns the object so
    it can be wrapped round a `mark`."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    return obj


def mark(obj, name):
    """Puts one part in a named material slot, so `paint` can colour it apart from the rest.

    Every part of a primitive that marks ANY of itself has to be marked, `body` included: `join_all`
    merges slots by name and the polygons keep their indices, so an unmarked part would inherit whatever
    slot happens to land at index 0."""
    obj.data.materials.clear()
    obj.data.materials.append(bpy.data.materials.get(name) or bpy.data.materials.new(name))
    return obj


def flat_material(name, hex_colour, alpha=1.0, unlit=False):
    """A flat matte material in one colour. Roughness 1 and zero specular: the set is painted and matte,
    with no highlight anywhere (tile-art-brief.md, "The style").

    `unlit` makes it EMIT that colour instead of reflecting it, which is what a part that IS light needs.
    A lit surface is shaded by its angle to the rig, and the exit's shaft is a cone — so its sides turn
    away as it narrows and the top of the beam rendered DARKER than its own hex. Added to the tile that
    top reads as a smear of tan pulling the ground down rather than as light on it: measured over the
    merchant's wall band the beam sat at luminance 46 against the band's own 49, and over his paving 90
    against 101. Light does not take shading from somewhere else; it is the source.

    `alpha` below 1 makes the part SEE-THROUGH in the render, and therefore in the tile: the film is
    transparent, so the render's own alpha is what `import-tile --mask` cuts to, and sharp's `dest-in`
    MULTIPLIES alpha rather than thresholding it. So a part rendered at 0.6 arrives 60% opaque over
    whatever the map draws behind it, with no importer flag and no change to the art.

    It moves no edge, which is what makes it safe to change on a tile that is already painted: the rule
    that a painted tile's geometry can never move is about the SILHOUETTE, and this leaves the silhouette
    exactly where it was. A master stays valid; only the re-import changes."""
    h = hex_colour.lstrip("#")
    rgb = tuple(srgb_to_linear(int(h[i : i + 2], 16) / 255) for i in (0, 2, 4))
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = 1.0
    for slot in ("Specular IOR Level", "Specular"):
        if slot in bsdf.inputs:
            bsdf.inputs[slot].default_value = 0.0
    if unlit:
        # Emission on the same BSDF rather than a separate shader, so the alpha branch below still
        # applies to it — an emissive part that cannot be made transparent is no use to a beam.
        bsdf.inputs["Base Color"].default_value = (0.0, 0.0, 0.0, 1.0)
        bsdf.inputs["Emission Color"].default_value = (*rgb, 1.0)
        bsdf.inputs["Emission Strength"].default_value = 1.0
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        # EEVEE renders alpha only when the material asks for it, and the property was renamed: 4.2+
        # calls it surface_render_method, older builds blend_method. Set whichever exists, or the part
        # comes back fully opaque with no error to say why.
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "BLENDED"
        elif hasattr(mat, "blend_method"):
            mat.blend_method = "BLEND"
    return mat


def paint(obj, hex_colour):
    """The rank's own colour over the prop, and its own colour over any part that asked for one.

    Not decoration: a grey render is unrecognisable. Asked to repaint an untextured grey table, the
    generator read the shape as wooden door panels and filled them with photographic burl. A scaffold
    that already arrives brown, in palette, and lit so its top reads lighter than its front is a table
    the model can recognise, and the repaint becomes texture rather than interpretation.

    ONE colour only gets that half done. A market table painted in a single brown is a brown table with
    brown things on it, and the balance and the grain heap are left for the repaint to identify from
    silhouette alone. Marked parts arrive told apart, and each takes `--colour-<name>` or the default in
    PART_COLOURS.

    Each also takes `--alpha-<name>`, which makes that part see-through in the finished tile — the mask
    is the render's alpha and the import multiplies by it. The priest's linen is the only user: his rank
    is thin bleached cloth at `--alpha-cloth=0.6`, and every other rank's is heavier and stays opaque.

    The hole is the case that forced this. `prim_pit`'s shaft is a surface like any other and shades like
    any other, so one flat colour handed the generator a rack with a mid-grey gap in it; at slot size
    that gap measured the same value as the floor behind the sprite and no hole read at all."""
    names = [m.name if m else "" for m in obj.data.materials]
    if not any(names):
        obj.data.materials.clear()
        obj.data.materials.append(flat_material("prop", hex_colour))
        return
    for i, name in enumerate(names):
        # By the PART, so `cloth!nocast` is painted cloth — see `nocast`.
        default = PART_COLOURS.get(part_of(name), hex_colour)
        # Keeps the slot's NAME, not `prop{i}`. `make_shadow` reads it back to find the void, and a
        # renamed slot leaves it unable to tell an absence from stone.
        #
        # But the FLAGS are looked up by the part, for the same reason the default is: a slot called
        # `haze!nocast` is still haze, and `--alpha-haze` has to reach it. Keyed on the raw slot name the
        # flag silently missed — the exit's shaft took its `--alpha-haze` for three sweeps and rendered
        # opaque every time, which reads as the beam being too bright rather than as a flag not arriving.
        part = part_of(name)
        obj.data.materials[i] = flat_material(
            name,
            arg(f"colour-{part}", default),
            float(arg(f"alpha-{part}", "1")),
            part in unlit_parts(),
        )


def load_subject(mesh_path, primitive):
    if primitive:
        if primitive not in PRIMITIVES:
            raise SystemExit(f"unknown primitive: {primitive} (have {', '.join(sorted(PRIMITIVES))})")
        return PRIMITIVES[primitive]()
    if mesh_path.endswith(".glb") or mesh_path.endswith(".gltf"):
        bpy.ops.import_scene.gltf(filepath=mesh_path)
    elif mesh_path.endswith(".obj"):
        # The importer moved namespace in Blender 4.0; accept either so the script does not depend on
        # which build happens to be installed.
        if hasattr(bpy.ops.wm, "obj_import"):
            bpy.ops.wm.obj_import(filepath=mesh_path)
        else:
            bpy.ops.import_scene.obj(filepath=mesh_path)
    elif mesh_path.endswith(".stl"):
        # Museum scans arrive as STL more often than anything else, and carry no materials at all —
        # which suits a scaffold, since --colour paints it in the rank's own stone anyway.
        if hasattr(bpy.ops.wm, "stl_import"):
            bpy.ops.wm.stl_import(filepath=mesh_path)
        else:
            bpy.ops.import_mesh.stl(filepath=mesh_path)
    elif mesh_path.endswith(".ply"):
        if hasattr(bpy.ops.wm, "ply_import"):
            bpy.ops.wm.ply_import(filepath=mesh_path)
        else:
            bpy.ops.import_mesh.ply(filepath=mesh_path)
    else:
        raise SystemExit(f"unknown mesh format: {mesh_path}")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.join()
    return bpy.context.object


def make_active(obj):
    """transform_apply needs an active, selected object in object mode, and an imported mesh is not
    reliably either."""
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def local_bounds(obj):
    """The mesh's own extents, read from the VERTICES.

    Not from `bound_box`: that is a cached value and it does not refresh after `data.transform`, so it
    keeps reporting the shape as it was before the shear. The first cube framed itself from those stale
    numbers and came out cropped, with the geometry perfectly correct underneath."""
    vs = obj.data.vertices
    if not vs:
        raise SystemExit("mesh has no vertices")
    xs = [v.co.x for v in vs]
    ys = [v.co.y for v in vs]
    zs = [v.co.z for v in vs]
    return (min(xs), max(xs)), (min(ys), max(ys)), (min(zs), max(zs))


def array_copies(obj, count, gap, jitter):
    """Stands several of the object side by side, each turned a little.

    Some props are not one thing. A shabti is a 20cm figurine and a burial held dozens of them — 365 in
    a generous one, stood in rows — so a single one alone in the middle of a chamber is both wrong and
    lonely, 14 units wide in a 56 unit cell. The same is true of sherds, of loose bricks, of a heap of
    anything.

    Copies are turned slightly and set at slightly different depths, because a row of identical figures
    facing exactly the same way reads as a repeated sprite rather than as a set of objects."""
    if count < 2:
        return obj
    (x0, x1), (y0, y1), _ = local_bounds(obj)
    step = (x1 - x0) * gap
    originals = []
    for i in range(count):
        offset = (i - (count - 1) / 2) * step
        if i == 0:
            copy = obj
        else:
            copy = obj.copy()
            copy.data = obj.data.copy()
            bpy.context.scene.collection.objects.link(copy)
        turn = math.radians(((i * 37) % 21) - 10) * jitter
        # And a little size variation. Identical SILHOUETTES are what makes a repeated sprite obvious —
        # not identical subjects, which is what a set of mould-made shabtis genuinely is. Rotation varies
        # the shading, size varies the outline, and between them four copies stop reading as one copied
        # four times.
        grow = 1.0 + (((i * 29) % 9) - 4) / 100.0 * 3 * jitter
        # Depth jitter stays TINY. Under this shear a copy set further back is drawn higher, which is
        # correct and which at 40 pixels reads as the thing hovering. Turning them is what breaks the
        # repetition; moving them back is what breaks the floor.
        depth = ((i * 53) % 7 - 3) / 3 * (y1 - y0) * 0.05 * jitter
        copy.data.transform(Matrix.Rotation(turn, 4, "Z"))
        copy.data.transform(Matrix.Diagonal((grow, grow, grow, 1.0)))
        copy.data.transform(Matrix.Translation((offset, depth, 0.0)))
        originals.append(copy)
    bpy.ops.object.select_all(action="DESELECT")
    for o in originals:
        o.select_set(True)
    bpy.context.view_layer.objects.active = originals[0]
    bpy.ops.object.join()
    return bpy.context.object


def seat_and_normalise(obj):
    """One unit tall, centred on X and Y, standing on z=0 — so every prop enters the shear at the same
    size whatever the mesh generator handed back, and the framing below can be fixed rather than fitted.

    Returns the drawn width and depth, and with them the SCALE it applied and WHERE THE PRIMITIVE'S OWN
    ORIGIN LANDED. Anything built after this — `--context`'s floor is the only thing today — is authored
    in the primitive's metres and has to be told both, or it draws at a seventh of its size a whole unit
    below where it belongs. A shallow prop is scaled hardest: the basin is 0.16 metres tall, so it leaves
    here 6.3 times bigger and its ground plane is 0.70 above the origin."""
    make_active(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    (x0, x1), (y0, y1), (z0, z1) = local_bounds(obj)
    height = z1 - z0
    if height <= 0:
        raise SystemExit("mesh has no height")
    obj.data.transform(Matrix.Scale(1 / height, 4))
    (x0, x1), (y0, y1), (z0, z1) = local_bounds(obj)
    origin = (-(x1 + x0) / 2, -(y1 + y0) / 2, -z0)
    obj.data.transform(Matrix.Translation(origin))
    (x0, x1), (y0, y1), (z0, z1) = local_bounds(obj)
    return x1 - x0, y1 - y0, 1 / height, origin


def drop_void_faces(mesh_obj):
    """Removes any face marked VOID or NOCAST, so nothing that fails to touch the floor casts on it.

    A part marked void is a HOLE — the inside of `prim_pit`'s shaft — and a hole does not sit on the
    floor, so it must not appear in a flattened footprint. The pit was given `--shadow=0` instead, which
    is right about the hole and wrong about everything beside it: the broken mudbrick round its mouth
    lies on the floor like any other prop and came out with no footprint at all, reading as pasted on
    rather than dropped there.

    NOCAST is the same idea for a part that is solid but hangs: the pit's pole lies across the mouth and
    its ladder hangs into the shaft, and flattening those to z=0 put dark slabs on the floor beside the
    hole. A shadow belongs to whatever TOUCHES the ground, which for that tile is the spoil and nothing
    else.

    Doing it here rather than in the caller means the rule holds for every hole the set gets — `breach`
    and `plug` are next — and a primitive with a void part takes a normal `--seat` like anything else."""
    # `m.name.split(".")[0]`, and the suffix is not cosmetic. `mark` creates a datablock called "void",
    # then `paint` creates ANOTHER material with that name — so Blender uniquifies it to "void.001" and an
    # exact-name test silently matches nothing. This function quietly did nothing at all until that was
    # printed out.
    void = [
        i
        for i, m in enumerate(mesh_obj.data.materials)
        if m and (part_of(m.name) in (VOID, NOCAST) or m.name.split(".")[0].endswith(NOCAST_SUFFIX))
    ]
    if not void:
        return
    mesh = mesh_obj.data
    doomed = [poly.index for poly in mesh.polygons if poly.material_index in void]
    if not doomed:
        return
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.faces[i] for i in doomed], context="FACES")
    bm.to_mesh(mesh)
    bm.free()


# The vertical allowance `add_camera` has always made for the sun. It buys nothing now that the offset
# runs in X, but it is kept to the digit: the span it produces is the span every painted master's mask was
# cut at, and a frame that changes zoom leaves the art no longer fitting the silhouette.
K_SUN_DROP_LEGACY = 0.7


def sun_offset(obj, sun, width, height, margin):
    """How far to push the footprint, and ALONG WHICH AXIS. Returns (dx, dy), and dy is always zero.

    THE DERIVATION, because this was patched three times before it was worked out. A world point
    (x, y, z) draws at (x, z + k*y), so a floor point (x, y, 0) draws at (x, k*y) — which means an
    UNSHIFTED footprint touches its object by construction, at every contact point, for free.

    Now shift the footprint by (dx, dy). The dx moves it sideways and changes nothing about its drawn
    height. The dy moves every point of it k*dy vertically, and there is no value of dy that does
    anything else: a footprint pushed toward the viewer is drawn BELOW the object's own lowest edge by
    k*|dy|, leaving a crescent of shadow with no object above it, and a footprint pushed away is drawn
    above and hides behind the object entirely. The first reads as the prop hovering; the second reads as
    no shadow at all.

    So `--sun` may only move along X. That is the same law as `prim_sconce`'s arm and `prim_lamp`'s spout
    — Y is the depth axis and feeds the drawn vertical, X is the only axis the projection leaves alone —
    and here it applies to the light rather than to the geometry. It also agrees with the rig: `add_light`
    aims its sun at (+0.18, +0.33, -0.93), so the shadow belongs to the RIGHT. The old code pushed it
    toward the viewer, which is the one direction the light never came from.

    CLAMPED to the air the frame already has, and that is deliberate. `add_camera` is framed from --sun
    rather than from the shadow's own bounds so that the three renders of a prop composite, which means
    changing the framing changes the MASK — and every painted master was drawn over the mask it had. So
    the offset gives way to the frame instead of the frame giving way to the offset. A tall prop has
    plenty of horizontal air and gets the full sun; a wide flat one has almost none and gets almost no
    offset, which is right anyway — `prim_pillar` records that a slab's own footprint lies under itself
    and no sun can pull it clear."""
    (x0, x1), _, (z0, z1) = local_bounds(obj)
    span_x = (x1 - x0) * margin
    span_z = (z1 - z0 + K_SUN_DROP_LEGACY * sun) * margin
    scale = max(span_x if width >= height else span_x * height / width,
                span_z if height >= width else span_z * width / height)
    frame_w = scale if width >= height else scale * width / height
    # The frame is centred on x=0 (see `add_camera`), so the room is on the +x side alone.
    room = frame_w / 2 - x1
    return max(0.0, min(sun, room * 0.9)), 0.0


def make_shadow(obj, depth, floor_hex, offset_x, offset_y):
    """The object's own footprint, lying on the floor, painted as that floor in shadow.

    Blender knows the shape, so the shadow does not have to be invented in paint — and this projection
    makes it almost free. A floor point (x, y, 0) draws at (x, k*y), so the shadow is the object
    FLATTENED to z=0 and put through the same shear. No ray tracing, no shadow catcher, no dependence on
    which engine or which Blender version.

    It is rendered OPAQUE, in the rank's floor colour darkened. Opaque because the SCAFFOLD carries this
    shadow against the magenta backdrop, where any alpha comes back magenta-tinted and the keyer either
    eats it or fringes it. The seat render has no backdrop, and `import-tile --seat-opacity` fades it
    there instead, so the paving shows through it — an opaque patch replaces the floor rather than
    shading it, and on a pale rank every prop sits in a hole.

    `--floor` therefore has to name the RANK BEING BUILT. Left at its default the nobleman's props were
    each seated in a patch of the merchant's floor, 62 luminance darker than the one they stand on, and
    that — not the shadow being a shadow — is what read as too black.

    `offset` is the light, and it may only move along X. See `sun_offset` for the derivation — a shift in
    Y is arithmetically the same thing as lifting the object off the ground."""
    # TWO flattened copies, unioned: one exactly under the object and one pushed along the light.
    #
    # A shadow touches its object where the OBJECT TOUCHES THE GROUND, and translating the whole
    # footprint moves that contact away. The copy at zero holds the contact; the offset copy gives the
    # pool its direction and spread. They overlap, and that costs nothing: the material is flat emission,
    # so two copies of it render exactly as one.
    #
    # This union is NOT what makes the shadow attach, which took four goes to see. With a Y offset the
    # union's lowest drawn edge is still k*|dy| below the object's own, and that protruding crescent is
    # the whole tell. Only `sun_offset`'s rule fixes it.
    shadow = obj.copy()
    shadow.data = obj.data.copy()
    bpy.context.scene.collection.objects.link(shadow)
    drop_void_faces(shadow)
    # Flattened to the plane the CASTING GEOMETRY RESTS ON, which is not always z=0.
    #
    # `seat_and_normalise` puts the object's lowest point at z=0, and for almost everything that is the
    # floor. For `prim_pit` it is the bottom of the SHAFT: the floor sits three quarters of the way up the
    # object, so flattening to z=0 laid the spoil's footprints half a shaft-depth below the bricks that
    # cast them. Taking the minimum z of what survives the void-drop puts the shadow back on the ground —
    # and leaves every ordinary prop exactly where it was, because for those that minimum IS zero.
    rest = min((v.co.z for v in shadow.data.vertices), default=0.0)
    # NOT CAST FROM THE LOW GEOMETRY ONLY, which was tried here and is worth recording as a dead end.
    # The plan of a light straight overhead reaches past the contact for anything whose widest part is
    # high — the basin's jar overhangs its tripod — so keeping only the faces within a third of the
    # resting plane looked like the fix. It is not: the market table loses its pool and arrives as four
    # black dots at the feet, which reads as debris on the floor rather than as a table's shadow. The
    # overhang is honest, and once the sun runs in X it is attached at the feet anyway.
    shadow.data.transform(Matrix.Diagonal((1.0, 1.0, 0.0, 1.0)))
    shadow.data.transform(Matrix.Translation((0.0, 0.0, rest)))
    if offset_x or offset_y:
        anchored = shadow.data.copy()
        shadow.data.transform(Matrix.Translation((offset_x, offset_y, 0.0)))
        contact = bpy.data.objects.new("shadow-contact", anchored)
        bpy.context.scene.collection.objects.link(contact)
        make_active(shadow)
        contact.select_set(True)
        bpy.ops.object.join()
        shadow = bpy.context.object
    h = floor_hex.lstrip("#")
    rgb = tuple(srgb_to_linear(int(h[i : i + 2], 16) / 255) * (1.0 - depth) for i in (0, 2, 4))
    mat = bpy.data.materials.new("shadow")
    mat.use_nodes = True
    tree = mat.node_tree
    for node in list(tree.nodes):
        if node.type != "OUTPUT_MATERIAL":
            tree.nodes.remove(node)
    # Emission, so the shadow is exactly the colour asked for and is not itself lit or shaded.
    emission = tree.nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = (*rgb, 1.0)
    out = next(n for n in tree.nodes if n.type == "OUTPUT_MATERIAL")
    tree.links.new(emission.outputs[0], out.inputs["Surface"])
    shadow.data.materials.clear()
    shadow.data.materials.append(mat)
    return shadow


def shear(obj, k, spin_degrees):
    """Spin on the floor first, then shear. Order matters: shearing a spun object is a different view of
    the same thing, while spinning a sheared one is nonsense.

    Both go onto the MESH DATA, not onto the object's transform. An object matrix is decomposed into
    location, rotation and scale — a shear is none of those and would be silently thrown away, leaving a
    plain front elevation that looks like the projection simply failed again."""
    if spin_degrees:
        obj.data.transform(Matrix.Rotation(math.radians(spin_degrees), 4, "Z"))
    # z' = z + k*y, everything else identity.
    obj.data.transform(Matrix(((1, 0, 0, 0), (0, 1, 0, 0), (0, k, 1, 0), (0, 0, 0, 1))))


def join_and_shear(parts, k):
    """Merge a list of freshly built objects into ONE mesh, then shear it.

    `shear` transforms mesh DATA, and `box` applies only its scale — a box's location stays on the object
    transform, so its local vertices sit around the origin however far out in the world it was placed.
    Sheared one at a time, therefore, a row of boxes is each slanted about its own centre and NONE of them
    is lifted by k*y: they all draw at the same height, piled into one band, and the rows further out
    simply are not where they should be.

    Primitives never meet this because `join_all` merges everything into one mesh BEFORE the shear, and
    joining bakes each part's world position into the merged vertices. Anything built AFTER the primitive,
    one object at a time — which is what `--context` does — has to do the same thing deliberately.

    It cost a long chase. The symptom was "only the courses in front of the hole draw", and it drew three
    confident and wrong explanations out of me in turn: z-fighting with the floor, the floor's extent, and
    the camera being on the far side. None of them was it, and each looked plausible enough to act on."""
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    merged = bpy.context.object
    shear(merged, k, 0)
    return merged


def add_shadow_catcher(k, span):
    """A ground plane that catches a REAL shadow, for the Cycles path.

    It is sheared with the same matrix as the object, which is what makes the shadow correct rather than
    merely plausible: a shear is linear, so shadows computed on sheared geometry are the sheared true
    shadows — provided the light direction is sheared too. A straight-down sun is the happy case, because
    this matrix maps (0, 0, -1) to itself, so nothing has to be corrected."""
    bpy.ops.mesh.primitive_plane_add(size=span * 6, location=(0, 0, 0))
    plane = bpy.context.object
    plane.data.transform(Matrix(((1, 0, 0, 0), (0, 1, 0, 0), (0, k, 1, 0), (0, 0, 0, 1))))
    plane.is_shadow_catcher = True
    return plane


def add_camera(obj, width, height, margin=1.06, drop=0.0):
    """Framed from the bounds AFTER the shear, which are not the bounds before it.

    Shearing pushes the near-bottom edge DOWN as far as it pushes the far-top edge up: a unit cube at
    k=1 spans -0.5 to 1.5, not 0 to 2. Framing from the pre-shear box cropped half a unit off the
    bottom of the first cube rendered, which measured as 1.5 units of a 2-unit object.

    `drop` is room under the object for its SHADOW, and it is not optional. The footprint is pushed
    `--sun` of the object's depth toward the viewer, and the shear draws that as k*sun*depth BELOW the
    object's own lowest point — outside a frame fitted to the object, where it is cut off square. It
    showed worst on the brazier, whose dish is wide and whose legs are short, so most of its pool fell
    past the edge and the tile arrived with a straight line sliced across the shadow.

    It is computed from --sun and the depth rather than taken from the shadow's own bounds, and that
    matters: the mask is rendered with --shadow=0 and so has no shadow object to measure. Measured, the
    three renders of a prop would be framed differently and would no longer composite."""
    (x0, x1), _, (z0, z1) = local_bounds(obj)
    z0 -= drop
    span_x = (x1 - x0) * margin
    span_z = (z1 - z0) * margin
    # ortho_scale covers the LARGER rendered dimension, so the other one has to be derived from it or the
    # object is framed to one axis and cropped on the other.
    scale = max(span_x if width >= height else span_x * height / width, span_z if height >= width else span_z * width / height)
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    # No tilt: the shear has already put depth into height. Any camera angle here would ADD perspective
    # on top of the projection and undo the entire point of the file.
    cam_data.ortho_scale = scale
    cam = bpy.data.objects.new("cam", cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = (0, -10, (z0 + z1) / 2)
    cam.rotation_euler = (math.radians(90), 0, 0)
    bpy.context.scene.camera = cam


def add_preview_camera(obj, spin_degrees=35.0, pitch_degrees=28.0):
    """A PERSPECTIVE three-quarter view of the mesh, unsheared — for checking the model, never the tile.

    Everything else in this file renders through the shear, which is the point of it, and that view
    answers one question well and another not at all. It says exactly what the map will draw. It says
    nothing about whether the thing is BUILT: under z + k*y two parts that touch in the world need not
    touch on the page, and two far apart in depth can land on top of each other — `prim_rubbleheap`
    records a crown that hid behind the brick it was meant to sit on, and `prim_sconce` a brace that
    floated under its own arm. Both were obvious the moment the mesh was seen from the side.

    So this is a MODELLER's view. Judge contact, overlap and proportion here; judge the tile in the
    sheared render and on the floor, and never the other way round — a heap that looks well built in
    three-quarter can still draw as a smudge at 56 units, which is most of what this file's docstrings
    are about."""
    (x0, x1), (y0, y1), (z0, z1) = local_bounds(obj)
    centre = Vector(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    reach = max(x1 - x0, y1 - y0, z1 - z0) * 2.6
    yaw, pitch = math.radians(spin_degrees), math.radians(pitch_degrees)
    offset = Vector((math.sin(yaw) * math.cos(pitch), -math.cos(yaw) * math.cos(pitch), math.sin(pitch))) * reach
    cam_data = bpy.data.cameras.new("preview")
    cam_data.lens = 60
    cam = bpy.data.objects.new("preview", cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = centre + offset
    cam.rotation_euler = (centre - cam.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam


def add_light(ambient=0.35):
    """Flat and frontal on purpose. The set is painted, matte, with no specular anywhere
    (tile-art-brief.md, "The style"), so a rendered prop must not arrive with highlights the painted
    ones do not have. This is the part most likely to look wrong beside the painted props."""
    sun_data = bpy.data.lights.new("sun", type="SUN")
    sun_data.energy = 3.0
    sun_data.angle = math.radians(45)
    sun = bpy.data.objects.new("sun", sun_data)
    bpy.context.scene.collection.objects.link(sun)
    # Steep, so UP-facing faces read clearly brighter than viewer-facing ones. The shear tilts every
    # normal toward the camera, which flattens the difference between a top and a front until the whole
    # object is one grey — and a scaffold with no face separation gives the repaint nothing to hold.
    sun.rotation_euler = (math.radians(22), 0, math.radians(-28))
    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    # Ambient is what stops a shadow being an absence. On the Cycles path a shadow catcher reports how
    # much light a point LOST, so with no ambient the area under a tabletop loses everything and renders
    # as a black hole. Raising this trades shadow contrast for a shadow that reads as shadow.
    world.node_tree.nodes["Background"].inputs[1].default_value = ambient
    bpy.context.scene.world = world


def add_backdrop(hex_colour, obj):
    """A flat emissive plane behind everything, in the colour the generator expects to key out.

    An EMISSION shader, so the backdrop is exactly the hex asked for and takes no light. The compositor
    would have been tidier, but `scene.node_tree` no longer exists in Blender 5 and a plane works on
    every version.

    Why bother at all: the generator cannot output alpha, which is why every prompt in this set asks for
    magenta and every import keys it out. A render HAS alpha, so the magenta never needs asking for — and
    one we lay down ourselves is exactly flat, exactly the right hex, and reaches all four edges, which
    is three things a prompt no longer has to nag about."""
    (x0, x1), _, (z0, z1) = local_bounds(obj)
    span = max(x1 - x0, z1 - z0) * 8
    bpy.ops.mesh.primitive_plane_add(size=span, location=(0, 12, (z0 + z1) / 2), rotation=(math.radians(90), 0, 0))
    plane = bpy.context.object
    mat = bpy.data.materials.new("backdrop")
    mat.use_nodes = True
    tree = mat.node_tree
    for node in list(tree.nodes):
        if node.type != "OUTPUT_MATERIAL":
            tree.nodes.remove(node)
    emission = tree.nodes.new("ShaderNodeEmission")
    h = hex_colour.lstrip("#")
    emission.inputs["Color"].default_value = (*(srgb_to_linear(int(h[i : i + 2], 16) / 255) for i in (0, 2, 4)), 1.0)
    emission.inputs["Strength"].default_value = 1.0
    out = next(n for n in tree.nodes if n.type == "OUTPUT_MATERIAL")
    tree.links.new(emission.outputs[0], out.inputs["Surface"])
    plane.data.materials.append(mat)
    return plane


def render(out_path, width, height, engine, samples):
    scene = bpy.context.scene
    if engine == "cycles":
        scene.render.engine = "CYCLES"
        scene.cycles.samples = samples
        # Metal on Apple silicon, CUDA elsewhere; falls back to CPU if neither is configured, which for
        # a scene of a few hundred triangles costs seconds rather than minutes.
        try:
            prefs = bpy.context.preferences.addons["cycles"].preferences
            for kind in ("METAL", "CUDA", "OPTIX", "HIP"):
                try:
                    prefs.compute_device_type = kind
                    break
                except TypeError:
                    continue
            prefs.get_devices()
            for d in prefs.devices:
                d.use = True
            scene.cycles.device = "GPU"
        except (KeyError, AttributeError):
            pass
    else:
        # EEVEE was renamed in 4.2. Take whichever this build has rather than pinning a version.
        for name in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "CYCLES"):
            try:
                scene.render.engine = name
                break
            except TypeError:
                continue
    # Transparent film even when a background is composited: the compositor needs the alpha to lay the
    # render over the colour, and --background=none then gives a genuine cut-out for masking later.
    scene.render.film_transparent = True
    # Standard, not AgX. Blender's default view transform is a film emulation: it would roll off the
    # highlights and shift every hex on the way out, so a material set to #a49781 would not render as
    # #a49781 and the palette clamp would be measuring something the art never contained.
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)


def main():
    mesh = arg("mesh")
    primitive = arg("primitive")
    if not mesh and not primitive:
        raise SystemExit("pass --mesh=<file> or --primitive=cube")
    out = arg("out", "/tmp/prop.png")
    # 0.7, not the 1.0 of textbook cavalier: matched against the props already hand-painted and approved.
    # The market table drawn by hand has aspect 0.77; at shear 1.0 the render comes out 0.98 and reads
    # markedly more top-down than the set, at 0.7 it comes out 0.83. The painted work is the baseline the
    # rendered work has to join, not the other way round.
    k = float(arg("shear", "0.7"))
    spin = float(arg("spin", "0"))
    width = int(arg("width", DEFAULT_W))
    height = int(arg("height", DEFAULT_H))

    colour = arg("colour", "#5c5347")

    # How far the floor is darkened where the object stands. 0.8, which is far darker than it sounds,
    # because it was measured against the props already painted by hand rather than guessed: their bottom
    # bands come in at 12, 18 and 37, where 0.35 rendered 81. The painted set puts a near-black void under
    # a thing, and a rendered prop has to join that convention or it floats.
    shadow_alpha = float(arg("shadow", "0.8"))

    # How far the flattened footprint is pushed toward the viewer — which is to say where the sun is.
    #
    # IT SCALES WITH HEIGHT, NOT WITH DEPTH, and getting that backwards is what made every prop in this
    # file need its own --sun. A shadow's offset is `height / tan(elevation)`: a tall thing throws its
    # shadow far and a flat thing throws it barely at all, and the object's DEPTH has nothing to do with
    # it. Multiplied by depth instead, the numbers came out close to random — the brick spill, the
    # flattest thing in the set, got the LARGEST offset of any prop at 0.240, because a wide flat spread
    # normalised to height 1 becomes enormous in y; the awning, which stands tall, got 0.027.
    #
    # `seat_and_normalise` makes every object exactly 1.0 tall, so height is a constant here and --sun is
    # simply the offset. One number for the whole set, which is what a single sun elevation means: the
    # per-prop overrides existed only to undo the depth term.
    #
    # `prim_pillar` records the limit this does not fix: a slab flat on the floor casts a copy of itself
    # at ANY offset, because --sun shifts a footprint in depth and never out from under a shape as wide
    # as the shadow it makes.
    sun = float(arg("sun", "0.12"))

    clear_scene()
    obj = load_subject(mesh, primitive)
    # Meshes get painted too, not just primitives: a scan has no material and a generated mesh usually
    # has a photographic one, and neither is what the repaint wants to be handed. --colour=none keeps
    # whatever the file brought.
    if colour != "none":
        paint(obj, colour)
    obj = array_copies(obj, int(arg("copies", "1")), float(arg("gap", "1.35")), float(arg("jitter", "1.0")))
    w_units, d_units, norm, origin = seat_and_normalise(obj)
    # Depth is the strongest lever on how a prop reads: it decides how much TOP the shear reveals, and so
    # how tall the sprite lands in its cell. Tuned against the hand-painted props rather than guessed.
    depth = float(arg("depth", "1.0"))
    if depth != 1.0:
        obj.data.transform(Matrix.Diagonal((1.0, depth, 1.0, 1.0)))
        w_units, d_units = local_bounds(obj)[0][1] - local_bounds(obj)[0][0], (
            local_bounds(obj)[1][1] - local_bounds(obj)[1][0]
        )
    if spin:
        obj.data.transform(Matrix.Rotation(math.radians(spin), 4, "Z"))
    engine = arg("engine", "eevee")
    # --preview short-circuits the whole projection: no shadow, no shear, a perspective camera. It is for
    # looking at the MESH, and nothing it shows is what the map draws.
    if arg("preview"):
        add_preview_camera(obj, float(arg("spin-view", "35")), float(arg("pitch-view", "28")))
        # No backdrop: `add_backdrop` sizes its card to the SHEARED framing and a perspective camera
        # sees straight past it. A modeller's view wants the silhouette against nothing anyway.
        add_light(float(arg("ambient", "0.35")))
        render(out, width, height, engine, int(arg("samples", "64")))
        return
    if engine == "cycles":
        # A real cast shadow, softened by the sun's angular size, instead of a flat footprint.
        shear(obj, k, 0)
        add_shadow_catcher(k, max(w_units, d_units, 1.0))
    else:
        dx, dy = sun_offset(obj, sun, width, height, float(arg("margin", "1.06")))
        shadow = make_shadow(obj, shadow_alpha, arg("floor", "#6c6257"), dx, dy) if shadow_alpha > 0 else None
        if shadow:
            shadow.data.transform(Matrix(((1, 0, 0, 0), (0, 1, 0, 0), (0, k, 1, 0), (0, 0, 0, 1))))
        shear(obj, k, 0)
    # After the shear the drawn height is the object's height plus k times its depth: that is the whole
    # projection in one line, and it is why a deep object comes out taller on the page than a shallow one.
    # --margin is air around the object, and it matters on the WALL slot in a way it does not elsewhere:
    # `SLOTS.wall` is `seat: false`, so the import does not trim and re-seat — it scales the whole FRAME
    # into 56x28. A prop's frame is discarded; a wall item's frame IS its placement. So a compact thing
    # like a sconce is given margin here rather than being blown up to fill the band.
    add_camera(obj, width, height, float(arg("margin", "1.06")), k * sun)
    add_light(float(arg("ambient", "0.35")))
    background = arg("background", "#ff00ff")
    if background != "none":
        add_backdrop(background, obj)
    # --only=shadow renders the footprint ALONE, in the same frame as the object.
    #
    # A prop's shadow is geometry, not material, and every repaint so far has proved it: told to paint a
    # shadow the generator paints an invented floor across the footprint instead, and the mask then keeps
    # a slab of floor-coloured pixels where the seating should be. The shelf and the crate both came back
    # with nothing at all below 35 where the hand-painted props sit at 2% to 11%. So the shadow is kept
    # out of the repaint's hands: mask the art to the OBJECT alone (--shadow=0) and put this render back
    # underneath it at import (--seat).
    #
    # Removed after add_camera and add_backdrop on purpose — both frame from the object, so all three
    # renders of a prop share one frame to the pixel and composite without alignment.
    if arg("only", "both") == "shadow":
        bpy.data.objects.remove(obj, do_unlink=True)
    # --drop=part[,part] renders the object WITHOUT those parts, for the same reason and in the same
    # place: after the frame is fixed, so two renders of one primitive line up to the pixel.
    #
    # It exists so a tile can be part paint and part render. The exit is the case — a marker stone the
    # generator paints and a shaft of light it cannot, because a repaint comes back opaque on magenta and
    # the beam's whole point is that the paving shows through it. Rendering the stone alone and the light
    # alone from the same primitive gives a scaffold to paint over and an overlay to lay back on top of
    # the return (`import-tile --overlay`), with nothing positioned by hand.
    #
    # Dropping is FACES, not objects, because `join_all` has already merged everything into one mesh by
    # then. Framing is unaffected either way: `seat_and_normalise` and `add_camera` have both run.
    drop = {p.strip() for p in (arg("drop") or "").split(",") if p.strip()}
    if drop and arg("only", "both") != "shadow":
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        gone = [f for f in bm.faces if part_of(obj.data.materials[f.material_index].name) in drop]
        bmesh.ops.delete(bm, geom=gone, context="FACES")
        bm.to_mesh(obj.data)
        bm.free()
    # --context lays a slab of FLOOR under the object, for the generator's eye and for nothing else.
    #
    # A HOLE CANNOT PROVE ITSELF ON MAGENTA. Every other prop is a thing you could pick up, and a product
    # shot suits it; a hole is an absence in a surface, and with the surface missing the same picture is
    # equally a tank, a panel or a flat pattern. The priest's sacred pool proved both readings in turn — a
    # raised stone tub first, then, told nothing may stand up, a flat plan diagram with no depth at all.
    #
    # `prim_pit` gets away without this because it is full of things that cross its own edge: a ladder
    # over the near lip, spoil on the paving outside it. Where a hole has no such furniture, the surface
    # has to be drawn instead.
    #
    # It is added AFTER add_camera, so it cannot change the frame, and it is passed ONLY on the render
    # that is handed over. The mask and the footprint never see it, so no floor reaches the tile and the
    # paint that lands on it is discarded exactly as an invented background is. Bigger than the frame on
    # purpose: a slab with visible edges would read as a plinth the hole is cut into rather than as ground
    # going on past the picture.
    if arg("context") and arg("only", "both") != "shadow":
        # A FLOOR WITH A HOLE CUT IN IT, the hole being this object's own footprint.
        #
        # Not a slab behind the object, which is what this was first and which is a fudge: with no opening
        # the floor is simply a backdrop the pool is drawn over, and the geometry says nothing the paint
        # can trust. Cut, the floor's own edge IS the lip of the hole — the near edge stops where the
        # paving stops, the far edge is what the water runs up to, and the shear draws all of it correctly
        # without anything being positioned by eye to look right.
        #
        # Four boxes rather than a boolean: the opening is a rectangle, and four boxes round a rectangle
        # ARE a rectangle with a hole in it, at no cost and with no modifier to apply.
        # THE OPENING IS DECLARED, not measured off the object. Cut to the object's own bounds the hole
        # swallows anything standing BESIDE it — and the paving is there precisely so that something can
        # stand on it, which is how the pool lost a jar to its own hole. `--context=WxD` gives the
        # opening; `--context=1` falls back to the bounds, for an object that is nothing but its hole.
        #
        # THE OPENING IS GIVEN IN THE PRIMITIVE'S OWN METRES, and converted here. `seat_and_normalise`
        # has already made the object one unit tall, which for a shallow thing is an enormous scale —
        # the basin is 0.16m tall and leaves seating 6.3x bigger, 6.96 units wide. Taken literally,
        # `--context=0.92x0.62` therefore cut a hole a seventh of the size of the object it was meant to
        # be the hole for, and laid the paving in a band narrower than the pool with the base showing
        # round it. The same scale applies to the FLOOR PLANE: a primitive is authored standing on z=0,
        # seating moves that plane up by `origin`, and paving left at z=0 sits a unit under the coping.
        ox, oy, oz = origin
        spec = arg("context", "1")
        if "x" in spec:
            hw, hd = (float(v) * norm for v in spec.split("x", 1))
            ox0, ox1, oy0, oy1 = ox - hw / 2, ox + hw / 2, oy - hd / 2, oy + hd / 2
        else:
            (ox0, ox1), (oy0, oy1), _ = local_bounds(obj)
        far = 20.0
        # THE FLOOR IS LAID AS SLABS WITH REAL GAPS over a dark base, and every piece is placed by
        # TRANSLATING ITS MESH rather than by setting the object's location.
        #
        # That distinction is the whole reason this took as long as it did. `shear` transforms mesh DATA,
        # and `box` applies only its SCALE — a box's location stays on the object transform, where the
        # shear never sees it. Sheared, such a box is slanted about its own centre and not lifted by k*y
        # at all, so a grid of forty slabs draws as forty slabs stacked in one band beside the hole with
        # nothing anywhere else. Joining them first does not fix it either.
        #
        # Primitives never meet this because everything inside one is merged by `join_all` before the
        # shear. Anything built AFTER, one object at a time, has to put its offset somewhere the shear can
        # read — which means the mesh.
        #
        # Joints as gaps rather than bars laid on a solid floor: a gap is an absence and cannot lose a
        # depth test to the surface it is cut in.
        def ground(sx, sy, sz, x, y, z, mat):
            o = box(sx, sy, sz)
            o.data.transform(Matrix.Translation((x, y, z)))
            shear(o, k, 0)
            o.data.materials.clear()
            o.data.materials.append(mat)
            return o

        dark = flat_material("joint", arg("joint", "#4c5560"))
        paving = flat_material("context", arg("floor", "#6c6257"))
        # The grid is ALIGNED TO THE HOLE, its slab size dividing the opening exactly, so no slab ever
        # straddles the lip and the paving meets the coping on a joint rather than mid-slab. Slab size
        # sets the joint width and the paving's thickness too, so the floor keeps its proportions at
        # whatever scale seating chose.
        sw, sd = (ox1 - ox0) / 4, (oy1 - oy0) / 2
        gap, thick = sd * 0.05, sd * 0.08
        ground(2 * far, 2 * far, thick, ox, oy, oz - thick * 0.9, dark)
        # IT RUNS PAST THE FRAME ON ALL FOUR SIDES — nine slabs each way in x, eight in y, which at this
        # slab size is roughly ±11 units against a frame about 7 wide. Ground that stops inside the
        # picture is a plinth the hole is cut into; ground that leaves on every side is a floor.
        for cx in range(-9, 10):
            for cy in range(-8, 9):
                bx0, by0 = ox0 + cx * sw, oy0 + cy * sd
                if ox0 - 0.001 <= bx0 < ox1 - 0.001 and oy0 - 0.001 <= by0 < oy1 - 0.001:
                    continue  # the opening itself
                ground(sw - gap, sd - gap, thick, bx0 + sw / 2, by0 + sd / 2, oz - thick / 2, paving)
    render(out, width, height, engine, int(arg("samples", "64")))
    # What it will actually BE, in map units, before a single repaint is spent on it. The import trims to
    # the object and scales it into a 56x84 slot, so drawn height is 56 * (height / width) capped at 84 —
    # which is how a 20cm shabti arrived 84 units tall, as tall as the explorer, and nobody noticed until
    # after it had been painted. --scale divides both.
    drawn_h = 1.0 + k * d_units
    aspect = drawn_h / w_units if w_units else 0
    cell_h = min(84, round(56 * aspect))
    cell_w = round(cell_h / aspect) if aspect else 0
    print(f"{out} — {width}x{height}, {engine}, shear {k}, spin {spin}deg, colour {colour}")
    print(f"  object {w_units:.2f} wide {d_units:.2f} deep, aspect {aspect:.2f}")
    print(f"  lands at {cell_w}x{cell_h} map units at --scale=1   (a cell is 56, the explorer is 40x70)")


main()
