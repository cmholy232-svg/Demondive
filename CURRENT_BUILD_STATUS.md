# DemonDive Current Build Status

## Plan position

Active build: **Alpha 7.7 story and tutorial playtest** on `alpha/7.4-rebuild`.

Next phase: **Alpha 7.8 whole-game polish and Alpha-completion gating**.

## Preserved implementation

- Alpha 7.3C: mechanically playable Levels 1–9, ending, credits, and Deep Dive registration.
- Alpha 7.4: integrity contracts, movement/input refinement, twenty-boon mechanics, HUD/room-quality rules, save/retry/reset protection, difficulty and performance safeguards.
- Alpha 7.5: recovered art-integrated runtime plus source audits and correction registers.
- Alpha 7.6: code-side audio/feedback hierarchy, procedural fallback SFX, deterministic camera feedback, impact budgets, and final authored-SFX requirements.
- Alpha 7.7: playable three-room tutorial and full campaign dialogue draft.

## Open Alpha-completion blockers

1. Human fresh-save and max-save campaign approval.
2. Keyboard/controller feel and new-player tutorial approval.
3. Two-hour Deep Dive and extreme-build performance/readability test.
4. Representative desktop/laptop performance captures.
5. Final authored SFX replacement and mix approval.
6. Alpha 7.5 asset corrections and human visual approval.
7. Narrative copy approval and dialogue layout review.
8. P0/P1 bug closure and explicit P2/P3 disposition.
9. Restore-tested downloadable package and release manifest.

## Evidence boundary

Automated verification proves deterministic contracts, builds, mapped source recovery, and HTTP serving. It does not prove controls feel good, visuals are final, audio is mixed, or physical devices sustain target performance.

## Backup rule

Every independently verified checkpoint is committed and pushed to the recovery branch. `main` remains untouched until the owner explicitly approves a merge or release action.
