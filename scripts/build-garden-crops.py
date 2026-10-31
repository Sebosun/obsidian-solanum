"""Blender-authored tomato, corn and apple lifecycles, plus separate picked produce.

  blender --background --python scripts/build-garden-crops.py -- tomato
  blender --background --python scripts/build-garden-crops.py -- corn
  blender --background --python scripts/build-garden-crops.py -- apple

Each family is built sequentially and saved before anything is connected to the app.
Uses the same deterministic vertex-light baker and GLB encoder as the farm plot.
No Cycles rendering, texture baking, external art, or generated textures are needed.
"""

import math
import sys
from pathlib import Path
from types import ModuleType

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'assets/crops/garden'
PALETTE = {
    'stem': '559637', 'stem_light': '78b63f',
    'leaf': '4caa3f', 'leaf_light': '88c946', 'leaf_dark': '348439',
    'tomato': 'f44328', 'tomato_light': 'ff6335', 'tomato_green': 'a4c845',
    'tomato_turning': 'f3ac38', 'flower': 'ffd74c', 'flower_middle': 'd58e23',
    'bark': '95613d', 'bark_light': 'b47a47',
    'apple': 'e73542', 'apple_light': 'fa5748', 'apple_blush': 'f5a345',
    'apple_green': 'a7cc44', 'canopy': '69b443', 'canopy_light': '92ce4a',
    'pink': 'ffd9cb', 'corn': 'ffd04c', 'corn_light': 'ffe37a', 'corn_deep': 'eeac2e',
    'husk': '63ae3b', 'husk_light': '9bcb49', 'tassel': 'd9ac48',
}


def load_baker():
    path = ROOT / 'scripts/build-farm-platform.py'
    module = ModuleType('solanum_garden_baker')
    module.__file__ = str(path)
    exec(compile(path.read_text(), str(path), 'exec'), module.__dict__)
    module.PALETTE = PALETTE
    return module


