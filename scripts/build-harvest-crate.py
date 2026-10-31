"""Build an empty, low-poly harvest crate in Blender and save assets/harvest/Crate.glb.

  blender --background --python scripts/build-harvest-crate.py

Uses the deterministic vertex-light baker and GLB encoder in blender_common.py. No Cycles
render, texture bake, external art, or changes to the application are needed.
Each interactive run creates its own review scene and leaves existing scenes alone.
"""

import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

sys.dont_write_bytecode = True  # keep scripts/ free of __pycache__
sys.path.insert(0, str(Path(__file__).resolve().parent))
import blender_common as common  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = common.output_path(ROOT / "assets/harvest/Crate.glb")


KEY_LIGHT = {**common.KEY_LIGHT, 'name': 'Crate • warm key'}
FILL_LIGHT = {**common.FILL_LIGHT, 'name': 'Crate • soft fill'}
TRIANGLES = []
BASE_COLOURS = []


def board(scene, name, centre, size, material, bevel=0):
    x, y, z = (side / 2 for side in size)
    vertices = [(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
    faces = [(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)]
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.materials.append(material)
    data.update()
    if bevel:
        mesh = bmesh.new()
        mesh.from_mesh(data)
        affect = next(i.identifier for i in bpy.ops.mesh.bevel.get_rna_type().properties['affect'].enum_items if i.identifier == 'EDGES')
        bmesh.ops.bevel(mesh, geom=list(mesh.edges), offset=bevel, segments=1, affect=affect)
        bmesh.ops.recalc_face_normals(mesh, faces=list(mesh.faces))
        mesh.to_mesh(data)
        mesh.free()
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = centre
    return obj


def build(scene):
    def wood(name, hex_colour):
        material = bpy.data.materials.new(name)
        material.use_nodes = True
        shader = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        shader.inputs['Base Color'].default_value = (*common.linear(hex_colour), 1)
        shader.inputs['Roughness'].default_value = 1
        return material

    honey = wood('Crate • warm honey wood', 'c98e4c')
    light = wood('Crate • light plank', 'd49b58')
    shade = wood('Crate • darker plank', 'b87d42')
    frame = wood('Crate • solid corner wood', 'bc8044')
    floor = wood('Crate • inside floor', 'a97340')
    parts = []

    def add(name, centre, size, material, bevel=0):
        parts.append(board(scene, name, centre, size, material, bevel))

    # Five boards put solid wood below all five produce columns, including the centre.
    for i, x in enumerate([-.696, -.348, 0, .348, .696]):
        add('Floor plank %02d' % i, (x,0,.045), (.34,1.36,.07), floor)
    for y in [-.49, .49]:
        add('Underside runner', (0,y,.01), (1.72,.15,.02), shade)
    for x in [-.885, .885]:
        for y in [-.685, .685]:
            add('Corner post', (x,y,.30), (.13,.13,.60), frame, .012)
    for side in [-1, 1]:
        for i, (z, height) in enumerate([(.15,.13),(.3325,.135),(.515,.17)]):
            add('Long side slat', (0,side*.705,z), (1.77,.09,height), [honey,light,honey][i], .009 if i == 2 else 0)
    for side in [-1, 1]:
        for i, (z, height) in enumerate([(.15,.13),(.3325,.135)]):
            add('Short side slat', (side*.905,0,z), (.09,1.31,height), [light,honey][i])
        for end in [-1, 1]:
            add('Handle side block', (side*.905,end*.49,.515), (.09,.33,.17), honey)
        add('Handle lower rail', (side*.905,0,.4575), (.09,.65,.055), shade)
        add('Handle upper rail', (side*.905,0,.58), (.09,.65,.04), light, .007)
    bpy.context.view_layer.update()
    return parts


def bake_parts(parts):
    for obj in parts:
        obj.data.calc_loop_triangles()
        shader = next(n for n in obj.data.materials[0].node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        base = tuple(shader.inputs['Base Color'].default_value[:3])
        for face in obj.data.loop_triangles:
            TRIANGLES.append(tuple(obj.matrix_world @ obj.data.vertices[i].co for i in face.vertices))
            BASE_COLOURS.append(base)
    return common.bake(TRIANGLES, BASE_COLOURS, KEY_LIGHT, FILL_LIGHT)


def baked_mesh(scene, colours):
    data = bpy.data.meshes.new('Harvest crate • low poly')
    data.from_pydata([tuple(p) for face in TRIANGLES for p in face], [], [tuple(range(i,i+3)) for i in range(0,len(colours),3)])
    attribute = data.color_attributes.new(
        name='BakedLight',
        type='FLOAT_COLOR',
        domain='CORNER',
    )
    for entry, colour in zip(attribute.data, colours):
        entry.color = (*colour, 1)
    material = bpy.data.materials.new('Harvest crate • baked wood')
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
    obj = bpy.data.objects.new('Harvest_crate', data)
    scene.collection.objects.link(obj)
    return obj


def review(scene, obj):
    if bpy.context.window is None:
        return
    common.add_lights(scene, (KEY_LIGHT, FILL_LIGHT))
    camera_data = bpy.data.cameras.new('Crate review')
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = 2.65
    camera = bpy.data.objects.new('Crate review', camera_data)
    scene.collection.objects.link(camera)
    camera.location = (3,-4,3.2)
    camera.rotation_euler = (Vector((0,0,.27)) - camera.location).to_track_quat('-Z','Y').to_euler()
    scene.camera = camera
    scene.render.resolution_x, scene.render.resolution_y = 900, 700
    standard = next((i.identifier for i in scene.view_settings.bl_rna.properties['view_transform'].enum_items if i.identifier == 'Standard'), None)
    if standard:
        scene.view_settings.view_transform = standard
    for entry in scene.objects:
        entry.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                shading = area.spaces.active.shading
                shading.type = 'SOLID'
                shading.color_type = 'VERTEX'


def main():
    scene = bpy.data.scenes.new('Solanum • Baked harvest crate')
    if bpy.context.window is not None:
        bpy.context.window.scene = scene
    # Use an override in headless Blender too; no existing scene is modified.
    with bpy.context.temp_override(scene=scene, view_layer=scene.view_layers[0]):
        parts = build(scene)
        colours = bake_parts(parts)
        encoded = common.glb(
            TRIANGLES,
            colours,
            name='Harvest_crate',
            label='Harvest crate',
            generator='Solanum Blender harvest crate builder',
            material_name='Baked crate wood',
        )
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_bytes(encoded)
        obj = baked_mesh(scene, colours)
        # Remove only the construction boards just created by this run.
        for part in parts:
            bpy.data.objects.remove(part, do_unlink=True)
        review(scene, obj)
    print({'asset': str(OUTPUT), 'triangles': len(TRIANGLES), 'bytes': len(encoded), 'floor_top': .08, 'dimensions': [1.9,1.5,.6], 'contents': 'empty', 'render_jobs_started': 0})


if __name__ == '__main__':
    main()
