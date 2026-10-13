shader_type spatial;
// Two-band cel shading with a soft rim, for characters.

uniform vec4 albedo : source_color = vec4(1.0);
uniform vec4 shade_tint : source_color = vec4(0.55, 0.45, 0.7, 1.0);
uniform float band_softness : hint_range(0.0, 0.5) = 0.06;
uniform float rim_strength : hint_range(0.0, 2.0) = 0.45;
uniform vec4 rim_color : source_color = vec4(1.0, 0.75, 0.85, 1.0);

void fragment() {
	ALBEDO = albedo.rgb;
	ROUGHNESS = 1.0;
	SPECULAR = 0.0;
	float rim = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 3.0);
	EMISSION = rim_color.rgb * rim * rim_strength * albedo.rgb;
}

void light() {
	float ndl = dot(NORMAL, LIGHT);
	float lit = smoothstep(0.0, band_softness, ndl) * ATTENUATION;
	vec3 band = mix(shade_tint.rgb * 0.35, vec3(1.0), lit);
	DIFFUSE_LIGHT += LIGHT_COLOR / PI * band;
}
