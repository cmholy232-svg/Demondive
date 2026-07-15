# DemonDive Alpha 7.5 — Asset Batch 03 Handoff

## Roadmap position

Alpha 7.5 art production and integration preparation. This batch establishes the HUD information hierarchy and the formal source gates needed before Alpha 7.6 animation/audio implementation. It is not a playable release.

## Completed in this batch

- Seven reusable HUD source components: health, Demon Energy, global XP, dominant boon, equipped Special, contextual objective and wager.
- Desktop minimal-combat layout with the center playfield protected.
- Mobile landscape layout with safe-area and thumb-occlusion budgets.
- Full-information pause/loadout layout.
- Renderer-independent assembled layouts and repeatable contact-sheet generation.
- Master audit covering twenty boon-givers, nine biomes, eighteen boss/mini-boss encounters, Milo, UI and story categories.
- A complete Alpha 7.6 animation-source checklist.
- A recovery ledger recording the authoritative Alpha 7.4A identifiers and hashes.

## Information decisions frozen for implementation

- Health, Demon Energy, equipped Special and one dominant boon identity are the minimal combat HUD.
- Objectives and wagers are contextual.
- Global XP is temporary in combat and persistent in hub/pause/run summary.
- Complete boon stacks and run details belong in pause/loadout.
- Rush/payout announcer audio remains removed until a final approved voice direction exists.

## Verification

`npm run verify` passes all available source checks, Alpha 7.5 asset checks, TypeScript compilation, Vite production build and the inherited smoke test.

Important limitation: the inherited executable gate explicitly tests the older Alpha 7 Level 3 scaffold. It does not prove integration with the authoritative Levels 1–9 Alpha 7.4A runtime. Integration remains blocked until that exact source can be materially restored; no older runtime has been relabeled or overwritten as Alpha 7.4A.

## Next safe work

Continue Alpha 7.5 source production that is runtime-independent: character cleanup specifications, enemy/boss silhouette corrections, biome style templates, room-density cleanup boards, remaining UI source states and animation-source assets. Defer actual Levels 1–9 runtime wiring and Alpha 7.6 implementation until the authoritative source is restored.

## Approval state

`source-ready-correction-pending`; `humanApproved: false`; `playableRelease: false`.