class CropArt:
    def __init__(self):
        self.baker = load_baker()

    def face(self, points, colour, transform=None, upward=False):
        points = [Vector(p) for p in points]
        if upward:
            normal=Vector((0,0,0))
            for i in range(1,len(points)-1):
                normal+=(points[i]-points[0]).cross(points[i+1]-points[0])
            if normal.z<0:points.reverse()
        if transform:
            points = [transform(p) for p in points]
        for i in range(1,len(points)-1):
            triangle=[points[0],points[i],points[i+1]]
            if (triangle[1]-triangle[0]).cross(triangle[2]-triangle[0]).length_squared>1e-12:
                self.baker.polygon(triangle,colour)

    def tube(self, path, radii, colour='stem', sides=6, transform=None):
        path = [Vector(p) for p in path]
        rings = []
        for i, point in enumerate(path):
            axis = (path[min(i+1,len(path)-1)]-path[max(0,i-1)]).normalized()
            u = axis.cross(Vector((0,0,1)))
            if u.length < .01:
                u = axis.cross(Vector((0,1,0)))
            u.normalize()
            v = axis.cross(u)
            rings.append([point + radii[i]*(u*math.cos(j*math.tau/sides)+v*math.sin(j*math.tau/sides)) for j in range(sides)])
        for low, high in zip(rings, rings[1:]):
            for i in range(sides):
                j = (i+1) % sides
                self.face([low[i],low[j],high[j],high[i]], colour, transform)
        self.face(list(reversed(rings[0])), colour, transform)
        self.face(rings[-1], colour, transform)

    def leaf(self, start, direction, length, width, colour='leaf', light='leaf_light', curve=.06, transform=None):
        start, direction = Vector(start), Vector(direction).normalized()
        side = direction.cross(Vector((0,0,1)))
        if side.length < .01:
            side = Vector((1,0,0))
        side.normalize()
        rows = []
        for t in [0,.28,.62,1]:
            centre = start + direction*(length*t) + Vector((0,0,curve*math.sin(math.pi*t)))
            half = width*.5*math.sin(math.pi*t)**.8
            ridge = centre + Vector((0,0,width*.15*math.sin(math.pi*t)))
            rows.append((centre+side*half, ridge, centre-side*half))
        for a,b in zip(rows,rows[1:]):
            self.face([a[0],b[0],b[1],a[1]], colour, transform, upward=True)
            self.face([a[1],b[1],b[2],a[2]], light, transform, upward=True)

    def ellipsoid(self, centre, size, colour, segments=12, rings=7, lobes=0, dent=0, transform=None):
        centre = Vector(centre)
        def point(phi, theta):
            scallop = 1 + lobes*math.cos(5*theta)*math.cos(phi)**2
            z = size[2]*math.sin(phi)
            if phi > 0:
                z -= size[2]*dent*math.sin(phi)**12
            return centre + Vector((size[0]*math.cos(phi)*math.cos(theta)*scallop,
                                    size[1]*math.cos(phi)*math.sin(theta)*scallop,z))
        rows = [[point(-math.pi/2+math.pi*i/rings,math.tau*j/segments) for j in range(segments)] for i in range(1,rings)]
        bottom, top = point(-math.pi/2,0), point(math.pi/2,0)
        def tint(i,j):
            if isinstance(colour,tuple):
                return colour[1] if j % 6 in (0,1) and i > 1 else colour[0]
            return colour
        for j in range(segments):
            k=(j+1)%segments
            self.face([bottom,rows[0][k],rows[0][j]],tint(0,j),transform)
            for i in range(len(rows)-1):
                self.face([rows[i][j],rows[i][k],rows[i+1][k],rows[i+1][j]],tint(i,j),transform)
            self.face([top,rows[-1][j],rows[-1][k]],tint(rings,j),transform)

    def calyx(self, centre, radius, colour='leaf_dark'):
        centre=Vector(centre)
        for i in range(5):
            a=math.tau*i/5
            side=Vector((-math.sin(a),math.cos(a),0))*radius*.15
            tip=centre+Vector((math.cos(a)*radius,math.sin(a)*radius,-radius*.16))
            base=centre+Vector((math.cos(a)*radius*.10,math.sin(a)*radius*.10,.006))
            self.face([base-side,tip,base+side],colour,upward=True)

    def tomato(self, centre, radius, green=False, turning=False):
        centre=Vector(centre)
        tint='tomato_green' if green else 'tomato_turning' if turning else ('tomato','tomato_light')
        self.ellipsoid(centre,(radius,radius*.96,radius*.80),tint,lobes=.045,dent=.25)
        crown=centre+Vector((0,0,radius*.64))
        self.calyx(crown,radius*.72)
        self.tube([crown,crown+Vector((.02,0,radius*.18))],[radius*.08,radius*.05],'stem',5)

    def apple(self, centre, radius, green=False):
        centre=Vector(centre)
        tint='apple_green' if green else ('apple','apple_light')
        self.ellipsoid(centre,(radius,radius*.94,radius*.98),tint,lobes=.075,dent=.26)
        top=centre+Vector((0,0,radius*.76))
        self.tube([top,top+Vector((radius*.06,0,radius*.25)),top+Vector((radius*.17,0,radius*.35))],
                  [radius*.065,radius*.055,radius*.035],'bark',5)
        self.leaf(top+Vector((radius*.08,0,radius*.22)),(1,.2,.2),radius*.72,radius*.30)

    def flower(self, centre, radius, colour='flower'):
        centre=Vector(centre)
        for i in range(5):
            a=math.tau*i/5
            side=Vector((-math.sin(a),math.cos(a),0))*radius*.28
            tip=centre+Vector((math.cos(a)*radius,math.sin(a)*radius,radius*.1))
            self.face([centre-side*.3,tip-side,tip+side,centre+side*.3],colour,upward=True)
        self.ellipsoid(centre+Vector((0,0,.006)),(radius*.25,)*3,'flower_middle',segments=6,rings=3)

    def corn_ear(self, origin, direction, length=.60, radius=.145, ripe=True, hero=False):
        origin=Vector(origin);axis=Vector(direction).normalized()
        u=axis.cross(Vector((0,1,0))).normalized();v=axis.cross(u)
        def frame(p): return origin+u*p.x+v*p.y+axis*p.z
        if not ripe:
            self.ellipsoid((0,0,length*.48),(radius,radius,length*.48),'husk',segments=8,rings=5,transform=frame)
        else:
            self.ellipsoid((0,0,length*.49),(radius*.91,radius*.91,length*.48),'corn_deep',segments=10,rings=6,transform=frame)
            rows=8 if hero else 6
            for row in range(rows):
                t=(row+.65)/(rows+.3)
                profile=math.sin(math.pi*(.08+.84*t))**.35
                for column in range(8):
                    a=math.tau*column/8
                    radial=radius*.86*profile
                    def kernel_frame(p,a=a,radial=radial,t=t):
                        q=Vector((math.cos(a)*(radial+p.x)-math.sin(a)*p.y,
                                  math.sin(a)*(radial+p.x)+math.cos(a)*p.y,length*t+p.z))
                        return frame(q)
                    self.ellipsoid((0,0,0),(radius*.23,radius*.32,length/(rows+1)*.48),
                                   'corn_light' if (row+column)%4==0 else 'corn',segments=4,rings=3,transform=kernel_frame)
        for i,a in enumerate([.2,2.4,4.5]):
            direction=(math.cos(a)*.7,math.sin(a)*.7,.72)
            self.leaf((math.cos(a)*radius*.3,math.sin(a)*radius*.3,0),direction,
                      length*(.78 if hero else .64),radius*1.2,'husk','husk_light',curve=length*.12,transform=frame)
        self.tube([(0,0,length*.91),(.015,0,length*1.06)],[radius*.10,radius*.025],'tassel',4,frame)

    def ground(self):
        bottom=min(p.z for face in self.baker.TRIANGLES for p in face)
        for face in self.baker.TRIANGLES:
            for point in face:
                point.z-=bottom


