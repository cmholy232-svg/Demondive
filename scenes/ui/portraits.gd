class_name Portraits
extends RefCounted
## The boon-givers' painted portraits (art/portraits/chr_<id>_portrait.png).
## Dialogue looks them up by speaker name, boon cards by boon id.

const FOLDER: String = "res://art/portraits/chr_%s_portrait.png"
## The top of each portrait (head and shoulders), in source pixels.
const BUST: Rect2 = Rect2(0.0, 0.0, 384.0, 210.0)


static func id_for_speaker(speaker: String) -> StringName:
	return StringName(speaker.to_lower().replace(" ", "_"))


static func full(id: StringName) -> Texture2D:
	var path: String = FOLDER % String(id)
	if not ResourceLoader.exists(path):
		return null
	return load(path) as Texture2D


static func bust(id: StringName) -> Texture2D:
	var texture: Texture2D = full(id)
	if texture == null:
		return null
	var atlas := AtlasTexture.new()
	atlas.atlas = texture
	atlas.region = BUST
	return atlas
