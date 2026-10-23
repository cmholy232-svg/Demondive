class_name BoonCompanions
extends Node
## Boon behaviours that live beside Milo instead of on a bolt: Seraphine's
## orbiting fragments, Gaia's retaliating stone shards and Vespera's
## riposte. A child of the Specials node; the 3D view draws the fragments.

const ORBIT_RADIUS: float = 72.0
const ORBIT_SPEED: float = 2.4
const FRAGMENT_REACH: float = 480.0
## Seraphine: fragment shots carry this share of a full bolt's damage.
const FRAGMENT_SHARE: float = 0.4
const FRAGMENT_SECONDS: float = 1.5
const FRAGMENT_SECONDS_FAST: float = 1.0
const STONE_REACH: float = 360.0
const STONE_SHARDS: int = 3
const RIPOSTE_REACH: float = 420.0

var specials: Specials
var _time: float = 0.0
var _fragment_timer: float = FRAGMENT_SECONDS
var _dodge_hooked: bool = false


func _ready() -> void:
	Game.milo_hurt.connect(_on_milo_hurt)
	Game.shield_soaked.connect(_on_shield_soaked)


func _physics_process(delta: float) -> void:
	step(delta)


func step(delta: float) -> void:
	var milo: Milo = specials.milo if specials != null else null
	if milo == null or not is_instance_valid(milo):
		return
	if not _dodge_hooked:
		milo.perfect_dodged.connect(_on_perfect_dodge)
		_dodge_hooked = true
	_time += delta
	if fragment_count() <= 0:
		return
	_fragment_timer -= delta
	if _fragment_timer <= 0.0:
		_fragment_timer = fragment_seconds()
		fire_fragments()


## Seraphine: one orbiting fragment per rank (1 to 4).
static func fragment_count() -> int:
	return BoonCatalog.rank(&"seraphine")


static func fragment_seconds() -> float:
	return FRAGMENT_SECONDS_FAST if BoonCatalog.rank(&"seraphine") >= 3 else FRAGMENT_SECONDS


func fragment_positions() -> Array[Vector2]:
	var out: Array[Vector2] = []
	var count: int = fragment_count()
	for i: int in count:
		var angle: float = _time * ORBIT_SPEED + TAU * i / float(count)
		out.append(specials.origin() + Vector2(cos(angle), sin(angle) * 0.45) * ORBIT_RADIUS)
	return out


## Every fragment fires a small bolt at the nearest enemy in reach.
## Returns how many shots went out.
func fire_fragments() -> int:
	var caster: ArcaneCaster = specials.caster()
	if caster == null:
		return 0
	var stats: BoltStats = BoonEffects.bolt_stats(caster.tuning)
	stats.damage *= FRAGMENT_SHARE
	stats.split = 0
	stats.radius *= 0.7
	stats.color = BoonCatalog.color(&"seraphine")
	var fired: int = 0
	for at: Vector2 in fragment_positions():
		var targets: Array[Enemy] = BoonHooks.nearest(get_tree(), at, 1, FRAGMENT_REACH)
		if targets.is_empty():
			continue
		caster.spawn_at(at, (targets[0].center() - at).normalized(), stats.duplicate_stats())
		fired += 1
	return fired


## Seraphine Lv 7 Retribution: when the shield soaks a hit, every fragment fires.
func _on_shield_soaked() -> void:
	if BoonCatalog.rank(&"seraphine") >= 4:
		fire_fragments()


## Gaia Lv 2 Retaliate: when Milo is hurt, stone shards strike nearby enemies.
func _on_milo_hurt(_amount: float) -> void:
	if BoonCatalog.rank(&"gaia") < 2 or specials.milo == null:
		return
	var n: int = Game.stacks(&"gaia")
	for enemy: Enemy in BoonHooks.nearest(get_tree(), specials.origin(), STONE_SHARDS, STONE_REACH):
		Game.fx(&"hit", enemy.center(), BoonCatalog.color(&"gaia"), 1.0)
		BoonHooks.side_hit(enemy, 12.0 + 4.0 * n, &"shard", specials.origin())


## Vespera Lv 2 Riposte: a Perfect Dodge sends a mirror shard into every
## enemy in reach.
func _on_perfect_dodge() -> void:
	if BoonCatalog.rank(&"vespera") < 2:
		return
	var n: int = Game.stacks(&"vespera")
	for enemy: Enemy in BoonHooks.nearest(get_tree(), specials.origin(), 99, RIPOSTE_REACH):
		Game.fx(&"mirror", enemy.center(), BoonCatalog.color(&"vespera"), 0.8)
		BoonHooks.side_hit(enemy, 15.0 + 5.0 * n, &"shard", specials.origin())
