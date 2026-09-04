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


def jar(x, y, height, belly, z=0.0):
    """One Egyptian storage jar: a round belly tapering to a point, a short neck, a domed stopper.

    Built from a sphere squeezed and a cone rather than modelled, because at 56 units what survives is
    the silhouette — a round shoulder over a taper — and nothing finer."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=belly, location=(x, y, z + height * 0.62))
    body = bpy.context.object
    body.scale = (1.0, 1.0, height * 0.42 / belly)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=belly, radius2=0.0, depth=height * 0.5, location=(x, y, z + height * 0.37))
    point = bpy.context.object
    point.rotation_euler = (math.radians(180), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=belly * 0.42, depth=height * 0.12, location=(x, y, z + height * 0.98))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=10, radius=belly * 0.44, location=(x, y, z + height * 1.03))
    dome = bpy.context.object
    dome.scale = (1.0, 1.0, 0.55)
    bpy.ops.object.transform_apply(scale=True)


def prim_jarrack():
    """The merchant's rack: two uprights, two rails, three jars standing in it.

    The test this exists for is CURVES. Boxes came through the shear on the first try; a sphere and a
    cone are where a projection usually gives itself away, and a jar's stopper seen from above is the
    tell — under this shear a circle lying flat must draw as an ellipse exactly as wide as the jar."""
    post, w, d, h = 0.07, 0.95, 0.34, 0.62
    for sx in (-1, 1):
        box(post, d, h, x=sx * (w / 2 - post / 2), z=h / 2)
    for z in (h - 0.06, 0.16):
        box(w - post * 2, 0.05, 0.05, z=z)
    for i, x in enumerate((-0.29, 0.0, 0.29)):
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
    box(w, d, top_h, z=h - top_h / 2)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(leg, leg, h - top_h, x=sx * (w / 2 - leg), y=sy * (d / 2 - leg), z=(h - top_h) / 2)
    # The balance, standing on the right of the top: post, beam across it, a shallow pan hanging at
    # each end. Pans are discs, which under this shear draw as ellipses — the same tell as the jar lids.
    post_x, post_h = 0.28, 0.30
    cyl(0.022, post_h, x=post_x, z=h + post_h / 2)
    box(0.44, 0.035, 0.035, x=post_x, z=h + post_h)
    for sx in (-1, 1):
        cyl(0.019, 0.10, x=post_x + sx * 0.19, z=h + post_h - 0.05, verts=8)
        cyl(0.085, 0.02, x=post_x + sx * 0.19, z=h + post_h - 0.10)
    # The grain, heaped on the left: a low cone, spilling a little over the front edge.
    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=0.24, radius2=0.0, depth=0.13, location=(-0.26, 0.02, h + 0.065))
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
    """A reed mat rolled up and stood on its end, part unrolled at its foot, one corner curled.

    THE WEAKEST PROP IN THE SET, and the reason is structural rather than a bad roll: under this
    projection a flat thing lying on the floor has no silhouette, which is the same wall
    tile-art-brief.md hits with floor scatter. Three designs were rendered and measured:

    1. Flat sheet, thin roll behind. All top face — two pale bands of one value with nothing between
       them to say mat rather than slab.
    2. Roll stood on its end (this one). The roll gains a front elevation, but a cylinder upright is
       drum-shaped whatever is painted on it, and at 50 units it reads close to the crate's reed
       baskets. The marks that would separate them — a spiral on the roll's end, the weave on the
       sheet — are finer than a tenth of the object and mostly gone.
    3. Flat sheet with its edges FOLDED. Worth knowing why this fails, because the rule is general: a
       fold at the NEAR edge is invisible. Lifting the front edge raises its z, but as the flap swings
       up its tip travels back toward the hinge, and under z + 0.7y the terms nearly cancel — measured
       at 0.016 of the drawn height for 0.13 of real lift. Only the FAR edge gains from both, and a
       far-edge fold draws as one more pale band above the sheet, separated by its own underside.

    So relief at the FRONT of any prop is free to model and impossible to see, and this prop's identity
    has to come from the weave. Design 2 is what is imported, because it at least has a shape.

    The tongue runs UNDER the roll and OVERLAPS it in x. Set beside it, touching at one x, the roll
    towers over a 0.03 sheet and the two share only their bottom pixel: it reads as a drum standing next
    to a mat, with a shadow ellipse of its own. Nor may the roll lean — tipped 6 degrees its base lifts
    off the floor on one side, which is the floating the shear punishes hardest."""
    roll_h, r = 0.50, 0.17
    box(0.80, 0.42, 0.03, x=-0.14, y=-0.08, z=0.015)
    cyl(r, roll_h, x=0.12, y=0.05, z=roll_h / 2, verts=18)
    tilt(box(0.20, 0.16, 0.03, x=-0.46, y=-0.26, z=0.05), 40, "X")
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
    }
)


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def paint(obj, hex_colour):
    """A flat matte material in the rank's own colour.

    Not decoration: a grey render is unrecognisable. Asked to repaint an untextured grey table, the
    generator read the shape as wooden door panels and filled them with photographic burl. A scaffold
    that already arrives brown, in palette, and lit so its top reads lighter than its front is a table
    the model can recognise, and the repaint becomes texture rather than interpretation.

    Roughness 1 and zero specular: the set is painted and matte, with no highlight anywhere
    (tile-art-brief.md, "The style")."""
    h = hex_colour.lstrip("#")
    rgb = tuple(srgb_to_linear(int(h[i : i + 2], 16) / 255) for i in (0, 2, 4))
    mat = bpy.data.materials.new("prop")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = 1.0
    for name in ("Specular IOR Level", "Specular"):
        if name in bsdf.inputs:
            bsdf.inputs[name].default_value = 0.0
    obj.data.materials.clear()
    obj.data.materials.append(mat)


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

    It is OPAQUE, and it is the rank's floor colour darkened rather than a translucent black. A
    semi-transparent shadow composites against the magenta backdrop and comes out magenta-tinted, which
    the keyer then either eats or fringes. Opaque floor-in-shadow keys cleanly and is the colour the
    thing will actually sit on.

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


def add_camera(obj, width, height, margin=1.06):
    """Framed from the bounds AFTER the shear, which are not the bounds before it.

    Shearing pushes the near-bottom edge DOWN as far as it pushes the far-top edge up: a unit cube at
    k=1 spans -0.5 to 1.5, not 0 to 2. Framing from the pre-shear box cropped half a unit off the
    bottom of the first cube rendered, which measured as 1.5 units of a 2-unit object."""
    (x0, x1), _, (z0, z1) = local_bounds(obj)
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
    add_camera(obj, width, height)
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
