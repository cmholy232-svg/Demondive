# DemonDive Alpha 7.5 — Asset Batch 05 Handoff

## Roadmap position

Alpha 7.5 Milo final-art and animation-source preparation. This batch diagnoses the surviving scale/grounding architecture and locks the v02 source contract. It is not a playable build and does not claim final redrawn frames exist.

## Evidence

- Ordinary run frame multiplier mean: approximately `0.904`.
- Moving-cast multiplier: `1.04`, about 15% larger than running.
- Idle multiplier: `1.16`.
- Up-cast multiplier: `0.83`, about 28% smaller than idle.
- Early movement frames depend on a different feet anchor (`405`) instead of the nominal shared `458`.

These values explain the reported moving-fire growth, upward-fire shrink and grounding fragility.

## Frozen v02 contract

- Thirty required state sources and thirteen separated layer/mask sources.
- One body scale, one grounded visible-sole baseline and no per-frame runtime scale/feet overrides.
- Stable body landmarks with at most 3% apparent drift across ordinary transitions.
- Separate Arcane palm/charge/trail sources; no purple pixels below shoe contact.
- Re-measured palm sockets after art normalization.
- Existing quick-direction facing bug remains a runtime input/state task.

## Explicit exclusions

- No v01 runtime asset is overwritten.
- No older Level 3 source is relabeled as Alpha 7.4A.
- No claim that final Milo art or Alpha 7.6 animation implementation is complete.

## Approval state

`source-ready-correction-pending`; `humanApproved: false`; `playableRelease: false`.
