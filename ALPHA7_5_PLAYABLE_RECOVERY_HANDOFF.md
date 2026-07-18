# DemonDive Alpha 7.5 Playable Recovery Handoff

## Roadmap position

Alpha 7.5 runtime art integration is preserved on top of the recovered Alpha 7.3C full campaign. The active implementation branch proceeds to Alpha 7.4A: integrity, instrumentation, save safety, room validation and performance baselining. Alpha 7.6 remains the later animation, SFX, VFX and game-feel implementation pass.

## Recovery provenance

The authoritative playable package was `DemonDive_Alpha7_5_ArtIntegrated_Playable(1).zip`, SHA-256 `a111f8ca81acf9bb4f21f06447b2f9d34cb41de0863c0f50b45a9a064acc2c78`.

Its production source map supplied the exact newer `src/main.ts`. The runtime assets below were restored byte-for-byte from the playable package:

- six Level 4–9 painted backgrounds;
- six fixed 4x3 construction atlases;
- six fixed 2x6 common-enemy atlases;
- six fixed 2x4 mini-boss/boss encounter atlases;
- the environment, construction, enemy and encounter manifests.

The recovered source package already contained the twenty boon sigils, boon portraits, HUD hierarchy sources, sensory boards, art-direction documents and the earlier Alpha 7.5 production audit. Human visual approval is intentionally still separate from automated integrity verification.

## Runtime verification authority

Run:

```bash
npm ci
npm run verify
```

The completion gate must include:

```text
ALPHA 7.5 RUNTIME ART QA PASSED · 6 backgrounds · 36 common enemies · 12 encounters · 72 construction cells · 20 boon sigils
```

`scripts/verify-a75-runtime-art.mjs` validates dimensions, manifest checksums, asset counts and the required runtime registries. It prevents another source recovery from silently dropping the integrated Level 4–9 art.

## Protected boundaries

- Do not rewrite collision from image geometry.
- Do not replace the recovered Levels 1–3 art routes without side-by-side review.
- Do not claim human visual approval from automated checks.
- Keep Alpha 7.4 changes in independently revertible checkpoints.
- Every checkpoint handoff must state roadmap position, commit, verification status and next work item.

## Next checkpoint

Alpha 7.4A begins with a reproducible baseline and telemetry, then save/retry/reset fixtures, disconnected-room rejection, logical input boundaries and performance measurement. The completed Alpha 7.5 integration must remain separately recoverable before those changes begin.
