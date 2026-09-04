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

`k` is the depth ratio: 1.0 is cavalier (full depth, what props use), 0.5 is cabinet (half depth, what
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


PRIMITIVES.update({"cube": prim_cube, "table": prim_table, "crate": prim_crate})


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


def make_shadow(obj, opacity, offset_x, offset_y):
    """The object's own footprint, lying on the floor.

    Blender knows the shape, so the shadow does not have to be invented in paint — and this projection
    makes it almost free. A floor point (x, y, 0) draws at (x, k*y), so the shadow is the object
    FLATTENED to z=0 and put through the same shear. No ray tracing, no shadow catcher, no dependence on
    which engine or which Blender version.

    `offset` is the light: shifting the flattened copy is what moves the sun. Positive y pushes the
    shadow away from the viewer, which reads as light from the front."""
    shadow = obj.copy()
    shadow.data = obj.data.copy()
    bpy.context.scene.collection.objects.link(shadow)
    shadow.data.transform(Matrix.Diagonal((1.0, 1.0, 0.0, 1.0)))
    shadow.data.transform(Matrix.Translation((offset_x, offset_y, 0.0)))
    mat = bpy.data.materials.new("shadow")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.02, 0.015, 0.01, 1.0)
    bsdf.inputs["Roughness"].default_value = 1.0
    if "Alpha" in bsdf.inputs:
        bsdf.inputs["Alpha"].default_value = opacity
    for attr, value in (("blend_method", "BLEND"), ("surface_render_method", "BLENDED")):
        if hasattr(mat, attr):
            setattr(mat, attr, value)
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


def add_light():
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
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.35
    bpy.context.scene.world = world


def render(out_path, width, height):
    scene = bpy.context.scene
    # EEVEE was renamed in 4.2. Take whichever this build has rather than pinning a version.
    for name in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "CYCLES"):
        try:
            scene.render.engine = name
            break
        except TypeError:
            continue
    scene.render.film_transparent = True
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
    k = float(arg("shear", "1.0"))
    spin = float(arg("spin", "0"))
    width = int(arg("width", DEFAULT_W))
    height = int(arg("height", DEFAULT_H))

    colour = arg("colour", "#5c5347")

    # Low on purpose. Flat and hard-edged it reads as a translucent panel, not a shadow — its job is to
    # hand the repaint the exact footprint and light direction to soften, not to be the finished shadow.
    shadow_alpha = float(arg("shadow", "0.22"))

    clear_scene()
    obj = load_subject(mesh, primitive)
    if primitive:
        paint(obj, colour)
    w_units, d_units = seat_and_normalise(obj)
    if spin:
        obj.data.transform(Matrix.Rotation(math.radians(spin), 4, "Z"))
    shadow = make_shadow(obj, shadow_alpha, 0.0, -0.10 * d_units) if shadow_alpha > 0 else None
    if shadow:
        shadow.data.transform(Matrix(((1, 0, 0, 0), (0, 1, 0, 0), (0, k, 1, 0), (0, 0, 0, 1))))
    shear(obj, k, 0)
    # After the shear the drawn height is the object's height plus k times its depth: that is the whole
    # projection in one line, and it is why a deep object comes out taller on the page than a shallow one.
    add_camera(obj, width, height)
    add_light()
    render(out, width, height)
    print(f"{out} — {width}x{height}, shear {k}, spin {spin}deg, colour {colour}, object {w_units:.2f} wide {d_units:.2f} deep")


main()
