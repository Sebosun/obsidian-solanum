"""Build Solanum's shared low-poly farm platform in Blender, without rendering.

Blender 5.2: blender --background --python scripts/build-farm-platform.py
Also runnable through Blender MCP. Lighting and contact shadows are baked into
vertex colours with deterministic ray casts, not a blocking Cycles texture bake.
The GLB writer is deterministic; no cameras, lights, textures or external art ship.
"""

import json
import math
import struct
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "assets/stage/Farm_platform.glb"
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
KEY_LIGHT = {"name": "Platform • warm key", "position": (-3.5, -4.5, 6), "colour": (1.12, 1.02, .84), "strength": .43, "energy": 440, "size": 4}
FILL_LIGHT = {"name": "Platform • soft fill", "position": (4, 1, 3), "colour": (.78, .90, 1), "strength": .12, "energy": 85, "size": 5}


def linear(hex_colour):
    rgb = [int(hex_colour[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in rgb)


def polygon(points, colour):
    base = linear(PALETTE[colour])
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


def bake():
    points = [p for face in TRIANGLES for p in face]
    tree = BVHTree.FromPolygons(points, [tuple(range(i, i + 3)) for i in range(0, len(points), 3)], all_triangles=True)
    sun = Vector(KEY_LIGHT["position"]).normalized()
    fill = Vector(FILL_LIGHT["position"]).normalized()
    colours = []
    for face, base in zip(TRIANGLES, BASE_COLOURS):
        normal = (face[1] - face[0]).cross(face[2] - face[0]).normalized()
        tangent = normal.cross(Vector((0, 0, 1)))
        if tangent.length < .01:
            tangent = normal.cross(Vector((0, 1, 0)))
        tangent.normalize()
        bitangent = normal.cross(tangent)
        for point in face:
            origin = point + normal * .001
            blocked = 0
            for i in range(12):
                u = (i + .5) / 12
                angle = i * 2.399963229728653
                ray = tangent * (math.sqrt(u) * math.cos(angle)) + bitangent * (math.sqrt(u) * math.sin(angle)) + normal * math.sqrt(1 - u)
                if tree.ray_cast(origin, ray, .16)[0] is not None:
                    blocked += 1
            ao = 1 - .40 * blocked / 12
            lit = 0
            for offset in [(-.045, -.045), (.045, -.045), (-.045, .045), (.045, .045)]:
                direction = (sun + Vector((offset[0], offset[1], 0))).normalized()
                if tree.ray_cast(origin, direction, 5)[0] is None:
                    lit += max(0, normal.dot(direction)) / 4
            ambient = (.61 + .06 * max(0, normal.z)) * ao
            cool = FILL_LIGHT["strength"] * max(0, normal.dot(fill))
            multipliers = [ambient * sky + KEY_LIGHT["strength"] * lit * key + cool * fill_colour
                           for sky, key, fill_colour in zip((.95, 1, 1.04), KEY_LIGHT["colour"], FILL_LIGHT["colour"])]
            colours.append(tuple(round(min(1, max(0, c * m)) * 255) / 255 for c, m in zip(base, multipliers)))
    return colours


def glb(colours):
    positions, normals, rgba = [], [], []
    for face in TRIANGLES:
        n = (face[1] - face[0]).cross(face[2] - face[0]).normalized()
        for p in face:
            positions.extend((p.x, p.z, -p.y))
            normals.extend((n.x, n.z, -n.y))
    for colour in colours:
        rgba.extend([round(c * 255) for c in colour] + [255])
    chunks = [struct.pack('<%sf' % len(positions), *positions), struct.pack('<%sf' % len(normals), *normals), bytes(rgba)]
    binary = b''.join(chunks)
    count = len(positions) // 3
    document = {
        'asset': {'version': '2.0', 'generator': 'Solanum low-poly farm platform builder'},
        'extensionsUsed': ['KHR_materials_unlit'],
        'extensionsRequired': ['KHR_materials_unlit'],
        'scene': 0, 'scenes': [{'name': 'Farm platform', 'nodes': [0]}],
        'nodes': [{'name': 'Farm_platform', 'mesh': 0}],
        'meshes': [{'name': 'Farm_platform', 'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'COLOR_0': 2}, 'material': 0}]}],
        'materials': [{'name': 'Baked earth and turf', 'doubleSided': True, 'extensions': {'KHR_materials_unlit': {}}, 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': 1}}],
        'buffers': [{'byteLength': len(binary)}],
        'bufferViews': [{'buffer': 0, 'byteOffset': sum(len(c) for c in chunks[:i]), 'byteLength': len(chunk), 'target': 34962} for i, chunk in enumerate(chunks)],
        'accessors': [
            {'bufferView': 0, 'componentType': 5126, 'count': count, 'type': 'VEC3', 'min': [min(positions[k::3]) for k in range(3)], 'max': [max(positions[k::3]) for k in range(3)]},
            {'bufferView': 1, 'componentType': 5126, 'count': count, 'type': 'VEC3'},
            {'bufferView': 2, 'componentType': 5121, 'normalized': True, 'count': count, 'type': 'VEC4'},
        ],
    }
    encoded = json.dumps(document, sort_keys=True, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    binary += b'\0' * (-len(binary) % 4)
    return struct.pack('<III', 0x46546C67, 2, 28 + len(encoded) + len(binary)) + struct.pack('<II', len(encoded), 0x4E4F534A) + encoded + struct.pack('<II', len(binary), 0x004E4942) + binary


def add_lights(scene):
    for source in (KEY_LIGHT, FILL_LIGHT):
        if scene.objects.get(source["name"]) is not None:
            continue
        kind = next(i.identifier for i in bpy.types.Light.bl_rna.properties['type'].enum_items if i.identifier == 'AREA')
        data = bpy.data.lights.new(source["name"], type=kind)
        data.energy = source["energy"]
        data.size = source["size"]
        data.color = tuple(min(1, c) for c in source["colour"])
        obj = bpy.data.objects.new(source["name"], data)
        scene.collection.objects.link(obj)
        obj.location = source["position"]
        obj.rotation_euler = (-obj.location).to_track_quat('-Z', 'Y').to_euler()


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
    add_lights(scene)
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
    colours = bake()
    encoded = glb(colours)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes(encoded)
    preview(colours)
    print({'asset': str(OUTPUT), 'triangles': len(TRIANGLES), 'bytes': len(encoded), 'lighting': 'Baked vertex light and ray-cast contact shadows; no Cycles render or texture bake.'})


if __name__ == '__main__':
    main()
