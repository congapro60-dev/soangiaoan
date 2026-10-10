import json
import math
import os
import bpy

# 1. Scene setup (preserve defaults)
scene = bpy.data.scenes.new("CodexOwlPilot")
bpy.context.window.scene = scene
scene.render.fps = 24

# Preview lighting/cam (deselected, excluded from export)
cam_data = bpy.data.cameras.new("PreviewCam")
cam = bpy.data.objects.new("PreviewCam", cam_data)
cam.location = (0.0, -5.5, 2.0)
from mathutils import Vector
cam.rotation_euler = (Vector((0,0,1.5))-cam.location).to_track_quat("-Z","Y").to_euler()
scene.camera=cam
scene.collection.objects.link(cam)

lamp_data = bpy.data.lights.new("PreviewLight", "SUN")
lamp = bpy.data.objects.new("PreviewLight", lamp_data)
lamp.location = (2.0, -3.0, 5.0)
scene.collection.objects.link(lamp)

# 2. Shared Vertex Color Material
mat = bpy.data.materials.new("M_OwlVertexColor")
mat.use_nodes = True
nodes = mat.node_tree.nodes
nodes.clear()
bsdf = nodes.new("ShaderNodeBsdfPrincipled")
out = nodes.new("ShaderNodeOutputMaterial")
vcol = nodes.new("ShaderNodeVertexColor")
vcol.layer_name = "Color"
bsdf.inputs["Roughness"].default_value = 0.78
if hasattr(vcol, "attribute_name"):
    vcol.attribute_name = "Color"
mat.node_tree.links.new(vcol.outputs.get("Color", vcol.outputs[0]), bsdf.inputs["Base Color"])
mat.node_tree.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

# 3. Procedural Primitives
parts_data = [
    # type, name, bone, color (RGBA), loc, rot, scale
    ("SPHERE", "Body", "root", (0.35, 0.20, 0.10, 1.0), (0, 0, 1.2), (0, 0, 0), (0.75, 0.65, 0.85)),
    ("SPHERE", "Head", "head", (0.38, 0.22, 0.11, 1.0), (0, -0.05, 2.25), (0, 0, 0), (0.65, 0.60, 0.55)),
    ("SPHERE", "HeartMask", "head", (0.92, 0.88, 0.78, 1.0), (0, -0.45, 2.25), (0, 0, 0), (0.50, 0.20, 0.45)),
    ("SPHERE", "Eye_L", "head", (0.95, 0.65, 0.05, 1.0), (-0.25, -0.55, 2.3), (0, 0, 0), (0.22, 0.17, 0.23)),
    ("SPHERE", "Eye_R", "head", (0.95, 0.65, 0.05, 1.0), (0.25, -0.55, 2.3), (0, 0, 0), (0.22, 0.17, 0.23)),
    ("SPHERE", "Pupil_L", "head", (0.025,0.012,0.006,1), (-0.25,-0.72,2.32), (0,0,0), (0.115,0.06,0.125)),
    ("SPHERE", "Pupil_R", "head", (0.025,0.012,0.006,1), (0.25,-0.72,2.32), (0,0,0), (0.115,0.06,0.125)),
    ("SPHERE", "Glint_L", "head", (1,1,1,1), (-0.28,-0.776,2.37), (0,0,0), (0.035,0.02,0.035)),
    ("SPHERE", "Glint_R", "head", (1,1,1,1), (0.22,-0.776,2.37), (0,0,0), (0.035,0.02,0.035)),
    ("CONE", "Beak", "head", (0.95, 0.45, 0.05, 1.0), (0, -0.65, 2.15), (math.radians(-75), 0, 0), (0.12, 0.12, 0.25)),
    ("CONE", "Tuft_L", "head", (0.32, 0.18, 0.08, 1.0), (-0.35, -0.1, 2.8), (0, math.radians(-25), 0), (0.12, 0.12, 0.35)),
    ("CONE", "Tuft_R", "head", (0.32, 0.18, 0.08, 1.0), (0.35, -0.1, 2.8), (0, math.radians(25), 0), (0.12, 0.12, 0.35)),
    ("SPHERE", "Wing_L", "wing_L", (0.30, 0.16, 0.07, 1.0), (-0.85, 0, 1.3), (math.radians(10), 0, math.radians(-15)), (0.18, 0.42, 0.65)),
    ("SPHERE", "Wing_R", "wing_R", (0.30, 0.16, 0.07, 1.0), (0.85, 0, 1.3), (math.radians(10), 0, math.radians(15)), (0.18, 0.42, 0.65)),
    ("CYLINDER", "Foot_L", "foot_L", (0.95, 0.45, 0.05, 1.0), (-0.30, -0.05, 0.15), (0, 0, 0), (0.16, 0.25, 0.15)),
    ("CYLINDER", "Foot_R", "foot_R", (0.95, 0.45, 0.05, 1.0), (0.30, -0.05, 0.15), (0, 0, 0), (0.16, 0.25, 0.15)),
    ("CUBE", "Book", "root", (0.05, 0.45, 0.45, 1.0), (0, -0.65, 1.0), (0, 0, 0), (0.25, 0.08, 0.32)),
]

