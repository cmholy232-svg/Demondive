class_name RoomMechanics
extends RefCounted
## Builds each level's signature mechanics from the room map and keeps the
## shapes for the 3D view:
##   < >  currents push Milo sideways (Drowned Court)
##   *    bubble vents lift Milo up their column (Drowned Court)
##   %    thorn cover swallows enemy shots (Thornwild)
##   !    rails that switch on and off on a beat (Thunder Jackpot)
##   Y    icicles that drop a moment after Milo passes under (Frozen Basilica)
##   1-4  linked portals, 1 with 2 and 3 with 4 (Forever Motel)
##   /    mirrors that bounce every shot back (City of a Thousand Faces)
##   &    corruption: drains Health while Milo stands in it, then powers him up (Lilith's Throne)

const T: float = RoomData.TILE
const CURRENT_PUSH: float = 1500.0
const VENT_LIFT: float = 4300.0
const VENT_HEIGHT: int = 8

var currents: Array[ForceZone] = []
var vents: Array[ForceZone] = []
var cover: Array[Rect2] = []
var rails: Array[HazardZone] = []
var icicles: Array[Icicle] = []
var portals: Array[Portal] = []
var mirrors: Array[Rect2] = []
var corruption: Array[Rect2] = []


func build(data: RoomData, parent: Node2D) -> void:
	for symbol: String in ["<", ">"]:
		for rect: Rect2 in RoomBuilder.runs(data, symbol):
			var zone := ForceZone.make(rect, Vector2(CURRENT_PUSH * (1.0 if symbol == ">" else -1.0), 0.0))
			parent.add_child(zone)
			currents.append(zone)
	for rect: Rect2 in RoomBuilder.runs(data, "*"):
		var top: int = int(rect.position.y / T)
		var rows: int = 0
		while rows < VENT_HEIGHT and top - rows - 1 >= 0 and not data.is_solid(int(rect.position.x / T), top - rows - 1):
			rows += 1
		var column := Rect2(rect.position.x, rect.position.y - rows * T, rect.size.x, (rows + 1) * T)
		var vent := ForceZone.make(column, Vector2(0.0, -VENT_LIFT))
		vent.lift = true
		parent.add_child(vent)
		vents.append(vent)
	for rect: Rect2 in RoomBuilder.runs(data, "%"):
		var bush := ThornCover.make(Rect2(rect.position - Vector2(0.0, T), rect.size + Vector2(0.0, T)))
		parent.add_child(bush)
		cover.append(bush.rect)
	var beat: int = 0
	for rect: Rect2 in RoomBuilder.runs(data, "!"):
		var rail := HazardZone.make(&"rail", Rect2(rect.position + Vector2(0.0, T * 0.55), Vector2(rect.size.x, T * 0.45)), 16.0)
		rail.cycle_on = 1.3
		rail.cycle_off = 1.9
		rail.cycle_offset = beat * 1.6
		rail.color = Color(1.0, 0.92, 0.3)
		beat += 1
		parent.add_child(rail)
		rails.append(rail)
	for rect: Rect2 in RoomBuilder.runs(data, "Y"):
		for i: int in int(rect.size.x / T):
			var icicle := Icicle.new()
			icicle.position = rect.position + Vector2(T * (i + 0.5), 0.0)
			parent.add_child(icicle)
			icicles.append(icicle)
	var pads: Dictionary = {}
	for code: String in ["1", "2", "3", "4"]:
		for rect: Rect2 in RoomBuilder.runs(data, code):
			var portal := Portal.new()
			portal.position = rect.position + Vector2(T * 0.5, T)
			parent.add_child(portal)
			portals.append(portal)
			pads[code] = portal
	for pair: Array in [["1", "2"], ["3", "4"]]:
		if pads.has(pair[0]) and pads.has(pair[1]):
			(pads[pair[0]] as Portal).partner = pads[pair[1]] as Portal
			(pads[pair[1]] as Portal).partner = pads[pair[0]] as Portal
	for x: int in data.width:
		var y: int = 0
		while y < data.height:
			if data.tile(x, y) != "/":
				y += 1
				continue
			var rows: int = 0
			while data.tile(x, y + rows) == "/":
				rows += 1
			var mirror := Mirror.make(Rect2(x * T + T * 0.3, y * T, T * 0.4, rows * T))
			parent.add_child(mirror)
			mirrors.append(mirror.rect)
			y += rows
	for rect: Rect2 in RoomBuilder.runs(data, "&"):
		var pool := Corruption.make(Rect2(rect.position + Vector2(0.0, T * 0.35), Vector2(rect.size.x, T * 0.65)))
		parent.add_child(pool)
		corruption.append(pool.rect)
