shader_type spatial;
// Club back wall: dark lacquered panels with a faint neon seam grid, a hot
// magenta wash rising from the floor line and a few softly pulsing panels.

uniform vec4 base_color : source_color = vec4(0.035, 0.018, 0.045, 1.0);
uniform vec4 seam_color : source_color = vec4(1.0, 0.18, 0.62, 1.0);
uniform vec4 wash_color : source_color = vec4(0.9, 0.15, 0.55, 1.0);
uniform vec2 panel = vec2(2.4, 1.6);
uniform float floor_y = -10.0;
uniform float wash_height = 4.0;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void fragment() {
	vec3 world = (INV_VIEW_MATRIX * vec4(VERTEX, 1.0)).xyz;
	vec2 p = world.xy / panel;
	vec2 id = floor(p);
	vec2 f = fract(p);
	float seam = 1.0 - step(0.025, f.x) * step(0.04, f.y);
	float h = hash(id);
	float lit = step(0.9, h) * (0.5 + 0.5 * sin(TIME * (0.6 + h * 1.5) + h * 30.0));
	float wash = exp(-max(world.y - floor_y, 0.0) / wash_height);
	ALBEDO = base_color.rgb * (0.75 + 0.5 * h);
	ROUGHNESS = 0.35;
	METALLIC = 0.2;
	EMISSION = seam_color.rgb * seam * 0.05 + seam_color.rgb * lit * 0.06 + wash_color.rgb * wash * 0.09;
}