def tomato_stage(art,stage):
    if stage==1:
        art.tube([(0,0,0),(.012,0,.12),(0,0,.18)],[.013,.011,.006])
        for side in [-1,1]:art.leaf((0,0,.12),(side,.1,.36),.20,.10)
        return
    height={2:.65,3:1.10,4:1.40}[stage]
    art.tube([(0,0,0),(-.025,0,height*.42),(.025,.015,height*.78),(0,0,height)],
             [.035 if stage==4 else .025,.027,.018,.007])
    nodes=3 if stage==2 else 5
    for i in range(nodes):
        z=height*(.22+i*.14);side=-1 if i%2 else 1
        end=Vector((side*(.23 if stage==2 else .32),.08 if i%2 else .02,z+.12))
        art.tube([(0,0,z),end],[.014,.007])
        art.leaf(end,(side,.16,.15),.25 if stage==2 else .32,.14 if stage==2 else .18)
        art.leaf(end,(-side,.8,.24),.20 if stage==2 else .26,.13)
    art.leaf((0,0,height*.84),(-.5,.1,.9),.22,.12)
    if stage==2:art.flower((.10,-.025,.54),.048)
    if stage==3:
        art.tomato((.24,-.09,.43),.125,green=True)
        art.tomato((-.22,-.1,.77),.14,turning=True)
        art.flower((.17,-.01,.96),.055)
    if stage==4:
        for centre,radius in [((-.30,-.18,.48),.23),((.30,-.15,.77),.25),((-.22,-.08,1.06),.23),((.13,-.14,1.22),.18)]:
            art.tomato(centre,radius)


def corn_stage(art,stage):
    if stage==1:
        art.tube([(0,0,0),(0,0,.11)],[.018,.012])
        art.leaf((0,0,.06),(1,0,.9),.28,.085,'husk','husk_light',curve=.06)
        art.leaf((0,0,.075),(-1,.1,.8),.24,.075,'husk','husk_light',curve=.07)
        return
    height={2:.73,3:1.22,4:1.65}[stage]
    art.tube([(0,0,0),(0,0,height*.5),(.015,0,height)], [.036,.029,.015], 'stem_light')
    count={2:5,3:7,4:8}[stage]
    for i in range(count):
        angle=i*2.45
        art.leaf((0,0,.13+height*i/(count+1)),(math.cos(angle),math.sin(angle),.32),
                 .37 if stage==2 else .52 if stage==3 else .62,.11 if stage==2 else .15,
                 'leaf','husk_light',curve=.12)
    if stage>=3:
        art.corn_ear((0,-.025,height*.38),(.5,-.32,.86),length=.35 if stage==3 else .58,
                     radius=.09 if stage==3 else .15,ripe=stage==4)
        art.corn_ear((0,.025,height*.59),(-.55,-.15,.83),length=.27 if stage==3 else .51,
                     radius=.08 if stage==3 else .135,ripe=stage==4)
        for i in range(5):
            a=i*math.tau/5
            art.tube([(.015,0,height*.91),(.015+math.cos(a)*.07,math.sin(a)*.07,height+.025),
                      (.015+math.cos(a)*.13,math.sin(a)*.13,height+.13)],
                     [.009,.007,.002],'tassel',4)


def apple_stage(art,stage):
    if stage==1:
        art.tube([(0,0,0),(0,0,.19)],[.012,.008])
        for side in [-1,1]:art.leaf((0,0,.14),(side,.1,.4),.18,.10)
        return
    height={2:.67,3:1.12,4:1.55}[stage]
    art.tube([(0,0,0),(-.02,0,height*.4),(.02,0,height*.8),(0,0,height)],
             [.032 if stage==2 else .055,.027 if stage==2 else .045,.024,.010], 'bark')
    if stage==2:
        for side,z in [(-1,.32),(1,.45),(-1,.57)]:
            end=(side*.15,.015,z+.1)
            art.tube([(0,0,z),end],[.014,.006],'bark')
            art.leaf(end,(side,.1,.3),.24,.16)
            art.leaf(end,(-side,.6,.6),.17,.12)
        return
    canopy=[(-.30,.06,height*.74),(.30,.10,height*.78),(0,.13,height*.98)]
    for i,centre in enumerate(canopy):
        art.tube([(0,0,height*.45),centre],[.028,.014],'bark')
        size=(.27,.24,.27) if stage==3 else (.40,.33,.34)
        art.ellipsoid(centre,size,('canopy','canopy_light'),segments=10,rings=5)
    if stage==3:
        art.apple((-.22,-.15,.82),.095,green=True)
        art.apple((.22,-.14,1.03),.10,green=True)
        art.flower((0,-.14,1.24),.045,'pink')
    else:
        for centre,radius in [((-.33,-.22,1.03),.21),((.32,-.19,1.18),.225),((.02,-.20,1.51),.205)]:
            art.apple(centre,radius)