part_objs = []
for ptype, name, bone, col, loc, rot, scale in parts_data:
    if ptype == "SPHERE":
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, location=loc, rotation=rot)
    elif ptype == "CONE":
        bpy.ops.mesh.primitive_cone_add(vertices=8, location=loc, rotation=rot)
    elif ptype == "CYLINDER":
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    obj = bpy.context.active_object
    for face in obj.data.polygons:
        face.use_smooth=True
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    vg = obj.vertex_groups.new(name=bone)
    vg.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    color_layer = obj.data.color_attributes.new(name="Color", type="BYTE_COLOR", domain="CORNER")
    for loop_idx in range(len(obj.data.loops)):
        color_layer.data[loop_idx].color = col
    part_objs.append(obj)

# Join meshes
bpy.ops.object.select_all(action="DESELECT")
for o in part_objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = part_objs[0]
bpy.ops.object.join()
owl_mesh = bpy.context.active_object
owl_mesh.name = "Owl_Mesh"
owl_mesh.data.materials.append(mat)

# 4. Rigging
arm_data = bpy.data.armatures.new("Owl_Armature")
arm_obj = bpy.data.objects.new("Owl_Rig", arm_data)
scene.collection.objects.link(arm_obj)
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.mode_set(mode="EDIT")

bones = {
    "root": ((0, 0, 0.4), (0, 0, 1.6), None),
    "head": ((0, 0, 1.8), (0, 0, 2.7), "root"),
    "wing_L": ((-0.7, 0, 1.7), (-0.9, 0, 0.7), "root"),
    "wing_R": ((0.7, 0, 1.7), (0.9, 0, 0.7), "root"),
    "foot_L": ((-0.3, 0, 0.3), (-0.3, -0.2, 0.0), "root"),
    "foot_R": ((0.3, 0, 0.3), (0.3, -0.2, 0.0), "root"),
}
ebones = arm_data.edit_bones
for bname, (head, tail, parent) in bones.items():
    b = ebones.new(bname)
    b.head, b.tail = head, tail
for bname, (_, _, parent) in bones.items():
    if parent:
        ebones[bname].parent = ebones[parent]
bpy.ops.object.mode_set(mode="OBJECT")

# Bind Rig
mod = owl_mesh.modifiers.new("Armature", "ARMATURE")
mod.object = arm_obj
owl_mesh.parent=arm_obj

