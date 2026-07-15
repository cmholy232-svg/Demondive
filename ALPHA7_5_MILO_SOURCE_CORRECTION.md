# DemonDive Alpha 7.5 — Milo Source-Correction Gate

## Root cause retained from the surviving source

The current renderer multiplies each animation frame by a different scale. Ordinary run frames average approximately `0.904`; moving fire uses `1.04`, which is roughly 15% larger. Idle uses `1.16`; upward fire uses `0.83`, roughly 28% smaller. The source also uses per-frame feet anchors for early movement frames.

This matches the reported visible symptoms. It is not a camera illusion and should not be tuned away with another set of runtime multipliers.

## Alpha 7.5 correction standard

Milo v02 must be normalized in the source cells:

- one model-sheet body scale;
- one visible shoe-sole baseline at cell y=458 for grounded poses;
- stable head, shoulder, jacket, pelvis and shoe landmarks;
- no more than 3% apparent scale change across an ordinary state transition;
- right-palm ownership and socket retained across mirroring;
- Arcane palm flame, charge, long trail and upward overshoot exported separately from the body;
- no purple or disconnected effect pixels below the shoe contact mask;
- 6% transparent inset in every cell.

Crouch, jump and dash poses are not normalized by total bounding-box height. Their body landmarks are compared, because a tucked pose should become shorter without making Milo’s head, torso or shoes larger.

## Required sources

The package enumerates thirty states from idle/run through casts, hurt, death, victory and boon acquisition, plus thirteen separated source layers/masks. Alpha 7.6 does not begin Milo implementation until those sources exist.

## Integration after art approval

Register v02 paths beside v01. The v02 runtime definition omits `frameScales` and `frameFeetY`, uses the shared feet anchor, and remeasures palm sockets after normalization. A/B captures place every transition over a fixed collider/floor guide before v01 can be retired.

The quick-direction facing defect remains a runtime input/state issue; mirroring policy is locked here so art does not make it worse.

## Approval state

`source-ready-correction-pending`; `humanApproved: false`; `playableRelease: false`. This is the correction and source gate, not a claim that final redrawn v02 animation frames already exist.
