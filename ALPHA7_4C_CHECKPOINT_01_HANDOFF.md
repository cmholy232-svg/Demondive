# DemonDive Alpha 7.4C — Checkpoint 01 Handoff

## Roadmap position

Active phase: **Alpha 7.4C1 — Twenty boon mechanical contracts**.

This checkpoint begins contract reconciliation. Alpha 7.4C is not complete: the attached audit deliberately records unresolved partial and mismatched boons.

## Implemented

- Added deterministic dominant-boon selection: highest stack, then starting-boon tie preference, then most recently increased tie preference.
- Added a stable dominant color/accent instead of time-cycling the Arcane Bolt identity.
- Added twenty distinct temporary projectile silhouette families and at most two bounded secondary effect markers.
- Added dominant-boon metadata directly to player projectiles.
- Updated the compact Arcana HUD to name the dominant giver and stack instead of presenting every build as an anonymous prism.
- Corrected Gaia's always-on armor contract; Crya defense now applies only while a living enemy is controlled.
- Connected Nerissa stacks to the promised pickup magnet radius and pull strength.
- Added pure tests for dominant selection, bounded secondary identity, all twenty silhouettes, defense composition and pickup radius.
- Added `production/alpha7_4c-boon-contract-reconciliation.json` with the current aligned/partial/mismatch status of all twenty boons.

## Safety boundaries

- The new silhouettes are temporary mechanical-readability visuals; Alpha 7.5 source remains explicitly human-approval pending.
- Presentation metadata does not change projectile damage, target count or proc results.
- The existing smart two-choice boon offer system remains unchanged.

## Open gates

- Reconcile every partial/mismatch row in the twenty-boon audit.
- Run single, three, ten and extreme-stack correctness/readability fixtures.
- Complete 7.4C2 HUD and room-quality metadata.
- Human five-second recognition testing remains required.
- Destructive live-projectile trimming remains a 7.4D blocker and is explicitly not accepted as a performance solution.
