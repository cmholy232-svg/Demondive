# DemonDive Alpha 7.4B — Checkpoint 01 Handoff

## Roadmap position

Active phase: **Alpha 7.4B — Baseline locomotion, input and neutral Arcane responsiveness**.

This is an automated implementation checkpoint on `alpha/7.4-rebuild`. It does not claim that either movement profile has passed physical-device or human feel approval.

## Implemented

- Preserved the exact established movement values as selectable **A0 Control**.
- Added an explicit **A1 Responsive Candidate** that changes only ordinary acceleration, deceleration, air control, coyote time, jump buffering and shot buffering.
- Locked run speed, gravity curve, jump shape, fall caps, dash, wavedash, waveland and dash recovery to equal values in both profiles.
- Added runtime profile switching in Settings and profile identity in the local telemetry snapshot.
- Added split-hand and arcade keyboard presets, individual key rebinding, reset behavior and visible conflict detection.
- Added controller-axis hysteresis and analog-trigger handling to reduce accidental direction changes and unreliable trigger firing.
- Added active-device prompts for keyboard, controller and touch, including temporary tutorial prompts.
- Added a short neutral-fire input buffer so a fire tap during a temporary attack lock can execute when the lock clears instead of disappearing.
- Reset movement/binding selections with the full save reset.

## Automated status

- `npm run verify` passes.
- TypeScript and production build pass with 30 transformed modules.
- Alpha 7.3C campaign and Alpha 7.5 runtime-art recovery gates pass.
- Alpha 7.4 fixtures pass, including 13,413 generated-room validations, save/retry integrity, input remapping, conflict detection, controller hysteresis, movement-profile protection and telemetry.
- Production HTTP smoke passes for index, JavaScript, CSS, Level 9 environment art and final-fight music.

## Human gates still open

- Keyboard and controller comparison of A0 versus A1.
- 30/60/90/120 Hz input and frame-pacing captures.
- Three casual and three experienced testers per primary input device.
- Confirmation that ordinary walking, jumping, landing and neutral fire improve without weakening dash, wavedash or waveland.
- Final movement-profile selection; A0 remains the default until evidence supports promotion.

## Next work

Continue Alpha 7.4B with the neutral Arcane Bolt mechanical A/B matrix and captured action-outcome evidence. Final muzzle, impact, animation, sound, shake and particle polish remains Alpha 7.6 work.
