extends Node
## Run state: Milo's Health and Demon Energy, the run's boons and shards,
## and where he is in the dive. Cleared on death; Save keeps the rest.

signal health_changed(health: float, max_health: float)
signal energy_changed(energy: float, max_energy: float)
signal boons_changed
signal run_shards_changed(amount: int)
signal milo_hurt(amount: float)
signal milo_died
## Asks the 3D view for a one-shot effect (burst, ring, blast, shards...).
signal fx_requested(kind: StringName, at: Vector2, color: Color, size: float)

const BASE_HEALTH: float = 100.0
const BASE_ENERGY: float = 60.0
const HURT_INVULNERABLE_SECONDS: float = 0.9

var health: float = BASE_HEALTH
var max_health: float = BASE_HEALTH
var energy: float = 0.0
var max_energy: float = BASE_ENERGY
var run_shards: int = 0
## Boon id -> stack count for this run.
var boons: Dictionary = {}
## The one equipped Special's boon id, or &"" for none.
var special: StringName = &""
var level: int = 1
var room_index: int = 0
var rerolls: int = 0
var run_time: float = 0.0
var kills: int = 0
var in_run: bool = false
var rng := RandomNumberGenerator.new()
## Extra damage multiplier for the current room (Belladonna feeding, Lilith's pact).
var room_damage_bonus: float = 0.0
## Short speed buffs from Belladonna, as remaining seconds per stack.
var appetite_buffs: Array[float] = []


func _process(delta: float) -> void:
	if not in_run or get_tree().paused:
		return
	run_time += delta
	for i: int in range(appetite_buffs.size() - 1, -1, -1):
		appetite_buffs[i] -= delta
		if appetite_buffs[i] <= 0.0:
			appetite_buffs.remove_at(i)


func start_run(seed_value: int = 0) -> void:
	rng.seed = seed_value if seed_value != 0 else int(Time.get_unix_time_from_system() * 1000.0) ^ randi()
	boons.clear()
	special = &""
	level = 1
	room_index = 0
	run_shards = 0
	run_time = 0.0
	kills = 0
	room_damage_bonus = 0.0
	appetite_buffs.clear()
	max_health = BASE_HEALTH + Upgrades.value(&"vitality")
	max_energy = BASE_ENERGY + Upgrades.value(&"reservoir")
	health = max_health
	energy = max_energy * 0.5
	rerolls = int(Upgrades.value(&"reroll"))
	in_run = true
	Save.bump_stat("runs")
	Save.write()
	_emit_all()


func end_run(won: bool) -> void:
	in_run = false
	Save.add_shards(run_shards)
	Save.bump_stat("wins" if won else "deaths")
	Save.bump_stat("kills", kills)
	Save.write()


func _emit_all() -> void:
	health_changed.emit(health, max_health)
	energy_changed.emit(energy, max_energy)
	boons_changed.emit()
	run_shards_changed.emit(run_shards)


# --- Health and energy ------------------------------------------------------

## Applies armor and returns the damage actually taken.
func hurt(amount: float) -> float:
	if health <= 0.0:
		return 0.0
	var taken: float = maxf(1.0, amount * (1.0 - BoonEffects.armor()))
	health = maxf(0.0, health - taken)
	health_changed.emit(health, max_health)
	milo_hurt.emit(taken)
	if health <= 0.0:
		milo_died.emit()
	return taken


func heal(amount: float) -> void:
	health = minf(max_health, health + amount)
	health_changed.emit(health, max_health)


func raise_max_health(amount: float) -> void:
	max_health += amount
	health += amount
	health_changed.emit(health, max_health)


func add_energy(amount: float) -> void:
	energy = clampf(energy + amount, 0.0, max_energy)
	energy_changed.emit(energy, max_energy)


func spend_energy(amount: float) -> bool:
	if energy < amount:
		return false
	energy -= amount
	energy_changed.emit(energy, max_energy)
	return true


func add_run_shards(amount: int) -> void:
	run_shards += int(round(amount * (1.0 + BoonEffects.shard_bonus())))
	run_shards_changed.emit(run_shards)


# --- Boons -----------------------------------------------------------------

func stacks(id: StringName) -> int:
	return int(boons.get(id, 0))


func add_boon(id: StringName) -> void:
	var before: int = stacks(id)
	boons[id] = before + 1
	if id == &"maris":
		raise_max_health(BoonEffects.MARIS_HEALTH_PER_STACK)
	if special == &"":
		special = id
	boons_changed.emit()


func equip_special(id: StringName) -> void:
	if stacks(id) > 0:
		special = id
		boons_changed.emit()


func boon_ids() -> Array[StringName]:
	var out: Array[StringName] = []
	for id: Variant in boons.keys():
		out.append(id as StringName)
	return out


## The boon with the most stacks sets the bolt's shape; ties go to the earliest taken.
func dominant_boon() -> StringName:
	var best: StringName = &""
	var best_stacks: int = 0
	for id: Variant in boons.keys():
		if int(boons[id]) > best_stacks:
			best = id as StringName
			best_stacks = int(boons[id])
	return best


func on_pickup() -> void:
	var appetite: int = stacks(&"belladonna")
	if appetite <= 0:
		return
	appetite_buffs.append(3.0 + appetite * 0.5)
	room_damage_bonus = minf(0.6, room_damage_bonus + 0.04 * appetite)


func fx(kind: StringName, at: Vector2, color: Color = Color.WHITE, size: float = 1.0) -> void:
	fx_requested.emit(kind, at, color, size)


func enter_room() -> void:
	room_index += 1
	room_damage_bonus = 0.0
