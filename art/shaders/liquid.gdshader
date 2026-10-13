shader_type spatial;
render_mode unshaded;
// Glowing hell liquid (lava, cocktail pools): scrolling bands of two colours.

uniform vec4 color_a : source_color = vec4(1.0, 0.25, 0.45, 1.0);
uniform vec4 color_b : source_color = vec4(1.0, 0.65, 0.2, 1.0);
uniform float energy = 1.6;
uniform float speed = 0.6;

float wave(vec2 p) {
	return sin(p.x * 3.1 + TIME * speed * 2.0) * 0.5 + sin(p.x * 7.3 - p.y * 2.0 - TIME * speed * 3.0) * 0.3 + sin(p.y * 5.0 + TIME * speed) * 0.2;
}

void fragment() {
	vec3 world = (INV_VIEW_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float w = wave(world.xz * 1.5) * 0.5 + 0.5;
	float hot = smoothstep(0.55, 0.9, w);
	// Mostly deep colour; only the crests run hot enough to bloom.
	ALBEDO = mix(color_a.rgb * 0.55, color_b.rgb, hot) * mix(0.9, energy, hot * hot);
}
