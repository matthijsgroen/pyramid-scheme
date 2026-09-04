"""Renders a prop in the map's projection, exactly, from a 3D mesh.

    blender -b -P scripts/renderProp.py -- --primitive=cube --out=/tmp/cube.png
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
from mathutils import Matrix

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


def load_subject(mesh_path, primitive):
    if primitive == "cube":
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.5))
        return bpy.context.object
    if mesh_path.endswith(".glb") or mesh_path.endswith(".gltf"):
        bpy.ops.import_scene.gltf(filepath=mesh_path)
    elif mesh_path.endswith(".obj"):
        bpy.ops.wm.obj_import(filepath=mesh_path)
    elif mesh_path.endswith(".ply"):
        bpy.ops.wm.ply_import(filepath=mesh_path)
    else:
        raise SystemExit(f"unknown mesh format: {mesh_path}")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.join()
    return bpy.context.object


def seat_and_normalise(obj):
    """One unit tall, centred on X and Y, standing on z=0 — so every prop enters the shear at the same
    size whatever the mesh generator handed back, and the framing below can be fixed rather than fitted."""
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bbox = [obj.matrix_world @ Matrix.Identity(4).to_3x3() @ v for v in obj.bound_box]
    xs, ys, zs = zip(*[(v[0], v[1], v[2]) for v in bbox])
    height = max(zs) - min(zs)
    if height <= 0:
        raise SystemExit("mesh has no height")
    obj.scale = (1 / height,) * 3
    bpy.ops.object.transform_apply(scale=True)
    bbox = [Matrix.Identity(4).to_3x3() @ v for v in obj.bound_box]
    xs, ys, zs = zip(*[(v[0], v[1], v[2]) for v in bbox])
    obj.location = (-(max(xs) + min(xs)) / 2, -(max(ys) + min(ys)) / 2, -min(zs))
    bpy.ops.object.transform_apply(location=True)
    return max(xs) - min(xs), max(ys) - min(ys)


def shear(obj, k, spin_degrees):
    """Spin on the floor first, then shear. Order matters: shearing a spun object is a different view of
    the same thing, while spinning a sheared one is nonsense."""
    if spin_degrees:
        obj.rotation_euler = (0, 0, math.radians(spin_degrees))
        bpy.ops.object.transform_apply(rotation=True)
    # z' = z + k*y, everything else identity.
    obj.matrix_world = Matrix(((1, 0, 0, 0), (0, 1, 0, 0), (0, k, 1, 0), (0, 0, 0, 1))) @ obj.matrix_world


def add_camera(width_units, height_units):
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    # The shear has already put depth into height, so the camera only has to look straight on. Any tilt
    # here would ADD perspective on top of the projection and undo the entire point of the file.
    cam_data.ortho_scale = max(width_units, height_units)
    cam = bpy.data.objects.new("cam", cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = (0, -10, height_units / 2)
    cam.rotation_euler = (math.radians(90), 0, 0)
    bpy.context.scene.camera = cam


def add_light():
    """Flat and frontal on purpose. The set is painted, matte, with no specular anywhere
    (tile-art-brief.md, "The style"), so a rendered prop must not arrive with highlights the painted
    ones do not have. This is the part most likely to look wrong beside the painted props."""
    sun_data = bpy.data.lights.new("sun", type="SUN")
    sun_data.energy = 2.0
    sun_data.angle = math.radians(45)
    sun = bpy.data.objects.new("sun", sun_data)
    bpy.context.scene.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    bpy.context.scene.world = world


def render(out_path, width, height):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
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

    clear_scene()
    obj = load_subject(mesh, primitive)
    w_units, d_units = seat_and_normalise(obj)
    shear(obj, k, spin)
    # After the shear the drawn height is the object's height plus k times its depth: that is the whole
    # projection in one line, and it is why a deep object comes out taller on the page than a shallow one.
    add_camera(max(w_units, 1.0) * 1.15, (1.0 + k * d_units) * 1.15)
    add_light()
    render(out, width, height)
    print(f"{out} — {width}x{height}, shear {k}, spin {spin}deg, object {w_units:.2f} wide {d_units:.2f} deep")


main()
