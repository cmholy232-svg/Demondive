class_name EnemyFactory
extends RefCounted
## Makes an enemy from its kind name, as used in room files and boss scripts.
## A kind can also be a level variant from data/enemies/variants.json: the
## archetype it is built on, retuned and recoloured. Bosses come from
## data/bosses/bosses.json unless they have their own script.

const VARIANTS_PATH: String = "res://data/enemies/variants.json"

static var _variants: Dictionary = {}


static func variants() -> Dictionary:
	if _variants.is_empty():
		_variants = JSON.parse_string(FileAccess.get_file_as_string(VARIANTS_PATH)) as Dictionary
	return _variants


static func variant(id: StringName) -> Dictionary:
	return variants().get(String(id), {}) as Dictionary


static func make(kind: StringName) -> Enemy:
	if variants().has(String(kind)):
		var spec: Dictionary = variant(kind)
		var enemy: Enemy = _archetype(StringName(str(spec["base"])))
		enemy.variant = kind
		return enemy
	if PatternBoss.has(kind):
		return PatternBoss.make(kind)
	return _archetype(kind)


static func _archetype(kind: StringName) -> Enemy:
	match kind:
		&"imp":
			return Imp.new()
		&"floater":
			return Floater.new()
		&"succubus":
			return Succubus.new()
		&"hellhound":
			return Hellhound.new()
		&"crawler":
			return Crawler.new()
		&"siren":
			return Siren.new()
		&"lobber":
			return Lobber.new()
		&"diver":
			return Diver.new()
		&"bartender":
			return Bartender.new()
		&"belladonna":
			return Belladonna.new()
	push_error("EnemyFactory: unknown kind %s" % kind)
	return Imp.new()
