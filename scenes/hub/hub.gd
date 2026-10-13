class_name Hub
extends Node2D
## Milo's Hellroom: walk around, choose a starting boon at the altar, buy
## upgrades at the desk, change outfits at the wardrobe, and dive through
## the hellmouth. The goddesses Milo has freed hang out here.

signal dive_requested

const MILO_SCENE: PackedScene = preload("res://scenes/player/milo.tscn")
const ROOM_PATH: String = "res://data/rooms/hub/hellroom.txt"
const STATION_REACH: float = 110.0

var room: Room
var milo: Milo
var camera: GameCamera
var view: RoomView3D
var dialogue: DialogueBox
var fade: ScreenFade
var altar: AltarPanel
var desk: DeskPanel
var wardrobe: WardrobePanel
var _prompt: Label
var _shards: Label
var _near: StringName = &""
var _leaving: bool = false
var _time: float = 0.0


func _ready() -> void:
	Game.enter_hub()
	camera = GameCamera.new()
	camera.follow_mode = true
	add_child(camera)
	room = Room.new()
	var rewards: Array[StringName] = [&"dive"]
	room.setup(RoomData.load_file(ROOM_PATH), rewards)
	room.exit_chosen.connect(func(_reward: StringName) -> void: _dive())
	add_child(room)
	milo = MILO_SCENE.instantiate() as Milo
	add_child(milo)
	(milo.get_node("Feedback") as CanvasItem).visible = false
	milo.global_position = room.data.player_start
	camera.target = milo
	camera.set_room_bounds(Rect2(Vector2.ZERO, room.data.size_px()))
	camera.snap()
	view = RoomView3D.new()
	add_child(view)
	view.setup(camera, milo)
	view.build_room(room, "hellroom")
	_build_overlay()
	dialogue = DialogueBox.new()
	add_child(dialogue)
	altar = AltarPanel.new()
	add_child(altar)
	altar.boon_selected.connect(func(boon: StringName) -> void: _tint_orb(boon))
	desk = DeskPanel.new()
	add_child(desk)
	desk.closed.connect(_refresh_overlay)
	wardrobe = WardrobePanel.new()
	add_child(wardrobe)
	wardrobe.preview.connect(func(outfit: StringName) -> void: view.milo_view().apply_outfit(outfit))
	wardrobe.closed.connect(_refresh_overlay)
	fade = ScreenFade.new()
	add_child(fade)
	room.start()
	Audio.play_music(&"hub")
	_refresh_overlay()
	fade.fade_in(0.3)
	# First visit: the 2 AM scene in Milo's room, then Pyrra's welcome.
	for beat: StringName in [&"prologue_dive", &"prologue_arrival"]:
		if dialogue.play(beat):
			milo.controllable = false
			await dialogue.finished
			milo.controllable = true


func _build_overlay() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 10
	add_child(layer)
	_shards = UiStyle.label("", 22, UiStyle.SHARD, UiStyle.bold_font)
	_shards.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT, Control.PRESET_MODE_MINSIZE, 22)
	_shards.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	layer.add_child(_shards)
	var where := UiStyle.title(Strings.text("room.hellroom"), 20, UiStyle.TEXT)
	where.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT, Control.PRESET_MODE_MINSIZE, 22)
	layer.add_child(where)
	_prompt = UiStyle.label("", 20, UiStyle.TEXT)
	_prompt.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_prompt.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM, Control.PRESET_MODE_MINSIZE, 40)
	_prompt.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_prompt.grow_vertical = Control.GROW_DIRECTION_BEGIN
	layer.add_child(_prompt)


func _refresh_overlay() -> void:
	_shards.text = Strings.text("hub.shards") % Save.shards()


func _process(delta: float) -> void:
	_time += delta
	if HellroomKit.altar_orb != null and is_instance_valid(HellroomKit.altar_orb):
		HellroomKit.altar_orb.position.y = float(HellroomKit.altar_orb.get_meta("bob")) + sin(_time * 2.0) * 0.08


func _physics_process(_delta: float) -> void:
	if _leaving or get_tree().paused:
		return
	_near = &""
	for station: StringName in room.data.stations:
		var at: Vector2 = room.data.stations[station]
		if absf(milo.global_position.x - at.x) < STATION_REACH and absf(milo.global_position.y - at.y) < 140.0:
			_near = station
	var text: String = ""
	if _near != &"":
		text = Strings.text("hub.prompt.%s" % _near)
		if not dialogue.visible and (milo.current_input.interact_pressed or milo.current_input.up_pressed):
			_open_station(_near)
	else:
		for door: ExitDoor in room.exits:
			if door.open and door.milo_near:
				text = Strings.text("prompt.door") % Strings.text("reward.dive")
	_prompt.text = text


func _open_station(station: StringName) -> void:
	match station:
		&"altar":
			altar.show_altar()
		&"desk":
			desk.show_desk()
		&"wardrobe":
			wardrobe.show_wardrobe()


func _tint_orb(boon: StringName) -> void:
	if HellroomKit.altar_orb != null and is_instance_valid(HellroomKit.altar_orb):
		HellroomKit.altar_orb.material_override = Kit3D.neon(BoonCatalog.color(boon), 3.0)
	Game.fx(&"portal", room.data.stations[&"altar"] as Vector2 + Vector2(0.0, -120.0), BoonCatalog.color(boon), 1.0)


func _dive() -> void:
	if _leaving:
		return
	_leaving = true
	milo.controllable = false
	Audio.play_sfx(&"door_open", -2.0)
	await fade.fade_out(0.35)
	dive_requested.emit()
