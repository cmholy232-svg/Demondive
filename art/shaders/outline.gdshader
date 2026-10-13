shader_type spatial;
render_mode unshaded, cull_front;
// Inverted-hull ink outline. Used as a next pass on toon materials.

uniform vec4 outline_color : source_color = vec4(0.05, 0.03, 0.06, 1.0);
uniform float width = 0.012;

void vertex() {
	VERTEX += NORMAL * width;
}

void fragment() {
	ALBEDO = outline_color.rgb;
}