def model(family,stage):
    art=CropArt()
    if stage=='produce':
        if family=='tomato':art.tomato((0,0,.36),.45)
        elif family=='corn':art.corn_ear((0,0,0),(.08,0,1),length=.95,radius=.225,hero=True)
        else:art.apple((0,0,.45),.46)
    else:
        {'tomato':tomato_stage,'corn':corn_stage,'apple':apple_stage}[family](art,stage)
    art.ground()
    colours=art.baker.bake()
    name=f'{family.title()}_{stage}'
    encoded=art.baker.glb(colours,name=name,label=name,generator='Solanum Blender garden crops builder',material_name=f'{family.title()} • baked colour')
    return art,colours,encoded


def review_model(scene,art,colours,name,offset):
    data=bpy.data.meshes.new(name)
    data.from_pydata([tuple(p) for face in art.baker.TRIANGLES for p in face],[],[tuple(range(i,i+3)) for i in range(0,len(colours),3)])
    attr=data.color_attributes.new(name='BakedLight',type=next(i.identifier for i in bpy.types.Attribute.bl_rna.properties['data_type'].enum_items if i.identifier=='FLOAT_COLOR'),domain=next(i.identifier for i in bpy.types.Attribute.bl_rna.properties['domain'].enum_items if i.identifier=='CORNER'))
    for entry,c in zip(attr.data,colours):entry.color=(*c,1)
    material=bpy.data.materials.new(f'{name} • baked');material.use_nodes=True
    nodes=material.node_tree.nodes;nodes.clear()
    vertex=nodes.new('ShaderNodeVertexColor');vertex.layer_name=attr.name
    emission=nodes.new('ShaderNodeEmission');output=nodes.new('ShaderNodeOutputMaterial')
    material.node_tree.links.new(vertex.outputs['Color'],emission.inputs['Color'])
    material.node_tree.links.new(emission.outputs[0],output.inputs['Surface'])
    data.materials.append(material)
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=(offset,0,0)
    return obj


def build_family(family,review=True):
    OUTPUT.mkdir(parents=True,exist_ok=True)
    scene=None
    if review and bpy.context.window is not None:
        scene=bpy.data.scenes.new(f'Solanum • {family.title()} lifecycle')
        bpy.context.window.scene=scene
    stats=[]
    for i,stage in enumerate([1,2,3,4,'produce']):
        art,colours,encoded=model(family,stage)
        name=f'{family.title()}_{stage}'
        path=OUTPUT/f'{name}.glb';path.write_bytes(encoded)
        if scene:review_model(scene,art,colours,name,(i-2)*1.55)
        stats.append({'model':name,'triangles':len(art.baker.TRIANGLES),'bytes':len(encoded)})
    if scene:
        art.baker.add_lights(scene)
        camera_data=bpy.data.cameras.new(f'{family.title()} lifecycle review')
        camera_data.type=next(i.identifier for i in camera_data.bl_rna.properties['type'].enum_items if i.identifier=='ORTHO')
        camera_data.ortho_scale=8.5
        camera=bpy.data.objects.new('Lifecycle review',camera_data);scene.collection.objects.link(camera)
        camera.location=(2,-8,3.1);camera.rotation_euler=(Vector((0,0,.64))-camera.location).to_track_quat('-Z','Y').to_euler();scene.camera=camera
        scene.render.resolution_x,scene.render.resolution_y=1200,650
        standard=next((i.identifier for i in scene.view_settings.bl_rna.properties['view_transform'].enum_items if i.identifier=='Standard'),None)
        if standard:scene.view_settings.view_transform=standard
        for screen in bpy.data.screens:
            for area in screen.areas:
                if area.type=='VIEW_3D':
                    shading=area.spaces.active.shading
                    shading.type=next(i.identifier for i in shading.bl_rna.properties['type'].enum_items if i.identifier=='SOLID')
                    shading.color_type=next(i.identifier for i in shading.bl_rna.properties['color_type'].enum_items if i.identifier=='VERTEX')
    print({'family':family,'models':stats,'application_changed':False,'render_jobs_started':0})
    return stats


if __name__=='__main__':
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['tomato']
    build_family(args[0])
