class_name EnemyFactory
extends RefCounted
## Makes an enemy from its kind name, as used in room files and boss scripts.


static func make(kind: StringName) -> Enemy:
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
		&"bartender":
			return Bartender.new()
		&"belladonna":
			return Belladonna.new()
	push_error("EnemyFactory: unknown kind %s" % kind)
	return Imp.new()
