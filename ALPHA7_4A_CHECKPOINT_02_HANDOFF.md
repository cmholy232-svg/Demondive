# DemonDive Alpha 7.4A — Checkpoint 02 Handoff

## Roadmap position

Active phase: **Alpha 7.4A — Instrumentation, integrity and architecture safety**.

This checkpoint extends `5a1b2a0` without changing movement, combat, room difficulty or the protected Alpha 7.5 art integration.

## Added

- Expanded deterministic Levels 1–9 validation to 13,413 generated rooms.
- Added `ALPHA7_4_PERFORMANCE_CAPTURE_PROTOCOL.md` with reproducible A0 presets, 30/60/90/120 Hz comparison rules, required device evidence and initial frame/entity budgets.
- Retained save-load diagnostics so corrupt data or blocked browser storage is visible to the player instead of failing silently.
- Confirmed the production preview serves the built index, JavaScript, Level 8/9 environment/enemy/boss art and final-fight music over HTTP.

## Automated status

`npm run verify` passes in full. The production HTTP smoke check also passes.

## Human gates still open

- local gameplay videos;
- physical keyboard/controller review;
- display refresh-rate matrix;
- laptop/GPU performance traces and memory capture;
- Alpha 7.5 visual approval.

## Next work

Move into Alpha 7.4B implementation work: parameterize baseline locomotion without changing the A0 control, connect device-aware prompt state, add remap/conflict foundations, and run neutral Arcane responsiveness A/B fixtures. Physical playtest approval remains required before any candidate replaces the control values.
