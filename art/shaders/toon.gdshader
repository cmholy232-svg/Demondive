shader_type spatial;
// Cel shading for characters: two soft bands, a shade tint, a rim light.
// Takes the model's own texture when it has one (VRoid characters) and cuts
// out transparent texels (hair tips, lashes).

uniform vec4 albedo : source_color = vec4(1.0);
uniform sampler2D albedo_texture : source_color, filter_linear_mipmap, repeat_enable;
uniform bool use_texture = false;
// Outfit recolours: keep the texture's light and shade, take albedo's colour.
uniform bool luma_tint = false;
uniform float alpha_cut : hint_range(0.0, 1.0) = 0.0;
uniform vec4 shade_tint : source_color = vec4(0.62, 0.5, 0.78, 1.0);
uniform float shade_amount : hint_range(0.0, 1.0) = 0.42;
uniform float band_softness : hint_range(0.0, 0.5) = 0.08;
uniform float rim_strength : hint_range(0.0, 2.0) = 0.5;
uniform vec4 rim_color : source_color = vec4(1.0, 0.75, 0.88, 1.0);
uniform float emission_boost : hint_range(0.0, 4.0) = 0.0;

void fragment() {
	vec4 base = albedo;
	if (use_texture) {
		vec4 tex = texture(albedo_texture, UV);
		if (luma_tint) {
			float luma = dot(tex.rgb, vec3(0.2126, 0.7152, 0.0722));
			base = vec4(albedo.rgb * clamp(luma * 2.2, 0.0, 1.6), tex.a);
		} else {
			base *= tex;
		}
	}
	if (alpha_cut > 0.0 && base.a < alpha_cut) {
		discard;
	}
	ALBEDO = base.rgb;
	ROUGHNESS = 1.0;
	SPECULAR = 0.0;
	float rim = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 3.0);
	EMISSION = rim_color.rgb * rim * rim_strength * base.rgb + base.rgb * emission_boost;
}

void light() {
	float ndl = dot(NORMAL, LIGHT);
	float lit = smoothstep(-band_softness, band_softness, ndl);
	vec3 band = mix(mix(vec3(1.0), shade_tint.rgb, shade_amount) * (1.0 - shade_amount * 0.6), vec3(1.0), lit);
	// ATTENUATION carries distance falloff and shadow, so it scales the shaded
	// side too; otherwise every neon light in range washes the model out.
	DIFFUSE_LIGHT += LIGHT_COLOR / PI * band * ATTENUATION;
}
