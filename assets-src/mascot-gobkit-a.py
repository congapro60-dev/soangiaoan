import bpy, math, json, os
from mathutils import Vector
root=r'C:\Users\ADMIN\.codex\worktrees\6dec\signal-station-site'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=root+r'\tasks\qa-owl-candidates\gobkit-owl.glb')
arm=next(o for o in bpy.data.objects if o.type=='ARMATURE')
body=next(o for o in bpy.data.objects if o.type=='MESH' and o.name=='Owl')
for o in list(bpy.data.objects):
 if o.type=='MESH' and o!=body: bpy.data.objects.remove(o,do_unlink=True)
# Source Root bone is rotated90degX: localY lifts worldZ, localZ moves sideways.
hop=next(a for a in bpy.data.actions if a.name=='hop')
curves=[c for layer in hop.layers for strip in layer.strips for bag in strip.channelbags for c in bag.fcurves if c.data_path=='pose.bones["Root"].location']
vertical=next(c for c in curves if c.array_index==1);sideways=next(c for c in curves if c.array_index==2)
baseline=sideways.keyframe_points[0].co.y
for lift,drift in zip(vertical.keyframe_points,sideways.keyframe_points):
 lift.co.y+=drift.co.y-baseline;drift.co.y=baseline
# Accessories inherit the original rig's head/spine; no root-motion substitute.
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=color;m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=color;m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.8;return m
black=material('Glasses_Frame',(0.05,.025,.01,1));blue=material('Cloak_Blue',(.04,.25,.7,1))
def attach(o,bone,mat):
 bpy.context.view_layer.update();world=o.matrix_world.copy();o.parent=arm;o.parent_type='BONE';o.parent_bone=bone;bpy.context.view_layer.update();o.matrix_world=world;o.data.materials.append(mat)
# Owl source normalized to2.6m; accessory dimensions below are world metres.
face=[arm.matrix_world @ arm.data.bones[n].head_local for n in ['LeftEye','RightEye']]
for i,p in enumerate(face):
 bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=4,location=(p.x,p.y-.24,p.z),rotation=(math.pi/2,0,0),major_radius=.37,minor_radius=.035)
 attach(bpy.context.object,'Head',black);bpy.context.object.name='Glasses_'+str(i)
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,sum(p.y for p in face)/2-.24,sum(p.z for p in face)/2+.055));bridge=bpy.context.object;bridge.name='Glasses_Bridge';bridge.scale=(.22,.06,.06);attach(bridge,'Head',black)
# One black Head mesh instead of three draw calls; join preserves each world transform.
bpy.ops.object.select_all(action='DESELECT')
for name in ['Glasses_0','Glasses_1','Glasses_Bridge']:bpy.data.objects[name].select_set(True)
bpy.context.view_layer.objects.active=bpy.data.objects['Glasses_0'];bpy.ops.object.join();glasses=bpy.context.object;glasses.name='Glasses_Frame'
for polygon in glasses.data.polygons:polygon.material_index=0
glasses.data.materials.clear();glasses.data.materials.append(black)
# Faceted shoulder wrap sits outside the body, with an open chest and scalloped hem.
top=[(-1.40,-.10,1.63),(-1.18,.85,1.72),(-.72,1.38,1.72),(0,1.50,1.72),(.72,1.38,1.72),(1.18,.85,1.72),(1.40,-.10,1.63)]
hem=[(-1.30,.55,.34),(-1.18,1.22,.28),(-.72,1.58,.34),(0,1.67,.27),(.72,1.58,.34),(1.18,1.22,.28),(1.30,.55,.34)]
verts=top+hem;faces=[(i,i+1,8+i,7+i) for i in range(6)]
mesh=bpy.data.meshes.new('BlueCloakMesh');mesh.from_pydata(verts,[],faces);mesh.update();cloak=bpy.data.objects.new('BlueCloak',mesh);bpy.context.scene.collection.objects.link(cloak);attach(cloak,'Spine',blue)
# Two-sided cloak and boundedpoly accessories; original idle/walk/hop preserved.
blue.use_nodes=True;blue.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=0
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
 if o.type in ['MESH','ARMATURE']:o.select_set(True)
bpy.context.view_layer.objects.active=body
os.makedirs(root+r'\assets-src',exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=root+r'\assets-src\mascot-gobkit-a.blend')
bpy.ops.export_scene.gltf(filepath=root+r'\public\models\mascot-gobkit-a.glb',export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_yup=True,export_materials='EXPORT')
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100;scene.world=bpy.data.worlds.new('PreviewWorld');scene.world.color=(.18,.18,.18)
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=4.7;scene.camera=cam
for loc,power,size in [((3,-4,6),900,5),((-4,-2,3),700,4),((1,4,5),1100,4)]:
 bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,1.4))-l.location).to_track_quat('-Z','Y').to_euler()
scene.render.image_settings.file_format='PNG'
for view,loc in [('glasses-cloak',(4,-7,3.8)),('side',(7,0,3.2)),('back',(4,7,3.8))]:
 cam.location=loc;cam.rotation_euler=(Vector((0,0,1.35))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=root+r'\tasks\qa-owl-candidates\gobkit-a-'+view+'.png';bpy.ops.render.render(write_still=True)
print(json.dumps({'asset':os.path.getsize(root+r'\public\models\mascot-gobkit-a.glb'),'bones':len(arm.data.bones),'meshes':len([o for o in bpy.data.objects if o.type=='MESH'])}))
