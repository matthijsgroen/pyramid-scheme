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
    if arg("contents") != "none":
        for x in (-0.29, 0.0, 0.29):
            jar(x, 0.0, h * 0.92, 0.125)
    return join_all()


def cyl(r, h, x=0.0, y=0.0, z=0.0, verts=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=(x, y, z))
    return bpy.context.object


def prim_market():
    """The merchant's market table: the table he traded from, his balance, and a heap of grain.

    A prop is not its silhouette alone — the painted version of this reads as a market stall because of
    what stands ON it, and the scaffold has to carry that or the repaint has nothing to paint. The scale
    is a post, a beam and two pans; the grain is a squashed cone. Nothing here is finer than a thumb at
    slot size, which is the budget."""
    top_h, leg, w, d, h = 0.07, 0.06, 1.2, 0.6, 0.5
    mark(box(w, d, top_h, z=h - top_h / 2), "body")
    for sx in (-1, 1):
        for sy in (-1, 1):
            mark(box(leg, leg, h - top_h, x=sx * (w / 2 - leg), y=sy * (d / 2 - leg), z=(h - top_h) / 2), "body")
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
    """Leans one part over, about its own centre.

    Object-level rotation and nothing applied: `join_all` bakes every part's matrix into the result, so
    a part only has to be POSED, never baked. Rotating the mesh data instead means translating it to the
    origin and back, because `box` leaves its vertices centred and its offset in the object."""
    i = "XYZ".index(axis)
    obj.rotation_euler[i] = math.radians(degrees)
    return obj


