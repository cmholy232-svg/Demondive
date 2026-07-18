# DemonDive Alpha 7.8A — Asset Residency Audit

## Measured production payload

| Family | Files | Compressed size |
|---|---:|---:|
| Music MP3 | 32 | 112.30 MiB |
| Runtime PNG | 95 | 77.60 MiB |
| Procedural/fallback WAV | 26 | 1.52 MiB |
| SVG | 113 | 0.08 MiB |
| Other registry data | 11 | 0.09 MiB |
| Total `public` payload | — | 193 MiB |

Compressed file size is not texture-memory size. Decoded PNG surfaces can occupy approximately width × height × 4 bytes each before browser/GPU duplication.

## Corrected problem

The title constructor previously assigned `src` for:

- all 24 Level 4–9 backdrop/enemy/boss/environment raster surfaces;
- all 20 boon portraits;
- all 20 boon sigils.

That front-loaded network, image decode, and texture residency before the player entered a level. It also retained every late biome already visited during a full campaign or long Deep Dive.

## Current policy

- Title loads only the Pyrra and Belladonna portraits; no boon sigils are needed yet.
- Other boon portraits and sigils load at first actual use.
- A Level 4–9 room loads only its own four-biome surface group.
- Entering another late biome releases the prior late-biome image sources and registries.
- Returning to title or hub releases late-biome surfaces.
- Runtime telemetry reports resident late depths and boon visual counts.
- Missing/not-yet-decoded art uses the existing deterministic canvas fallback; simulation never waits on an image.

## Expected player-facing result

- Less title/startup decode pressure.
- Lower peak texture residency during the nine-level campaign and biome-swapping Deep Dive.
- Reduced risk of integrated-GPU stalls and mobile out-of-memory pressure.
- No change to damage, room generation, input, movement, boon logic, or earned projectile count.

## Evidence and limits

- TypeScript and production build pass.
- Source recovery gate rejects the former eager late-biome loop and requires the residency methods/telemetry markers.
- Full regression and production HTTP smoke are required for this checkpoint.
- Actual request counts, decoded memory, frame time, thermal behavior, and garbage-collection timing still require a browser/device capture. The current testing container exposes no runnable browser binary, so no browser-memory claim is made.

## Deferred payload work

The 193 MiB download remains large. Alpha 7.8 may later evaluate lossless metadata cleanup, delivery compression, or quality-reviewed alternate image/audio encodes. Those must be A/B reviewed; this patch intentionally changes residency rather than degrading supplied music or visual masters.
