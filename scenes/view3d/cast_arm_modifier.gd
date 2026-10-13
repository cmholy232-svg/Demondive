class_name CastArmModifier
extends SkeletonModifier3D
## Points Milo's right arm along his aim on top of whatever the body clip is
## doing, so he can cast while running, jumping or dashing. Poses come from
## the model's cast_* clips; the arm blends in and out by `weight`.

const BLEND_SPEED: float = 18.0

## aim index -> {bone index: Quaternion}
var _poses: Array[Dictionary] = []
var _aim: int = 2
var _weight: float = 0.0
var _target: float = 0.0


## Reads the arm rotations from the cast clips, in aim order (down .. up).
func load_poses(player: AnimationPlayer, names: Array[String], skeleton: Skeleton3D) -> void:
	_poses.clear()
	for name: String in names:
		var pose: Dictionary = {}
		if player.has_animation(name):
			var animation: Animation = player.get_animation(name)
			for track: int in animation.get_track_count():
				if animation.track_get_type(track) != Animation.TYPE_ROTATION_3D or animation.track_get_key_count(track) == 0:
					continue
				var bone: int = skeleton.find_bone(str(animation.track_get_path(track)).get_slice(":", 1))
				if bone >= 0:
					pose[bone] = animation.track_get_key_value(track, 0) as Quaternion
		_poses.append(pose)


func aim(index: int, active: bool) -> void:
	_aim = clampi(index, 0, maxi(0, _poses.size() - 1))
	_target = 1.0 if active else 0.0


func _process_modification() -> void:
	var skeleton: Skeleton3D = get_skeleton()
	if skeleton == null or _poses.is_empty():
		return
	var delta: float = get_process_delta_time() if is_inside_tree() else 0.016
	_weight = move_toward(_weight, _target, BLEND_SPEED * delta)
	if _weight <= 0.0:
		return
	for bone: int in _poses[_aim]:
		var current: Quaternion = skeleton.get_bone_pose_rotation(bone)
		skeleton.set_bone_pose_rotation(bone, current.slerp(_poses[_aim][bone] as Quaternion, _weight))
