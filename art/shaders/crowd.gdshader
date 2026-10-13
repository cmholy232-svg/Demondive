shader_type spatial;
render_mode unshaded, cull_disabled;
// Dancing crowd silhouettes behind the play plane. Each instance bobs to its
// own beat (phase in INSTANCE_CUSTOM.r) and is rimmed in club light.

uniform vec4 body_color : source_color = vec4(0.012, 0.005, 0.018, 1.0);
uniform vec4 rim_color : source_color = vec4(1.0, 0.25, 0.7, 1.0);
uniform float bpm = 124.0;
varying float v_height;

void vertex() {
	float phase = INSTANCE_CUSTOM.r * 6.2831;
	float beat = TIME * bpm / 60.0 * 3.14159;
	float bounce = abs(sin(beat + phase)) * 0.12 * INSTANCE_CUSTOM.g;
	float sway = sin(beat * 0.5 + phase) * 0.12 * VERTEX.y;
	VERTEX.y += bounce;
	VERTEX.x += sway;
	// Arms-up dancers (INSTANCE_CUSTOM.b) stretch their top half.
	VERTEX.y += max(VERTEX.y - 1.2, 0.0) * INSTANCE_CUSTOM.b * (0.4 + 0.3 * sin(beat + phase));
	v_height = VERTEX.y;
}

void fragment() {
	float rim = pow(1.0 - abs(dot(NORMAL, VIEW)), 2.5);
	ALBEDO = body_color.rgb + rim_color.rgb * rim * 0.55 + rim_color.rgb * smoothstep(1.6, 0.0, v_height) * 0.05;
}
