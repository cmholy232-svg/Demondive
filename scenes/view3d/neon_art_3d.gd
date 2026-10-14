class_name NeonArt3D
extends RefCounted
## Bent-tube neon pieces for the Neon Maw's walls: a heart, devil horns, a
## cocktail glass, lips and a pitchfork. Each is a polyline of glowing tube
## segments over a dark backing plate, with a little coloured light.

const TUBE: float = 0.06


static func piece(root: Node3D, kind: int, at: Vector3, size: float, color: Color) -> void:
	var lines: Array = _shape(kind)
	var holder := Node3D.new()
	holder.position = at
	root.add_child(holder)
	var glow: Material = Kit3D.neon(color, 5.0)
	for line: Variant in lines:
		var points: PackedVector2Array = line as PackedVector2Array
		for i: int in points.size() - 1:
			_segment(holder, points[i] * size, points[i + 1] * size, glow)
	Kit3D.omni(holder, Vector3(0.0, 0.0, 0.6), color, 1.6, size * 3.5)


static func _segment(holder: Node3D, a: Vector2, b: Vector2, mat: Material) -> void:
	var d: Vector2 = b - a
	var bar: MeshInstance3D = Kit3D.box(holder, Vector3((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, 0.0), Vector3(d.length() + TUBE * 0.6, TUBE, TUBE), mat)
	bar.rotation.z = d.angle()


static func _shape(kind: int) -> Array:
	match kind % 5:
		0:
			return [_heart()]
		1:
			return _horns()
		2:
			return [PackedVector2Array([Vector2(-0.6, 0.6), Vector2(0.6, 0.6), Vector2(0.0, 0.0), Vector2(-0.6, 0.6)]),
				PackedVector2Array([Vector2(0.0, 0.0), Vector2(0.0, -0.6)]), PackedVector2Array([Vector2(-0.3, -0.6), Vector2(0.3, -0.6)]),
				PackedVector2Array([Vector2(0.25, 0.45), Vector2(0.55, 0.85)])]
		3:
			return _lips()
		_:
			return [PackedVector2Array([Vector2(0.0, -0.9), Vector2(0.0, 0.5)]),
				PackedVector2Array([Vector2(-0.4, 0.9), Vector2(-0.4, 0.5), Vector2(0.4, 0.5), Vector2(0.4, 0.9)]),
				PackedVector2Array([Vector2(0.0, 0.5), Vector2(0.0, 0.95)])]


static func _heart() -> PackedVector2Array:
	var points := PackedVector2Array()
	for i: int in 29:
		var t: float = TAU * i / 28.0
		var x: float = 16.0 * pow(sin(t), 3.0)
		var y: float = 13.0 * cos(t) - 5.0 * cos(2.0 * t) - 2.0 * cos(3.0 * t) - cos(4.0 * t)
		points.append(Vector2(x, y) / 17.0)
	return points


static func _horns() -> Array:
	var out: Array = []
	for side: float in [-1.0, 1.0]:
		var points := PackedVector2Array()
		for i: int in 9:
			var t: float = i / 8.0
			points.append(Vector2(side * (0.25 + 0.45 * sin(t * 1.4)), -0.3 + t * 1.1 - t * t * 0.2))
		out.append(points)
	var arc := PackedVector2Array()
	for i: int in 13:
		var a: float = PI + PI * i / 12.0
		arc.append(Vector2(cos(a) * 0.35, -0.3 + sin(a) * 0.35))
	out.append(arc)
	return out


static func _lips() -> Array:
	var top := PackedVector2Array()
	var bottom := PackedVector2Array()
	for i: int in 17:
		var t: float = -1.0 + 2.0 * i / 16.0
		top.append(Vector2(t * 0.8, 0.12 + 0.28 * (1.0 - t * t) - 0.12 * exp(-t * t * 30.0)))
		bottom.append(Vector2(t * 0.8, 0.0 - 0.35 * (1.0 - t * t)))
	var seam := PackedVector2Array([Vector2(-0.8, 0.05), Vector2(-0.3, 0.02), Vector2(0.0, 0.06), Vector2(0.3, 0.02), Vector2(0.8, 0.05)])
	return [top, bottom, seam]