# 5. Animations
arm_obj.animation_data_create()
clips = {
    "idle": (
        48,
        [
            ("root", "scale", [(1, (1, 1, 1)), (24, (1.03, 1.03, 0.97)), (48, (1, 1, 1))]),
            ("head", "rotation_euler", [(1, (0, 0, 0)), (24, (0.05, 0, 0.05)), (48, (0, 0, 0))]),
            ("wing_L", "rotation_euler", [(1, (0, 0, 0)), (24, (0, 0, -0.08)), (48, (0, 0, 0))]),
            ("wing_R", "rotation_euler", [(1, (0, 0, 0)), (24, (0, 0, 0.08)), (48, (0, 0, 0))]),
        ],
    ),
    "walk": (
        20,
        [
            ("root", "location", [(1, (0, 0, 0)), (10, (0, 0.08, 0)), (20, (0, 0, 0))]),
            ("foot_L", "location", [(1, (0, 0, 0)), (5, (0, 0.12, 0.1)), (15, (0, -0.12, 0)), (20, (0, 0, 0))]),
            ("foot_R", "location", [(1, (0, 0, 0)), (5, (0, -0.12, 0)), (15, (0, 0.12, 0.1)), (20, (0, 0, 0))]),
            ("wing_L", "rotation_euler", [(1, (0, 0, 0)), (10, (0, 0, -0.15)), (20, (0, 0, 0))]),
            ("wing_R", "rotation_euler", [(1, (0, 0, 0)), (10, (0, 0, 0.15)), (20, (0, 0, 0))]),
        ],
    ),
    "hop": (
        16,
        [
            ("root", "location", [(1, (0, 0, 0)), (4, (0, -0.1, 0)), (8, (0, 0.45, 0)), (12, (0, -0.05, 0)), (16, (0, 0, 0))]),
            ("wing_L", "rotation_euler", [(1, (0, 0, 0)), (8, (0, 0, -0.5)), (16, (0, 0, 0))]),
            ("wing_R", "rotation_euler", [(1, (0, 0, 0)), (8, (0, 0, 0.5)), (16, (0, 0, 0))]),
            ("foot_L", "location", [(1, (0, 0, 0)), (8, (0, 0, -0.1)), (16, (0, 0, 0))]),
            ("foot_R", "location", [(1, (0, 0, 0)), (8, (0, 0, -0.1)), (16, (0, 0, 0))]),
        ],
    ),
}

for clip_name, (frames, tracks) in clips.items():
    arm_obj.animation_data.action = None
    # Reset neutral pose
    for pb in arm_obj.pose.bones:
        pb.location, pb.rotation_euler, pb.scale = (0, 0, 0), (0, 0, 0), (1, 1, 1)
    act = bpy.data.actions.new(clip_name)
    arm_obj.animation_data.action = act
    for pb in arm_obj.pose.bones:
        for prop in ["location","rotation_euler","scale"]:
            for f in [1,frames]:
                pb.keyframe_insert(data_path=prop,frame=f)
    for bname, prop, kfs in tracks:
        pb = arm_obj.pose.bones[bname]
        for f, val in kfs:
            setattr(pb, prop, val)
            pb.keyframe_insert(data_path=prop, frame=f)
    for layer in act.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for fcu in bag.fcurves:
                    for kp in fcu.keyframe_points:
                        kp.interpolation = "LINEAR"
    track = arm_obj.animation_data.nla_tracks.new()
    track.name = clip_name
    nla=track.strips.new(clip_name, 1, act)
    track.mute=True
arm_obj.animation_data.action=None
scene.frame_set(1)

# 6. Export Paths & Save
glb_path = "C:/Users/ADMIN/.codex/worktrees/6dec/signal-station-site/public/models/mascot-owl.glb"
blend_path = "C:/Users/ADMIN/.codex/worktrees/6dec/signal-station-site/assets-src/mascot-owl.blend"
for p in [glb_path, blend_path]:
    os.makedirs(os.path.dirname(p), exist_ok=True)

bpy.ops.wm.save_as_mainfile(filepath=blend_path)

# glTF Export Selection
bpy.ops.object.select_all(action="DESELECT")
owl_mesh.select_set(True)
arm_obj.select_set(True)
bpy.context.view_layer.objects.active = arm_obj

rna = bpy.ops.export_scene.gltf.get_rna_type().properties
export_kwargs = {"filepath": glb_path}
candidates = {
    "export_format": "GLB",
    "use_selection": True,
    "export_apply": False,
    "export_colors": True,
    "export_attributes": True,
    "export_animations": True,
    "export_nla_strips": True,
    "export_animation_mode": "NLA_TRACKS",
    "export_vertex_color": "MATERIAL",
    "export_all_vertex_colors": True,
    "export_skins": True,
    "export_force_sampling": False,
}
for k, v in candidates.items():
    if k in rna:
        export_kwargs[k] = v

bpy.ops.export_scene.gltf(**export_kwargs)

# 7. Print JSON report
owl_mesh.data.calc_loop_triangles()
tri_count = len(owl_mesh.data.loop_triangles)
glb_size = os.path.getsize(glb_path) if os.path.exists(glb_path) else 0
print(
    json.dumps(
        {
            "triangles": tri_count,
            "bytes": glb_size,
            "clips": list(clips.keys()),
            "skinbones": list(bones.keys()),
        }
    )
)
# ponytail: rigid block weighting; add smooth auto-weights when deformation detail requires organic folding.