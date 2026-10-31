"""Shared pieces of Solanum's Blender asset builders (no rendering, deterministic).

Imported by build-farm-platform.py and build-harvest-crate.py, which put this
folder on sys.path first. It holds the sRGB conversion, the ray-cast vertex-light
baker, the GLB encoder and the review-scene lights.
"""

import json
import math
import os
import struct
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

# Studio lighting shared by every baked model. Callers rename these for their review scenes.
KEY_LIGHT = {"name": "Platform • warm key", "position": (-3.5, -4.5, 6), "colour": (1.12, 1.02, .84), "strength": .43, "energy": 440, "size": 4}
FILL_LIGHT = {"name": "Platform • soft fill", "position": (4, 1, 3), "colour": (.78, .90, 1), "strength": .12, "energy": 85, "size": 5}


def output_path(default):
    """Where to write the GLB: the repo path, or the same file name inside $SOLANUM_ASSET_OUT (used by the reproducibility test)."""
    folder = os.environ.get("SOLANUM_ASSET_OUT")
    return Path(folder) / default.name if folder else default


def linear(hex_colour):
    rgb = [int(hex_colour[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in rgb)


def bake(triangles, base_colours, key_light=KEY_LIGHT, fill_light=FILL_LIGHT):
    """Per-vertex colour for every triangle corner: ambient occlusion, a soft key and a fill."""
    points = [p for face in triangles for p in face]
    tree = BVHTree.FromPolygons(points, [tuple(range(i, i + 3)) for i in range(0, len(points), 3)], all_triangles=True)
    sun = Vector(key_light["position"]).normalized()
    fill = Vector(fill_light["position"]).normalized()
    colours = []
    for face, base in zip(triangles, base_colours):
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
            cool = fill_light["strength"] * max(0, normal.dot(fill))
            multipliers = [ambient * sky + key_light["strength"] * lit * key + cool * fill_colour
                           for sky, key, fill_colour in zip((.95, 1, 1.04), key_light["colour"], fill_light["colour"])]
            colours.append(tuple(round(min(1, max(0, c * m)) * 255) / 255 for c, m in zip(base, multipliers)))
    return colours


def glb(triangles, colours, *, name, label, generator, material_name):
    """Encode the baked triangles as one unlit, vertex-coloured GLB; identical input gives identical bytes."""
    positions, normals, rgba = [], [], []
    for face in triangles:
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
        'asset': {'version': '2.0', 'generator': generator},
        'extensionsUsed': ['KHR_materials_unlit'],
        'extensionsRequired': ['KHR_materials_unlit'],
        'scene': 0, 'scenes': [{'name': label, 'nodes': [0]}],
        'nodes': [{'name': name, 'mesh': 0}],
        'meshes': [{'name': name, 'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'COLOR_0': 2}, 'material': 0}]}],
        'materials': [{'name': material_name, 'doubleSided': True, 'extensions': {'KHR_materials_unlit': {}}, 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': 1}}],
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


def add_lights(scene, lights):
    """Add the area lights to a review scene, skipping any that are already there."""
    for source in lights:
        if scene.objects.get(source["name"]) is not None:
            continue
        data = bpy.data.lights.new(source["name"], type='AREA')
        data.energy = source["energy"]
        data.size = source["size"]
        data.color = tuple(min(1, c) for c in source["colour"])
        obj = bpy.data.objects.new(source["name"], data)
        scene.collection.objects.link(obj)
        obj.location = source["position"]
        obj.rotation_euler = (-obj.location).to_track_quat('-Z', 'Y').to_euler()
