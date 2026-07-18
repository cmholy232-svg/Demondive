# DemonDive Alpha 7.4A — Checkpoint 01 Handoff

## Roadmap position

Active phase: **Alpha 7.4A — Instrumentation, integrity and architecture safety**.

This checkpoint follows the protected Alpha 7.5 playable tag `alpha-7.5-playable-preserved` at commit `339f20f`. It is the first independently revertible 7.4 change set. Alpha 7.4B locomotion tuning has not begun, so dash, wavedash and waveland constants remain unchanged.

## Completed in this checkpoint

- Added the machine-readable A0 baseline at `production/alpha7_4-a0-baseline.json`.
- Added local-only runtime telemetry for frame time, clamped frames, action consumption/rejection reasons, sampled movement, shots, entity peaks/caps, room entry/clear and deaths.
- Exposed a read-only debug snapshot through `window.__DEMONDIVE_TELEMETRY__()`; no telemetry is transmitted.
- Replaced the false horizontal ground-node shortcut with gate-aware entry-to-exit traversal validation.
- Added an adversarial split-floor fixture that must fail.
- Validated 4,460 generated campaign rooms across Levels 1–9 and checked the no-consecutive-empty rule.
- Added a save repository boundary around browser storage without changing the save payload.
- Added fixtures for current-save round-trip, legacy migration, corrupt-current fallback, reset, and storage failure behavior.
- Extracted retry requests so Retry Same Seed is fixture-locked to Level 1 with the original seed and starting-boon flow.
- Added keyboard/controller/touch prompt contracts and explicit PC/mobile-free/mobile-full entitlement test contexts.
- Instrumented the existing emergency caps so every trim records entity type, count, limit and amount removed.
- Preserved the full Alpha 7.3C, Alpha 7.5 art and runtime verification gates.

## Verification

`npm run verify` passes:

- TypeScript and Vite production build;
- Alpha 7.3C Levels 1–9 foundation checks;
- every Alpha 7.5 source-asset and runtime-art gate;
- save/retry/room/entitlement/prompt/telemetry fixtures;
- 4,460 generated-room traversal checks.

## Performance findings

- The game uses a variable timestep clamped to 33.33 ms. A fixed-step rewrite is not authorized without measured 30/60/90/120 Hz divergence.
- Particle creation already respects a reduced-VFX budget, but several effect arrays still depend on emergency trimming.
- The 320-projectile cap removes oldest live projectiles. This is now observable, but replacing it with simulation-safe consolidation belongs to the later 7.4 performance checkpoint because it can change high-stack mechanics.
- Boss hazards have a warning budget but no destructive emergency trim in this checkpoint.
- Runtime telemetry retains bounded local buffers to avoid becoming a new memory problem.

## Human-required evidence still open

- baseline gameplay videos on a local machine;
- physical keyboard and controller input review;
- 30/60/90/120 Hz comparison;
- laptop/GPU frame-time and memory capture;
- human visual approval of the Alpha 7.5 packages.

These are explicit approval/evidence gates, not silently marked complete by automated tests.

## Next work

Finish 7.4A with performance-capture presets and any migration review list produced by larger seed sweeps. Then begin 7.4B instrumented locomotion/input/neutral-Arcane A/B work while keeping the advanced movement baseline as the control.
