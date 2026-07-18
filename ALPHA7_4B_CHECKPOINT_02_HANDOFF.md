# DemonDive Alpha 7.4B — Checkpoint 02 Handoff

## Roadmap position

Active phase: **Alpha 7.4B — Baseline locomotion, input and neutral Arcane responsiveness**.

This checkpoint adds the instrumented neutral Arcane Bolt comparison on top of checkpoint `fb08432`. It remains a testable candidate, not a human-approved default change.

## Added

- Preserved exact neutral Arcane values as **A0 Control**.
- Added a separately selectable **A1 Responsive Candidate** in Settings and through the `arcaneProfile` query parameter.
- A1 tests a 0.235s to 0.220s base cooldown, 780 to 840 projectile speed, and 0.24s to 0.20s fire pose.
- Damage, collision radius, effective range, boon scaling and Specials remain protected.
- Adjusted candidate projectile lifetime so the faster projectile retains the exact 1,248-unit A0 effective range.
- Added the selected Arcane profile to the local telemetry snapshot.
- Added automated control/candidate selection and protected-value fixtures.
- Full reset returns both movement and Arcane tuning to A0.

## Approval and regression gates

- A0 remains the default.
- A1 requires physical keyboard/controller input-to-fire comparison and cast-readability approval.
- Encounter balance must be reviewed because the candidate cadence is approximately 6.8% faster even though per-shot damage is unchanged.
- Final muzzle, trail, impact, hit-stop, shake, sound layering and particles remain Alpha 7.6 work.

## Automated status

- TypeScript and production build pass with 31 transformed modules.
- Alpha 7.4 fixtures pass, including exact neutral damage, hitbox and range protection.
- Full repository verification must remain green before this checkpoint is published.

## Next work

Complete the full verification and publish this checkpoint, then proceed to Alpha 7.4C boon identity/readability and performance-safe high-stack behavior.
