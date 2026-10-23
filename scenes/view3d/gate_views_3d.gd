class_name GateViews3D
extends RefCounted
## The gates of a box room in 3D: a neon frame round each open gate, laser
## bars across it while the room is locked, and a sign naming what waits on
## the other side (from Room.gate_hints).

const LOCKED: Color = Color(1.0, 0.12, 0.25)
const OPEN: Color = Color(0.25, 1.0, 0.75)
const DEPTH_Z: float = 0.35


## Builds every gate under root. Returns side -> the bars node to show while locked.
static func build(root: Node3D, room: Room) -> Dictionary:
	var bars: Dictionary = {}
	for side: String in room.data.open_gates:
		var rect: Rect2 = room.data.gate_rect(side)
		if side == "S":
			rect.size.y = RoomData.TILE * 0.5
		var frame := Node3D.new()
		root.add_child(frame)
		_frame(frame, rect, side)
		var lock := Node3D.new()
		frame.add_child(lock)
		_bars(lock, rect, side)
		bars[side] = lock
		var hint: StringName = room.gate_hints.get(side, &"") as StringName
		if hint != &"" and Strings.has_key("reward.%s" % hint):
			_sign(frame, rect, side, Strings.text("reward.%s" % hint))
	return bars


## Glowing posts along the two edges of the opening that meet the wall.
static func _frame(root: Node3D, rect: Rect2, side: String) -> void:
	var c: Vector3 = Kit3D.rect_center(rect)
	var w: float = rect.size.x / Kit3D.PX_PER_M
	var h: float = rect.size.y / Kit3D.PX_PER_M
	var mat: Material = Kit3D.neon(OPEN, 3.0)
	if side == "W" or side == "E":
		Kit3D.box(root, Vector3(c.x, c.y + h * 0.5, DEPTH_Z), Vector3(w + 0.2, 0.08, 0.08), mat)
		Kit3D.box(root, Vector3(c.x, c.y - h * 0.5, DEPTH_Z), Vector3(w + 0.2, 0.08, 0.08), mat)
	else:
		Kit3D.box(root, Vector3(c.x - w * 0.5, c.y, DEPTH_Z), Vector3(0.08, h + 0.2, 0.08), mat)
		Kit3D.box(root, Vector3(c.x + w * 0.5, c.y, DEPTH_Z), Vector3(0.08, h + 0.2, 0.08), mat)
	Kit3D.omni(root, Vector3(c.x, c.y, 0.8), OPEN, 0.8, 3.0)


static func _bars(root: Node3D, rect: Rect2, side: String) -> void:
	var c: Vector3 = Kit3D.rect_center(rect)
	var w: float = rect.size.x / Kit3D.PX_PER_M
	var h: float = rect.size.y / Kit3D.PX_PER_M
	var mat: Material = Kit3D.neon(LOCKED, 5.0)
	for i: int in 5:
		var t: float = (i + 0.5) / 5.0 - 0.5
		if side == "W" or side == "E":
			Kit3D.box(root, Vector3(c.x, c.y + t * h, DEPTH_Z), Vector3(w, 0.035, 0.035), mat)
		else:
			Kit3D.box(root, Vector3(c.x + t * w, c.y, DEPTH_Z), Vector3(0.035, h, 0.035), mat)
	Kit3D.omni(root, Vector3(c.x, c.y, 0.9), LOCKED, 1.2, 3.5)


static func _sign(root: Node3D, rect: Rect2, side: String, text: String) -> void:
	var c: Vector3 = Kit3D.rect_center(rect)
	var h: float = rect.size.y / Kit3D.PX_PER_M
	var at: Vector3
	match side:
		"W":
			at = Vector3(c.x + 1.6, c.y + h * 0.5 + 0.45, DEPTH_Z)
		"E":
			at = Vector3(c.x - 1.6, c.y + h * 0.5 + 0.45, DEPTH_Z)
		"N":
			at = Vector3(c.x, c.y - 1.0, DEPTH_Z)
		_:
			at = Vector3(c.x, c.y + 1.4, DEPTH_Z)
	Kit3D.sign_text(root, text, at, OPEN.lerp(Color.WHITE, 0.3), 0.006, 96)
