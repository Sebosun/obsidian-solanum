"""Build Solanum's shared low-poly farm platform in Blender, without rendering.

Blender 5.2: blender --background --python scripts/build-farm-platform.py
Also runnable through Blender MCP. Lighting and contact shadows are baked into
vertex colours with deterministic ray casts, not a blocking Cycles texture bake.
The GLB writer is deterministic; no cameras, lights, textures or external art ship.
"""

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.dont_write_bytecode = True  # keep scripts/ free of __pycache__
sys.path.insert(0, str(Path(__file__).resolve().parent))
import blender_common as common  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = common.output_path(ROOT / "assets/stage/Farm_platform.glb")
PALETTE = {
    "turf": "78974a",
    "turf_edge": "617b3c",
    "earth": "996641",
    "base": "765137",
    "bottom": "624733",
    "soil": "805439",
    "soil_row": "875a3d",
    "grass": "8ca54d",
}
TRIANGLES = []
BASE_COLOURS = []


def polygon(points, colour):
    base = common.linear(PALETTE[colour])
    for i in range(1, len(points) - 1):
        TRIANGLES.append(tuple(Vector(p) for p in (points[0], points[i], points[i + 1])))
        BASE_COLOURS.append(base)


def rectangle(width, depth, corner, height):
    x, y, c = width / 2, depth / 2, corner
    return [(a, b, height) for a, b in [
        (-x + c, -y), (x - c, -y), (x, -y + c), (x, y - c),
        (x - c, y), (-x + c, y), (-x, y - c), (-x, -y + c),
    ]]


def bridge(a, b, colour, outside=False):
    for i in range(8):
        j = (i + 1) % 8
        points = [a[i], a[j], b[j], b[i]]
        polygon(list(reversed(points)) if outside else points, colour)


def clip_y(points, boundary, above):
    result = []
    for i, start in enumerate(points):
        end = points[(i + 1) % len(points)]
        inside_start = start[1] >= boundary if above else start[1] <= boundary
        inside_end = end[1] >= boundary if above else end[1] <= boundary
        if inside_start:
            result.append(start)
        if inside_start != inside_end:
            t = (boundary - start[1]) / (end[1] - start[1])
            result.append((start[0] + t * (end[0] - start[0]), boundary, 0))
    return result


def geometry():
    crown = rectangle(1.84, 1.50, .13, .024)
    outside = rectangle(1.90, 1.56, .16, -.008)
    inside = rectangle(1.59, 1.25, .10, .018)
    bed = rectangle(1.56, 1.22, .09, 0)
    grass_bottom = rectangle(1.88, 1.54, .15, -.052)
    earth_bottom = rectangle(1.84, 1.50, .14, -.17)
    bottom = rectangle(1.71, 1.37, .12, -.245)
    bridge(outside, crown, "turf")
    bridge(crown, inside, "turf")
    bridge(inside, bed, "earth")
    bridge(outside, grass_bottom, "turf_edge", outside=True)
    bridge(grass_bottom, earth_bottom, "earth", outside=True)
    bridge(earth_bottom, bottom, "base", outside=True)
    polygon(list(reversed(bottom)), "bottom")
    # Five broad, barely contrasting soil rows. The centre stays flat at zero.
    for row in range(5):
        low, high = -.61 + row * 1.22 / 5, -.61 + (row + 1) * 1.22 / 5
        strip = clip_y(clip_y(bed, low, True), high, False)
        # Add a centre to keep the contact-shadow bake off the broad triangle fan.
        centre = tuple(sum(p[k] for p in strip) / len(strip) for k in range(3))
        for i, p in enumerate(strip):
            polygon([centre, p, strip[(i + 1) % len(strip)]], "soil_row" if row % 2 else "soil")
    # Just two three-blade tufts. No pebbles, roots, flowers, or fine texture noise.
    for x, y, turn in [(-.79, .40, -.7), (.70, -.60, .8)]:
        for blade in range(3):
            a = turn + (blade - 1) * .6
            dx, dy = math.cos(a), math.sin(a)
            height = .045 + (1 - abs(blade - 1)) * .015
            polygon([
                (x - dy * .007, y + dx * .007, .022),
                (x + dy * .007, y - dx * .007, .022),
                (x + dx * .019, y + dy * .019, .022 + height),
            ], "grass")


def preview(colours):
    if bpy.context.window is None:
        return
    scene = bpy.data.scenes.new('Solanum • Rectangular farm platform')
    bpy.context.window.scene = scene
    data = bpy.data.meshes.new('Farm platform • low poly')
    data.from_pydata([tuple(p) for face in TRIANGLES for p in face], [], [tuple(range(i, i + 3)) for i in range(0, len(colours), 3)])
    colour_type = next(i.identifier for i in bpy.types.Attribute.bl_rna.properties['data_type'].enum_items if i.identifier == 'FLOAT_COLOR')
    corner_domain = next(i.identifier for i in bpy.types.Attribute.bl_rna.properties['domain'].enum_items if i.identifier == 'CORNER')
    attribute = data.color_attributes.new(name='BakedLight', type=colour_type, domain=corner_domain)
    for i, colour in enumerate(colours):
        attribute.data[i].color = (*colour, 1)
    material = bpy.data.materials.new('Farm platform • baked vertex light')
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    vertex = nodes.new('ShaderNodeVertexColor')
    vertex.layer_name = attribute.name
    emission = nodes.new('ShaderNodeEmission')
    output = nodes.new('ShaderNodeOutputMaterial')
    material.node_tree.links.new(vertex.outputs['Color'], emission.inputs['Color'])
    material.node_tree.links.new(emission.outputs[0], output.inputs['Surface'])
    data.materials.append(material)
    obj = bpy.data.objects.new('Farm_platform_rectangular', data)
    scene.collection.objects.link(obj)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    camera_data = bpy.data.cameras.new('Platform review')
    camera_data.type = next(i.identifier for i in camera_data.bl_rna.properties['type'].enum_items if i.identifier == 'ORTHO')
    camera_data.ortho_scale = 2.7
    camera = bpy.data.objects.new('Platform review', camera_data)
    scene.collection.objects.link(camera)
    camera.location = (3, -4, 2.8)
    camera.rotation_euler = (Vector((0, 0, -.04)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = camera
    common.add_lights(scene, (common.KEY_LIGHT, common.FILL_LIGHT))
    standard = next((i.identifier for i in scene.view_settings.bl_rna.properties['view_transform'].enum_items if i.identifier == 'Standard'), None)
    if standard:
        scene.view_settings.view_transform = standard
    scene.render.resolution_x, scene.render.resolution_y = 900, 700
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                shading = area.spaces.active.shading
                shading.type = next(i.identifier for i in shading.bl_rna.properties['type'].enum_items if i.identifier == 'SOLID')
                shading.color_type = next(i.identifier for i in shading.bl_rna.properties['color_type'].enum_items if i.identifier == 'VERTEX')


def main():
    geometry()
    colours = common.bake(TRIANGLES, BASE_COLOURS)
    encoded = common.glb(
        TRIANGLES,
        colours,
        name="Farm_platform",
        label="Farm platform",
        generator="Solanum low-poly farm platform builder",
        material_name="Baked earth and turf",
    )
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes(encoded)
    preview(colours)
    print({'asset': str(OUTPUT), 'triangles': len(TRIANGLES), 'bytes': len(encoded), 'lighting': 'Baked vertex light and ray-cast contact shadows; no Cycles render or texture bake.'})


if __name__ == '__main__':
    main()