def prim_shelf():
    """Mudbrick shelving: a back slab, two side piers, two open levels, and what stands in them.

    An OPENING is shorter than the gap that makes it. The shelf above is a slab of depth d, and its
    front-bottom edge sits at y = -d/2, so the shear draws that edge 0.7*(d/2) LOWER than its own z. A
    pot the gap could hold is beheaded by the lip; the room a pot really has is
    (z_above - 0.35*d) - (z_below + 0.35*d), which is where the 0.22 below comes from.

    Two more, learned the same way. The contents have to be COARSE — a jar of 0.07 belly on a 1.35-wide
    unit is three pixels in the slot, the brief's tenth-of-the-object rule failed by a factor of two —
    and they have to be SQUAT, because an amphora slim enough to read as an amphora is finer than that
    limit. These are storage pots, and the ostracon lies flat on the top course where the shear shows a
    top face generously, rather than leaning in an opening where nothing is lit."""
    w, d, h, brick = 1.15, 0.30, 0.86, 0.08
    lip = 0.35 * d
    box(w, brick, h, y=(d - brick) / 2, z=h / 2)
    for sx in (-1, 1):
        box(brick, d, h, x=sx * (w / 2 - brick / 2), z=h / 2)
    shelf_z, shelf_t = 0.40, 0.07
    box(w - brick * 2, d, shelf_t, z=shelf_z)
    box(w, d, brick, z=h - brick / 2)
    # Upper level: two mud-stoppered storage pots, sized to the room the lip really leaves.
    base = shelf_z + shelf_t / 2
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
    """A single-wick pottery oil lamp on a low wooden stool, and its flame.

    Nothing on this may point at the VIEWER. A pinched spout modelled along -Y draws, under the shear,
    as a cone hanging straight down off the saucer, and the first scaffold read as a flying saucer with
    a nose cone. The spout goes out along X, where the projection leaves it alone.

    The flame is modelled rather than left to the repaint because it is the one place the ochre accent
    is allowed, and a prompt can only put paint where there is already a shape. But it is a NUB and not
    a cone: a sharp triangle a fifth of the object tall is the most salient shape in the picture, and
    the scaffold read as a flying saucer with a nose cone. The lamp is a straight cylinder for the same
    reason — a flared saucer overhangs its own base and the black crescent of its underside was bigger
    than the lamp.

    Two things about the STOOL, both about the seat's top face, which is the shape that eats this prop.
    A seat 0.26 deep put 40% of the drawn height into one featureless pale rectangle and read as a wall
    with legs; at 0.16 it is 22% and reads as a seat. And whatever stands on that seat must OVERHANG its
    front edge, because a dish sitting wholly within the seat draws its own pale top INSIDE a pale
    rectangle of the same value and the eye reads the dark side wall as a hole in the furniture rather
    than as a bowl. Hanging the lamp over the front breaks the seat's top-to-front boundary, which is the
    one edge in the picture that says which surface is which."""
    top_h, leg, w, d, h = 0.045, 0.04, 0.36, 0.16, 0.30
    box(w, d, top_h, z=h - top_h / 2)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(leg, leg, h - top_h, x=sx * (w / 2 - leg), y=sy * (d / 2 - leg), z=(h - top_h) / 2)
    cyl(0.095, 0.05, x=-0.02, y=-0.04, z=h + 0.025, verts=20)
    box(0.075, 0.05, 0.03, x=0.13, y=-0.04, z=h + 0.03)
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.028, radius2=0.0, depth=0.055, location=(0.13, -0.04, h + 0.075))
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
    # The pole laid across the far lip, and the ladder over it. Coarse on purpose — at 56 units across
    # the opening a rope of 0.03 is two pixels and the ladder becomes a smudge.
    rope_y = (d - 0.05) / 2 - 0.055
    pole = mark(cyl(0.05, w - 0.06, x=0, y=d / 2 + 0.01, z=0.05, verts=12), "body")
    pole.rotation_euler = (0, math.radians(90), 0)
    for sx in (-1, 1):
        mark(box(0.05, 0.05, 0.10 + hv, x=sx * 0.25, y=rope_y, z=(0.10 - hv) / 2), "body")
    for i in range(3):
        mark(box(0.55, 0.055, 0.055, y=rope_y, z=-0.09 - i * 0.15), "body")
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
    """
    # The wall plate: flat against the wall, its own depth shallow so it does not out-draw the arm. Tall
    # enough for the brace to land ON it — the brace's foot has to meet the plate in the DRAWN picture,
    # and the two sit at different y, so the plate draws 0.07 higher than its own z and the brace 0.025.
    box(0.20, 0.07, 0.62, x=-0.42, y=0.14, z=0.53)
    # The arm, across the band, and the two pegs that fix the plate to the wall.
    box(0.80, 0.10, 0.10, x=-0.02, y=0.05, z=0.50)
    for z in (0.74, 0.32):
        box(0.11, 0.15, 0.07, x=-0.42, y=0.05, z=z)
    # The brace, in the x-z plane where a diagonal is drawn as a diagonal. In y-z it would be invisible by
    # construction rather than merely small.
    tilt(box(0.36, 0.07, 0.06, x=-0.22, y=0.05, z=0.40), -38, "Y")
    # The lamp standing on the arm's end: the niche's proven mass, its spout along X.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.16, location=(0.26, 0.0, 0.68))
    body = bpy.context.object
    body.scale = (1.3, 0.9, 0.95)
    bpy.ops.object.transform_apply(scale=True)
    box(0.17, 0.08, 0.08, x=0.52, y=0.0, z=0.65)
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.065, radius2=0.0, depth=0.12, location=(0.26, 0.0, 0.88))
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
    a banner at 56 units: a banner is hemmed straight."""
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
    # The surround: back slab, two jambs, a sill under and a lintel over. The hollow between them IS the
    # niche, so nothing is modelled where the opening is.
    box(w, brick, h, y=(d - brick) / 2, z=h / 2)
    for sx in (-1, 1):
        box(brick, d, h, x=sx * (w / 2 - brick / 2), z=h / 2)
    box(w, d, brick, z=brick / 2)
    box(w, d, head, z=h - head / 2)
    # What stands in it, sized to the room the lintel actually leaves. The BAY is the same at every rank
    # — the brief gives each one a niche, and a cut recess is a cut recess — so `--contents` is the only
    # thing that changes, and a rank costs a repaint rather than a model.
    base = brick
    room = (h - head - lip) - (base + lip)
    if arg("contents", "goods") == "lamp":
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


PRIMITIVES.update(
    {
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
        "mat": prim_mat,
        "rubbleHeap": prim_rubbleheap,
        "niche": prim_niche,
        "pit": prim_pit,
        "sconce": prim_sconce,
        "shrine": prim_shrine,
        "hanging": prim_hanging,
    }
)


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


VOID = "void"  # the material name a primitive marks the inside of a hole with

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
    "cloth": "#bdb3a0",
}


def mark(obj, name):
    """Puts one part in a named material slot, so `paint` can colour it apart from the rest.

    Every part of a primitive that marks ANY of itself has to be marked, `body` included: `join_all`
    merges slots by name and the polygons keep their indices, so an unmarked part would inherit whatever
    slot happens to land at index 0."""
    obj.data.materials.clear()
    obj.data.materials.append(bpy.data.materials.get(name) or bpy.data.materials.new(name))
    return obj


