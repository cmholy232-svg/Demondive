class_name CastArmModifier
extends SkeletonModifier3D
## Lays Milo's throwing upper body (torso turned, casting arm along the aim,
## off arm drawn back) over whatever his legs are doing, so he can cast while
## running, jumping or dashing. Poses come from the model's cast_* clips; each
## shot kicks the arm back toward its cast_*_pull pose for a moment.

const BLEND_SPEED: float = 14.0
## How far each shot pulls the arm back toward the draw, and how fast it recovers.
const RECOIL: float = 0.45
const RECOIL_RECOVERY: float = 7.0

## aim index -> {bone index: Quaternion}
var _poses: Array[Dictionary] = []
var _pulls: Array[Dictionary] = []
var _recoil: float = 0.0
var _aim: int = 2
var _weight: float = 0.0
var _target: float = 0.0


## Reads the arm rotations from the cast clips, in aim order (down .. up).
func load_poses(player: AnimationPlayer, names: Array[String], skeleton: Skeleton3D) -> void:
	_poses.clear()
	_pulls.clear()
	for name: String in names:
		_poses.append(_read_pose(player, name, skeleton))
		_pulls.append(_read_pose(player, name + "_pull", skeleton))


static func _read_pose(player: AnimationPlayer, name: String, skeleton: Skeleton3D) -> Dictionary:
	var pose: Dictionary = {}
	if not player.has_animation(name):
		return pose
	var animation: Animation = player.get_animation(name)
	for track: int in animation.get_track_count():
		if animation.track_get_type(track) != Animation.TYPE_ROTATION_3D or animation.track_get_key_count(track) == 0:
			continue
		var bone: int = skeleton.find_bone(str(animation.track_get_path(track)).get_slice(":", 1))
		if bone >= 0:
			pose[bone] = animation.track_get_key_value(track, 0) as Quaternion
	return pose


## One shot: snap the arm back a little; it eases out to full reach again.
func kick() -> void:
	_recoil = 1.0


func aim(index: int, active: bool) -> void:
	_aim = clampi(index, 0, maxi(0, _poses.size() - 1))
	_target = 1.0 if active else 0.0


func _process_modification() -> void:
	var skeleton: Skeleton3D = get_skeleton()
	if skeleton == null or _poses.is_empty():
		return
	var delta: float = get_process_delta_time() if is_inside_tree() else 0.016
	_weight = move_toward(_weight, _target, BLEND_SPEED * delta)
	_recoil = move_toward(_recoil, 0.0, RECOIL_RECOVERY * delta)
	if _weight <= 0.0:
		return
	var pull: Dictionary = _pulls[_aim]
	var back: float = ease(_recoil, 2.0) * RECOIL
	for bone: int in _poses[_aim]:
		var target: Quaternion = _poses[_aim][bone] as Quaternion
		if pull.has(bone):
			target = target.slerp(pull[bone] as Quaternion, back)
		var current: Quaternion = skeleton.get_bone_pose_rotation(bone)
		skeleton.set_bone_pose_rotation(bone, current.slerp(target, _weight))