def flat_material(name, hex_colour):
    """A flat matte material in one colour. Roughness 1 and zero specular: the set is painted and matte,
    with no highlight anywhere (tile-art-brief.md, "The style")."""
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

    The hole is the case that forced this. `prim_pit`'s shaft is a surface like any other and shades like
    any other, so one flat colour handed the generator a rack with a mid-grey gap in it; at slot size
    that gap measured the same value as the floor behind the sprite and no hole read at all."""
    names = [m.name if m else "" for m in obj.data.materials]
    if not any(names):
        obj.data.materials.clear()
        obj.data.materials.append(flat_material("prop", hex_colour))
        return
    for i, name in enumerate(names):
        default = PART_COLOURS.get(name, hex_colour)
        obj.data.materials[i] = flat_material(f"prop{i}", arg(f"colour-{name}", default))


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
    size whatever the mesh generator handed back, and the framing below can be fixed rather than fitted."""
    make_active(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    (x0, x1), (y0, y1), (z0, z1) = local_bounds(obj)
    height = z1 - z0
    if height <= 0:
        raise SystemExit("mesh has no height")
    obj.data.transform(Matrix.Scale(1 / height, 4))
    (x0, x1), (y0, y1), (z0, z1) = local_bounds(obj)
    obj.data.transform(Matrix.Translation((-(x1 + x0) / 2, -(y1 + y0) / 2, -z0)))
    (x0, x1), (y0, y1), (z0, z1) = local_bounds(obj)
    return x1 - x0, y1 - y0


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

    `offset` is the light: shifting the flattened copy is what moves the sun."""
    shadow = obj.copy()
    shadow.data = obj.data.copy()
    bpy.context.scene.collection.objects.link(shadow)
    shadow.data.transform(Matrix.Diagonal((1.0, 1.0, 0.0, 1.0)))
    shadow.data.transform(Matrix.Translation((offset_x, offset_y, 0.0)))
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

    # How far the flattened footprint is pushed toward the viewer, as a fraction of the object's depth —
    # which is to say where the sun is. 0.10 matched the painted props for DARKNESS and not for EXTENT:
    # at that offset the shear draws the shadow almost entirely behind the object and one pixel of it
    # shows, where the hand-painted props spread a visible pool in front of the thing.
    #
    # 0.30 IS A TALL PROP'S NUMBER. The offset is a fraction of DEPTH but what hides it is HEIGHT: a
    # shelf or a jar rack stands over its own footprint and covers most of it, while a low wide thing
    # does not, and the pool slides out from under and reads as a separate slab lying beside the object.
    # Three have needed it small now — the mat at 0.03, the nobleman's plaster fall at 0.05, the
    # merchant's brick heap at 0.12 — and the rule is the object's height against its depth, not what it
    # is made of. `prim_pillar` records the other end of the same problem: at any offset, a slab flat on
    # the floor casts a copy of itself, because --sun shifts a footprint in depth and never out from
    # under a shape as wide as the shadow it makes.
    sun = float(arg("sun", "0.30"))

    clear_scene()
    obj = load_subject(mesh, primitive)
    # Meshes get painted too, not just primitives: a scan has no material and a generated mesh usually
    # has a photographic one, and neither is what the repaint wants to be handed. --colour=none keeps
    # whatever the file brought.
    if colour != "none":
        paint(obj, colour)
    obj = array_copies(obj, int(arg("copies", "1")), float(arg("gap", "1.35")), float(arg("jitter", "1.0")))
    w_units, d_units = seat_and_normalise(obj)
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
        shadow = (
            make_shadow(obj, shadow_alpha, arg("floor", "#6c6257"), 0.0, -sun * d_units)
            if shadow_alpha > 0
            else None
        )
        if shadow:
            shadow.data.transform(Matrix(((1, 0, 0, 0), (0, 1, 0, 0), (0, k, 1, 0), (0, 0, 0, 1))))
        shear(obj, k, 0)
    # After the shear the drawn height is the object's height plus k times its depth: that is the whole
    # projection in one line, and it is why a deep object comes out taller on the page than a shallow one.
    # --margin is air around the object, and it matters on the WALL slot in a way it does not elsewhere:
    # `SLOTS.wall` is `seat: false`, so the import does not trim and re-seat — it scales the whole FRAME
    # into 56x28. A prop's frame is discarded; a wall item's frame IS its placement. So a compact thing
    # like a sconce is given margin here rather than being blown up to fill the band.
    add_camera(obj, width, height, float(arg("margin", "1.06")), k * sun * d_units)
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
